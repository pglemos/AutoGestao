import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { loginAsOwner } from './e2e-helpers/owner-auth'

const OWNER_BASE_PATH = '/dono'

const routes = [
  { key: 'inicio', path: OWNER_BASE_PATH, expectedPath: '/dono' },
  { key: 'rotina', path: `${OWNER_BASE_PATH}/rotina`, expectedPath: '/dono/rotina' },
  { key: 'decisoes', path: `${OWNER_BASE_PATH}/decisoes`, expectedPath: '/dono/decisoes' },
  { key: 'plano-estrategico', path: `${OWNER_BASE_PATH}/plano-estrategico`, expectedPath: '/dono/plano-estrategico' },
  { key: 'plano-acao', path: `${OWNER_BASE_PATH}/plano-acao`, expectedPath: '/dono/plano-acao' },
  { key: 'consultoria', path: `${OWNER_BASE_PATH}/consultoria`, expectedPath: '/dono/consultoria' },
  { key: 'departamentos', path: `${OWNER_BASE_PATH}/departamentos`, expectedPath: '/dono/departamentos' },
  { key: 'visao-geral', path: `${OWNER_BASE_PATH}/departamentos/visao-geral`, expectedPath: '/dono/departamentos' },
  { key: 'comercial', path: `${OWNER_BASE_PATH}/departamentos/comercial`, expectedPath: '/dono/departamentos/comercial' },
  { key: 'marketing', path: `${OWNER_BASE_PATH}/departamentos/marketing`, expectedPath: '/dono/departamentos/marketing' },
  { key: 'produto', path: `${OWNER_BASE_PATH}/departamentos/produto`, expectedPath: '/dono/departamentos/produto-e-estoque' },
  { key: 'rh', path: `${OWNER_BASE_PATH}/departamentos/rh`, expectedPath: '/dono/departamentos/pessoas-rh' },
  { key: 'financeiro', path: `${OWNER_BASE_PATH}/departamentos/financeiro`, expectedPath: '/dono/departamentos/financeiro' },
  { key: 'operacional', path: `${OWNER_BASE_PATH}/departamentos/operacional`, expectedPath: '/dono/departamentos/operacoes' },
  { key: 'mercado', path: `${OWNER_BASE_PATH}/mercado`, expectedPath: '/dono/mercado' },
  { key: 'universidade', path: `${OWNER_BASE_PATH}/universidade`, expectedPath: '/dono/universidade' },
  { key: 'consultor', path: `${OWNER_BASE_PATH}/consultor`, expectedPath: '/dono/consultoria' },
] as const

