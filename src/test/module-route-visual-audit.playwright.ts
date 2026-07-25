import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getVisualAuthPassword } from '../../e2e/visual/helpers'

const PASSWORD = process.env.E2E_ROLE_PASSWORD || getVisualAuthPassword()
const EVIDENCE_DIR = join(process.cwd(), 'visual-evidence', 'internal-mx')

const adminRoutes = [
  { key: 'painel', path: '/painel' },
  { key: 'lojas', path: '/lojas' },
  { key: 'loja-detalhe', path: '/lojas/lial' },
  { key: 'consultoria-clientes', path: '/consultoria/clientes' },
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

const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'tablet', width: 1024, height: 768 },
  { key: 'mobile', width: 390, height: 844 },
] as const

const profiles = [
  { role: 'administrador_geral', email: process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com' },
  { role: 'administrador_mx', email: process.env.E2E_ADMIN_MX_EMAIL },
  { role: 'consultor_mx', email: process.env.E2E_CONSULTANT_EMAIL },
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
  consoleErrors: string[]
  managerPage: string
  managerTemplate: string
  canonicalTemplate: string
  templateShell: boolean
  templateBody: boolean
  templateSlots: number
  nativePage: boolean
  accessMode: string
  enabledManageActions: number
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
    const managerFrame = document.querySelector<HTMLElement>('[data-mx-manager-page]')
    const canonicalTemplate = managerFrame?.querySelector<HTMLElement>('[data-mx-canonical-template]') ?? null
    const nestedMain = canonicalTemplate?.querySelector<HTMLElement>('main')
    const managerHeader = canonicalTemplate?.querySelector<HTMLElement>('[data-mx-template-header], [data-mx-module-header], [data-mx-page-heading="manager"]')
      ?? nestedMain?.querySelector<HTMLElement>(':scope > header:first-child, :scope > div > header:first-child')
      ?? null
    const headerStyle = managerHeader ? getComputedStyle(managerHeader) : null
    const cards = canonicalTemplate
      ? Array.from(canonicalTemplate.querySelectorAll<HTMLElement>('[data-mx-card], [data-mx-section-card]'))
          .filter((node) => node.getBoundingClientRect().width > 0)
      : []
    const isDark = (background: string) => {
      const values = background.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
      if (values.length !== 3) return false
      const [red, green, blue] = values
      return (red * 299 + green * 587 + blue * 114) / 1000 < 100
    }
    const legacyAccentBars = canonicalTemplate
      ? Array.from(canonicalTemplate.querySelectorAll<HTMLElement>("[class*='w-mx-xs'][class*='bg-brand-primary']"))
          .filter((node) => {
            const rect = node.getBoundingClientRect()
            return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0
          }).length
      : 0
    const accessNode = canonicalTemplate?.querySelector<HTMLElement>('[data-mx-access-mode]') ?? null
    const enabledManageActions = canonicalTemplate
      ? Array.from(canonicalTemplate.querySelectorAll<HTMLElement>('[data-mx-requires-manage]'))
          .filter((node) => {
            const rect = node.getBoundingClientRect()
            const disabled = node.matches(':disabled') || node.getAttribute('aria-disabled') === 'true'
            return !disabled && getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0
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
      legacyNodes: main.querySelectorAll('.mxds-page-frame, .mx-internal-workspace, [class*="mxds-"]').length,
      aggressiveHeadings: headings.filter((node) => {
        const style = getComputedStyle(node)
        return Number(style.fontWeight) > 700 || style.textTransform === 'uppercase'
      }).length,
      oversizedHeadings: headings.filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) > 40).length,
      consoleErrors,
      managerPage: managerFrame?.dataset.mxManagerPage || '',
      managerTemplate: managerFrame?.dataset.mxManagerTemplate || '',
      canonicalTemplate: canonicalTemplate?.dataset.mxCanonicalTemplate || '',
      templateShell: Boolean(canonicalTemplate?.querySelector('[data-mx-template-shell]')),
      templateBody: Boolean(canonicalTemplate?.querySelector('[data-mx-template-body]')),
      templateSlots: canonicalTemplate?.querySelectorAll('[data-mx-template-slot]').length || 0,
      nativePage: Boolean(canonicalTemplate?.querySelector('[data-mx-template-page]')),
      accessMode: accessNode?.dataset.mxAccessMode || '',
      enabledManageActions,
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
  expect.soft(metric.managerPage, `${role}/${viewport}/${key}: área registrada`).toBe(key)
  expect.soft(metric.managerTemplate, `${role}/${viewport}/${key}: template registrado`).not.toBe('')
  expect.soft(metric.canonicalTemplate, `${role}/${viewport}/${key}: template canônico`).toBe(metric.managerTemplate)
  expect.soft(metric.templateShell, `${role}/${viewport}/${key}: shell explícito`).toBe(true)
  expect.soft(metric.templateBody, `${role}/${viewport}/${key}: body explícito`).toBe(true)
  expect.soft(metric.templateSlots, `${role}/${viewport}/${key}: slots estruturais`).toBeGreaterThanOrEqual(2)
  expect.soft(metric.managerHeader, `${role}/${viewport}/${key}: cabeçalho Gerente`).toBe(true)
  expect.soft(metric.managerHeaderRadius, `${role}/${viewport}/${key}: raio do cabeçalho`).toBeGreaterThanOrEqual(14)
  expect.soft(metric.managerHeaderBackground, `${role}/${viewport}/${key}: superfície do cabeçalho`).toBe('rgb(255, 255, 255)')
  expect.soft(metric.darkCards, `${role}/${viewport}/${key}: cards escuros`).toBe(0)
  expect.soft(metric.cardRadiusViolations, `${role}/${viewport}/${key}: raio dos cards`).toBe(0)
  expect.soft(metric.legacyAccentBars, `${role}/${viewport}/${key}: barra de título antiga`).toBe(0)

  if (key === 'config-operacional' || key === 'config-pmr') {
    const expectedMode = role === 'consultor_mx' ? 'read-only' : 'manage'
    expect.soft(metric.accessMode, `${role}/${viewport}/${key}: modo de acesso`).toBe(expectedMode)
    if (role === 'consultor_mx') {
      expect.soft(metric.enabledManageActions, `${role}/${viewport}/${key}: mutações habilitadas`).toBe(0)
    }
  }

  page.off('console', onConsole)
  page.off('pageerror', onPageError)
  return metric
}

test.describe('auditoria visual canônica das rotas internas MX', () => {
  test.describe.configure({ timeout: 900_000 })

  for (const profile of profiles) {
    for (const viewport of viewports) {
      test(`${profile.role} percorre as dezenove áreas em ${viewport.key}`, async ({ page }, testInfo) => {
        test.skip(!profile.email, `Configure o e-mail E2E de ${profile.role}`)
        mkdirSync(EVIDENCE_DIR, { recursive: true })
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await login(page, profile.email!)

        const metrics: RouteMetric[] = []
        for (const route of adminRoutes) {
          metrics.push(await auditRoute(page, testInfo, profile.role, viewport.key, route.key, route.path))
        }

        const matrixName = `${profile.role}-${viewport.key}-route-matrix.json`
        writeFileSync(join(EVIDENCE_DIR, matrixName), JSON.stringify(metrics, null, 2))
        writeFileSync(testInfo.outputPath(matrixName), JSON.stringify(metrics, null, 2))
      })
    }
  }
})
