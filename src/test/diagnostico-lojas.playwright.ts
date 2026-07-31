import { test, type Page } from '@playwright/test'
import { getVisualAuthPassword } from '../../e2e/visual/helpers'

const PASSWORD = process.env.E2E_ROLE_PASSWORD || getVisualAuthPassword()

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

test('diagnóstico rota /lojas/lial admin', async ({ page }) => {
  page.setDefaultTimeout(30_000)
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) console.log('[NAV]', frame.url())
  })
  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error' || text.includes('Audit') || text.includes('Warn')) console.log(`[console.${msg.type()}]`, text.slice(0, 160))
  })
  page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 160)))

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com')
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.locator('main#main-content').waitFor({ state: 'visible', timeout: 30_000 })
  console.log('[login ok]', page.url())

  for (let pass = 0; pass < 3; pass++) {
    console.log(`=== pass ${pass + 1} ===`)
    for (const route of adminRoutes) {
      const res = await page.goto(route.path, { waitUntil: 'networkidle' }).catch((e) => `ERRO: ${String(e).slice(0, 160)}`)
      if (res instanceof Error) {
        console.log(`[FALHA] ${route.key} → ${res}`)
        await page.waitForTimeout(2500)
        console.log('[URL após falha]', page.url())
        const h1 = await page.locator('h1').first().innerText().catch(() => '(sem h1)')
        console.log('[H1 após falha]', h1)
        return
      }
      await page.locator('main#main-content').waitFor({ state: 'visible', timeout: 30_000 })
      await page.waitForTimeout(350)
    }
    console.log('[pass completa]')
  }
})
