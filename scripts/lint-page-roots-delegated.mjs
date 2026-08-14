#!/usr/bin/env node
/**
 * Foundation Zero AC-29.001/29.003.
 *
 * `lint-page-roots.mjs` inspeciona a raiz do arquivo que a rota monta, mas uma
 * rota pode delegar a sua primeira camada visual para outro componente. Esse
 * scanner segue somente componentes realmente importados e usados como JSX
 * por uma raiz montada, até dois níveis, e audita a raiz JSX desses delegados.
 * Assim `DashboardLoja -> DashboardHeader` não fica invisível para o gate.
 *
 * O scanner é deliberadamente conservador:
 * - só considera wrappers com largura máxima de página + centralização + ritmo;
 * - só considera scroll owner quando ele é a raiz do componente delegado;
 * - scroll interno declarado por overlay/dialog ou `data-mx-scroll-region` é
 *   permitido e continua sendo responsabilidade do componente interno.
 *
 * Uso:
 *   node scripts/lint-page-roots-delegated.mjs
 *   node scripts/lint-page-roots-delegated.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']
const COMPONENT_TAG = /^[A-Z][A-Za-z0-9_$]*$/

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function sourceFile(filePath, text) {
  const kind = /\.tsx?$/.test(filePath) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind)
}

function exportedComponentNames(sf) {
  const names = new Set()

  function visit(node) {
    const modifiers = node.modifiers ?? []
    const isExported = modifiers.some(
      modifier => modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword,
    )

    if (isExported) {
      if (ts.isFunctionDeclaration(node) && node.name) names.add(node.name.text)
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text)
        }
      }
    }

    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
      names.add(node.expression.text)
    }

    ts.forEachChild(node, visit)
  }

  visit(sf)
  return names
}

function unwrapJsx(node) {
  if (!node) return []
  if (ts.isParenthesizedExpression(node)) return unwrapJsx(node.expression)
  if (ts.isJsxFragment(node)) {
    return node.children.flatMap((child) => {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) return [child]
      if (ts.isJsxExpression(child) && child.expression) return unwrapJsx(child.expression)
      return []
    })
  }
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) return [node]
  if (ts.isConditionalExpression(node)) return [...unwrapJsx(node.whenTrue), ...unwrapJsx(node.whenFalse)]
  return []
}

function rootJsxElements(fn) {
  const roots = []

  function visit(node) {
    if (node !== fn && (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      return
    }
    if (ts.isReturnStatement(node)) roots.push(...unwrapJsx(node.expression))
    ts.forEachChild(node, visit)
  }

  visit(fn)
  return roots
}

function directJsxChildren(element) {
  if (ts.isJsxSelfClosingElement(element)) return []
  return element.children.flatMap((child) => {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) return [child]
    if (ts.isJsxExpression(child) && child.expression) return unwrapJsx(child.expression)
    return []
  })
}

function isInternalOverlayContainer(element, sf) {
  const opening = ts.isJsxElement(element) ? element.openingElement : element
  const tagName = opening.tagName.getText(sf)
  return /(?:Dialog|Sheet|Drawer|ScrollableRegion)/.test(tagName)
}

function staticClassName(element, sf) {
  if (ts.isJsxFragment(element)) return ''
  const opening = ts.isJsxElement(element) ? element.openingElement : element
  const attribute = opening.attributes.properties.find(
    property => ts.isJsxAttribute(property) && property.name.text === 'className',
  )
  if (!attribute?.initializer) return ''
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text
  if (!ts.isJsxExpression(attribute.initializer)) return ''
  return [...attribute.initializer.getText(sf).matchAll(/['"`]([^'"`]*)['"`]/g)]
    .map(([, value]) => value)
    .join(' ')
}

function hasAttribute(element, name, sf) {
  if (ts.isJsxFragment(element)) return false
  const opening = ts.isJsxElement(element) ? element.openingElement : element
  return opening.attributes.properties.some(
    property => ts.isJsxAttribute(property) && property.name.getText(sf) === name,
  )
}

function hasClassToken(classes, token) {
  return new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:\\s|$)`).test(classes)
}

function structuralWrapper(classes) {
  const hasCenter = hasClassToken(classes, 'mx-auto')
  const hasPageWidth = /(?:^|\s)(?:max-w-7xl|max-w-screen-[^\s]+|max-w-\[[^\]]+\])(?:\s|$)/.test(classes)
  const hasFullWidth = hasClassToken(classes, 'w-full')
  const hasPageRhythm = /(?:^|\s)(?:space-y-[^\s]+|gap-[^\s]+|p[xylrtb]?-[^\s]+)(?:\s|$)/.test(classes)
  return hasCenter && hasPageWidth && (hasFullWidth || hasPageRhythm)
}

function hasPageScrollClass(classes) {
  return /(?:^|\s)overflow-[xy]-(?:auto|scroll)(?:\s|$)/.test(classes)
}

function isDeclaredInternalScroll(element, classes, sf) {
  const overlayRoot = hasClassToken(classes, 'fixed') && hasClassToken(classes, 'inset-0')
  const opening = ts.isJsxElement(element) ? element.openingElement : element
  const primitive = opening.tagName.getText(sf) === 'ScrollableRegion'
  const dialog = hasAttribute(element, 'role', sf) || hasAttribute(element, 'aria-modal', sf)
  const declaredRegion = hasAttribute(element, 'data-mx-scroll-region', sf)
  return primitive || dialog || declaredRegion || (overlayRoot && dialog)
}

/**
 * Pure helper used by the unit contract and by the CLI gate.
 */
