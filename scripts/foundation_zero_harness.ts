import 'dotenv/config'

import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page, type Request } from 'playwright'

type FoundationRole =
  | 'administrador_geral'
  | 'administrador_mx'
  | 'consultor_mx'
  | 'dono'
  | 'gerente'
  | 'vendedor'

type Surface = 'STANDARD_CANVAS' | 'REDIRECT' | 'FULLSCREEN' | 'AUTH_LEGAL_PUBLIC' | 'PRINT'

type RouteRoleRow = {
  path: string
  role: FoundationRole
  surface: Surface
  kind: string
  element: string
}

type Matrix = {
  generatedAt: string
  roles: FoundationRole[]
  summary: {
    routesTotal: number
    routeRoleTotal: number
    standardCanvasTotal: number
    standardCanvasRenderings: number
    [key: string]: number
  }
  routeRoleRows: RouteRoleRow[]
}

type ViewportCase = {
  key: string
  width: number
  height: number
  zoom?: number
  reducedMotion?: boolean
  safeArea?: { left: number; right: number; bottom: number }
  orientation?: 'portrait' | 'landscape'
}

type RuntimeMessage = {
  type: string
  text: string
  location?: string
}

type NetworkFailure = {
  kind: 'requestfailed' | 'http'
  method: string
  url: string
  status?: number
  failure?: string
  resourceType?: string
}

type AxeResult = {
  violations: Array<{ id?: string; impact?: string | null; nodes?: unknown[] }>
  incomplete: unknown[]
  passes: unknown[]
  error?: string
}

type DomMetrics = {
  viewport: ViewportCase & { devicePixelRatio: number }
  finalUrl: string
  mainCount: number
  pageCanvasCount: number
  pageViewportCount: number
  pageScrollOwnerCount: number
  horizontalOverflow: boolean
  bodyHeight: number
  documentScrollHeight: number
  canvas: {
    present: boolean
    left: number
    rightGap: number
    paddingLeft: number
    paddingRight: number
    paddingTop: number
    paddingBottom: number
    maxWidth: number | null
    widthToken: string | null
    clearanceToken: string | null
  }
  header: {
    present: boolean
    height: number
  }
  shell: {
    role: string | null
    density: string | null
  }
}

type CaseState = {
  runId: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  role: FoundationRole
  requestedRole: FoundationRole
  routeTemplate: string
  route: string
  viewport: ViewportCase
  surface: Surface
  kind: string
  startedAt: string
  finishedAt: string
  finalUrl?: string
  observedRole?: string | null
  checks: {
    authenticated: boolean
    mainCount: number | null
    pageCanvasCount: number | null
    pageViewportCount: number | null
    pageScrollOwnerCount: number | null
    horizontalOverflow: boolean | null
    criticalA11yViolations: number | null
    seriousA11yViolations: number | null
    consoleErrors: number
    pageErrors: number
    failedRequests: number
    httpErrors: number
  }
  classification: {
    geometry: 'PASS' | 'FAIL' | 'NOT_CAPTURED'
    runtime: 'PASS' | 'FAIL' | 'NOT_CAPTURED'
    accessibility: 'PASS' | 'FAIL' | 'NOT_CAPTURED'
  }
  notes: string[]
  error?: string
}

const require = createRequire(import.meta.url)
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'))

