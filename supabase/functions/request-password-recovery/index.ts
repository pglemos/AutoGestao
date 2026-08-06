import { corsHeaders } from '../_shared/cors.ts'
import { initSentryForEdge, withSentry } from '../_shared/sentry.ts'
import { sendReportEmail } from '../_shared/email.ts'
import { createResendClient, createServiceClient } from '../_shared/supabase-client.ts'

const adminClient = createServiceClient()
const resend = createResendClient()
const windowSeconds = 15 * 60
const maxAttempts = 3

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || 'unknown'
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

function normalizeRedirectTo(value: unknown) {
  const fallback = 'https://www.mxperformance.com.br/login?recovery=1'
  try {
    const url = new URL(String(value || fallback))
    const localOrigin = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    const allowedOrigins = [
      'https://www.mxperformance.com.br',
      'https://mxperformance.com.br',
      'https://mxperformance.vercel.app',
    ]
    if (!localOrigin && !allowedOrigins.includes(url.origin)) return fallback
    return `${url.origin}/login?recovery=1`
  } catch {
    return fallback
  }
}

// Anti-enumeração: só expomos erro real ao cliente para falhas claramente
// transitórias/de infra. Qualquer outra rejeição do GoTrue (usuário
// inexistente, e-mail inválido pra ele, etc.) cai no genericSuccess() —
// o smoke test da auditoria de 2026-07-24 mostrou que a lista antiga de
// mensagens ("not found"/"does not exist") não cobria todas as variantes
// que o GoTrue retorna pra e-mail sem conta, o que fazia esses casos
// vazarem como erro 502 em vez da mensagem genérica.
function isTransientInfraError(error: { status?: number; message?: string }) {
  const message = String(error.message || '').toLowerCase()
  return (
    error.status === 500 ||
    error.status === 503 ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('unavailable') ||
    message.includes('internal server error') ||
    message.includes('fetch failed') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  )
}

function genericSuccess() {
  return jsonResponse({
    success: true,
    message: 'Se o e-mail estiver autorizado, enviaremos um link para redefinir a senha.',
  })
}

initSentryForEdge()

Deno.serve(req => withSentry('request-password-recovery', req, async () => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  let payload: { email?: unknown; redirect_to?: unknown }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const email = normalizeEmail(payload.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ success: false, error: 'Informe um e-mail válido.' }, 400)
  }

  const key = `${clientIp(req)}:${email}`
  const { data: allowed, error: rateLimitError } = await adminClient.rpc(
    'check_and_increment_recovery_rate_limit',
    { p_key: key, p_window_seconds: windowSeconds, p_max_attempts: maxAttempts },
  )
  if (rateLimitError) {
    console.error('[PasswordRecovery] rate limit check failed:', rateLimitError.message)
    return jsonResponse({ success: false, error: 'Não foi possível processar agora. Tente novamente em alguns minutos.' }, 502)
  }
  if (!allowed) {
    return jsonResponse({ success: false, code: 'rate_limited', error: 'Aguarde alguns minutos antes de solicitar novamente.' }, 429)
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: normalizeRedirectTo(payload.redirect_to) },
  })

  if (error) {
    if (!isTransientInfraError(error)) return genericSuccess()
    console.error('[PasswordRecovery] generateLink failed:', error.message)
    return jsonResponse({ success: false, error: 'Não foi possível enviar o link agora. Tente novamente em alguns minutos.' }, 502)
  }

  const actionLink = data.properties?.action_link
  if (!actionLink) {
    console.error('[PasswordRecovery] Supabase did not return an action link')
    return jsonResponse({ success: false, error: 'Não foi possível gerar o link agora. Tente novamente em alguns minutos.' }, 502)
  }

  const emailResult = await sendReportEmail({
    resend,
    to: [email],
    subject: 'Recuperar acesso | MX Performance',
    storeName: 'MX Performance',
    logPrefix: '[PasswordRecovery]',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#17231d">
        <h1 style="color:#0d3b2e">Redefinir sua senha</h1>
        <p>Recebemos uma solicitação para recuperar o acesso ao MX Performance.</p>
        <p><a href="${escapeHtml(actionLink)}" style="display:inline-block;background:#0d3b2e;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700">Redefinir senha</a></p>
        <p style="font-size:13px;color:#66736b">O link é individual e temporário. Se você não solicitou esta mensagem, ignore este e-mail.</p>
      </div>
    `,
  })

  if (emailResult.status !== 'sent') {
    console.error('[PasswordRecovery] email delivery failed:', emailResult.warnings.join('; '))
    return jsonResponse({ success: false, error: 'Não foi possível entregar o e-mail agora. Tente novamente em alguns minutos.' }, 502)
  }

  return genericSuccess()
}))
