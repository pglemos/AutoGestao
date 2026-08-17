import { chromium, type Page } from 'playwright'
import { config as loadEnv } from 'dotenv'

loadEnv({ quiet: true })

const BASE_URL = (process.env.E2E_BASE_URL || process.env.VITE_APP_URL || 'https://mxperformance.com.br').replace(/\/$/, '')
const AUTH_EMAIL = process.env.E2E_AUTH_EMAIL
const AUTH_PASSWORD = process.env.E2E_AUTH_PASSWORD

type ResultStatus = 'PASS' | 'SKIP' | 'FAIL'

const results: Array<{ check: string; status: ResultStatus; detail?: string }> = []

function record(check: string, status: ResultStatus, detail?: string) {
  results.push({ check, status, detail })
  const suffix = detail ? ` - ${detail}` : ''
  console.log(`[${status.padEnd(4)}] ${check}${suffix}`)
}

async function expectVisible(page: Page, selector: string, label: string) {
  const locator = page.locator(selector).first()
  await locator.waitFor({ state: 'visible', timeout: 15_000 })
  record(label, 'PASS')
}

async function validatePublicSurface(page: Page) {
  const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  if (response && response.status() >= 500) throw new Error(`Landing returned HTTP ${response.status()}`)
  await expectVisible(page, 'body', 'landing renders')

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await expectVisible(page, 'input[type="email"]', 'login email input renders')
  await expectVisible(page, 'input[type="password"]', 'login password input renders')
  await expectVisible(page, 'button[type="submit"]', 'login submit renders')
}

async function validateProtectedRedirects(page: Page) {
  const protectedRoutes = ['/lojas', '/pdi', '/devolutivas', '/configuracoes']
  for (const route of protectedRoutes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    record(`protected route redirects: ${route}`, 'PASS')
  }
}

async function validateAuthenticatedFlow(page: Page) {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) {
    record('authenticated login flow', 'SKIP', 'E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD not configured')
    return
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', AUTH_EMAIL)
  await page.fill('input[type="password"]', AUTH_PASSWORD)
  await page.click('button[type="submit"]')
  await page.locator('main#main-content').first().waitFor({ state: 'visible', timeout: 25_000 })
  record('authenticated login flow', 'PASS')

  await page.goto(`${BASE_URL}/lojas`, { waitUntil: 'domcontentloaded' })
  await page.locator('main#main-content').first().waitFor({ state: 'visible', timeout: 25_000 })
  record('authenticated stores route renders', 'PASS')
}

async function main() {
  console.log(`Live E2E smoke target: ${BASE_URL}`)
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await validatePublicSurface(page)
    await validateProtectedRedirects(page)
    await validateAuthenticatedFlow(page)
  } finally {
    await browser.close()
  }

  const failures = results.filter(result => result.status === 'FAIL')
  if (failures.length) process.exit(1)
}

main().catch((error: unknown) => {
  record('live e2e smoke', 'FAIL', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