function readFileSync(path: string): string {
  // createRequire is intentionally used only for the stable axe asset path;
  // this synchronous read keeps the script's page probe setup deterministic.
  return require('node:fs').readFileSync(path, 'utf8') as string
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_MATRIX = join(ROOT, 'artifacts/route-role-inventory/route-role-matrix.json')
const DEFAULT_OUTPUT = join(ROOT, 'artifacts/foundation-zero')

const VIEWPORTS: ViewportCase[] = [
  { key: '320x568', width: 320, height: 568, orientation: 'portrait' },
  { key: '360x800', width: 360, height: 800, orientation: 'portrait' },
  { key: '390x844', width: 390, height: 844, orientation: 'portrait' },
  { key: '412x915', width: 412, height: 915, orientation: 'portrait' },
  { key: '599x900', width: 599, height: 900, orientation: 'portrait' },
  { key: '600x900', width: 600, height: 900, orientation: 'portrait' },
  { key: '639x900', width: 639, height: 900, orientation: 'portrait' },
  { key: '640x900', width: 640, height: 900, orientation: 'portrait' },
  { key: '768x1024', width: 768, height: 1024, orientation: 'portrait' },
  { key: '839x1024', width: 839, height: 1024, orientation: 'portrait' },
  { key: '840x1024', width: 840, height: 1024, orientation: 'portrait' },
  { key: '1023x768', width: 1023, height: 768, orientation: 'landscape' },
  { key: '1024x768', width: 1024, height: 768, orientation: 'landscape' },
  { key: '1199x900', width: 1199, height: 900, orientation: 'landscape' },
  { key: '1200x900', width: 1200, height: 900, orientation: 'landscape' },
  { key: '1279x900', width: 1279, height: 900, orientation: 'landscape' },
  { key: '1280x800', width: 1280, height: 800, orientation: 'landscape' },
  { key: '1440x900', width: 1440, height: 900, orientation: 'landscape' },
  { key: '1599x1000', width: 1599, height: 1000, orientation: 'landscape' },
  { key: '1600x1000', width: 1600, height: 1000, orientation: 'landscape' },
  { key: '1920x1080', width: 1920, height: 1080, orientation: 'landscape' },
  { key: 'zoom-200', width: 390, height: 844, zoom: 2, orientation: 'portrait' },
  { key: 'reduced-motion', width: 390, height: 844, reducedMotion: true, orientation: 'portrait' },
  {
    key: 'safe-area-mobile',
    width: 390,
    height: 844,
    safeArea: { left: 24, right: 24, bottom: 18 },
    orientation: 'portrait',
  },
  { key: 'tablet-landscape', width: 1024, height: 768, orientation: 'landscape' },
]

const ROLE_ORDER: FoundationRole[] = [
  'administrador_geral',
  'administrador_mx',
  'consultor_mx',
  'dono',
  'gerente',
  'vendedor',
]

const DEFAULT_ROLE_EMAILS: Partial<Record<FoundationRole, string>> = {
  administrador_geral: 'synvollt@gmail.com',
  dono: 'dono@mxgestaopreditiva.com.br',
  gerente: 'gerente@mxgestaopreditiva.com.br',
  vendedor: 'vendedor@mxgestaopreditiva.com.br',
}

const ROLE_ENV_EMAILS: Record<FoundationRole, string | undefined> = {
  administrador_geral: process.env.E2E_ADMIN_EMAIL,
  administrador_mx: process.env.E2E_ADMIN_MX_EMAIL,
  consultor_mx: process.env.E2E_CONSULTANT_EMAIL,
  dono: process.env.E2E_OWNER_EMAIL,
  gerente: process.env.E2E_MANAGER_EMAIL,
  vendedor: process.env.E2E_SELLER_EMAIL,
}

const ROLE_PASSWORD = process.env.E2E_ROLE_PASSWORD || process.env.E2E_AUTH_PASSWORD

function parseArgs(argv: string[]) {
  const result: Record<string, string | boolean> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) continue
    const [rawKey, inlineValue] = value.slice(2).split('=', 2)
    if (inlineValue !== undefined) result[rawKey] = inlineValue
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) result[rawKey] = argv[++index]
    else result[rawKey] = true
  }
  return result
}

function csv(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== 'string') return undefined
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function safeSlug(value: string): string {
  return value
    .replace(/:[^/]+/g, 'param')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'root'
}

function routeWithRealParameters(routeTemplate: string, args: Record<string, string | boolean>): string {
  const storeSlug = typeof args['store-slug'] === 'string'
    ? args['store-slug']
    : process.env.E2E_STORE_SLUG || 'mx-consultoria'
  const clientSlug = typeof args['client-slug'] === 'string'
    ? args['client-slug']
    : process.env.E2E_CLIENT_SLUG || 'sample'
  const visitNumber = typeof args['visit-number'] === 'string'
    ? args['visit-number']
    : process.env.E2E_VISIT_NUMBER || '1'
  const simulationRole = process.env.E2E_SIMULATION_ROLE || 'dono'

  return routeTemplate
    .replaceAll(':storeSlug', storeSlug)
    .replaceAll(':clientSlug', clientSlug)
    .replaceAll(':visitNumber', visitNumber)
    .replaceAll(':simulationRole', simulationRole)
    .replaceAll(':id', process.env.E2E_PDI_ID || 'sample')
    .replace(/\/\*$/, '')
}

function redactUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    for (const key of [...url.searchParams.keys()]) {
      if (/token|key|secret|password|authorization|code|challenge/i.test(key)) url.searchParams.set(key, '<REDACTED>')
    }
    return url.toString()
  } catch {
    return '<INVALID_URL>'
  }
}

function redactError(value: unknown): string {
  return String(value)
    .replace(/(Bearer\s+)[^\s]+/gi, '$1<REDACTED>')
    .replace(/(access_token|refresh_token|token|password|secret|apikey)=([^&\s]+)/gi, '$1=<REDACTED>')
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writePlaceholderState(path: string, state: CaseState) {
  await writeJson(join(path, 'state.json'), state)
}

function expectedPageMargin(width: number): number {
  if (width >= 840) return 32
  if (width >= 600) return 24
  return 16
}

async function prepareViewport(page: Page, viewport: ViewportCase) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  if (viewport.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
}

async function applyViewportSimulation(page: Page, viewport: ViewportCase) {
  if (viewport.zoom) {
    await page.evaluate((zoom) => {
      document.documentElement.style.zoom = String(zoom)
    }, viewport.zoom)
  }
  if (viewport.safeArea) {
    await page.addStyleTag({
      content: `
        :root { --foundation-zero-safe-left: ${viewport.safeArea.left}px; --foundation-zero-safe-right: ${viewport.safeArea.right}px; --foundation-zero-safe-bottom: ${viewport.safeArea.bottom}px; }
        [data-mx-page-canvas] { padding-inline-start: max(var(--mx-page-margin), var(--foundation-zero-safe-left)) !important; padding-inline-end: max(var(--mx-page-margin), var(--foundation-zero-safe-right)) !important; padding-bottom: calc(var(--mx-page-padding-bottom) + var(--mx-page-bottom-clearance) + var(--foundation-zero-safe-bottom)) !important; }
      `,
    })
  }
}

async function collectDomMetrics(page: Page, viewport: ViewportCase): Promise<DomMetrics> {
  return page.evaluate((viewportData) => {
    const canvas = document.querySelector<HTMLElement>('[data-mx-page-canvas]')
    const pageViewport = document.querySelector<HTMLElement>('[data-mx-page-viewport]')
    const main = document.querySelector<HTMLElement>('#main-content')
    const pageCandidates = [
      ...(pageViewport ? [pageViewport, ...Array.from(pageViewport.querySelectorAll<HTMLElement>('*'))] : []),
      document.documentElement,
      document.body,
    ].filter((element, index, all) => element && all.indexOf(element) === index)
    const pageScrollOwnerCount = pageCandidates.filter((element) => {
      const overflowY = getComputedStyle(element).overflowY
      if (overflowY !== 'auto' && overflowY !== 'scroll') return false
      // The canonical viewport is an explicit owner even when the current
      // route is shorter than the viewport. Descendants count only when they
      // actually clip overflowing content, which avoids false positives from
      // generic `overflow-y-auto` utility classes.
      return element === pageViewport || element.scrollHeight > element.clientHeight + 1
    }).length
    const style = canvas ? getComputedStyle(canvas) : null
    const rect = canvas?.getBoundingClientRect()
    const header = document.querySelector<HTMLElement>('[data-mx-mobile-header], [data-mx-page-heading], [data-mx-module-header], header')
    const rootStyle = getComputedStyle(document.documentElement)
    const maxWidth = style?.maxWidth && style.maxWidth !== 'none' ? Number.parseFloat(style.maxWidth) : null
    return {
      viewport: { ...viewportData, devicePixelRatio: window.devicePixelRatio },
      finalUrl: window.location.href,
      mainCount: document.querySelectorAll('#main-content').length,
      pageCanvasCount: document.querySelectorAll('[data-mx-page-canvas]').length,
      pageViewportCount: document.querySelectorAll('[data-mx-page-viewport]').length,
      pageScrollOwnerCount,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      bodyHeight: document.body.getBoundingClientRect().height,
      documentScrollHeight: document.documentElement.scrollHeight,
      canvas: {
        present: Boolean(canvas),
        left: Math.round(rect?.left ?? 0),
        rightGap: Math.round(window.innerWidth - (rect?.right ?? 0)),
        paddingLeft: Math.round(Number.parseFloat(style?.paddingLeft || '0')),
        paddingRight: Math.round(Number.parseFloat(style?.paddingRight || '0')),
        paddingTop: Math.round(Number.parseFloat(style?.paddingTop || '0')),
        paddingBottom: Math.round(Number.parseFloat(style?.paddingBottom || '0')),
        maxWidth,
        widthToken: canvas?.dataset.mxPageWidth || null,
        clearanceToken: canvas?.dataset.mxPageClearance || null,
      },
      header: {
        present: Boolean(header),
        height: Math.round(header?.getBoundingClientRect().height ?? 0),
      },
      shell: {
        role: document.querySelector<HTMLElement>('.mx-ds')?.dataset.mxRole || null,
        density: document.querySelector<HTMLElement>('.mx-ds')?.dataset.mxDensity || null,
      },
      // Read the canonical token so the artifact records the source of the
      // expected gutter without exposing application data.
      tokenMargin: rootStyle.getPropertyValue('--mx-page-margin').trim(),
    } as DomMetrics
  }, viewport)
}

async function collectA11y(page: Page): Promise<AxeResult> {
  try {
    if (!await page.evaluate(() => Boolean((window as unknown as { axe?: unknown }).axe))) {
      await page.addScriptTag({ content: AXE_SOURCE })
    }
    return await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: unknown[]; incomplete: unknown[]; passes: unknown[] }> } }).axe
      const result = await axe.run(
        document,
        { resultTypes: ['violations', 'incomplete', 'passes'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } },
      )
      return result as AxeResult
    })
  } catch (error) {
    return { violations: [], incomplete: [], passes: [], error: redactError(error) }
  }
}

