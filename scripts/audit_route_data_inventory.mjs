import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const appPath = resolve(root, 'src/App.tsx')
const accessPath = resolve(root, 'src/lib/auth/routeAccess.ts')

function attribute(node, name, sourceFile) {
  const property = node.attributes.properties.find(
    item => ts.isJsxAttribute(item) && item.name.text === name,
  )
  if (!property || !ts.isJsxAttribute(property) || !property.initializer) return null
  if (ts.isStringLiteral(property.initializer)) return property.initializer.text
  if (ts.isJsxExpression(property.initializer)) {
    return property.initializer.expression?.getText(sourceFile) || ''
  }
  return property.initializer.getText(sourceFile)
}

function routeTag(node) {
  if (ts.isJsxSelfClosingElement(node)) return node
  if (ts.isJsxElement(node)) return node.openingElement
  return null
}

function isRoute(node) {
  const tag = routeTag(node)
  return Boolean(tag && tag.tagName.getText() === 'Route')
}

function joinRoute(parent, child) {
  if (!child) return parent || '/'
  if (child.startsWith('/')) return child
  const base = parent === '/' ? '' : parent.replace(/\/$/, '')
  return `${base}/${child}` || '/'
}

function collectRoutes(source) {
  const sourceFile = ts.createSourceFile(appPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const routes = []

  function visit(node, parentPath = '', inheritedProtected = false) {
    if (isRoute(node)) {
      const tag = routeTag(node)
      const path = attribute(tag, 'path', sourceFile)
      const element = attribute(tag, 'element', sourceFile) || ''
      const index = tag.attributes.properties.some(
        item => ts.isJsxAttribute(item) && item.name.text === 'index',
      )
      const container = ts.isJsxElement(node) && node.children.some(child => isRoute(child))
      const fullPath = index ? (parentPath || '/') : joinRoute(parentPath, path)
      const protectedRoute = inheritedProtected || element.includes('<ProtectedRoute')
      // Only classify a route as a route-level redirect when the entire route
      // element is the redirect. A Navigate nested in RoleSwitch is a
      // role-specific outcome (for example /pdi for vendedor), not a reason
      // to discard the page renderings of the other roles from the matrix.
      const redirect = element.match(/^\s*<(?:Navigate|RedirectWithSearch)\s+to="([^"]+)"/)?.[1] || null
      const forbiddenRoles = [...element.matchAll(/(vendedor|gerente|dono|admin)=\{<ForbiddenRoute/g)]
        .map(match => match[1])

      if (path !== null || index) {
        routes.push({
          path: fullPath,
          kind: container ? 'container' : index ? 'index' : path === '*' ? 'fallback' : 'route',
          protected: protectedRoute,
          redirect,
          forbiddenRoles,
          element: element.replace(/\s+/g, ' ').slice(0, 180),
        })
      }

      if (ts.isJsxElement(node)) {
        for (const child of node.children) visit(child, fullPath, protectedRoute)
      }
      return
    }

    ts.forEachChild(node, child => visit(child, parentPath, inheritedProtected))
  }

  visit(sourceFile)
  return routes
}

function collectAccessRules(source) {
  const rules = []
  const regex = /\{\s*pattern:\s*'([^']+)'([^}]*)\}/g
  for (const match of source.matchAll(regex)) {
    rules.push({
      pattern: match[1],
      policy: match[2].replace(/\s+/g, ' ').replace(/^,\s*/, '').trim(),
    })
  }
  return rules
}

function matchesPattern(pathname, pattern) {
  const pathParts = pathname.split('?')[0].split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index]
    if (expected === '*') return true
    const actual = pathParts[index]
    if (!actual) return false
    if (expected.startsWith(':')) continue
    if (expected !== actual) return false
  }
  return pathParts.length === patternParts.length
}

function representativePath(path) {
  return path.replace(/:[^/]+/g, 'sample').replace(/\*$/, 'sample')
}

function walk(directory, files = []) {
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name)
    const info = statSync(path)
    if (info.isDirectory()) {
      if (!['node_modules', 'dist', 'test-results', 'output', 'base44-reference'].includes(name)) {
        walk(path, files)
      }
    } else if (/\.(?:ts|tsx|js|jsx)$/.test(name) && !/\.test\.|\.playwright\./.test(name)) {
      files.push(path)
    }
  }
  return files
}

