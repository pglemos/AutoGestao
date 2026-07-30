// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { findSupabaseSecretKey } from '../_shared/api-keys.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentryForEdge, withSentry } from '../_shared/sentry.ts'
import { sendReportEmail } from '../_shared/email.ts'
import { createResendClient } from '../_shared/supabase-client.ts'

const allowedRoles = ['dono', 'gerente', 'vendedor']
const passwordChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
const recoveryRedirectTo = 'https://mxperformance.vercel.app/login?recovery=1'
const PRE_REGISTRATION_SELECT = [
  'id',
  'status',
  'auth_user_id',
  'store_id',
  'full_name',
  'email',
  'phone',
  'role',
  'avatar_url',
  'company_legal_name',
  'company_cnpj',
  'company_address',
  'company_administrative_phone',
].join(', ')

type SupabaseAdminClient = {
  auth: any
  from: (table: string) => any
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clean(value: unknown, max = 240) {
  return String(value || '').trim().slice(0, max)
}

function generateTemporaryPassword(length = 18) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => passwordChars[byte % passwordChars.length]).join('')
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

initSentryForEdge()

serve((req) => withSentry('approve-store-registration', req, async () => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = findSupabaseSecretKey(Deno.env.get) ?? ''
  if (!supabaseUrl || !serviceKey) return jsonResponse({ success: false, error: 'Service is misconfigured' }, 500)

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return jsonResponse({ success: false, error: 'Sessão inválida.' }, 401)

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as SupabaseAdminClient
  const resend = createResendClient()

  const { data: authData, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !authData.user) return jsonResponse({ success: false, error: 'Sessão inválida.' }, 401)

  const { data: reviewer, error: reviewerError } = await adminClient
    .from('usuarios')
    .select('id, role, active')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (reviewerError) return jsonResponse({ success: false, error: reviewerError.message }, 500)
  if (!reviewer?.active || !['administrador_geral', 'administrador_mx'].includes(reviewer.role)) {
    return jsonResponse({ success: false, error: 'Apenas Admin MX e MX Master podem aprovar logins.' }, 403)
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const preRegistrationId = clean(payload.pre_registration_id, 80)
  const action = clean(payload.action, 20)
  const approvedRole = clean(payload.role, 40)
  const note = clean(payload.note, 600)

  if (!preRegistrationId || !['approve', 'reject'].includes(action)) {
    return jsonResponse({ success: false, error: 'Ação inválida.' }, 400)
  }

  const { data: preRegistration, error: preRegistrationError } = await adminClient
    .from('pre_cadastros_loja')
    .select(PRE_REGISTRATION_SELECT)
    .eq('id', preRegistrationId)
    .maybeSingle()

  if (preRegistrationError) return jsonResponse({ success: false, error: preRegistrationError.message }, 500)
  if (!preRegistration) return jsonResponse({ success: false, error: 'Pré-cadastro não encontrado.' }, 404)
  if (preRegistration.status !== 'pending') return jsonResponse({ success: false, error: 'Este login já foi revisado.' }, 409)
  if (!preRegistration.auth_user_id) return jsonResponse({ success: false, error: 'Pré-cadastro sem usuário vinculado.' }, 422)

  const finalRole = allowedRoles.includes(approvedRole) ? approvedRole : preRegistration.role

  if (action === 'reject') {
    await adminClient
      .from('vendedores_loja')
      .update({ is_active: false, ended_at: new Date().toISOString().slice(0, 10) })
      .eq('seller_user_id', preRegistration.auth_user_id)
      .eq('store_id', preRegistration.store_id)
    await adminClient
      .from('vinculos_loja')
      .update({ is_active: false, ended_at: new Date().toISOString().slice(0, 10) })
      .eq('user_id', preRegistration.auth_user_id)
      .eq('store_id', preRegistration.store_id)
    await adminClient.from('usuarios').update({ active: false }).eq('id', preRegistration.auth_user_id)
    await adminClient.from('pre_cadastros_loja').update({
      status: 'rejected',
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      rejected_by: reviewer.id,
      rejected_at: new Date().toISOString(),
      approval_note: note || null,
    }).eq('id', preRegistration.id)
    return jsonResponse({ success: true, status: 'rejected' })
  }

  const temporaryPassword = generateTemporaryPassword()
  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(preRegistration.auth_user_id, {
    password: temporaryPassword,
    user_metadata: {
      name: preRegistration.full_name,
      role: finalRole,
      phone: preRegistration.phone,
      avatar_url: preRegistration.avatar_url,
      must_change_password: true,
      store_id: preRegistration.store_id,
    },
  })

  if (authUpdateError) return jsonResponse({ success: false, error: authUpdateError.message }, 500)

  const { error: userError } = await adminClient.from('usuarios').update({
    name: preRegistration.full_name,
    email: preRegistration.email,
    phone: preRegistration.phone,
    role: finalRole,
    avatar_url: preRegistration.avatar_url,
    active: true,
    must_change_password: true,
    is_venda_loja: finalRole === 'vendedor',
  }).eq('id', preRegistration.auth_user_id)

  if (userError) return jsonResponse({ success: false, error: userError.message }, 500)

  const { error: membershipError } = await adminClient.from('vinculos_loja').upsert({
    user_id: preRegistration.auth_user_id,
    store_id: preRegistration.store_id,
    role: finalRole,
    is_active: true,
    ended_at: null,
  }, { onConflict: 'user_id,store_id' })

  if (membershipError) return jsonResponse({ success: false, error: membershipError.message }, 500)

  if (finalRole === 'dono') {
    const storePayload: Record<string, string> = {}
    if (preRegistration.company_legal_name) storePayload.legal_name = preRegistration.company_legal_name
    if (preRegistration.company_cnpj) storePayload.cnpj = preRegistration.company_cnpj
    if (preRegistration.company_address) storePayload.address = preRegistration.company_address
    if (preRegistration.company_administrative_phone) storePayload.administrative_phone = preRegistration.company_administrative_phone

    if (Object.keys(storePayload).length) {
      const { error: storeUpdateError } = await adminClient
        .from('lojas')
        .update(storePayload)
        .eq('id', preRegistration.store_id)
      if (storeUpdateError) return jsonResponse({ success: false, error: storeUpdateError.message }, 500)
    }
  }

  if (finalRole === 'vendedor') {
    const { error: sellerError } = await adminClient.from('vendedores_loja').upsert({
      seller_user_id: preRegistration.auth_user_id,
      store_id: preRegistration.store_id,
      started_at: new Date().toISOString().slice(0, 10),
      ended_at: null,
      is_active: true,
      closing_month_grace: false,
    }, { onConflict: 'store_id,seller_user_id' })
    if (sellerError) return jsonResponse({ success: false, error: sellerError.message }, 500)
  } else {
    await adminClient
      .from('vendedores_loja')
      .update({ is_active: false, ended_at: new Date().toISOString().slice(0, 10) })
      .eq('seller_user_id', preRegistration.auth_user_id)
      .eq('store_id', preRegistration.store_id)
  }

  const { error: updateError } = await adminClient.from('pre_cadastros_loja').update({
    role: finalRole,
    status: 'synced',
    reviewed_by: reviewer.id,
    reviewed_at: new Date().toISOString(),
    approved_by: reviewer.id,
    approved_at: new Date().toISOString(),
    approval_note: note || null,
  }).eq('id', preRegistration.id)

  if (updateError) return jsonResponse({ success: false, error: updateError.message }, 500)

  let emailStatus: 'sent' | 'failed' | 'not_sent' = 'not_sent'
  let emailWarning = ''
  let actionLink = ''

  const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: preRegistration.email,
    options: { redirectTo: recoveryRedirectTo },
  })

  if (recoveryError || !recoveryData?.properties?.action_link) {
    emailStatus = 'failed'
    emailWarning = 'Não foi possível gerar o link de criação de senha.'
    console.error('[ApproveStoreRegistration] recovery link failed:', recoveryError?.message || 'link ausente')
  } else {
    actionLink = recoveryData.properties.action_link
    const emailResult = await sendReportEmail({
      resend,
      to: [preRegistration.email],
      subject: 'Acesso aprovado | MX Performance',
      storeName: 'MX Performance',
      logPrefix: '[ApproveStoreRegistration]',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#17231d">
          <h1 style="color:#0d3b2e">Seu acesso foi aprovado</h1>
          <p>Seu cadastro foi aprovado e o acesso ao MX Performance está pronto.</p>
          <p><a href="${escapeHtml(actionLink)}" style="display:inline-block;background:#0d3b2e;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700">Criar minha senha</a></p>
          <p style="font-size:13px;color:#66736b">O link é individual e temporário. Se você não solicitou este cadastro, ignore este e-mail.</p>
        </div>
      `,
    })
    emailStatus = emailResult.status
    if (emailStatus !== 'sent') emailWarning = 'O cadastro foi aprovado, mas não foi possível entregar o e-mail de criação de senha.'
  }

  return jsonResponse({
    success: true,
    status: 'synced',
    role: finalRole,
    login_email: preRegistration.email,
    email_status: emailStatus,
    ...(emailWarning ? { email_warning: emailWarning } : {}),
    ...(emailStatus === 'sent' ? {} : { temporary_password: temporaryPassword }),
  })
}))