function a11yCounts(a11y: { violations?: Array<{ impact?: string | null }> }) {
  const violations = a11y.violations || []
  return {
    critical: violations.filter(item => item.impact === 'critical').length,
    serious: violations.filter(item => item.impact === 'serious').length,
  }
}

function isExpectedTransportFailure(failure: NetworkFailure): boolean {
  return failure.kind === 'requestfailed' && /ERR_ABORTED/i.test(failure.failure || '')
}

function roleEmail(role: FoundationRole): string | undefined {
  return ROLE_ENV_EMAILS[role] || DEFAULT_ROLE_EMAILS[role]
}

async function authenticate(page: Page, role: FoundationRole) {
  const email = roleEmail(role)
  if (!email || !ROLE_PASSWORD) return { ok: false, reason: `credencial ausente para ${role}` }
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', ROLE_PASSWORD)
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 45_000 })
    await page.locator('#main-content, [data-mx-page-canvas], [data-mx-role]').first().waitFor({ state: 'attached', timeout: 30_000 })
    return { ok: true, reason: undefined }
  } catch (error) {
    return { ok: false, reason: redactError(error) }
  }
}

function routeRows(matrix: Matrix, roles: FoundationRole[], routeFilter?: string[]): RouteRoleRow[] {
  return matrix.routeRoleRows.filter((row) => {
    if (row.surface !== 'STANDARD_CANVAS') return false
    if (!roles.includes(row.role)) return false
    if (routeFilter?.length && !routeFilter.includes(row.path)) return false
    return true
  })
}

function selectedViewports(args: Record<string, string | boolean>): ViewportCase[] {
  const filters = csv(args.viewport)
  if (!filters?.length || filters.includes('all')) return VIEWPORTS
  const selected = VIEWPORTS.filter(viewport => filters.includes(viewport.key))
  if (!selected.length) throw new Error(`Nenhum viewport conhecido em --viewport=${filters.join(',')}`)
  return selected
}

function selectedRoles(args: Record<string, string | boolean>): FoundationRole[] {
  const filters = csv(args.role)
  if (!filters?.length || filters.includes('all')) return ROLE_ORDER
  const invalid = filters.filter(role => !ROLE_ORDER.includes(role as FoundationRole))
  if (invalid.length) throw new Error(`Perfil desconhecido: ${invalid.join(', ')}`)
  return filters as FoundationRole[]
}

