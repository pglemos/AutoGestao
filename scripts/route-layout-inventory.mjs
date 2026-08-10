#!/usr/bin/env node
/**
 * Inventário de rotas — Task 3/5 do plano de padronização de layout.
 *
 * Extrai rotas de `src/App.tsx` via AST do TypeScript, resolve o componente
 * montado por rota (incluindo `RoleSwitch`), segue re-exports, e cruza com o
 * registro `routeLayoutMetadata` para produzir:
 *   docs/reports/layout-route-inventory.json
 *   docs/reports/layout-route-inventory.md
 *
 * Uso:
 *   node scripts/route-layout-inventory.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const OUT_JSON = path.join(ROOT_DIR, 'docs/reports/layout-route-inventory.json')
const OUT_MD = path.join(ROOT_DIR, 'docs/reports/layout-route-inventory.md')

const APP_PATH = path.join(ROOT_DIR, 'src', 'App.tsx')
const METADATA_PATH = path.join(ROOT_DIR, 'src/design-system/page/routeLayoutMetadata.ts')

const appSource = ts.createSourceFile(APP_PATH, fs.readFileSync(APP_PATH, 'utf8'), ts.ScriptTarget.Latest, true)
const appText = appSource.text

/** Mapa: nome do componente lazy → specifier `@/...`. */
function collectLazyImports(sf) {
  const map = new Map()
  const visit = (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const init = decl.initializer
        if (
          init &&
          ts.isCallExpression(init) &&
          init.expression.getText(sf) === 'lazy' &&
          init.arguments.length === 1 &&
          ts.isArrowFunction(init.arguments[0]) &&
          ts.isCallExpression(init.arguments[0].body) &&
          init.arguments[0].body.expression.getText(sf) === 'import' &&
          init.arguments[0].body.arguments.length >= 1 &&
          ts.isStringLiteral(init.arguments[0].body.arguments[0])
        ) {
          const name = decl.name.getText(sf)
          const specifier = init.arguments[0].body.arguments[0].text
          map.set(name, specifier)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return map
}

/** Extrai a string de um atributo JSX (string literal ou template simples). */
function jsxAttributeString(node, name) {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return null
  const attrs = (ts.isJsxSelfClosingElement(node) ? node.attributes : node.openingElement.attributes).properties
  for (const attr of attrs) {
    if (ts.isJsxAttribute(attr) && attr.name.text === name && attr.initializer) {
      if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text
      if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression && ts.isStringLiteral(attr.initializer.expression)) {
        return attr.initializer.expression.text
      }
    }
  }
  return null
}

/** Retorna os nomes dos elementos filhos de RoleSwitch. */
function roleSwitchComponents(element) {
  const props = (ts.isJsxSelfClosingElement(element) ? element.attributes : element.openingElement.attributes).properties
  const names = { vendedor: null, gerente: null, dono: null, admin: null }
  for (const attr of props) {
    if (!ts.isJsxAttribute(attr) || !(attr.name.text in names)) continue
    const value = attr.initializer
    if (value && ts.isJsxExpression(value) && value.expression && (ts.isJsxElement(value.expression) || ts.isJsxSelfClosingElement(value.expression))) {
      names[attr.name.text] = (ts.isJsxSelfClosingElement(value.expression) ? value.expression.tagName : value.expression.openingElement.tagName).getText(appSource)
    }
  }
  return names
}

const lazyImports = collectLazyImports(appSource)

/** Acesso compatível TS5: openingElement ou direto no self-closing. */
function jsxOpen(n) {
  if (ts.isJsxSelfClosingElement(n)) return { tagName: n.tagName, attributes: n.attributes }
  return n.openingElement
}

/** Percorre JSX: dado um elemento Route, extrai (path, componentes montados). */
function extractRoutes(node) {
  const acc = []
  const visit = (n, parentPath = '') => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName?.getText(appSource) ?? jsxOpen(n).tagName.getText(appSource)
      if (tag === 'Route') {
        const routePath = jsxAttributeString(n, 'path')
        let fullPath = parentPath
        if (routePath) {
          fullPath = routePath.startsWith('/') ? routePath : `${parentPath}/${routePath}`.replace(/\/{2,}/g, '/')
        } else if (parentPath) {
          fullPath = parentPath // Route index
        }

        const components = []
        const visitChildren = (child) => {
          if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            const childTag = (ts.isJsxSelfClosingElement(child) ? child.tagName : child.openingElement.tagName).getText(appSource)
            if (childTag === 'RoleSwitch') {
              const roles = roleSwitchComponents(child)
              for (const [role, comp] of Object.entries(roles)) {
                if (comp) components.push({ role, component: comp })
              }
            } else if (childTag !== 'Route') {
              components.push({ role: '*', component: childTag })
            }
          }
        }
        // Elementos filhos do elemento element= (não Routes aninhadas)
        const elementAttr = jsxOpen(n).attributes.properties.find(
          (a) => ts.isJsxAttribute(a) && a.name.text === 'element',
        )
        if (elementAttr && ts.isJsxAttribute(elementAttr) && elementAttr.initializer && ts.isJsxExpression(elementAttr.initializer)) {
          const expr = elementAttr.initializer.expression
          if (expr) {
            if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) {
              const tag = (ts.isJsxSelfClosingElement(expr) ? expr.tagName : expr.openingElement.tagName).getText(appSource)
              if (tag === 'RoleSwitch') {
                const roles = roleSwitchComponents(expr)
                for (const [role, comp] of Object.entries(roles)) {
                  if (comp) components.push({ role, component: comp })
                }
              } else if (tag !== 'Suspense') {
                components.push({ role: '*', component: tag })
              } else {
                for (const c of expr.children ?? []) visitChildren(c)
              }
            } else if (ts.isParenthesizedExpression(expr) && ts.isJsxElement(expr.expression)) {
              const tag = (ts.isJsxSelfClosingElement(expr.expression) ? expr.expression.tagName : expr.expression.openingElement.tagName).getText(appSource)
              if (tag === 'RoleSwitch') {
                const roles = roleSwitchComponents(expr.expression)
                for (const [role, comp] of Object.entries(roles)) {
                  if (comp) components.push({ role, component: comp })
                }
              }
            }
          }
        }
        // Routes aninhadas (filhos JSX de <Route>)
        const nested = []
        for (const child of n.children ?? []) {
          if ((ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) && (ts.isJsxSelfClosingElement(child) ? child.tagName : child.openingElement.tagName).getText(appSource) === 'Route') {
            visit(child, fullPath || parentPath)
          }
        }

        acc.push({
          path: fullPath || parentPath,
          components,
          hasElement: components.length > 0,
        })
        return
      }
      if (tag === 'Routes') {
        for (const child of n.children ?? []) {
          if ((ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) && (ts.isJsxSelfClosingElement(child) ? child.tagName : child.openingElement.tagName).getText(appSource) === 'Route') {
            visit(child, parentPath)
          }
        }
        return
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return acc
}

