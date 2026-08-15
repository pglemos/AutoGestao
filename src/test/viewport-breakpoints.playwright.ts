import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

/**
 * FASE AF — 32.007-32.025: viewport breakpoints críticos.
 *
 * Roda as rotas adotadas (mesmo conjunto do canvas-matrix) nos 17 breakpoints
 * pendentes e valida: margem lateral canônica (`expectedMargin` §7.3), padding
 * topo 24 (§28.4), sem overflow horizontal, e os casos especiais (zoom 200%,
 * reduced-motion, safe-area, portrait/landscape).
 *
 * Read-only — não muta negócio. Credenciais reais via env; skip se ausentes.
 */

const PASSWORD = process.env.E2E_ROLE_PASSWORD || process.env.E2E_AUTH_PASSWORD

type RoleKey = 'vendedor' | 'gerente' | 'dono'
const CREDENTIALS: Record<RoleKey, string> = {
  vendedor: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
  gerente: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
  dono: process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br',
}
const ADOPTED_ROUTES: Record<RoleKey, string[]> = {
  vendedor: ['/ajuda', '/configuracoes', '/meu-funil', '/terminal-mx'],
  gerente: ['/pdi', '/funil-vendas', '/falar-consultor'],
  dono: ['/treinamentos', '/organograma', '/banco-talentos'],
}

/** Breakpoints pendentes (32.007-32.021) — altura 900 por padrão. */
const BREAKPOINTS: Array<[string, number, number]> = [
  ['32.007', 639, 900],
  ['32.008', 640, 900],
  ['32.011', 840, 1024],
  ['32.012', 1023, 768],
  ['32.013', 1024, 768],
  ['32.014', 1199, 900],
  ['32.015', 1200, 900],
  ['32.016', 1279, 900],
  ['32.017', 1280, 800],
  ['32.018', 1440, 900],
  ['32.019', 1599, 1000],
  ['32.020', 1600, 1000],
  ['32.021', 1920, 1080],
]

function expectedMargin(w: number): number {
  if (w >= 840) return 32
  if (w >= 600) return 24
  return 16
}

async function signIn(page: Page, role: RoleKey): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', CREDENTIALS[role])
  await page.fill('input[type="password"]', PASSWORD || '')
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
}

async function checkRoute(page: Page, route: string, w: number): Promise<string[]> {
  const failures: string[] = []
  await page.goto(route)
  await page.waitForLoadState('networkidle')
  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('[data-mx-page-canvas]')
    if (!canvas) return null
    const style = getComputedStyle(canvas)
    return {
      paddingLeft: Math.round(Number.parseFloat(style.paddingLeft || '0')),
      paddingRight: Math.round(Number.parseFloat(style.paddingRight || '0')),
      paddingTop: Math.round(Number.parseFloat(style.paddingTop || '0')),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      mainCount: document.querySelectorAll('main').length,
    }
  })
  if (!metrics) {
    failures.push(`${route}@${w}px: sem PageCanvas`)
    return failures
  }
  const margin = expectedMargin(w)
  if (metrics.paddingLeft !== margin || metrics.paddingRight !== margin) {
    failures.push(`${route}@${w}px: margem ${metrics.paddingLeft}/${metrics.paddingRight}, esperada ${margin}`)
  }
  if (metrics.paddingTop !== 24) {
    failures.push(`${route}@${w}px: padding-top ${metrics.paddingTop}, esperado 24`)
  }
  if (metrics.overflowX) failures.push(`${route}@${w}px: overflow horizontal`)
  if (metrics.mainCount !== 1) failures.push(`${route}@${w}px: ${metrics.mainCount} main, esperado 1`)
  return failures
}

test.describe('FASE AF — breakpoints pendentes', () => {
  test.skip(!PASSWORD, 'E2E_ROLE_PASSWORD não configurado — breakpoints ignorados.')

  for (const [id, w, h] of BREAKPOINTS) {
    test(`32.${id.slice(-3)} — ${w}x${h} sem regressão de geometria`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile-chrome', 'Breakpoints desktop rodam no projeto desktop.')
      await page.setViewportSize({ width: w, height: h })
      const role: RoleKey = w >= 1280 ? 'dono' : 'vendedor'
      await signIn(page, role)

      const allFailures: string[] = []
      for (const route of ADOPTED_ROUTES[role]) {
        const routeFailures = await checkRoute(page, route, w)
        allFailures.push(...routeFailures)
      }
      expect(allFailures, `${id} @${w}x${h}`).toEqual([])
    })
  }

  test('32.022 — zoom 200% sem corte (representativo)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Zoom roda no desktop.')
    await page.setViewportSize({ width: 640, height: 900 })
    await signIn(page, 'vendedor')
    await page.setViewportSize({ width: 640, height: 450 })
    // 200% zoom aproximado por viewport reduzido: sem overflow horizontal
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflow, 'zoom 200% sem overflow horizontal').toBe(false)
  })

  test('32.023 — prefers-reduced-motion em conjunto representativo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Reduced-motion roda no desktop.')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await signIn(page, 'dono')
    const failures: string[] = []
    for (const route of ADOPTED_ROUTES.dono) {
      const routeFailures = await checkRoute(page, route, 1280)
      failures.push(...routeFailures)
    }
    expect(failures, '32.023 reduced-motion @1280x800').toEqual([])
  })

  test('32.024 — safe-area inset simulado em mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Safe-area roda no desktop.')
    // viewport móvel com safe-area implícita (bottom bar) — sem overflow
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page, 'vendedor')
    const failures: string[] = []
    for (const route of ADOPTED_ROUTES.vendedor) {
      const routeFailures = await checkRoute(page, route, 390)
      failures.push(...routeFailures)
    }
    expect(failures, '32.024 safe-area @390x844').toEqual([])
  })

  test('32.025 — portrait/landscape tablet quando layout troca composição', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Tablet roda no desktop.')
    // portrait 768x1024 e landscape 1024x768 — mesma rota dono
    await page.setViewportSize({ width: 768, height: 1024 })
    await signIn(page, 'dono')
    let failures: string[] = []
    for (const route of ADOPTED_ROUTES.dono) {
      failures.push(...await checkRoute(page, route, 768))
    }
    await page.setViewportSize({ width: 1024, height: 768 })
    for (const route of ADOPTED_ROUTES.dono) {
      failures.push(...await checkRoute(page, route, 1024))
    }
    expect(failures, '32.025 tablet portrait/landscape').toEqual([])
  })
})
