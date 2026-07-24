import { expect, test } from '@playwright/test'
import {
  createE2EPassword,
  createE2EAdminUser,
  createPasswordRecoverySession,
  createPasswordRecoveryLink,
  deleteE2EUser,
  getMustChangePassword,
  type E2EUser,
} from './e2e-helpers/supabase-admin'

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
}

test.describe('Password recovery login flow', () => {
  let user: E2EUser | null = null

  test.afterEach(async () => {
    if (user) {
      await deleteE2EUser(user.id)
      user = null
    }
  })

  test('forgot password request validates email and confirms a generic send message', async ({ page }) => {
    await page.route('**/functions/v1/request-password-recovery*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        // Mock desatualizado (de 2026-05-14): a função sempre respondeu
        // {success:true, message:...} — o client lança erro quando
        // payload.success está ausente (ver requestPasswordRecovery em
        // src/lib/auth/passwordRecovery.ts), então o body vazio nunca
        // bateu com o contrato real da função.
        body: JSON.stringify({
          success: true,
          message: 'Se o e-mail estiver autorizado, enviaremos um link para redefinir a senha.',
        }),
      })
    })

    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Esqueci minha senha/i })).toBeVisible()

    await page.getByRole('button', { name: /Esqueci minha senha/i }).click()
    await expect(page.getByRole('heading', { name: /Recuperar acesso/i })).toBeVisible()

    await page.getByRole('button', { name: /Enviar link/i }).click()
    await expect(page.getByText(/E-mail e obrigatorio/i)).toBeVisible()

    await page.fill('input[type="email"]', 'email-invalido')
    await page.getByRole('button', { name: /Enviar link/i }).click()
    await expect(page.getByText(/Informe um e-mail valido/i)).toBeVisible()

    await page.fill('input[type="email"]', 'pessoa@mxperformance.test')
    await page.getByRole('button', { name: /Enviar link/i }).click()
    await expect(page.getByText(/Se o e-mail estiver autorizado/i)).toBeVisible()
  })

  test('forgot password request handles Supabase resend rate limit as a neutral state', async ({ page }) => {
    await page.route('**/functions/v1/request-password-recovery*', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'over_email_send_rate_limit',
          message: 'For security purposes, you can only request this after 57 seconds.',
        }),
      })
    })

    await page.goto('/login')
    await page.getByRole('button', { name: /Esqueci minha senha/i }).click()
    await page.fill('input[type="email"]', 'rate-limit@mxperformance.test')
    await page.getByRole('button', { name: /Enviar link/i }).click()

    await expect(page.getByText(/Já existe um link recente/i)).toBeVisible()
    await expect(page.getByText(/Não foi possível enviar/i)).toHaveCount(0)
  })

  test('login network failure shows authentication connectivity message', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', async route => {
      await route.abort('namenotresolved')
    })

    await login(page, 'network-failure@mxperformance.test', createE2EPassword())

    await expect(page.getByText(/Não foi possível conectar ao servidor de autenticação/i)).toBeVisible()
    await expect(page.getByText(/E-mail ou senha inválidos/i)).toHaveCount(0)
  })

  test('generated recovery link points to the login recovery route', async ({}, testInfo) => {
    user = await createE2EAdminUser({
      prefix: `password-recovery-link-${testInfo.project.name}`,
      password: createE2EPassword('MxRecoveryLink'),
      mustChangePassword: true,
    })

    const link = await createPasswordRecoveryLink(
      user.email,
      'https://mxperformance.vercel.app/login?recovery=1',
    )

    const url = new URL(link)
    expect(url.origin).toBe('https://fbhcmzzgwjdgkctlfvbo.supabase.co')
    expect(url.pathname).toBe('/auth/v1/verify')
    expect(url.searchParams.get('type')).toBe('recovery')
    expect(url.searchParams.get('redirect_to')).toBe('https://mxperformance.vercel.app/login?recovery=1')
  })

  test('recovery link lets a user set a new password and clears must_change_password', async ({ page }, testInfo) => {
    const temporaryPassword = createE2EPassword('MxRecovery')
    user = await createE2EAdminUser({
      prefix: `password-recovery-${testInfo.project.name}`,
      password: temporaryPassword,
      mustChangePassword: true,
    })

    const recoverySession = await createPasswordRecoverySession(user.email)
    const newPassword = `Mx#${Date.now()}!`

    await page.goto(`/login?recovery=1#access_token=${recoverySession.accessToken}&refresh_token=${recoverySession.refreshToken}&expires_in=${recoverySession.expiresIn}&token_type=bearer&type=recovery`)
    await expect(page.getByRole('heading', { name: /Definir nova senha/i })).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Salvar senha/i }).click()
    await expect(page.getByText(/Nova senha e obrigatoria/i)).toBeVisible()

    await page.fill('#recovery-password', newPassword)
    await page.fill('#recovery-password-confirm', `${newPassword}x`)
    await page.getByRole('button', { name: /Salvar senha/i }).click()
    await expect(page.getByText(/As senhas nao coincidem/i)).toBeVisible()

    await page.fill('#recovery-password-confirm', newPassword)
    await page.getByRole('button', { name: /Salvar senha/i }).click()
    await expect(page.getByText(/Senha redefinida com sucesso/i)).toBeVisible({ timeout: 15000 })
    await expect.poll(() => getMustChangePassword(user!.id), { timeout: 15000 }).toBe(false)

    await login(page, user.email, temporaryPassword)
    await expect(page.getByText(/E-mail ou senha inválidos/i)).toBeVisible()

    await login(page, user.email, newPassword)
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 })
    await expect(page).toHaveURL(/\/(painel|dashboard|home|lojas|loja)/, { timeout: 15000 })
  })
})