function collectIntegrations() {
  const integrations = {
    table: new Map(),
    table_operation: new Map(),
    rpc: new Map(),
    edge_function: new Map(),
  }
  const patterns = [
    ['table', /\.from\(\s*['"`]([^'"`]+)['"`]\s*\)/g],
    ['rpc', /\.rpc\(\s*['"`]([^'"`]+)['"`]\s*[,)]/g],
    ['edge_function', /functions\.invoke(?:<[^>]+>)?\(\s*['"`]([^'"`]+)['"`]\s*[,)]/g],
  ]

  for (const file of walk(resolve(root, 'src'))) {
    const source = readFileSync(file, 'utf8')
    const display = relative(root, file)
    for (const [kind, regex] of patterns) {
      for (const match of source.matchAll(regex)) {
        const files = integrations[kind].get(match[1]) || new Set()
        files.add(display)
        integrations[kind].set(match[1], files)
      }
    }

    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'from' &&
        node.arguments.length === 1 &&
        (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
      ) {
        const table = node.arguments[0].text
        const operations = new Set()
        let cursor = node
        while (cursor.parent) {
          const parent = cursor.parent
          if (ts.isPropertyAccessExpression(parent) && parent.expression === cursor) {
            if (['select', 'insert', 'update', 'upsert', 'delete'].includes(parent.name.text)) {
              operations.add(parent.name.text)
            }
            cursor = parent
            continue
          }
          if (
            (ts.isCallExpression(parent) && parent.expression === cursor) ||
            ts.isAwaitExpression(parent) ||
            ts.isParenthesizedExpression(parent)
          ) {
            cursor = parent
            continue
          }
          break
        }

        for (const operation of operations) {
          const key = `${table}:${operation}`
          const files = integrations.table_operation.get(key) || new Set()
          files.add(display)
          integrations.table_operation.set(key, files)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }
  return integrations
}

function escapeCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
}

const routes = collectRoutes(readFileSync(appPath, 'utf8'))
const accessRules = collectAccessRules(readFileSync(accessPath, 'utf8'))
const integrations = collectIntegrations()
const inventory = routes.map(route => {
  const rule = route.protected
    ? accessRules.find(candidate => matchesPattern(representativePath(route.path), candidate.pattern))
    : null
  return { ...route, rule }
})

const ungoverned = inventory.filter(
  route => route.protected && route.kind !== 'container' && route.kind !== 'fallback' && !route.redirect && !route.rule,
)
const duplicatePaths = [...new Set(
  inventory
    .filter(route => route.kind !== 'container')
    .map(route => route.path)
    .filter((path, index, all) => all.indexOf(path) !== index),
)]

if (process.argv.includes('--json')) {
  const serialiseIntegrations = kind => Object.fromEntries(
    [...integrations[kind].entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, files]) => [name, [...files].sort()]),
  )

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    routes: inventory,
    counts: {
      total: inventory.length,
      protected: inventory.filter(route => route.protected).length,
      public: inventory.filter(route => !route.protected).length,
      ungoverned: ungoverned.length,
      duplicatePaths: duplicatePaths.length,
      tables: integrations.table.size,
      rpcs: integrations.rpc.size,
      edgeFunctions: integrations.edge_function.size,
      tableOperations: integrations.table_operation.size,
    },
    integrations: {
      tables: serialiseIntegrations('table'),
      tableOperations: serialiseIntegrations('table_operation'),
      rpcs: serialiseIntegrations('rpc'),
      edgeFunctions: serialiseIntegrations('edge_function'),
    },
    ungoverned: ungoverned.map(route => route.path),
    duplicatePaths,
  }, null, 2))

  if (process.argv.includes('--check') && (ungoverned.length || duplicatePaths.length)) {
    process.exitCode = 1
  }
  process.exit()
}

console.log('# Matriz reproduzível de rotas, autorização e dados')
console.log('')
console.log(`- Rotas declaradas em \`src/App.tsx\`: **${inventory.length}**`)
console.log(`- Rotas protegidas: **${inventory.filter(route => route.protected).length}**`)
console.log(`- Rotas públicas: **${inventory.filter(route => !route.protected).length}**`)
console.log(`- Rotas protegidas sem regra canônica e sem redirect: **${ungoverned.length}**`)
console.log(`- Caminhos declarados mais de uma vez: **${duplicatePaths.length}**`)
console.log(`- Tabelas referenciadas pelo runtime: **${integrations.table.size}**`)
console.log(`- RPCs referenciadas pelo runtime: **${integrations.rpc.size}**`)
console.log(`- Edge Functions invocadas pelo runtime: **${integrations.edge_function.size}**`)
console.log(`- Pares tabela/operação encontrados: **${integrations.table_operation.size}**`)
console.log('')
console.log('## Rotas')
console.log('')
console.log('| Caminho | Tipo | Superfície | Redirect | Regra canônica | RoleSwitch negado | Elemento |')
console.log('|---|---|---|---|---|---|---|')
for (const route of inventory) {
  const rule = route.rule
    ? `\`${escapeCell(route.rule.pattern)}\``
    : route.protected && !['container', 'fallback'].includes(route.kind)
      ? '**AUSENTE**'
      : 'n/a'
  console.log(`| \`${escapeCell(route.path)}\` | ${route.kind} | ${route.protected ? 'protegida' : 'pública'} | ${route.redirect ? `\`${escapeCell(route.redirect)}\`` : '—'} | ${rule} | ${route.forbiddenRoles.join(', ') || '—'} | \`${escapeCell(route.element || '(grupo)')}\` |`)
}

for (const [kind, title] of [
  ['table', 'Tabelas'],
  ['table_operation', 'Operações por tabela'],
  ['rpc', 'RPCs'],
  ['edge_function', 'Edge Functions'],
]) {
  console.log('')
  console.log(`## ${title}`)
  console.log('')
  console.log('| Recurso | Arquivos consumidores |')
  console.log('|---|---:|')
  for (const [name, files] of [...integrations[kind].entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`| \`${escapeCell(name)}\` | ${files.size} |`)
  }
}

if (ungoverned.length || duplicatePaths.length) {
  console.error(JSON.stringify({
    ungoverned: ungoverned.map(route => route.path),
    duplicatePaths,
  }))
}

if (process.argv.includes('--check') && ungoverned.length) process.exitCode = 1
