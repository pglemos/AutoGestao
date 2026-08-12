import { createClient, type Session } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { skipManagerTour } from './auth'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function createShortLivedOwnerSession(email: string): Promise<Session> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL, anon key e service role são obrigatórios sem senha E2E')
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const tokenHash = link.properties?.hashed_token
  if (linkError || !tokenHash) throw new Error('Não foi possível emitir a sessão E2E do Dono')

  const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: verified, error: verifyError } = await auth.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })
  if (verifyError || !verified.session) throw new Error('Não foi possível validar a sessão E2E do Dono')
  return verified.session
}

async function installOwnerSession(page: Page, session: Session) {
  if (!SUPABASE_URL) throw new Error('Supabase URL obrigatória para instalar a sessão E2E')
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ storageKey, authSession }) => localStorage.setItem(storageKey, JSON.stringify(authSession)),
    { storageKey: `sb-${projectRef}-auth-token`, authSession: session },
  )
  await page.reload({ waitUntil: 'networkidle' })
}

export async function loginAsOwner(
  page: Page,
  options: { email?: string; password?: string } = {},
) {
  await skipManagerTour(page)
  const email = options.email || process.env.E2E_OWNER_EMAIL
  const password = options.password || process.env.E2E_ROLE_PASSWORD || process.env.E2E_AUTH_PASSWORD

  if (!email) {
    throw new Error('E2E_OWNER_EMAIL é obrigatório para autenticar o Dono nos testes E2E')
  }

  if (!password) {
    await installOwnerSession(page, await createShortLivedOwnerSession(email))
    await page.waitForURL(/\/(dono|lojas|home|painel)/, { timeout: 30_000 })
    return
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dono|lojas|home|painel)/, { timeout: 30_000 })
}
