import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getVisualAuthPassword } from '../../e2e/visual/helpers'

const PASSWORD = process.env.E2E_ROLE_PASSWORD || getVisualAuthPassword()
const EVIDENCE_DIR = join(process.cwd(), 'visual-evidence', 'internal-mx')

const adminRoutes = [
  { key: 'painel', path: '/painel' },
  { key: 'lojas', path: '/lojas' },
  { key: 'loja-lial', path: '/lojas/lial' },
  { key: 'consultoria', path: '/consultoria/clientes' },
  { key: 'agenda', path: '/agenda' },
  { key: 'ranking', path: '/classificacao' },
  { key: 'devolutivas', path: '/devolutivas' },
  { key: 'treinamentos', path: '/treinamentos' },
  { key: 'produtos', path: '/produtos' },
  { key: 'notificacoes', path: '/notificacoes' },
  { key: 'relatorio-matinal', path: '/relatorio-matinal' },
  { key: 'performance-vendas', path: '/relatorios/performance-vendas' },
  { key: 'performance-vendedor', path: '/relatorios/performance-vendedor' },
  { key: 'auditoria', path: '/auditoria' },
  { key: 'config-operacional', path: '/configuracoes/operacional' },
  { key: 'config-pmr', path: '/configuracoes/consultoria-pmr' },
  { key: 'reprocessamento', path: '/configuracoes/reprocessamento' },
  { key: 'configuracoes', path: '/configuracoes?aba=perfil' },
  { key: 'simulacao', path: '/simulacao' },
] as const

const strictManagerRoutes = new Set([
  'ranking',
  'devolutivas',
  'treinamentos',
  'produtos',
  'notificacoes',
  'relatorio-matinal',
  'performance-vendas',
  'config-operacional',
  'config-pmr',
  'configuracoes',
])

const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'tablet', width: 1024, height: 768 },
  { key: 'mobile', width: 390, height: 844 },
] as const

type RouteMetric = {
  role: string
  viewport: string
  route: string
  finalPath: string
  title: string
  h1: string
  runtime: string
  horizontalOverflow: boolean
  legacyNodes: number
  aggressiveHeadings: number
  oversizedHeadings: number
  uppercaseSamples: string[]
  consoleErrors: string[]
  managerPage: string
  managerHeader: boolean
  managerHeaderRadius: number
  managerHeaderBackground: string
  darkCards: number
  cardRadiusViolations: number
  legacyAccentBars: number
}

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
}