const routes = extractRoutes(appSource)

/** Resolve `@/x` para o caminho absoluto do arquivo. */
function resolveSpecifier(specifier) {
  for (const extension of ['.tsx', '.ts']) {
    const candidate = path.join(ROOT_DIR, 'src', `${specifier.slice(2)}${extension}`)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/** Segue re-export fino para a view real (até 4 níveis). */
function resolveToComponentFile(filePath, depth = 0) {
  if (!filePath || depth > 4) return filePath
  const text = fs.readFileSync(filePath, 'utf8')
  const match = text.match(/export\s*\{\s*default\s*\}\s*from\s*'@\/([^']+)'/)
    ?? text.match(/export\s*\{[^}]*\}\s*from\s*'@\/([^']+)'/)
  if (!match) return filePath
  const resolved = resolveSpecifier(`@/${match[1]}`)
  return resolved && resolved !== filePath ? resolveToComponentFile(resolved, depth + 1) : filePath
}

/** Conta usos de PageCanvas/ConditionalPageCanvas/PageTemplate no arquivo. */
function fileLayoutUsage(file) {
  if (!file || file === '—') return { canvas: 0, template: 0, structural: 0 }
  const abs = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file)
  if (!fs.existsSync(abs)) return { canvas: 0, template: 0, structural: 0 }
  const text = fs.readFileSync(abs, 'utf8')
  const canvas = (text.match(/<PageCanvas|ConditionalPageCanvas|PageCanvas\b/g) ?? []).length
  const template = (text.match(/PageTemplate/g) ?? []).length
  const structural = (text.match(/mx-auto|max-w-(7xl|\[[0-9a-z]+px\])/g) ?? []).length
  return { canvas, template, structural }
}

const metadataText = fs.readFileSync(METADATA_PATH, 'utf8')

