import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'
import { routesForRole } from './e2e-helpers/real-data-role-routes'

/**
 * FASE AE (31.003–31.015) — Matriz visual e DOM para os perfis operacionais.
 *
 * Percorre as rotas reais de vendedor/gerente/dono em múltiplos viewports,
 * capturando:
 *   - screenshot full-page e viewport (31.003);
 *   - DOM metrics: PageCanvas, main, scroll owner, gutters, padding, max-width,
 *     overflow, header height (31.004–31.011);
 *   - console errors, page errors e HTTP >= 400 (31.013–31.015).
 *
 * Evidência é gravada em `visual-evidence/roles/{role}-{viewport}-matrix.json`.
 * Este harness NÃO compara com baseline nem falha por diff visual: ele é a
 * coleta que alimenta 31.016–31.019 (comparação e classificação no CI).
 */
const PASSWORD = getE2ERolePassword()

const CREDENTIALS: Record<string, string> = {
  vendedor: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
  gerente: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
  dono: process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br',
}

const VIEWPORTS = [
  { key: 'mobile-320', width: 320, height: 568 },
  { key: 'mobile-390', width: 390, height: 844 },
  { key: 'desktop', width: 1440, height: 900 },
] as const

/** Rotas canônicas por role (denominador real) — amostra por perfil. */
const SAMPLE_ROUTES: Record<string, readonly string[]> = {
  vendedor: ['/home', '/central-execucao', '/carteira-clientes', '/meu-funil', '/ranking', '/universidade-mx', '/configuracoes'],
  gerente: ['/home', '/rotina', '/fechamento-diario', '/minha-equipe', '/ranking', '/universidade-mx'],
  dono: ['/home', '/rotina', '/plano-estrategico', '/plano-acao', '/consultoria', '/departamentos', '/minhas-lojas'],
}

interface RouteMetric {
  role: string
  viewport: string
  route: string
  pageCanvasCount: number
  mainCount: number
  scrollOwnerCount: number
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  maxContentWidth: number
  horizontalOverflow: boolean
  headerHeight: number
  consoleErrors: string[]
  httpErrors: string[]
  pageErrors: number
  screenshotViewport: string
  screenshotFullPage: string
}

const EVIDENCE_DIR = join(process.cwd(), 'visual-evidence', 'roles')

async function login(page: Page, role: string) {
  const email = CREDENTIALS[role]
  if (!email) {
    test.skip(true, `E2E credencial ausente para ${role}`)
    return
  }
  await loginWithCredentials(page, email, PASSWORD)
  await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
}

async function auditRoute(
  page: Page,
  testInfo: TestInfo,
  role: string,
  viewport: string,
  path: string,
): Promise<RouteMetric> {
  const consoleErrors: string[] = []
  const httpErrors: string[] = []
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') {
      const text = message.text()
      const isNavAbort = text.includes('loadUserData fail') && text.includes('Failed to fetch')
      const isDevNoise = text.startsWith('WebSocket connection') && text.includes('realtime/v1/websocket')
      if (!isNavAbort && !isDevNoise) consoleErrors.push(text)
    }
  }
  const onResponse = (response: { status: () => number; url: () => string }) => {
    const status = response.status()
    const url = response.url()
    if (status >= 400 && !url.includes('/_vercel/insights') && !url.includes('supabase.co')) {
      httpErrors.push(`HTTP ${status} ${url}`)
    }
  }
  let pageErrorCount = 0
  const onPageError = () => { pageErrorCount++ }
  page.on('console', onConsole)
  page.on('response', onResponse)
  page.on('pageerror', onPageError)

  await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {})
  await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(300)

  const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'index'
  const base = `${role}-${viewport}-${slug}`
  await page.screenshot({ path: join(EVIDENCE_DIR, `${base}-viewport.png`), fullPage: false })
  await page.screenshot({ path: join(EVIDENCE_DIR, `${base}-fullpage.png`), fullPage: true })
  const outViewport = join(testInfo.outputPath('screens'), `${base}-viewport.png`)
  const outFull = join(testInfo.outputPath('screens'), `${base}-fullpage.png`)
  mkdirSync(join(testInfo.outputPath('screens')), { recursive: true })
  await page.screenshot({ path: outViewport, fullPage: false })
  await page.screenshot({ path: outFull, fullPage: true })

  const metric = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main#main-content')
    const canvas = main?.querySelector<HTMLElement>('[data-mx-page-canvas]')
    const style = canvas ? getComputedStyle(canvas) : null
    const scrollOwners = document.querySelectorAll('[data-mx-scroll-owner]').length
    const header = main?.querySelector<HTMLElement>('header')
    const headerHeight = header ? header.getBoundingClientRect().height : 0
    return {
      pageCanvasCount: document.querySelectorAll('[data-mx-page-canvas]').length,
      mainCount: document.querySelectorAll('main').length,
      scrollOwnerCount: scrollOwners,
      paddingLeft: style ? Math.round(parseFloat(style.paddingLeft)) : 0,
      paddingRight: style ? Math.round(parseFloat(style.paddingRight)) : 0,
      paddingTop: style ? Math.round(parseFloat(style.paddingTop)) : 0,
      maxContentWidth: canvas ? Math.round(canvas.getBoundingClientRect().width) : 0,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      headerHeight: Math.round(headerHeight),
    }
  })

  page.removeListener('console', onConsole)
  page.removeListener('response', onResponse)
  page.removeListener('pageerror', onPageError)

  return {
    role, viewport, route: path,
    ...metric,
    consoleErrors, httpErrors, pageErrors: pageErrorCount,
    screenshotViewport: outViewport,
    screenshotFullPage: outFull,
  }
}

test.describe.configure({ timeout: 600_000 })

for (const role of ['vendedor', 'gerente', 'dono'] as const) {
  for (const viewport of VIEWPORTS) {
    test(`${role} percorre rotas canônicas em ${viewport.key} (matriz AE)`, async ({ page }, testInfo) => {
      mkdirSync(EVIDENCE_DIR, { recursive: true })
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await login(page, role)
      const metrics: RouteMetric[] = []
      for (const route of SAMPLE_ROUTES[role]) {
        metrics.push(await auditRoute(page, testInfo, role, viewport.key, route))
      }
      const matrixName = `${role}-${viewport.key}-matrix.json`
      writeFileSync(join(EVIDENCE_DIR, matrixName), JSON.stringify(metrics, null, 2))
      writeFileSync(testInfo.outputPath(matrixName), JSON.stringify(metrics, null, 2))
    })
  }
}