async function auditRoute(
  page: Page,
  testInfo: TestInfo,
  role: string,
  viewport: string,
  key: string,
  path: string,
): Promise<RouteMetric> {
  const consoleErrors: string[] = []
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  }
  const onPageError = (error: Error) => consoleErrors.push(error.message)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  await page.goto(path, { waitUntil: 'networkidle' })
  await expect(page.locator('main#main-content')).toBeVisible()
  await page.waitForTimeout(350)

  const metric = await page.evaluate(({ role, viewport, route, consoleErrors }) => {
    const main = document.querySelector<HTMLElement>('main#main-content')
    if (!main) throw new Error('main-content não encontrado')
    const headings = Array.from(main.querySelectorAll<HTMLElement>('h1, h2, h3'))
      .filter((node) => node.getBoundingClientRect().width > 0)
    const texts = Array.from(main.querySelectorAll<HTMLElement>('h1, h2, h3, p, span, th, button'))
      .map((node) => node.textContent?.trim() || '')
      .filter((text) => text.length >= 5 && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(text))
    const uppercaseSamples = texts
      .filter((text) => text === text.toLocaleUpperCase('pt-BR'))
      .filter((text, index, collection) => collection.indexOf(text) === index)
      .slice(0, 12)

    const managerFrame = document.querySelector<HTMLElement>('[data-mx-manager-page]')
    const nestedMain = managerFrame?.querySelector<HTMLElement>('main')
    const managerHeader = managerFrame?.querySelector<HTMLElement>('[data-mx-page-heading="manager"]')
      ?? nestedMain?.querySelector<HTMLElement>(':scope > header:first-child')
      ?? null
    const headerStyle = managerHeader ? getComputedStyle(managerHeader) : null
    const cards = managerFrame
      ? Array.from(managerFrame.querySelectorAll<HTMLElement>('[data-mx-card]')).filter((node) => node.getBoundingClientRect().width > 0)
      : []
    const isDark = (background: string) => {
      const values = background.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
      if (values.length !== 3) return false
      const [red, green, blue] = values
      return (red * 299 + green * 587 + blue * 114) / 1000 < 100
    }
    const legacyAccentBars = managerFrame
      ? Array.from(managerFrame.querySelectorAll<HTMLElement>("[class*='w-mx-xs'][class*='bg-brand-primary']"))
          .filter((node) => {
            const rect = node.getBoundingClientRect()
            return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0
          }).length
      : 0

    return {
      role,
      viewport,
      route,
      finalPath: window.location.pathname + window.location.search,
      title: document.title,
      h1: main.querySelector('h1')?.textContent?.trim() || '',
      runtime: document.documentElement.dataset.mxRuntime || '',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      legacyNodes: main.querySelectorAll(
        '.mxds-page-frame, .mx-internal-workspace, [class*="mxds-"], [class*="bg-mx-black"]',
      ).length,
      aggressiveHeadings: headings.filter((node) => {
        const style = getComputedStyle(node)
        return Number(style.fontWeight) > 700 || style.textTransform === 'uppercase'
      }).length,
      oversizedHeadings: headings.filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) > 40).length,
      uppercaseSamples,
      consoleErrors,
      managerPage: managerFrame?.dataset.mxManagerPage || '',
      managerHeader: Boolean(managerHeader),
      managerHeaderRadius: headerStyle ? Number.parseFloat(headerStyle.borderRadius) : 0,
      managerHeaderBackground: headerStyle?.backgroundColor || '',
      darkCards: cards.filter((node) => isDark(getComputedStyle(node).backgroundColor)).length,
      cardRadiusViolations: cards.filter((node) => Number.parseFloat(getComputedStyle(node).borderRadius) < 14).length,
      legacyAccentBars,
    }
  }, { role, viewport, route: key, consoleErrors })

  mkdirSync(EVIDENCE_DIR, { recursive: true })
  const evidencePrefix = `${role}-${viewport}-${key}`
  writeFileSync(join(EVIDENCE_DIR, `${evidencePrefix}-metrics.json`), JSON.stringify(metric, null, 2))
  writeFileSync(testInfo.outputPath(`${evidencePrefix}-metrics.json`), JSON.stringify(metric, null, 2))
  await page.screenshot({
    path: join(EVIDENCE_DIR, `${evidencePrefix}.png`),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })

  expect.soft(metric.runtime, `${role}/${viewport}/${key}: runtime`).toBe('universal-shell-v2')
  expect.soft(metric.horizontalOverflow, `${role}/${viewport}/${key}: overflow horizontal`).toBe(false)
  expect.soft(metric.legacyNodes, `${role}/${viewport}/${key}: nós legados`).toBe(0)
  expect.soft(metric.aggressiveHeadings, `${role}/${viewport}/${key}: títulos agressivos`).toBe(0)
  expect.soft(metric.oversizedHeadings, `${role}/${viewport}/${key}: títulos superdimensionados`).toBe(0)
  expect.soft(metric.h1, `${role}/${viewport}/${key}: heading principal`).not.toBe('')
  expect.soft(metric.consoleErrors, `${role}/${viewport}/${key}: erros de console`).toEqual([])

  if (strictManagerRoutes.has(key)) {
    expect.soft(metric.managerPage, `${role}/${viewport}/${key}: frame Gerente 1:1`).toBe(key)
    expect.soft(metric.managerHeader, `${role}/${viewport}/${key}: cabeçalho Gerente`).toBe(true)
    expect.soft(metric.managerHeaderRadius, `${role}/${viewport}/${key}: raio do cabeçalho`).toBeGreaterThanOrEqual(14)
    expect.soft(metric.managerHeaderBackground, `${role}/${viewport}/${key}: superfície do cabeçalho`).toBe('rgb(255, 255, 255)')
    expect.soft(metric.darkCards, `${role}/${viewport}/${key}: cards escuros`).toBe(0)
    expect.soft(metric.cardRadiusViolations, `${role}/${viewport}/${key}: raio dos cards`).toBe(0)
    expect.soft(metric.legacyAccentBars, `${role}/${viewport}/${key}: barra de título antiga`).toBe(0)
  }

  page.off('console', onConsole)
  page.off('pageerror', onPageError)
  return metric
}

test.describe('auditoria visual completa das rotas internas MX', () => {
  test.describe.configure({ timeout: 900_000 })

  test('Administrador Geral percorre todas as rotas em desktop, tablet e mobile', async ({ page }, testInfo) => {
    mkdirSync(EVIDENCE_DIR, { recursive: true })
    await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height })
    await login(page, process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com')

    const metrics: RouteMetric[] = []
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      for (const route of adminRoutes) {
        metrics.push(await auditRoute(page, testInfo, 'admin', viewport.key, route.key, route.path))
      }
    }

    writeFileSync(join(EVIDENCE_DIR, 'admin-route-matrix.json'), JSON.stringify(metrics, null, 2))
    writeFileSync(testInfo.outputPath('admin-route-matrix.json'), JSON.stringify(metrics, null, 2))
  })
})