function resolveRouteMetadata(routePath) {
  const normalized = (routePath || '').replace(/^\/+/, '')
  const exact = new RegExp(`['"]${escapeRegex(normalized)}['"]:\\s*\\{([^}]*)\\}`).exec(metadataText)
  if (exact) return parseMetadataBlock(exact[1])

  const blocks = [...metadataText.matchAll(/['"]((?:[^'"]*\/)*[^'"]*)['"]:\s*\{([^}]*)\}/g)]
  const prefixMatches = blocks
    .filter(([, key]) => normalized.startsWith(`${key.replace(/^\/+/, '')}/`))
    .sort((a, b) => b[1].length - a[1].length)
  if (prefixMatches.length > 0) return parseMetadataBlock(prefixMatches[0][2])
  return { width: 'dashboard', source: 'default' }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseMetadataBlock(block) {
  const meta = { width: 'dashboard' }
  const width = block.match(/width:\s*'([^']+)'/)
  if (width) meta.width = width[1]
  const density = block.match(/density:\s*'([^']+)'/)
  if (density) meta.density = density[1]
  const clearance = block.match(/bottomClearance:\s*'([^']+)'/)
  if (clearance) meta.bottomClearance = clearance[1]
  if (/adopted:\s*true/.test(block)) meta.adopted = true
  return meta
}

const routeInfo = []
const seen = new Set()

for (const route of routes) {
  const key = route.path
  if (seen.has(key)) continue
  seen.add(key)

  const meta = resolveRouteMetadata(route.path)
  const rendered = []
  for (const { role, component } of route.components) {
    if (component === 'ForbiddenRoute' || component === 'Navigate' || component === 'RedirectWithSearch' || component === 'RoleRedirect') continue
    const specifier = lazyImports.get(component)
    const file = specifier ? resolveSpecifier(specifier) : null
    const finalFile = file ? resolveToComponentFile(file) : null
    const usage = fileLayoutUsage(finalFile)
    rendered.push({
      role,
      component,
      source: specifier ?? '—',
      file: finalFile ? path.relative(ROOT_DIR, finalFile).replace(/\\/g, '/') : '—',
      ...usage,
    })
  }
  const uniqueFiles = new Set(rendered.map((r) => r.file).filter((f) => f !== '—'))
  const canvas = Math.max(0, ...rendered.map((r) => r.canvas))
  const template = Math.max(0, ...rendered.map((r) => r.template))
  const structural = Math.max(0, ...rendered.map((r) => r.structural))

  routeInfo.push({
    path: route.path,
    renderCount: route.components.length,
    routes: route.components.length > 0 ? route.components.map((c) => `${c.role}:${c.component}`) : [],
    files: [...uniqueFiles],
    canvas,
    template,
    structural,
    metadata: meta,
  })
}

routeInfo.sort((a, b) => a.path.localeCompare(b.path))

const json = {
  generatedAt: new Date().toISOString(),
  baselineSha: execSync('git rev-parse HEAD').toString().trim(),
  routeCount: routeInfo.length,
  routes: routeInfo,
}

fs.writeFileSync(OUT_JSON, `${JSON.stringify(json, null, 2)}\n`)

const mdLines = []
mdLines.push('# Inventário de Rotas — Layout')
mdLines.push('')
mdLines.push(`- Gerado em: ${json.generatedAt}`)
mdLines.push(`- Baseline SHA: \`${json.baselineSha}\``)
mdLines.push(`- Total de rotas: ${json.routeCount}`)
mdLines.push('')
mdLines.push('| Path | Rota p/ perfil | Arquivo(s) | Canvas | Template | Estrutural | Width | Clearance | Adotada |')
mdLines.push('|---|---|---|---|---|---|---|---|---|')
for (const route of routeInfo) {
  mdLines.push(
    `| ${route.path} | ${route.routes.join(', ') || '—'} | ${route.files.map((f) => `\`${f}\``).join('<br>') || '—'} | ${route.canvas} | ${route.template} | ${route.structural} | ${route.metadata.width} | ${route.metadata.bottomClearance ?? '—'} | ${route.metadata.adopted ? 'sim' : 'não'} |`,
  )
}
fs.writeFileSync(OUT_MD, `${mdLines.join('\n')}\n`)

console.log(`[route-layout-inventory] ${routeInfo.length} rotas → docs/reports/layout-route-inventory.md`)