export function inspectDelegatedComponent(source, file = '<inline>') {
  const sf = sourceFile(file, source)
  const exported = exportedComponentNames(sf)
  const violations = []

  function visit(node) {
    const isComponent =
      (ts.isFunctionDeclaration(node) && node.body) ||
      (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)))

    if (isComponent) {
      const fn = ts.isVariableDeclaration(node) ? node.initializer : node
      const name = ts.isVariableDeclaration(node) ? node.name.getText(sf) : node.name?.getText(sf)
      if (name && COMPONENT_TAG.test(name) && exported.has(name)) {
        for (const root of rootJsxElements(fn)) {
          const candidates = [root]
          if (!isInternalOverlayContainer(root, sf)) candidates.push(...directJsxChildren(root))

          for (const candidate of candidates) {
            const classes = staticClassName(candidate, sf)
            if (!classes) continue
            const opening = ts.isJsxElement(candidate) ? candidate.openingElement : candidate
            const line = sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1

            if (structuralWrapper(classes)) {
              violations.push({
                file,
                line,
                component: name,
                rule: 'delegated-page-wrapper',
                utility: classes,
              })
            }

            if (hasPageScrollClass(classes) && !isDeclaredInternalScroll(candidate, classes, sf)) {
              violations.push({
                file,
                line,
                component: name,
                rule: 'delegated-page-scroll-owner',
                utility: classes,
              })
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sf)
  return violations
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'base44-reference'].includes(entry.name)) walk(full, files)
    } else if (SOURCE_EXTENSIONS.some(extension => entry.name.endsWith(extension)) && !/\.(test|spec|playwright)\./.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function resolveSpecifier(specifier, importer) {
  const base = specifier.startsWith('@/')
    ? path.join(SRC_DIR, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(importer), specifier)
      : null
  if (!base) return null
  for (const extension of SOURCE_EXTENSIONS) {
    if (fs.existsSync(`${base}${extension}`)) return `${base}${extension}`
  }
  for (const extension of SOURCE_EXTENSIONS) {
    if (fs.existsSync(path.join(base, `index${extension}`))) return path.join(base, `index${extension}`)
  }
  return null
}

function importedComponentBindings(filePath) {
  const text = readText(filePath)
  const bindings = []
  const importPattern = /(?:^|\n)\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g

  for (const match of text.matchAll(importPattern)) {
    const clause = match[1].trim()
    const specifier = match[2]
    if (clause.startsWith('type ') || !specifier.startsWith('.') && !specifier.startsWith('@/')) continue

    const locals = []
    const named = clause.match(/\{([\s\S]*?)\}/)
    if (named) {
      for (const part of named[1].split(',')) {
        const clean = part.trim()
        if (!clean || clean.startsWith('type ')) continue
        const [imported, local = imported] = clean.split(/\s+as\s+/)
        locals.push({ local: local.trim(), component: imported.trim() })
      }
    }

    const defaultPart = clause.replace(/\{[\s\S]*?\}/, '').replace(/^type\s+/, '').trim().replace(/,$/, '').trim()
    if (defaultPart && /^[A-Za-z_$][\w$]*$/.test(defaultPart)) {
      locals.push({ local: defaultPart, component: null })
    }

    if (clause.includes('* as ')) {
      const namespace = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)
      if (namespace) locals.push({ local: namespace[1], component: null })
    }

    const resolved = resolveSpecifier(specifier, filePath)
    if (!resolved) continue
    for (const binding of locals) {
      if (!new RegExp(`<${binding.local}(?:\\s|/|>)`).test(text)) continue
      bindings.push({ ...binding, resolved })
    }
  }

  return bindings
}

function routeMountedFiles() {
  const appPath = path.join(SRC_DIR, 'App.tsx')
  const app = readText(appPath)
  const files = new Set(walk(path.join(SRC_DIR, 'pages')))
  for (const [, specifier] of app.matchAll(/import\(['"]@\/(features\/[^'"]+)['"]\)/g)) {
    const resolved = resolveSpecifier(`@/${specifier}`, appPath)
    if (resolved) files.add(resolved)
  }
  return [...files]
}

function resolveReExport(filePath) {
  const text = readText(filePath)
  const match = text.match(/export\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/) 
  return match ? resolveSpecifier(match[1], filePath) ?? filePath : filePath
}

function collectDelegatedViolations() {
  const violations = []
  const seen = new Set()

  function visit(parent, depth) {
    if (depth > 2) return
    for (const binding of importedComponentBindings(parent)) {
      const key = `${binding.resolved}:${binding.component ?? '*'}`
      if (seen.has(key)) continue
      seen.add(key)
      const file = binding.resolved
      const relative = path.relative(ROOT_DIR, file).replace(/\\/g, '/')
      const found = inspectDelegatedComponent(readText(file), relative)
      violations.push(...found.map(item => ({ ...item, importedBy: path.relative(ROOT_DIR, parent).replace(/\\/g, '/') })))
      visit(file, depth + 1)
    }
  }

  for (const routeFile of routeMountedFiles()) {
    const resolved = resolveReExport(routeFile)
    visit(resolved, 0)
  }

  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

export function runDelegatedRootGate() {
  return collectDelegatedViolations()
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runDelegatedRootGate()
  const result = {
    gate: 'lint-page-roots-delegated',
    pass: violations.length === 0,
    violationCount: violations.length,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log('[lint-page-roots-delegated] OK — nenhum wrapper/scroll owner delegado fora do contrato')
  } else {
    console.error(`[lint-page-roots-delegated] FALHA — ${violations.length} violação(ões):`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} ${violation.rule} (${violation.component})`)
      console.error(`    ${violation.utility}`)
      console.error(`    importado por ${violation.importedBy}`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
