import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { loginAsOwner } from './e2e-helpers/owner-auth'

const OWNER_BASE_PATH = ''

const routes = [
  { key: 'inicio', path: '/home', expectedPath: '/home' },
  { key: 'rotina', path: `/rotina`, expectedPath: '/rotina' },
  { key: 'decisoes', path: `/decisoes`, expectedPath: '/decisoes' },
  { key: 'plano-estrategico', path: `/plano-estrategico`, expectedPath: '/plano-estrategico' },
  { key: 'plano-acao', path: `/plano-acao`, expectedPath: '/plano-acao' },
  { key: 'consultoria', path: `/consultoria`, expectedPath: '/consultoria' },
  { key: 'departamentos', path: `/departamentos`, expectedPath: '/departamentos' },
  { key: 'visao-geral', path: `/departamentos`, expectedPath: '/departamentos' },
  { key: 'comercial', path: `/departamentos/comercial`, expectedPath: '/departamentos/comercial' },
  { key: 'marketing', path: `/departamentos/marketing`, expectedPath: '/departamentos/marketing' },
  { key: 'produto', path: `/departamentos/produto-e-estoque`, expectedPath: '/departamentos/produto-e-estoque' },
  { key: 'rh', path: `/departamentos/pessoas-rh`, expectedPath: '/departamentos/pessoas-rh' },
  { key: 'financeiro', path: `/departamentos/financeiro`, expectedPath: '/departamentos/financeiro' },
  { key: 'operacional', path: `/departamentos/operacoes`, expectedPath: '/departamentos/operacoes' },
  { key: 'mercado', path: `/mercado`, expectedPath: '/mercado' },
  { key: 'universidade', path: '/universidade-mx', expectedPath: '/universidade-mx' },
] as const

const viewports = [
  { key: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { key: 'tablet-landscape', width: 1024, height: 768, mobile: true },
  { key: 'tablet-portrait', width: 768, height: 1024, mobile: true },
  { key: 'mobile-390', width: 390, height: 844, mobile: true },
] as const

type RouteMetric = {
  route: string
  viewport: string
  finalPath: string
  ownerShell: boolean
  ownerRegion: boolean
  ownerSidebar: boolean
  ownerSidebarWidth: number
  ownerSidebarBackground: string
  ownerContentHeight: number
  activeNavigationItems: number
  horizontalOverflow: boolean
  pageErrors: string[]
  consoleErrors: string[]
}

async function openOwnerRoute(page: Page, path: string, expectedPath: string) {
  await page.goto(path, { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(new RegExp(`${expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#]|$)`))
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 30_000 })
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
      const ownerShell = document.querySelector<HTMLElement>('.owner-base44-exact')
      const ownerRegion = document.querySelector<HTMLElement>('#main-content')
      const ownerSidebar = Array.from(
        document.querySelectorAll<HTMLElement>('aside[aria-label="Menu principal do Dono"], [role="dialog"][aria-label="Menu principal do Dono"]'),
      ).find((node) => node.getBoundingClientRect().width > 0) || null
      const ownerSidebarSurface =
        ownerSidebar?.matches('[data-sidebar="sidebar"], aside[data-sidebar]')
          ? ownerSidebar
          : ownerSidebar?.querySelector<HTMLElement>('[data-sidebar="sidebar"], aside[data-sidebar]') || ownerSidebar

      return {
        route: routeKey,
        viewport: viewportKey,
        finalPath: window.location.pathname + window.location.search,
        ownerShell: Boolean(ownerShell),
        ownerRegion: Boolean(ownerRegion),
        ownerSidebar: Boolean(ownerSidebar),
        ownerSidebarWidth: ownerSidebarSurface ? Math.round(ownerSidebarSurface.getBoundingClientRect().width) : 0,
        ownerSidebarBackground: ownerSidebarSurface
          ? getComputedStyle(ownerSidebarSurface).backgroundColor
          : '',
        ownerContentHeight: ownerRegion ? Math.round(ownerRegion.getBoundingClientRect().height) : 0,
        activeNavigationItems: ownerSidebar?.querySelectorAll('a[aria-current="page"]').length || 0,
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

  expect.soft(metric.ownerShell, `${route.key}/${viewport.key}: shell Base44`).toBe(true)
  expect.soft(metric.ownerRegion, `${route.key}/${viewport.key}: região do Dono`).toBe(true)
  expect.soft(metric.ownerSidebar, `${route.key}/${viewport.key}: sidebar Base44`).toBe(true)
  expect.soft(metric.horizontalOverflow, `${route.key}/${viewport.key}: overflow horizontal`).toBe(false)
  expect.soft(metric.activeNavigationItems, `${route.key}/${viewport.key}: item ativo`).toBe(1)
  expect.soft(metric.ownerContentHeight, `${route.key}/${viewport.key}: conteúdo`).toBeGreaterThan(0)
  expect.soft(metric.ownerSidebarWidth, `${route.key}/${viewport.key}: sidebar`).toBe(256)
  expect.soft(metric.ownerSidebarBackground, `${route.key}/${viewport.key}: fundo da sidebar`).toBe('rgb(250, 250, 250)')
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

test.describe('módulo Dono Base44 aprovado', () => {
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
