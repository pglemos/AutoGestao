import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getE2ERolePassword, loginWithCredentials, getE2ESellerEmail, getE2EInternalEmail } from './e2e-helpers/auth'

/**
 * FASE AI 35.011 — browser performance smoke nas rotas críticas.
 *
 * Mede Web Vitals (LCP, FCP, CLS) + console errors nas rotas por perfil.
 * É um PROBE de evidência (não falha por métrica — métrica depende de
 * hardware/CI): grava `visual-evidence/perf/{role}-{route}.json` e reporta.
 * Regressões de CLS/LCP são classificadas por tendência no CI, não por um
 * teto fixo aqui (35.003 cobre bundle; 35.011 cobre runtime).
 */
const PASSWORD = getE2ERolePassword()

const CREDENTIALS: Record<string, { email: string }> = {
  vendedor: { email: getE2ESellerEmail() },
  admin: { email: getE2EInternalEmail() },
}

const ROUTES: Record<string, string[]> = {
  vendedor: ['/home', '/central-execucao', '/carteira-clientes', '/meu-funil', '/ranking'],
  admin: ['/painel', '/lojas', '/agenda', '/consultoria/clientes'],
}

interface PerfMetric {
  role: string
  route: string
  lcp: number | null
  fcp: number | null
  cls: number | null
  tti: number | null
  consoleErrors: string[]
  httpErrors: string[]
}

const EVIDENCE_DIR = join(process.cwd(), 'visual-evidence', 'perf')

async function measurePage(page: Page, role: string, route: string): Promise<PerfMetric> {
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
    if (response.status() >= 400 && !response.url().includes('/_vercel/insights')) {
      httpErrors.push(`HTTP ${response.status()} ${response.url()}`)
    }
  }
  page.on('console', onConsole)
  page.on('response', onResponse)

  const vitals = await page.evaluate(() => new Promise<{ lcp: number | null; fcp: number | null; cls: number | null; tti: number | null }>((resolve) => {
    let lcp: number | null = null
    let fcp: number | null = null
    let cls = 0
    const tti: number | null = null
    const start = performance.now()
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') lcp = entry.startTime
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') fcp = entry.startTime
        }
      }).observe({ type: 'paint', buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          cls += (entry as { value: number }).value || 0
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {
      // PerformanceObserver indisponível em alguns contextos — reporta null.
    }
    setTimeout(() => resolve({ lcp, fcp, cls: cls || null, tti }), 2500)
    void start
  }))

  page.removeListener('console', onConsole)
  page.removeListener('response', onResponse)

  return { role, route, ...vitals, consoleErrors, httpErrors }
}

for (const role of Object.keys(ROUTES) as (keyof typeof ROUTES)[]) {
  test(`${role} mede Web Vitals nas rotas críticas (35.011)`, async ({ page }, testInfo: TestInfo) => {
    mkdirSync(EVIDENCE_DIR, { recursive: true })
    const { email } = CREDENTIALS[role]
    await loginWithCredentials(page, email, PASSWORD)
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })

    const results: PerfMetric[] = []
    for (const route of ROUTES[role]) {
      await page.goto(route, { waitUntil: 'networkidle' }).catch(() => {})
      await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 }).catch(() => {})
      results.push(await measurePage(page, role, route))
    }

    const slug = `perf-${role}`
    writeFileSync(join(EVIDENCE_DIR, `${slug}.json`), JSON.stringify(results, null, 2))
    writeFileSync(testInfo.outputPath(`${slug}.json`), JSON.stringify(results, null, 2))
    // Probe de evidência: reporta métricas, não falha por teto (35.011 mede, 35.003 limita bundle).
    console.log(`[PERF ${role}]`, results.map((r) => `${r.route}: LCP=${r.lcp?.toFixed(0) ?? 'n/a'} FCP=${r.fcp?.toFixed(0) ?? 'n/a'} CLS=${r.cls?.toFixed(3) ?? 'n/a'} err=${r.consoleErrors.length}`).join('\n'))
  })
}