const viewports = [
  { key: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { key: 'tablet-landscape', width: 1024, height: 768, mobile: false },
  { key: 'tablet-portrait', width: 768, height: 1024, mobile: false },
  { key: 'mobile-390', width: 390, height: 844, mobile: true },
] as const

type RouteMetric = {
  route: string
  viewport: string
  finalPath: string
  ownerRoot: boolean
  ownerRegion: boolean
  universalMain: boolean
  universalSidebar: boolean
  universalSidebarWidth: number
  universalSidebarBackground: string
  ownerTopbarHeight: number
  activeNavigationItems: number
  horizontalOverflow: boolean
  pageErrors: string[]
  consoleErrors: string[]
}

async function openOwnerRoute(page: Page, path: string, expectedPath: string) {
  await page.goto(path, { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(new RegExp(`${expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#]|$)`))
  await expect(page.locator('.owner-base44-exact')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[role="region"]#owner-main-content')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
}

async function auditRoute(
  page: Page,
  testInfo: TestInfo,
  route: (typeof routes)[number],
  viewport: (typeof viewports)[number],
): Promise<RouteMetric> {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const onPageError = (error: Error) => pageErrors.push(error.message)
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  }
  page.on('pageerror', onPageError)
  page.on('console', onConsole)

  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await openOwnerRoute(page, route.path, route.expectedPath)

  const desktopSidebar = page.locator('aside[aria-label="Menu principal do Dono"]')
  const mobileDrawer = page.getByRole('dialog', { name: 'Menu principal do Dono' })
  if (viewport.mobile) {
    await expect(desktopSidebar).toBeHidden()
    await expect(mobileDrawer).toHaveCount(0)
    await page.getByRole('button', { name: 'Abrir menu principal' }).click()
    await expect(mobileDrawer).toBeVisible()
  } else {
    await expect(desktopSidebar).toBeVisible()
    await expect(mobileDrawer).toHaveCount(0)
  }

  const visibleSidebar = viewport.mobile ? mobileDrawer : desktopSidebar
  const departmentsGroup = visibleSidebar.locator('[data-sidebar-group="Departamentos"]')
  const departmentsToggle = departmentsGroup.getByRole('button', { name: 'Departamentos' })
  const departmentsSubnav = departmentsGroup.locator('[data-sidebar-subnav="Departamentos"]')
  await expect(departmentsToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(departmentsSubnav.getByRole('link')).toHaveCount(7)
  await expect(departmentsSubnav.locator('svg')).toHaveCount(0)
  expect(await departmentsSubnav.getByRole('link').allTextContents()).toEqual([
    'Visão Geral',
    'Comercial',
    'Marketing',
    'Produto e Estoque',
    'Pessoas — RH',
    'Financeiro',
    'Operações',
  ])

  const metric = await page.evaluate(
    ({ routeKey, viewportKey, collectedPageErrors, collectedConsoleErrors }) => {
      const ownerRoot = document.querySelector<HTMLElement>('.owner-base44-exact')
      const ownerRegion = document.querySelector<HTMLElement>('[role="region"]#owner-main-content')
      const universalMain = document.querySelector<HTMLElement>('main#main-content')
      const universalSidebar = Array.from(
        document.querySelectorAll<HTMLElement>(
          'aside[aria-label="Menu principal do Dono"], [role="dialog"][aria-label="Menu principal do Dono"]',
        ),
      ).find((node) => node.getBoundingClientRect().width > 0) || null
      const ownerTopbar = document.querySelector<HTMLElement>('.owner-base44-exact__topbar')

      return {
        route: routeKey,
        viewport: viewportKey,
        finalPath: window.location.pathname + window.location.search,
        ownerRoot: Boolean(ownerRoot),
        ownerRegion: Boolean(ownerRegion),
        universalMain: Boolean(universalMain),
        universalSidebar: Boolean(universalSidebar),
        universalSidebarWidth: universalSidebar ? Math.round(universalSidebar.getBoundingClientRect().width) : 0,
        universalSidebarBackground: universalSidebar ? getComputedStyle(universalSidebar).backgroundColor : '',
        ownerTopbarHeight: ownerTopbar ? Math.round(ownerTopbar.getBoundingClientRect().height) : 0,
        activeNavigationItems: universalSidebar?.querySelectorAll('a[aria-current="page"]').length || 0,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        pageErrors: collectedPageErrors,
        consoleErrors: collectedConsoleErrors,
      }
    },
    {
      routeKey: route.key,
      viewportKey: viewport.key,
      collectedPageErrors: pageErrors,
      collectedConsoleErrors: consoleErrors,
    },
  )

  expect.soft(metric.ownerRoot, `${route.key}/${viewport.key}: escopo do conteúdo`).toBe(true)
  expect.soft(metric.ownerRegion, `${route.key}/${viewport.key}: região do Dono`).toBe(true)
  expect.soft(metric.universalMain, `${route.key}/${viewport.key}: main universal`).toBe(true)
  expect.soft(metric.universalSidebar, `${route.key}/${viewport.key}: sidebar universal`).toBe(true)
  expect.soft(metric.horizontalOverflow, `${route.key}/${viewport.key}: overflow horizontal`).toBe(false)
  expect.soft(metric.activeNavigationItems, `${route.key}/${viewport.key}: item ativo`).toBe(1)
  expect.soft(metric.ownerTopbarHeight, `${route.key}/${viewport.key}: topbar`).toBeGreaterThanOrEqual(60)
  expect.soft(metric.universalSidebarWidth, `${route.key}/${viewport.key}: sidebar`).toBe(viewport.mobile ? 304 : 224)
  expect.soft(metric.universalSidebarBackground, `${route.key}/${viewport.key}: fundo da sidebar`).toBe('rgb(255, 255, 255)')
  expect.soft(metric.pageErrors, `${route.key}/${viewport.key}: erros de página`).toEqual([])
  expect.soft(metric.consoleErrors, `${route.key}/${viewport.key}: erros de console`).toEqual([])

  if (viewport.mobile) {
    await page.screenshot({
      path: testInfo.outputPath(`owner-${route.key}-${viewport.key}-drawer.png`),
      animations: 'disabled',
      caret: 'hide',
    })
    await page.getByRole('button', { name: 'Fechar menu principal' }).click()
    await expect(mobileDrawer).toHaveCount(0)
  }

  writeFileSync(
    testInfo.outputPath(`owner-${route.key}-${viewport.key}-metrics.json`),
    JSON.stringify(metric, null, 2),
  )

  await page.screenshot({
    path: testInfo.outputPath(`owner-${route.key}-${viewport.key}.png`),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })

  page.off('pageerror', onPageError)
  page.off('console', onConsole)
  return metric
}

test.describe('módulo Dono Base44 com sidebar universal MX', () => {
  test.describe.configure({ timeout: 900_000 })

  test('percorre todas as superfícies e viewports no mesmo shell de Vendedor e Gerente', async ({ browser }, testInfo) => {
    const results: RouteMetric[] = []

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
      const page = await context.newPage()
      await loginAsOwner(page)

      for (const route of routes) {
        results.push(await auditRoute(page, testInfo, route, viewport))
      }

      await context.close()
    }

    writeFileSync(testInfo.outputPath('owner-base44-route-matrix.json'), JSON.stringify(results, null, 2))
    expect(results).toHaveLength(routes.length * viewports.length)
  })
})
