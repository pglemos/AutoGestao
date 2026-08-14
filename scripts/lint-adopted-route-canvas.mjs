#!/usr/bin/env node
/**
 * Foundation Zero — contrato de rotas adotadas × canvas (AC-29.004).
 *
 * Para cada rota marcada `adopted: true` em `routeLayoutMetadata.ts`, exige
 * que todo componente realmente renderizado na rota (ignorando `ForbiddenRoute`
 * e `Navigate`, e desempacotando `RoleSwitch`/`Suspense`) use `PageCanvas`,
 * `PageTemplate` ou `MxModulePage` com `width` e `bottomClearance` compatíveis
 * com a metadata. `MxModulePage` renderiza `PageCanvas` internamente, por isso
 * conta como canvas-bearing. Re-exports simples de página (`export { X as
 * default } from '@/features/...'`) são seguidos em um nível para chegar ao
 * arquivo que realmente declara o canvas:
 *
 *   - `width` da página  == `width` da metadata (default `dashboard`);
 *   - `bottomClearance` da página == `bottomClearance` da metadata
 *     (default `none`, cobrindo rotas adotadas SEM clearance explícito).
 *
 * Determinstico: parseia App.tsx e as raízes com TypeScript AST; nenhum React,
 * nenhum runtime, nenhuma escrita — gate puramente read-only (não gera
 * artefatos).
 *
 * Uso:
 *   node scripts/lint-adopted-route-canvas.mjs
 *   node scripts/lint-adopted-route-canvas.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']
const CANVAS_TAGS = new Set(['PageCanvas', 'PageTemplate', 'MxModulePage'])
const SKIPPED_TAGS = new Set(['ForbiddenRoute', 'Navigate'])
const DEFAULT_WIDTH = 'dashboard'
const DEFAULT_CLEARANCE = 'none'

function normalizeRoute(value) {
  return value.replace(/^\/+|\/+$/g, '')
}

function createSourceFile(fileName, source) {
  const kind = /\.tsx?$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind)
}

// JsxElement tem `.openingElement`; JsxSelfClosingElement carrega tag/attributes
// diretamente. Estes helpers normalizam as duas formas do AST.
const isJsxTag = (node) => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)
function nodeTagName(node, sf) {
  return ts.isJsxElement(node) ? node.openingElement.tagName.getText(sf) : node.tagName.getText(sf)
}
function nodeAttributes(node) {
  return ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes
}
function nodeChildren(node) {
  return ts.isJsxElement(node) ? node.children : []
}
function nodeStart(node, sf) {
  return ts.isJsxElement(node) ? node.openingElement.getStart(sf) : node.getStart(sf)
}

/** Entradas `adopted: true` com width/clearance, lidas da metadata (determinístico). */
export function collectAdoptedMetadata(source) {
  const entries = []
  const entryPattern = /(?:^|[\n{,])[ \t]*(?:'([^']+)'|([A-Za-z0-9_-]+))\s*:\s*\{([^}]*)\}/g
  for (const match of source.matchAll(entryPattern)) {
    const key = match[1] ?? match[2]
    const block = match[3]
    if (!/\badopted:\s*true\b/.test(block)) continue
    entries.push({
      key,
      route: normalizeRoute(key),
      width: block.match(/\bwidth:\s*'([^']+)'/)?.[1] ?? null,
      bottomClearance: block.match(/\bbottomClearance:\s*'([^']+)'/)?.[1] ?? null,
    })
  }
  return entries
}