async function captureCase(
  context: BrowserContext,
  row: RouteRoleRow,
  viewport: ViewportCase,
  baseUrl: string,
  outputRoot: string,
  runId: string,
  args: Record<string, string | boolean>,
) {
  const startedAt = new Date().toISOString()
  const route = routeWithRealParameters(row.path, args)
  const caseDir = join(outputRoot, row.role, safeSlug(row.path), viewport.key)
  const notes: string[] = []
  const stateBase: CaseState = {
    runId,
    status: 'FAIL',
    role: row.role,
    requestedRole: row.role,
    routeTemplate: row.path,
    route,
    viewport,
    surface: row.surface,
    kind: row.kind,
    startedAt,
    finishedAt: startedAt,
    checks: {
      authenticated: true,
      mainCount: null,
      pageCanvasCount: null,
      pageViewportCount: null,
      pageScrollOwnerCount: null,
      horizontalOverflow: null,
      criticalA11yViolations: null,
      seriousA11yViolations: null,
      consoleErrors: 0,
      pageErrors: 0,
      failedRequests: 0,
      httpErrors: 0,
    },
    classification: { geometry: 'NOT_CAPTURED', runtime: 'NOT_CAPTURED', accessibility: 'NOT_CAPTURED' },
    notes,
  }
  const page = await context.newPage()
  const consoleMessages: RuntimeMessage[] = []
  const pageErrors: RuntimeMessage[] = []
  const networkFailures: NetworkFailure[] = []

  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({ type: message.type(), text: redactError(message.text()), location: message.location().url })
    }
  })
  page.on('pageerror', error => pageErrors.push({ type: 'pageerror', text: redactError(error.message) }))
  page.on('requestfailed', request => {
    networkFailures.push({
      kind: 'requestfailed',
      method: request.method(),
      url: redactUrl(request.url()),
      failure: redactError(request.failure()?.errorText || 'unknown'),
      resourceType: request.resourceType(),
    })
  })
  page.on('response', response => {
    if (response.status() >= 400) {
      networkFailures.push({
        kind: 'http',
        method: response.request().method(),
        url: redactUrl(response.url()),
        status: response.status(),
        resourceType: response.request().resourceType(),
      })
    }
  })

  try {
    await prepareViewport(page, viewport)
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    try {
      await page.locator('#main-content, [data-mx-page-canvas], [data-mx-role]').first().waitFor({ state: 'attached', timeout: 30_000 })
    } catch {
      notes.push('Nenhum landmark/shell apareceu dentro de 30s após a navegação.')
    }
    try {
      // `#main-content` belongs to the shell and mounts before lazy route
      // modules. STANDARD_CANVAS needs one more explicit synchronization point
      // so that a Suspense fallback cannot be recorded as a geometry failure.
      await page.locator('[data-mx-page-canvas]').first().waitFor({ state: 'attached', timeout: 30_000 })
    } catch {
      notes.push('PageCanvas canônico não apareceu dentro de 30s após a navegação.')
    }
    await page.waitForTimeout(1_000)
    const nativeMetrics = await collectDomMetrics(page, viewport)
    await applyViewportSimulation(page, viewport)
    await page.waitForTimeout(250)
    if (response?.status() && response.status() >= 500) notes.push(`HTTP inicial ${response.status()}`)

    const metrics = await collectDomMetrics(page, viewport)
    const a11y = await collectA11y(page)
    const counts = a11yCounts(a11y)
    const expectedMargin = expectedPageMargin(viewport.width)
    const safeAreaPass = !viewport.safeArea || (
      metrics.canvas.paddingLeft >= Math.max(expectedMargin, viewport.safeArea.left) &&
      metrics.canvas.paddingRight >= Math.max(expectedMargin, viewport.safeArea.right) &&
      metrics.canvas.paddingBottom >= viewport.safeArea.bottom
    )
    const geometryPass = nativeMetrics.mainCount === 1 &&
      nativeMetrics.pageCanvasCount === 1 &&
      nativeMetrics.pageViewportCount === 1 &&
      nativeMetrics.pageScrollOwnerCount === 1 &&
      nativeMetrics.canvas.paddingLeft >= expectedMargin &&
      nativeMetrics.canvas.paddingRight >= expectedMargin &&
      nativeMetrics.canvas.paddingTop >= 24 &&
      !nativeMetrics.horizontalOverflow &&
      safeAreaPass
    const roleMatches = nativeMetrics.shell.role === row.role
    const unexpectedNetworkFailures = networkFailures.filter(item => !isExpectedTransportFailure(item))
    const runtimePass = consoleMessages.filter(item => item.type === 'error').length === 0 &&
      pageErrors.length === 0 &&
      unexpectedNetworkFailures.length === 0 &&
      !page.url().includes('/login') &&
      roleMatches
    const accessibilityPass = counts.critical === 0 && counts.serious === 0 && !('error' in a11y)
    const status: CaseState['status'] = geometryPass && runtimePass && accessibilityPass ? 'PASS' : 'FAIL'

    if (route.includes('sample')) notes.push('Parâmetro dinâmico fallback=sample; configure E2E_CLIENT_SLUG para prova de dados reais.')
    if (viewport.zoom) notes.push('Zoom 200% simulado via documentElement.style.zoom=2.')
    if (viewport.reducedMotion) notes.push('prefers-reduced-motion=reduce aplicado pelo contexto Playwright.')
    if (viewport.safeArea) notes.push('Safe area simulada por override CSS testável, sem alterar o runtime da aplicação.')
    if (!geometryPass) notes.push(`Geometria fora do contrato; margem alvo ${expectedMargin}px.`)
    if (!roleMatches) notes.push(`Perfil observado não corresponde ao solicitado: ${nativeMetrics.shell.role || 'desconhecido'} ≠ ${row.role}.`)
    if (networkFailures.length) notes.push('Falhas HTTP/rede foram registradas sem assumir que são bugs de produção.')
    if (networkFailures.some(isExpectedTransportFailure)) notes.push('ERR_ABORTED de fetch foi classificado como transporte esperado durante cancelamento de consultas.')
    if (page.url().includes('/login')) notes.push('A rota terminou em /login; autenticação/guard não permitiu a prova desta combinação.')

    stateBase.status = status
    stateBase.finalUrl = page.url()
    stateBase.observedRole = nativeMetrics.shell.role
    stateBase.finishedAt = new Date().toISOString()
    stateBase.checks = {
      authenticated: !page.url().includes('/login'),
      mainCount: metrics.mainCount,
      pageCanvasCount: metrics.pageCanvasCount,
      pageViewportCount: metrics.pageViewportCount,
      pageScrollOwnerCount: metrics.pageScrollOwnerCount,
      horizontalOverflow: metrics.horizontalOverflow,
      criticalA11yViolations: counts.critical,
      seriousA11yViolations: counts.serious,
      consoleErrors: consoleMessages.filter(item => item.type === 'error').length,
      pageErrors: pageErrors.length,
      failedRequests: networkFailures.filter(item => item.kind === 'requestfailed').length,
      httpErrors: networkFailures.filter(item => item.kind === 'http').length,
    }
    stateBase.classification = {
      geometry: geometryPass ? 'PASS' : 'FAIL',
      runtime: runtimePass ? 'PASS' : 'FAIL',
      accessibility: accessibilityPass ? 'PASS' : 'FAIL',
    }

    await mkdir(caseDir, { recursive: true })
    await page.screenshot({ path: join(caseDir, 'screenshot.png'), fullPage: false })
    await page.screenshot({ path: join(caseDir, 'fullpage.png'), fullPage: true })
    await writeJson(join(caseDir, 'dom-metrics.json'), metrics)
    await writeJson(join(caseDir, 'dom-metrics-native.json'), nativeMetrics)
    await writeJson(join(caseDir, 'console.json'), { errors: consoleMessages.filter(item => item.type === 'error'), warnings: consoleMessages.filter(item => item.type === 'warning'), pageErrors })
    await writeJson(join(caseDir, 'network.json'), { failures: networkFailures })
    await writeJson(join(caseDir, 'a11y.json'), a11y)
    await writeJson(join(caseDir, 'state.json'), stateBase)
  } catch (error) {
    stateBase.finishedAt = new Date().toISOString()
    stateBase.error = redactError(error)
    stateBase.notes.push('Captura interrompida; artefatos ausentes não são considerados PASS.')
    stateBase.checks.consoleErrors = consoleMessages.filter(item => item.type === 'error').length
    stateBase.checks.pageErrors = pageErrors.length
    stateBase.checks.failedRequests = networkFailures.filter(item => item.kind === 'requestfailed').length
    stateBase.checks.httpErrors = networkFailures.filter(item => item.kind === 'http').length
    await writePlaceholderState(caseDir, stateBase)
  } finally {
    await page.close()
  }
  return stateBase
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const matrixPath = typeof args.matrix === 'string' ? (isAbsolute(args.matrix) ? args.matrix : resolve(ROOT, args.matrix)) : DEFAULT_MATRIX
  const outputRoot = typeof args.output === 'string' ? (isAbsolute(args.output) ? args.output : resolve(ROOT, args.output)) : DEFAULT_OUTPUT
  const baseUrl = String(args['base-url'] || process.env.E2E_BASE_URL || process.env.VITE_APP_URL || `http://localhost:${process.env.PLAYWRIGHT_PORT || '3107'}`).replace(/\/$/, '')
  const runId = String(args['run-id'] || `foundation-zero-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`)
  const roles = selectedRoles(args)
  const viewports = selectedViewports(args)
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8')) as Matrix
  const routeFilter = csv(args.route)
  const rows = routeRows(matrix, roles, routeFilter)
  const limit = typeof args.limit === 'string' ? Number.parseInt(args.limit, 10) : Number.POSITIVE_INFINITY
  if (!Number.isFinite(limit) && args.limit !== undefined) throw new Error(`--limit inválido: ${String(args.limit)}`)
  const planned = rows.flatMap(row => viewports.map(viewport => ({ row, viewport }))).slice(0, limit)

  console.log(JSON.stringify({ runId, baseUrl, matrixPath, outputRoot, roles, viewports: viewports.map(item => item.key), routeRows: rows.length, plannedCases: planned.length }, null, 2))
  if (!ROLE_PASSWORD) console.warn('E2E_ROLE_PASSWORD/E2E_AUTH_PASSWORD ausente; casos serão SKIP.')

  const browser: Browser = await chromium.launch({ headless: true })
  const results: CaseState[] = []
  try {
    for (const role of roles) {
      const roleRows = planned.filter(item => item.row.role === role)
      if (!roleRows.length) continue
      const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1280, height: 800 } })
      try {
        const loginPage = await context.newPage()
        const auth = await authenticate(loginPage, role)
        await loginPage.close()
        if (!auth.ok) {
          for (const item of roleRows) {
            const startedAt = new Date().toISOString()
            const state: CaseState = {
              runId,
              status: 'SKIP',
              role,
              requestedRole: role,
              routeTemplate: item.row.path,
              route: routeWithRealParameters(item.row.path, args),
              viewport: item.viewport,
              surface: item.row.surface,
              kind: item.row.kind,
              startedAt,
              finishedAt: new Date().toISOString(),
              checks: { authenticated: false, mainCount: null, pageCanvasCount: null, pageViewportCount: null, pageScrollOwnerCount: null, horizontalOverflow: null, criticalA11yViolations: null, seriousA11yViolations: null, consoleErrors: 0, pageErrors: 0, failedRequests: 0, httpErrors: 0 },
              classification: { geometry: 'NOT_CAPTURED', runtime: 'NOT_CAPTURED', accessibility: 'NOT_CAPTURED' },
              notes: [auth.reason || 'credencial ausente'],
            }
            await writePlaceholderState(join(outputRoot, role, safeSlug(item.row.path), item.viewport.key), state)
            results.push(state)
          }
          continue
        }
        for (const item of roleRows) {
          const result = await captureCase(context, item.row, item.viewport, baseUrl, outputRoot, runId, args)
          results.push(result)
          console.log(`[${result.status}] ${role} ${item.row.path} ${item.viewport.key}`)
        }
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  const summary = {
    runId,
    generatedAt: new Date().toISOString(),
    baseUrl,
    matrixPath,
    outputRoot,
    denominators: {
      matrixRoutes: matrix.summary.routesTotal,
      matrixRouteRoleRows: matrix.summary.routeRoleTotal,
      standardCanvasRoutes: matrix.summary.standardCanvasTotal,
      standardCanvasRenderings: matrix.summary.standardCanvasRenderings,
      viewportCases: viewports.length,
      plannedCases: planned.length,
    },
    results: {
      pass: results.filter(item => item.status === 'PASS').length,
      fail: results.filter(item => item.status === 'FAIL').length,
      skip: results.filter(item => item.status === 'SKIP').length,
    },
    cases: results,
  }
  await writeJson(join(outputRoot, 'run-summary.json'), summary)
  console.log(JSON.stringify({ runId, results: summary.results, summary: join(outputRoot, 'run-summary.json') }, null, 2))
  if (summary.results.fail > 0 && args['allow-failures'] !== true) process.exitCode = 1
}

main().catch(error => {
  console.error(redactError(error))
  process.exitCode = 1
})
