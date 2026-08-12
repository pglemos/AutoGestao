import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { canAccessPath } from '@/lib/auth/routeAccess'
import type { UserRole } from '@/types/database'

type InventoryRoute = {
  path: string
  kind: 'route' | 'index' | 'container' | 'fallback'
  protected: boolean
  redirect: string | null
  forbiddenRoles: string[]
  element: string
  rule: { pattern: string; policy: string } | null
}

type Inventory = {
  generatedAt: string
  routes: InventoryRoute[]
  counts: Record<string, number>
}

const ROOT = process.cwd()
const OUTPUT_DIR = resolve(ROOT, 'artifacts/route-role-inventory')
const roles = [
  'administrador_geral',
  'administrador_mx',
  'consultor_mx',
  'dono',
  'gerente',
  'vendedor',
] as const satisfies readonly UserRole[]

const auditOutput = execFileSync('node', ['scripts/audit_route_data_inventory.mjs', '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
})
const inventory = JSON.parse(auditOutput) as Inventory

function representativePath(pathname: string) {
  return pathname.replace(/:[^/]+/g, 'sample').replace(/\*$/, 'sample')
}

function isDirectAlias(route: InventoryRoute) {
  if (route.path === '/dono/*') return false
  return /^\s*<[A-Za-z][A-Za-z0-9]*Redirect\b/.test(route.element)
}

function roleRedirectTarget(route: InventoryRoute, role: UserRole) {
  const roleKey = ['administrador_geral', 'administrador_mx', 'consultor_mx'].includes(role)
    ? 'admin'
    : role
  const match = route.element.match(
    new RegExp(`${roleKey}=\\{<(?:Navigate|RedirectWithSearch)\\s+to="([^"]+)"`),
  )
  return match?.[1] ?? null
}

function surfaceFor(route: InventoryRoute) {
  if (route.path === '/dono/*') return 'FULLSCREEN'
  // Link de aprovação ocupa o viewport inteiro e não participa do shell/canvas
  // padrão. Mantê-lo explicitamente fora da matriz STANDARD_CANVAS evita
  // mascarar uma exceção de produto como falha geométrica.
  if (route.path === '/liberacao-fechamento') return 'FULLSCREEN'
  if (!route.protected) return 'AUTH_LEGAL_PUBLIC'
  if (route.kind === 'fallback') return 'CATCHALL'
  if (route.redirect || isDirectAlias(route)) return 'REDIRECT'
  if (route.path.includes('/print')) return 'PRINT'
  if (route.path === '/simulacao' || route.path.startsWith('/simulacao/')) return 'FULLSCREEN'
  return 'STANDARD_CANVAS'
}

function statusFor(route: InventoryRoute, role: UserRole) {
  const surface = surfaceFor(route)
  if (!route.protected) return 'PUBLIC'
  if (route.kind === 'container') return 'CONTAINER'
  if (route.kind === 'fallback') return 'CATCHALL'
  if (route.redirect || isDirectAlias(route) || roleRedirectTarget(route, role)) {
    return canAccessPath(representativePath(route.path), role) ? 'REDIRECT_ALLOWED' : 'REDIRECT_BLOCKED'
  }
  if (!route.rule) return 'NO_RULE'
  return canAccessPath(representativePath(route.path), role) ? `RENDER_${surface}` : 'FORBIDDEN'
}

const rows = inventory.routes.map(route => {
  const surface = surfaceFor(route)
  const roleStatus = Object.fromEntries(roles.map(role => [role, statusFor(route, role)])) as Record<UserRole, string>
  const renderRoles = roles.filter(role => roleStatus[role].startsWith('RENDER_'))
  return {
    path: route.path,
    kind: route.kind,
    surface,
    rulePattern: route.rule?.pattern ?? null,
    redirect: route.redirect,
    renderRoles,
    roleStatus,
    applicable: surface !== 'AUTH_LEGAL_PUBLIC' && surface !== 'CATCHALL' && surface !== 'REDIRECT' && route.kind !== 'container',
    element: route.element,
  }
})

const routeRoleRows = rows.flatMap(row => row.renderRoles.map(role => ({
  path: row.path,
  role,
  surface: row.surface,
  kind: row.kind,
  element: row.element,
})))

const summary = {
  routesTotal: rows.length,
  routesProtected: inventory.counts.protected,
  routesPublic: inventory.counts.public,
  routeRoleTotal: routeRoleRows.length,
  standardCanvasTotal: rows.filter(row => row.surface === 'STANDARD_CANVAS').length,
  standardCanvasRenderings: routeRoleRows.filter(row => row.surface === 'STANDARD_CANVAS').length,
  redirectTotal: rows.filter(row => row.surface === 'REDIRECT').length,
  fullscreenTotal: rows.filter(row => row.surface === 'FULLSCREEN').length,
  printTotal: rows.filter(row => row.surface === 'PRINT').length,
  ungoverned: inventory.counts.ungoverned,
  duplicatePaths: inventory.counts.duplicatePaths,
}

const artifact = {
  generatedAt: new Date().toISOString(),
  source: 'scripts/audit_route_data_inventory.mjs + src/lib/auth/routeAccess.ts',
  roles,
  summary,
  rows,
  routeRoleRows,
}

mkdirSync(OUTPUT_DIR, { recursive: true })
writeFileSync(resolve(OUTPUT_DIR, 'route-role-matrix.json'), `${JSON.stringify(artifact, null, 2)}\n`)

const csvRows = [
  ['path', 'role', 'surface', 'kind', 'element'],
  ...routeRoleRows.map(row => [row.path, row.role, row.surface, row.kind, row.element]),
]
const csv = csvRows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n'
writeFileSync(resolve(OUTPUT_DIR, 'route-role-matrix.csv'), csv)

const statusCounts = Object.fromEntries(
  roles.map(role => [role, Object.fromEntries(
    [...new Set(rows.flatMap(row => Object.values(row.roleStatus)))].sort().map(status => [status, rows.filter(row => row.roleStatus[role] === status).length]),
  )]),
)
const markdown = [
  '# MX Foundation Zero — Matriz atual route × role',
  '',
  `Gerado em ${artifact.generatedAt} a partir do inventário AST vivo e de ROUTE_ACCESS_RULES.`,
  '',
  '## Denominadores',
  '',
  ...Object.entries(summary).map(([key, value]) => `- **${key}:** ${value}`),
  '',
  '## Renderizações aplicáveis',
  '',
  '| Rota | Perfil | Superfície | Tipo | Elemento |',
  '|---|---|---|---|---|',
  ...routeRoleRows.map(row => `| \`${row.path}\` | ${row.role} | ${row.surface} | ${row.kind} | ${row.element.replaceAll('|', '\\|')} |`),
  '',
  '## Status por rota',
  '',
  '| Rota | Superfície | Padrão de acesso | ' + roles.join(' | ') + ' |',
  '|---|---|---|' + roles.map(() => '---').join('|') + '|',
  ...rows.map(row => `| \`${row.path}\` | ${row.surface} | ${row.rulePattern ? `\`${row.rulePattern}\`` : '—'} | ${roles.map(role => row.roleStatus[role]).join(' | ')} |`),
  '',
  '## Totais de status',
  '',
  ...roles.map(role => `- **${role}:** ${JSON.stringify(statusCounts[role])}`),
  '',
].join('\n')
writeFileSync(resolve(OUTPUT_DIR, 'route-role-matrix.md'), markdown)

console.log(JSON.stringify({ outputDir: OUTPUT_DIR, summary }, null, 2))