/** Tag→especifier a partir de lazy consts e imports do App.tsx. */
function collectBindings(sf) {
  const map = {}
  const visit = (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          const m = decl.initializer
            .getText(sf)
            .match(/lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)/)
          if (m) map[decl.name.text] = m[1]
        }
      }
    }
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.startsWith('@/')
    ) {
      const spec = node.moduleSpecifier.text
      const clause = node.importClause
      if (clause) {
        if (clause.name) map[clause.name.text] = spec
        const named = clause.namedBindings
        if (named && ts.isNamedImports(named)) {
          for (const el of named.elements) map[el.name.text] = spec
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return map
}

/** Caminhos candidatos (repo-relativos) para um especifier `@/...`. */
function candidatePaths(spec) {
  if (!spec.startsWith('@/')) return []
  const base = path.join('src', spec.slice(2))
  const candidates = []
  for (const ext of SOURCE_EXTENSIONS) candidates.push(`${base}${ext}`)
  for (const ext of SOURCE_EXTENSIONS) candidates.push(path.join(base, `index${ext}`))
  return candidates
}

/**
 * Segue um re-export de página em um nível.
 *
 * As rotas decompostas (ADR-0050) expõem `src/pages/X.tsx` como um re-export
 * puro: `export { Container, default } from '@/features/...'`. O canvas vive no
 * container, não no shim; sem este passo o gate acusaria `missing-canvas` em
 * páginas perfeitamente adotadas. Um nível é suficiente porque os shims nunca
 * empilham re-exports — a cadeia termina no container real.
 */
function resolvePageReExport(source, readFile) {
  const sf = createSourceFile('__reexport__.ts', source)
  for (const statement of sf.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue
    const specifier = statement.moduleSpecifier
    if (!ts.isStringLiteral(specifier) || !specifier.text.startsWith('@/')) continue
    const candidates = candidatePaths(specifier.text)
    const resolved = candidates.find((rel) => readFile(rel) !== null)
    if (resolved) return resolved
  }
  return null
}

/**
 * Segue um wrapper de página que delega a outro componente de página.
 *
 * Padrão do Padrão A da coorte C7: a raiz renderizada pela rota é um
 * componente fino que apenas delega — `OwnerStoresNetworkPage` retorna
 * `<NetworkDashboardPage scope="owner" />`. O canvas real vive no componente
 * delegado. Resolve o binding do tag renderizado (via imports do próprio
 * arquivo) e devolve o caminho do arquivo alvo, se existir.
 */
function resolvePageDelegate(source, fileName, readFile) {
  const sf = createSourceFile(fileName, source)
  const bindings = collectBindings(sf)
  const rendered = new Set()
  for (const statement of sf.statements) {
    let body = null
    if (ts.isFunctionDeclaration(statement)) body = statement.body
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          body = decl.initializer.body
        }
      }
    }
    if (body && ts.isBlock(body)) {
      const collectReturns = (n) => {
        if (ts.isReturnStatement(n) && n.expression) {
          extractRenderedTags(n.expression, sf, rendered)
          return
        }
        ts.forEachChild(n, collectReturns)
      }
      collectReturns(body)
    }
  }
  for (const tag of rendered) {
    if (CANVAS_TAGS.has(tag)) return null // raiz tem canvas próprio
    const spec = bindings[tag]
    if (!spec) continue
    const candidates = candidatePaths(spec)
    const resolved = candidates.find((rel) => readFile(rel) !== null)
    if (resolved) return resolved
  }
  return null
}

/** Tags realmente renderizadas, ignorando ForbiddenRoute/Navigate. */
function extractRenderedTags(node, sf, out = new Set()) {
  if (!node) return out
  if (ts.isParenthesizedExpression(node)) return extractRenderedTags(node.expression, sf, out)
  if (ts.isJsxFragment(node)) {
    for (const child of node.children) extractRenderedTags(child, sf, out)
    return out
  }
  if (ts.isJsxExpression(node)) return extractRenderedTags(node.expression, sf, out)
  if (isJsxTag(node)) {
    const name = nodeTagName(node, sf)
    if (SKIPPED_TAGS.has(name)) return out
    if (name === 'Suspense') {
      for (const child of nodeChildren(node)) extractRenderedTags(child, sf, out)
      return out
    }
    if (name === 'RoleSwitch') {
      for (const attr of nodeAttributes(node).properties) {
        if (ts.isJsxAttribute(attr) && attr.initializer) extractRenderedTags(attr.initializer, sf, out)
      }
      return out
    }
    out.add(name)
  }
  return out
}

