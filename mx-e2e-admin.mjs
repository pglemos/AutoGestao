import { chromium } from 'playwright'
const BASE = 'https://www.mxperformance.com.br'
const PWD = process.env.PWD_MX
const STAMP = Date.now().toString().slice(-6)
const log = (...a) => console.log(...a)
const results = []
function check(name, ok, detail = '') { results.push({ name, ok }); log(`${ok ? 'PASS' : 'FALHA'} · ${name}${detail ? ' · ' + detail : ''}`) }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)) })

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[type="email"]', 'synvollt@gmail.com')
await page.fill('input[type="password"]', PWD)
await page.click('button[type="submit"]')
await page.waitForTimeout(6000)
check('login admin MX', !page.url().includes('/login'), page.url().replace(BASE, ''))

// ---------- 1. PRODUTO ----------
await page.goto(`${BASE}/produtos`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
await page.getByRole('button', { name: /Novo produto/i }).first().click()
await page.waitForTimeout(1200)
await page.getByLabel(/Chave do programa/i).fill(`smoke_prod_${STAMP}`)
await page.getByLabel(/Nome do produto/i).fill(`SMOKE Produto ${STAMP}`)
await page.getByLabel(/Encontros da jornada/i).fill('5')
await page.getByRole('button', { name: /^Salvar$/ }).click()
await page.waitForTimeout(4000)
let text = await page.locator('main').innerText()
check('criar produto de consultoria', text.includes(`SMOKE Produto ${STAMP}`))

// editar o produto recém-criado
const row = page.locator('tr', { hasText: `SMOKE Produto ${STAMP}` })
await row.getByRole('button', { name: /Editar/i }).click()
await page.waitForTimeout(1200)
await page.getByLabel(/Nome do produto/i).fill(`SMOKE Produto ${STAMP} v2`)
await page.getByRole('button', { name: /^Salvar$/ }).click()
await page.waitForTimeout(4000)
text = await page.locator('main').innerText()
check('editar produto', text.includes(`SMOKE Produto ${STAMP} v2`))

// ---------- 2. INDICADOR ----------
await page.goto(`${BASE}/indicadores`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
await page.getByRole('button', { name: /Novo indicador/i }).first().click()
await page.waitForTimeout(1200)
await page.getByLabel(/Chave da métrica/i).fill(`smoke_ind_${STAMP}`)
await page.getByLabel(/Nome do indicador/i).fill(`SMOKE Indicador ${STAMP}`)
await page.getByLabel(/^Área$/i).fill('Comercial')
await page.getByRole('button', { name: /^Salvar$/ }).click()
await page.waitForTimeout(4000)
await page.fill('input[aria-label="Buscar indicador"]', `smoke_ind_${STAMP}`)
await page.waitForTimeout(1500)
text = await page.locator('main').innerText()
check('criar indicador no catálogo', text.includes(`SMOKE Indicador ${STAMP}`))

console.log('CONSOLE_ERRORS_ATE_AQUI', consoleErrors.length, consoleErrors.slice(0, 3))
await page.screenshot({ path: '/tmp/e2e-indicadores.png' })
await browser.close()
console.log('RESUMO', JSON.stringify(results))
