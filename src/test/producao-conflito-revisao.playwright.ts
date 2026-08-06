import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * AC-4 — duas sessões não se sobrescrevem em silêncio.
 *
 * Exercita `submit_checkin` com uma revisão que já ficou para trás, usando a
 * sessão autenticada real do vendedor no navegador. Só grava rascunho.
 */
test('revisão desatualizada é recusada com DRAFT_VERSION_CONFLICT', async ({ page }) => {
  await loginWithCredentials(page, process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br', getE2ERolePassword())
  await page.goto('/fechamento-diario')
  await expect(page.getByTestId('checkin-autosave-status')).toBeVisible({ timeout: 30_000 })

  const supabaseUrl = process.env.VITE_SUPABASE_URL as string
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY as string
  expect(supabaseUrl, 'VITE_SUPABASE_URL no ambiente').toBeTruthy()
  expect(anonKey, 'VITE_SUPABASE_ANON_KEY no ambiente').toBeTruthy()

  const resultado = await page.evaluate(async ({ supabaseUrl, anonKey }) => {
    // O client do bundle não é exposto em produção. A sessão vive no
    // localStorage do Supabase; usamos o próprio access_token do vendedor
    // para falar com a RPC, exatamente como o app faz.
    const chave = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k))
    if (!chave) return { erro: 'sessão não encontrada no localStorage' }
    const sessao = JSON.parse(localStorage.getItem(chave) || '{}')
    const token = sessao?.access_token
    const uid = sessao?.user?.id
    if (!token || !uid) return { erro: 'token/uid ausentes' }

    const headers = { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    const linhaResp = await fetch(
      `${supabaseUrl}/rest/v1/lancamentos_diarios?select=id,store_id,reference_date,draft_revision` +
      `&seller_user_id=eq.${uid}&submission_status=eq.draft&order=updated_at.desc&limit=1`,
      { headers },
    )
    const linhas = await linhaResp.json()
    const linha = Array.isArray(linhas) ? linhas[0] : null
    if (!linha) return { erro: 'sem rascunho para testar' }

    const base = {
      seller_user_id: uid,
      store_id: linha.store_id,
      reference_date: linha.reference_date,
      metric_scope: 'daily',
      submission_status: 'draft',
      visit_prev_day: 1,
    }
    const chamar = async (revisao: number) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_checkin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_payload: { ...base, expected_draft_revision: revisao } }),
      })
      return r.json()
    }

    const atual = linha.draft_revision ?? 0
    const conflito = await chamar(Math.max(0, atual - 1))
    const aceita = await chamar(atual)
    return { revisaoConhecida: atual, conflito, aceita }
  }, { supabaseUrl, anonKey })

  console.log('RESULTADO:', JSON.stringify(resultado))
  expect((resultado as any).erro).toBeUndefined()
  expect((resultado as any).conflito?.ok).toBe(false)
  expect((resultado as any).conflito?.code).toBe('DRAFT_VERSION_CONFLICT')
  expect((resultado as any).conflito?.data?.server_revision).toBeGreaterThanOrEqual(0)
  // A revisão correta continua sendo aceita: o guard não trava o uso legítimo.
  expect((resultado as any).aceita?.ok).toBe(true)
})
