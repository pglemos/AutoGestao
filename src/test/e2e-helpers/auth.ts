import { expect, test, type Page } from '@playwright/test'

const E2E_AUTH_EMAIL_SKIP_REASON = 'E2E authenticated tests require E2E_AUTH_EMAIL in the local environment.'
const E2E_AUTH_PASSWORD_SKIP_REASON = 'E2E authenticated tests require E2E_AUTH_PASSWORD in the local environment.'

export function getE2EInternalEmail() {
  const email = process.env.E2E_AUTH_EMAIL
  if (!email) {
    test.skip(true, E2E_AUTH_EMAIL_SKIP_REASON)
    return '__missing_e2e_auth_email__@example.test'
  }
  return email
}

export function getE2EPassword() {
  const password = process.env.E2E_AUTH_PASSWORD
  if (!password) {
    test.skip(true, E2E_AUTH_PASSWORD_SKIP_REASON)
    return '__missing_e2e_auth_password__'
  }
  return password
}

export function getE2ERolePassword() {
  return process.env.E2E_ROLE_PASSWORD || getE2EPassword()
}

export function getE2EInternalCredentials() {
  return {
    email: getE2EInternalEmail(),
    password: getE2EPassword(),
  }
}

/**
 * O Tour do Gerente abre sozinho nas três primeiras visitas de cada rota e
 * cobre a tela com um overlay `role="dialog"`. Como o Playwright começa com
 * perfil limpo a cada execução, ele abriria em todo teste autenticado e
 * interceptaria os cliques. Marcar as rotas como "tour já pulado" antes da
 * navegação reproduz o estado de um usuário que já conhece a tela.
 */
export async function skipManagerTour(page: Page) {
  await page.addInitScript(() => {
    try {
      // Chaves = `location.pathname`, iguais às de MANAGER_TOURS.
      const rotas = [
        '/home', '/meta-loja', '/rotina', '/fechamento-diario', '/rotina-equipe',
        '/minha-equipe', '/mentor', '/feedbacks-pdis', '/ranking', '/universidade-mx',
      ]
      const pulados: Record<string, boolean> = {}
      for (const rota of rotas) pulados[rota] = true
      window.localStorage.setItem('mx_tour_skipped', JSON.stringify(pulados))
    } catch {
      // Sem storage o tour não memoriza nada; o teste segue e trata o overlay.
    }
  })
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await skipManagerTour(page)
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await expect(page.locator('main#main-content').first()).toBeVisible({ timeout: 20000 })
}

export async function loginAsInternalMx(page: Page) {
  const { email, password } = getE2EInternalCredentials()
  await loginWithCredentials(page, email, password)
}

export function getE2ESellerEmail() {
  const email = process.env.E2E_SELLER_EMAIL
  if (!email) {
    test.skip(true, 'E2E seller tests require E2E_SELLER_EMAIL in the local environment.')
    return '__missing_e2e_seller_email__@example.test'
  }
  return email
}

export async function loginAsSeller(page: Page) {
  await loginWithCredentials(page, getE2ESellerEmail(), getE2ERolePassword())
}
