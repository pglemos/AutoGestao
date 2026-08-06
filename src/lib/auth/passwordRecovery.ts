import { getSupabaseFunctionHeaders, getSupabaseFunctionUrl } from '@/lib/supabase'

export class PasswordRecoveryRequestError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'PasswordRecoveryRequestError'
    this.status = status
    this.code = code
  }
}

export async function requestPasswordRecovery(email: string, origin?: string) {
  const redirectOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.mxperformance.com.br')
  const response = await fetch(getSupabaseFunctionUrl('request-password-recovery'), {
    method: 'POST',
    headers: getSupabaseFunctionHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      redirect_to: `${redirectOrigin}/login?recovery=1`,
    }),
  })

  const payload = await response.json().catch(() => null) as { success?: boolean; error?: string; code?: string } | null
  if (!response.ok || !payload?.success) {
    throw new PasswordRecoveryRequestError(
      payload?.error || 'Não foi possível enviar o link agora.',
      response.status,
      payload?.code,
    )
  }

  return payload
}
