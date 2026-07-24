import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { getVisualAuthPassword } from '../../e2e/visual/helpers'

const PASSWORD = process.env.E2E_ROLE_PASSWORD || getVisualAuthPassword()

const adminRoutes = [
  { key: 'painel', path: '/painel' },
  { key: 'lojas', path: '/lojas' },
  { key: 'loja-lial', path: '/lojas/lial' },
  { key: 'agenda', path: '/agenda' },
  { key: 'consultoria', path: '/consultoria/clientes' },
  { key: 'produtos', path: '/produtos' },
  { key: 'treinamentos', path: '/treinamentos' },
  { key: 'configuracoes', path: '/configuracoes' },
  { key: 'operacional', path: '/configuracoes/operacional' },
  { key: 'parametros-pmr', path: '/configuracoes/consultoria-pmr' },
  { key: 'reprocessamento', path: '/configuracoes/reprocessamento' },
  { key: 'relatorio-matinal', path: '/relatorio-matinal' },
  { key: 'performance-vendas', path: '/relatorios/performance-vendas' },
  { key: 'performance-vendedor', path: '/relatorios/performance-vendedor' },
  { key: 'auditoria', path: '/auditoria' },
  { key: 'simulacao', path: '/simulacao' },
] as const

type RouteMetric = {
  role: string
  route: string
  finalPath: string
  title: string
  h1: string
  runtime: string
  horizontalOverflow: boolean
  legacyNodes: number
  aggressiveNodes: number
  uppercaseSamples: string[]
  consoleErrors: string[]
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
  await page.waitForTimeout(500)

  const metric = await page.evaluate(({ role, route, consoleErrors }) => {
    const main = document.querySelector<HTMLElement>('main#main-content')
    if (!main) throw new Error('main-content não encontrado')
    const texts = Array.from(main.querySelectorAll<HTMLElement>('h1, h2, h3, p, span, th, button'))
      .map((node) => node.textContent?.trim() || '')
      .filter((text) => text.length >= 5 && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(text))
    const uppercaseSamples = texts
      .filter((text) => text === text.toLocaleUpperCase('pt-BR'))
      .filter((text, index, collection) => collection.indexOf(text) === index)
      .slice(0, 12)

    return {
      role,
      route,
      finalPath: window.location.pathname + window.location.search,
      title: document.title,
      h1: main.querySelector('h1')?.textContent?.trim() || '',
      runtime: document.documentElement.dataset.mxRuntime || '',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      legacyNodes: main.querySelectorAll(
        '.mxds-page-frame, .mx-internal-workspace, [class*="mxds-"], [class*="bg-mx-black"]',
      ).length,
      aggressiveNodes: main.querySelectorAll(
        '[class*="font-black"], [class*="backdrop-blur"], [class*="text-5xl"], [class*="text-6xl"]',
      ).length,
      uppercaseSamples,
      consoleErrors,
    }
  }, { role, route: key, consoleErrors })

  writeFileSync(
    testInfo.outputPath(`${role}-${key}-metrics.json`),
    JSON.stringify(metric, null, 2),
  )
  await page.screenshot({
    path: testInfo.outputPath(`${role}-${key}.png`),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })

  expect.soft(metric.runtime, `${role}/${key}: runtime`).toBe('universal-shell-v2')
  expect.soft(metric.horizontalOverflow, `${role}/${key}: overflow horizontal`).toBe(false)
  expect.soft(metric.legacyNodes, `${role}/${key}: nós legados`).toBe(0)
  expect.soft(metric.h1, `${role}/${key}: heading principal`).not.toBe('')
  expect.soft(metric.consoleErrors, `${role}/${key}: erros de console`).toEqual([])

  page.off('console', onConsole)
  page.off('pageerror', onPageError)
  return metric
}

test.describe('auditoria visual das rotas que permanecem no shell universal MX', () => {
  test.describe.configure({ timeout: 360_000 })

  test('Administrador Geral percorre todas as rotas internas', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com')

    const metrics: RouteMetric[] = []
    for (const route of adminRoutes) {
      metrics.push(await auditRoute(page, testInfo, 'admin', route.key, route.path))
    }
    writeFileSync(testInfo.outputPath('admin-route-matrix.json'), JSON.stringify(metrics, null, 2))
  })
})
