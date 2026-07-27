import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const internalAdminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']
const globallyCreatableRoles = [
  'administrador_geral',
  'administrador_mx',
  'consultor_mx',
  'dono',
  'gerente',
  'vendedor',
]
const roleCodeByLegacyRole: Record<string, string> = {
  administrador_geral: 'admin_mx',
  administrador_mx: 'admin_mx',
  consultor_mx: 'consultant',
  dono: 'master',
  gerente: 'sales_manager',
  vendedor: 'seller',
}

interface RegisterUserPayload {
  email: string
  password?: string
  name: string
  role: 'administrador_geral' | 'administrador_mx' | 'consultor_mx' | 'dono' | 'gerente' | 'vendedor'
  store_id?: string
  phone?: string
  started_at?: string
  ended_at?: string | null
  is_active?: boolean
  closing_month_grace?: boolean
  is_venda_loja?: boolean
}

const PASSWORD_POLICY_MESSAGE = 'Password must be at least 6 characters'

function isStrongPassword(password: string) {
  return password.length >= 6
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

async function resolveRoleId(adminClient: SupabaseClient, role: string) {
  const code = roleCodeByLegacyRole[role]
  if (!code) return null
  const { data, error } = await adminClient
    .from('roles')
    .select('id')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
}

async function findAuthUserByEmail(adminClient: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase()
  let page = 1
  const perPage = 1000

  while (page < 50) {
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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function rollbackCreatedUser(adminClient: SupabaseClient, userId: string, deleteAuthUser = true) {
  const rollbackErrors: string[] = []

  const steps = [
    () => adminClient.from('vendedores_loja').delete().eq('seller_user_id', userId),
    () => adminClient.from('vinculos_loja').update({ is_active: false, ended_at: todayISO() }).eq('user_id', userId),
    () => adminClient.from('usuarios').delete().eq('id', userId),
    ...(deleteAuthUser ? [() => adminClient.auth.admin.deleteUser(userId)] : []),
  ]

  for (const step of steps) {
    const { error } = await step()
    if (error) rollbackErrors.push(error.message)
  }

  return rollbackErrors
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ success: false, error: 'Service is misconfigured (missing env)' }, 500)
  }

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: caller, error: callerError } = await userClient.auth.getUser()
  if (callerError || !caller?.user) {
    return jsonResponse({ success: false, error: 'Invalid session' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerProfile } = await adminClient
    .from('usuarios')
    .select('role, active')
    .eq('id', caller.user.id)
    .maybeSingle()

  const callerRole = (callerProfile?.role || '').toLowerCase()
  if (!callerProfile?.active) {
    return jsonResponse({ success: false, error: 'Inactive user' }, 403)
  }

  if (![...internalAdminRoles, 'dono', 'gerente'].includes(callerRole)) {
    return jsonResponse({ success: false, error: 'Insufficient privileges' }, 403)
  }

  let payload: RegisterUserPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const { email, password, name, role, store_id, phone, started_at, ended_at, is_active, closing_month_grace, is_venda_loja } = payload

  if (!email || !name || !role) {
    return jsonResponse({ success: false, error: 'Missing required fields (email, name, role)' }, 400)
  }

  if (!password || !isStrongPassword(password)) {
    return jsonResponse({ success: false, error: PASSWORD_POLICY_MESSAGE }, 400)
  }

  if (!internalAdminRoles.includes(role) && !store_id) {
    return jsonResponse({ success: false, error: 'store_id is required for store-scoped roles' }, 400)
  }

  const allowedRolesByCaller: Record<string, string[]> = {
    administrador_geral: globallyCreatableRoles,
    administrador_mx: globallyCreatableRoles,
    consultor_mx: globallyCreatableRoles,
    dono: ['gerente', 'vendedor'],
    gerente: ['vendedor'],
  }
  if (!allowedRolesByCaller[callerRole]?.includes(role)) {
    return jsonResponse({ success: false, error: `Caller role "${callerRole}" cannot create role "${role}"` }, 403)
  }

  if (['dono', 'gerente'].includes(callerRole)) {
    const { data: callerMembership, error: callerMembershipError } = await adminClient
      .from('vinculos_loja')
      .select('role')
      .eq('user_id', caller.user.id)
      .eq('store_id', store_id)
      .eq('is_active', true)
      .maybeSingle()

    if (callerMembershipError || !callerMembership || callerMembership.role !== callerRole) {
      return jsonResponse({ success: false, error: 'Caller cannot create users outside their own store scope' }, 403)
    }
  }

  let roleId: string | null = null
  try {
    roleId = await resolveRoleId(adminClient, role)
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Não foi possível resolver o papel canônico.' }, 500)
  }
  if (!roleId) {
    return jsonResponse({ success: false, error: `Papel canônico não encontrado para "${role}".` }, 500)
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = name.trim().toLocaleUpperCase('pt-BR')

  const { data: existingProfile } = await adminClient
    .from('usuarios')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (existingProfile) {
    return jsonResponse({ success: false, error: 'Este e-mail já possui cadastro no sistema.' }, 409)
  }

  let existingAuthUser: Awaited<ReturnType<typeof findAuthUserByEmail>> = null
  try {
    existingAuthUser = await findAuthUserByEmail(adminClient, normalizedEmail)
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Não foi possível validar o e-mail no Auth.' }, 500)
  }

  const userMetadata = {
    name: normalizedName,
    role,
    phone: phone || null,
    must_change_password: true,
    is_venda_loja: is_venda_loja ?? false,
  }

  let newUserId: string
  let createdAuthUser = true

  if (existingAuthUser) {
    createdAuthUser = false
    newUserId = existingAuthUser.id
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(newUserId, {
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })
    if (updateAuthError) {
      return jsonResponse({ success: false, error: updateAuthError.message }, 500)
    }
  } else {
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (createError || !created?.user) {
      return jsonResponse({ success: false, error: createError?.message || 'Failed to create auth user' }, 400)
    }

    newUserId = created.user.id
  }

  const { error: profileError } = await adminClient
    .from('usuarios')
    .upsert(
      {
        id: newUserId,
        email: normalizedEmail,
        name: normalizedName,
        role,
        role_id: roleId,
        phone: phone || null,
        active: true,
        must_change_password: true,
        is_venda_loja: is_venda_loja ?? false,
      },
      { onConflict: 'id' },
    )

  if (profileError) {
    await rollbackCreatedUser(adminClient, newUserId, createdAuthUser)
    return jsonResponse({ success: false, error: `User created but profile insert failed: ${profileError.message}` }, 500)
  }

  let membershipCreated = false
  if (!internalAdminRoles.includes(role) && store_id) {
    const { error: membershipError } = await adminClient
      .from('vinculos_loja')
      .upsert(
        { user_id: newUserId, store_id, role, is_active: true, ended_at: null },
        { onConflict: 'user_id,store_id' },
      )

    if (membershipError) {
      await rollbackCreatedUser(adminClient, newUserId, createdAuthUser)
      return jsonResponse({ success: false, error: `Profile created but membership insert failed: ${membershipError.message}` }, 500)
    }
    membershipCreated = true

    if (role === 'vendedor') {
      const { error: tenureError } = await adminClient
        .from('vendedores_loja')
        .upsert(
          {
            store_id,
            seller_user_id: newUserId,
            started_at: started_at || todayISO(),
            ended_at: ended_at || null,
            is_active: is_active ?? true,
            closing_month_grace: closing_month_grace ?? false,
          },
          { onConflict: 'store_id,seller_user_id' },
        )

      if (tenureError) {
        await rollbackCreatedUser(adminClient, newUserId, createdAuthUser)
        return jsonResponse({ success: false, error: `Profile created but seller tenure insert failed: ${tenureError.message}` }, 500)
      }
    }
  }

  const { error: auditError } = await adminClient.from('internal_mx_admin_audit').insert({
    actor_id: caller.user.id,
    actor_role: callerRole,
    action: 'create',
    entity_type: 'usuario',
    entity_id: newUserId,
    store_id: store_id || null,
    before_data: null,
    after_data: {
      id: newUserId,
      email: normalizedEmail,
      name: normalizedName,
      role,
      role_id: roleId,
      active: true,
      is_venda_loja: is_venda_loja ?? false,
    },
    metadata: { membership_created: membershipCreated },
  })
  if (auditError) {
    await rollbackCreatedUser(adminClient, newUserId, createdAuthUser)
    return jsonResponse({ success: false, error: `User created but audit insert failed: ${auditError.message}` }, 500)
  }

  return jsonResponse({
    success: true,
    user_id: newUserId,
    email: normalizedEmail,
    role_id: roleId,
    must_change_password: true,
    membership_created: membershipCreated,
  })
})
