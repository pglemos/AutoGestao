import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://esm.sh/zod@3.23.8'
import { findSupabasePublishableKey, findSupabaseSecretKey } from '../_shared/api-keys.ts'
import { corsHeaders } from '../_shared/cors.ts'

const internalAdminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const
const globallyCreatableRoles = [
  'administrador_geral',
  'administrador_mx',
  'consultor_mx',
  'dono',
  'gerente',
  'vendedor',
] as const

const uuidSchema = z.string().uuid()
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const payloadSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(128),
  name: z.string().trim().min(1).max(160),
  role: z.enum(globallyCreatableRoles),
  store_id: uuidSchema.optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  started_at: dateSchema.optional(),
  ended_at: dateSchema.nullable().optional(),
  is_active: z.boolean().optional(),
  closing_month_grace: z.boolean().optional(),
  is_venda_loja: z.boolean().optional(),
}).strict()

type RegisterUserPayload = z.infer<typeof payloadSchema>

const PASSWORD_POLICY_MESSAGE = 'Password must be at least 6 characters'

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function genericFailure(status = 500, message = 'Não foi possível cadastrar o usuário.') {
  return jsonResponse({ success: false, error: message }, status)
}

async function findAuthUserByEmail(adminClient: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase()
  let page = 1
  const perPage = 1000

  while (page <= 50) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users || []
    const found = users.find((user) => (user.email || '').toLowerCase() === normalized)
    if (found) return found
    if (users.length < perPage) return null
    page += 1
  }

  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = findSupabaseSecretKey(Deno.env.get) ?? ''
  const anonKey = findSupabasePublishableKey(Deno.env.get) ?? ''
  if (!supabaseUrl || !serviceKey || !anonKey) return genericFailure()

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: caller, error: callerError } = await userClient.auth.getUser()
  if (callerError || !caller?.user) return jsonResponse({ success: false, error: 'Invalid session' }, 401)

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('usuarios')
    .select('role, active')
    .eq('id', caller.user.id)
    .maybeSingle()

  if (callerProfileError) {
    console.error('register-user caller lookup failure', { callerId: caller.user.id, callerProfileError })
    return genericFailure()
  }

  const callerRole = String(callerProfile?.role || '').toLowerCase()
  if (!callerProfile?.active || ![...internalAdminRoles, 'dono', 'gerente'].includes(callerRole)) {
    return jsonResponse({ success: false, error: 'Insufficient privileges' }, 403)
  }

  let rawPayload: unknown
  try {
    rawPayload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const parsed = payloadSchema.safeParse(rawPayload)
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.some((issue) => issue.path[0] === 'password')
    return jsonResponse({
      success: false,
      error: passwordIssue ? PASSWORD_POLICY_MESSAGE : 'Invalid payload',
    }, 400)
  }

  const payload: RegisterUserPayload = parsed.data
  const allowedRolesByCaller: Record<string, readonly string[]> = {
    administrador_geral: globallyCreatableRoles,
    administrador_mx: globallyCreatableRoles,
    consultor_mx: globallyCreatableRoles,
    dono: ['gerente', 'vendedor'],
    gerente: ['vendedor'],
  }

  if (!allowedRolesByCaller[callerRole]?.includes(payload.role)) {
    return jsonResponse({ success: false, error: 'Caller cannot create the requested role' }, 403)
  }
  if (!internalAdminRoles.includes(payload.role as typeof internalAdminRoles[number]) && !payload.store_id) {
    return jsonResponse({ success: false, error: 'store_id is required for store-scoped roles' }, 400)
  }

  const { data: rateLimitAllowed, error: rateLimitError } = await adminClient.rpc(
    'internal_mx_consume_admin_rate_limit',
    {
      p_actor_id: caller.user.id,
      p_action: 'register-user',
      p_max_attempts: 20,
      p_window_seconds: 60,
    },
  )

  if (rateLimitError) {
    console.error('register-user rate limit failure', { callerId: caller.user.id, rateLimitError })
    return genericFailure()
  }
  if (!rateLimitAllowed) {
    return jsonResponse({ success: false, error: 'Muitos cadastros em sequência. Aguarde e tente novamente.' }, 429)
  }

  const normalizedEmail = payload.email.trim().toLowerCase()
  const normalizedName = payload.name.trim().toLocaleUpperCase('pt-BR')

  const { data: existingProfile, error: profileLookupError } = await adminClient
    .from('usuarios')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (profileLookupError) {
    console.error('register-user profile duplicate check failure', { normalizedEmail, profileLookupError })
    return genericFailure()
  }
  if (existingProfile) {
    return jsonResponse({ success: false, error: 'Este e-mail já possui cadastro no sistema.' }, 409)
  }

  let existingAuthUser: Awaited<ReturnType<typeof findAuthUserByEmail>> = null
  try {
    existingAuthUser = await findAuthUserByEmail(adminClient, normalizedEmail)
  } catch (error) {
    console.error('register-user auth duplicate check failure', { normalizedEmail, error })
    return genericFailure()
  }

  if (existingAuthUser) {
    return jsonResponse({
      success: false,
      error: 'Este e-mail já existe na autenticação e precisa ser regularizado pelo suporte antes do cadastro.',
    }, 409)
  }

  const userMetadata = {
    name: normalizedName,
    role: payload.role,
    phone: payload.phone || null,
    must_change_password: true,
    is_venda_loja: payload.is_venda_loja ?? false,
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: payload.password,
    email_confirm: true,
    user_metadata: userMetadata,
  })

  if (createError || !created?.user) {
    console.error('register-user auth creation failure', { normalizedEmail, createError })
    return genericFailure(createError ? 400 : 500)
  }

  const newUserId = created.user.id

  const { data: finalized, error: finalizeError } = await adminClient.rpc(
    'internal_mx_finalize_registered_user',
    {
      p_actor_id: caller.user.id,
      p_user_id: newUserId,
      p_email: normalizedEmail,
      p_name: normalizedName,
      p_role: payload.role,
      p_store_id: payload.store_id || null,
      p_phone: payload.phone || null,
      p_started_at: payload.started_at || null,
      p_ended_at: payload.ended_at || null,
      p_is_active: payload.is_active ?? true,
      p_closing_month_grace: payload.closing_month_grace ?? false,
      p_is_venda_loja: payload.is_venda_loja ?? false,
    },
  )

  if (finalizeError) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(newUserId)
    console.error('register-user transactional finalization failure', {
      newUserId,
      finalizeError,
      rollbackError,
    })

    return genericFailure(
      500,
      rollbackError
        ? 'O cadastro falhou e a reversão ficou incompleta. Contate o suporte.'
        : 'O cadastro falhou e a criação foi revertida.',
    )
  }

  return jsonResponse({
    success: true,
    user_id: newUserId,
    email: normalizedEmail,
    role: payload.role,
    user: finalized,
  })
})