/** Rota → tags renderizadas, a partir do App.tsx (AST). */
function collectRouteRenders(sf) {
  const renders = new Map()
  const isRouteTag = (node) => isJsxTag(node) && nodeTagName(node, sf) === 'Route'
  const visit = (node) => {
    if (isRouteTag(node)) {
      const attrs = nodeAttributes(node).properties
      const pathAttr = attrs.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === 'path')
      const elementAttr = attrs.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === 'element')
      if (pathAttr && elementAttr && ts.isStringLiteral(pathAttr.initializer)) {
        const route = normalizeRoute(pathAttr.initializer.text)
        const tags = extractRenderedTags(elementAttr.initializer, sf)
        renders.set(route, [...tags])
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return renders
}

/** Checa uma raiz renderizada contra a metadata. */
function inspectRootFile(source, fileName, meta, route) {
  const sf = createSourceFile(fileName, source)
  const violations = []
  let canvasCount = 0
  let rootHasCanvas = false

  const containsCanvas = (node) => {
    if (!node) return false
    if (isJsxTag(node) && CANVAS_TAGS.has(nodeTagName(node, sf))) return true
    let found = false
    ts.forEachChild(node, (child) => {
      if (!found && containsCanvas(child)) found = true
    })
    return found
  }

  /**
   * Lê a prop `width`/`bottomClearance` de um canvas.
   *
   * Além do literal, aceita o padrão canônico de largura dinâmica por rota:
   * `width={resolveRouteLayout(useLocation().pathname).width}` (idem para
   * `bottomClearance`). Esse é o único non-literal permitido — o componente
   * promete seguir a metadata da rota atual, então a validação é transferida
   * para o contrato de metadata (lint-route-layout). Qualquer outra expressão
   * permanece `non-literal` e viola o gate.
   */
  const propVal = (attrs, prop) => {
    const attr = attrs.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === prop)
    if (!attr?.initializer) return undefined
    if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text
    const exprText = attr.initializer.getText(sf)
    const fromMetadata = /resolveRouteLayout\s*\(/.test(exprText)
    if (prop === 'width' && fromMetadata && /\.width\s*$/.test(exprText)) return 'dynamic-metadata-width'
    if (prop === 'bottomClearance' && fromMetadata && /\.bottomClearance\s*$/.test(exprText)) return 'dynamic-metadata-clearance'
    return '<non-literal>'
  }

  const visit = (node) => {
    if (isJsxTag(node)) {
      const name = nodeTagName(node, sf)
      if (CANVAS_TAGS.has(name)) {
        canvasCount++
        const attrs = nodeAttributes(node).properties
        const width = propVal(attrs, 'width')
        const clearance = propVal(attrs, 'bottomClearance')
        const line = sf.getLineAndCharacterOfPosition(nodeStart(node, sf)).line + 1

        if (width === '<non-literal>' || clearance === '<non-literal>') {
          violations.push({ rule: 'non-literal-canvas-prop', route, file: fileName, line })
        }
        if (width === 'dynamic-metadata-width') {
          if (!meta.width) {
            violations.push({ rule: 'dynamic-width-without-metadata', route, file: fileName, line, detail: 'width dinâmico exige metadata com width explícito' })
          }
        } else if (width !== undefined && width !== '<non-literal>') {
          if (width !== meta.width) {
            violations.push({
              rule: 'width-mismatch',
              route,
              file: fileName,
              line,
              detail: `expected width="${meta.width}", found ${width ? `"${width}"` : '(default)'}`,
            })
          }
        }
        if (clearance === 'dynamic-metadata-clearance') {
          if (!meta.bottomClearance) {
            violations.push({ rule: 'dynamic-clearance-without-metadata', route, file: fileName, line, detail: 'bottomClearance dinâmico exige metadata com clearance explícito' })
          }
        } else if (clearance !== undefined && clearance !== '<non-literal>') {
          const expected = meta.bottomClearance ?? DEFAULT_CLEARANCE
          const effective = clearance ?? DEFAULT_CLEARANCE
          if (effective !== expected) {
            violations.push({
              rule: 'clearance-mismatch',
              route,
              file: fileName,
              line,
              detail: `expected bottomClearance="${expected}", found ${clearance ? `"${clearance}"` : '(default)'}`,
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  // O canvas precisa aparecer num return de componente de topo da página.
  const visitStatements = (statement) => {
    let body = null
    if (ts.isFunctionDeclaration(statement)) body = statement.body
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          body = decl.initializer.body
        }
      }
    }
    if (body && ts.isBlock(body)) {
      const collectReturns = (n) => {
        if (ts.isReturnStatement(n) && n.expression) {
          if (containsCanvas(n.expression)) rootHasCanvas = true
          return
        }
        ts.forEachChild(n, collectReturns)
      }
      collectReturns(body)
    }
  }
  for (const statement of sf.statements) visitStatements(statement)

  if (canvasCount === 0) {
    violations.push({ rule: 'missing-canvas', route, file: fileName, detail: 'raiz não usa PageCanvas/PageTemplate' })
  } else if (!rootHasCanvas) {
    violations.push({ rule: 'canvas-not-in-page-root', route, file: fileName, detail: 'canvas existe mas fora de um return de componente de topo' })
  }

  return violations
}

/**
 * Função pura (testável) do gate.
 *
 * @param {object} opts
 * @param {string} opts.appSource            fonte de src/App.tsx
 * @param {string} opts.metadataSource       fonte de routeLayoutMetadata.ts
 * @param {(rel: string) => string | null} opts.readFile  resolve 'src/...' → fonte (ou null)
 */
export function inspectAdoptedRouteCanvas({ appSource, metadataSource, readFile }) {
  const adopted = collectAdoptedMetadata(metadataSource)
  const appSf = createSourceFile('src/App.tsx', appSource)
  const bindings = collectBindings(appSf)
  const routeRenders = collectRouteRenders(appSf)
  const violations = []
  const checked = new Set()

  for (const meta of adopted) {
    if (!meta.width) {
      violations.push({ rule: 'invalid-metadata-width', route: meta.route, file: 'routeLayoutMetadata.ts' })
      continue
    }
    const tags = routeRenders.get(meta.route) ?? []
    if (tags.length === 0) {
      violations.push({
        rule: 'route-not-found-in-app',
        route: meta.route,
        file: 'src/App.tsx',
        detail: `nenhum <Route path="${meta.route}"> com elemento renderizado encontrado`,
      })
      continue
    }
    for (const tag of tags) {
      const spec = bindings[tag]
      if (!spec) {
        violations.push({
          rule: 'unresolved-root',
          route: meta.route,
          file: 'src/App.tsx',
          detail: `componente renderizado <${tag}> sem binding resolvível (lazy/import)`,
        })
        continue
      }
      const candidates = candidatePaths(spec)
      let resolved = candidates.find((rel) => readFile(rel) !== null)
      if (!resolved) {
        violations.push({
          rule: 'unresolved-root',
          route: meta.route,
          file: 'src/App.tsx',
          detail: `não resolveu o arquivo de "${spec}"`,
        })
        continue
      }
      // Segue re-exports puros (ADR-0050) e wrappers que delegam a outro
      // componente de página (Padrão A da coorte C7) até o arquivo que
      // realmente declara o canvas. Limite de profundidade para evitar loops.
      const visited = new Set([resolved])
      for (let hop = 0; hop < 4; hop += 1) {
        const currentSource = readFile(resolved)
        if (currentSource === null) break
        const reexportTarget = resolvePageReExport(currentSource, readFile)
        const delegateTarget = resolvePageDelegate(currentSource, resolved, readFile)
        const next = reexportTarget ?? delegateTarget
        if (!next || visited.has(next)) break
        visited.add(next)
        resolved = next
      }
      const key = `${resolved}:${meta.route}:${tag}`
      if (checked.has(key)) continue
      checked.add(key)
      const source = readFile(resolved)
      violations.push(...inspectRootFile(source, resolved, meta, meta.route))    }
  }

  return {
    gate: 'lint-adopted-route-canvas',
    pass: violations.length === 0,
    adoptedCount: adopted.length,
    violations,
  }
}

// ----------------------------------------------------------------- CLI (read-only)
const readFile = (rel) => {
  const abs = path.join(ROOT_DIR, rel)
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null
}

const JSON_MODE = process.argv.includes('--json')

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const result = inspectAdoptedRouteCanvas({
    appSource: fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf8'),
    metadataSource: fs.readFileSync(path.join(ROOT_DIR, 'src/design-system/page/routeLayoutMetadata.ts'), 'utf8'),
    readFile,
  })

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.pass) {
    console.log(`[lint-adopted-route-canvas] OK — ${result.adoptedCount} rotas adotadas com canvas compatível`)
  } else {
    console.error(`[lint-adopted-route-canvas] FALHA — ${result.violations.length} violação(ões) em ${result.adoptedCount} rota(s) adotada(s):`)
    for (const v of result.violations) {
      console.error(`  - [${v.rule}] rota ${v.route} · ${v.file}${v.line ? `:${v.line}` : ''}${v.detail ? ` — ${v.detail}` : ''}`)
    }
  }
  process.exit(result.pass ? 0 : 1)
}
