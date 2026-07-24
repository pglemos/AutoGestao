import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']
const storeRoles = ['dono', 'gerente', 'vendedor']
const adminRoles = ['administrador_geral', 'administrador_mx']
type StoreRole = 'dono' | 'gerente' | 'vendedor'
type CallerRole = 'administrador_geral' | 'administrador_mx' | 'dono' | 'gerente'
type TeamAction = 'update' | 'delete'

type TeamUpdates = {
  role?: StoreRole
  name?: string
  email?: string
  phone?: string | null
  active?: boolean
  is_venda_loja?: boolean
  started_at?: string
  ended_at?: string | null
  is_active?: boolean
  closing_month_grace?: boolean
}

type TeamPayload = {
  action?: TeamAction
  user_id?: string
  store_id?: string
  previous_store_id?: string
  updates?: TeamUpdates
}

type UserProfileRow = {
  role: string
  active: boolean
}

type StoreMembershipRow = {
  role: StoreRole
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

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
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: caller, error: callerError } = await userClient.auth.getUser()
  if (callerError || !caller?.user) return jsonResponse({ success: false, error: 'Invalid session' }, 401)

  const { data: callerProfile } = await adminClient
    .from('usuarios')
    .select('role, active')
    .eq('id', caller.user.id)
    .maybeSingle()

  const callerRole = (callerProfile?.role || '').toLowerCase()
  if (!callerProfile?.active) {
    return jsonResponse({ success: false, error: 'Inactive user' }, 403)
  }

  if (!['administrador_geral', 'administrador_mx', 'dono', 'gerente'].includes(callerRole)) {
    return jsonResponse({ success: false, error: 'Insufficient privileges' }, 403)
  }

  let payload: TeamPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const action = payload.action ?? ''
  const userId = payload.user_id
  const targetStoreId = payload.store_id
  const previousStoreId = payload.previous_store_id || targetStoreId
  if (!['update', 'delete'].includes(action) || !userId || !targetStoreId) {
    return jsonResponse({ success: false, error: 'Missing required fields (action, user_id, store_id)' }, 400)
  }

  const isAdmin = adminRoles.includes(callerRole)
  const typedCallerRole = callerRole as CallerRole
  if (!isAdmin) {
    const { data: managerMembership } = await adminClient
      .from('vinculos_loja')
      .select('role')
      .eq('user_id', caller.user.id)
      .eq('store_id', targetStoreId)
      .eq('is_active', true)
      .in('role', ['dono', 'gerente'])
      .maybeSingle()

    if (!managerMembership) {
      return jsonResponse({ success: false, error: 'Caller cannot manage this store' }, 403)
    }

    if (previousStoreId && previousStoreId !== targetStoreId) {
      const { data: previousManagerMembership } = await adminClient
        .from('vinculos_loja')
        .select('role')
        .eq('user_id', caller.user.id)
        .eq('store_id', previousStoreId)
        .eq('is_active', true)
        .in('role', ['dono', 'gerente'])
        .maybeSingle()

      if (!previousManagerMembership) {
        return jsonResponse({ success: false, error: 'Caller cannot manage previous store' }, 403)
      }
    }
  }

  if (!isAdmin && userId === caller.user.id) {
    return jsonResponse({ success: false, error: 'Store managers cannot alter their own team access' }, 403)
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('usuarios')
    .select('role, active')
    .eq('id', userId)
    .maybeSingle()

  if (targetProfileError) return jsonResponse({ success: false, error: targetProfileError.message }, 500)
  if (!targetProfile) return jsonResponse({ success: false, error: 'Target user not found' }, 404)

  const { data: targetMembership } = await adminClient
    .from('vinculos_loja')
    .select('role')
    .eq('user_id', userId)
    .eq('store_id', targetStoreId)
    .eq('is_active', true)
    .maybeSingle()
  const targetMembershipRow = targetMembership as StoreMembershipRow | null

  if (!isAdmin && !targetMembershipRow) {
    return jsonResponse({ success: false, error: 'Target user is not a member of this managed store' }, 403)
  }

  if (!isAdmin && previousStoreId && previousStoreId !== targetStoreId) {
    return jsonResponse({ success: false, error: 'Store managers cannot move users between stores' }, 403)
  }

  let previousMembership: StoreMembershipRow | null = null
  if (previousStoreId) {
    const { data } = await adminClient
      .from('vinculos_loja')
      .select('role')
      .eq('user_id', userId)
      .eq('store_id', previousStoreId)
      .eq('is_active', true)
      .maybeSingle()
    previousMembership = data as StoreMembershipRow | null
  }

  const targetCurrentRole = (previousMembership?.role || targetMembershipRow?.role || targetProfile.role || '').toLowerCase()
  if (!isAdmin) {
    if (internalRoles.includes(targetCurrentRole)) {
      return jsonResponse({ success: false, error: 'Internal MX users can only be managed by admin' }, 403)
    }
    if (typedCallerRole === 'gerente' && targetCurrentRole !== 'vendedor') {
      return jsonResponse({ success: false, error: 'Gerente can manage only vendedores' }, 403)
    }
    if (typedCallerRole === 'dono' && targetCurrentRole === 'dono') {
      return jsonResponse({ success: false, error: 'Dono cannot alter another dono' }, 403)
    }
  }

  if (action === 'delete') {
    const endedAt = todayISO()
    const { error: tenureError } = await adminClient
      .from('vendedores_loja')
      .update({ is_active: false, ended_at: endedAt })
      .eq('store_id', targetStoreId)
      .eq('seller_user_id', userId)
    if (tenureError) return jsonResponse({ success: false, error: tenureError.message }, 500)

    const { error: membershipError } = await adminClient
      .from('vinculos_loja')
      .update({ is_active: false, ended_at: endedAt })
      .eq('store_id', targetStoreId)
      .eq('user_id', userId)
    if (membershipError) return jsonResponse({ success: false, error: membershipError.message }, 500)

    const { data: remainingMemberships, error: remainingError } = await adminClient
      .from('vinculos_loja')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
    if (remainingError) return jsonResponse({ success: false, error: remainingError.message }, 500)

    if (!remainingMemberships?.length) {
      const { error: userError } = await adminClient.from('usuarios').update({ active: false }).eq('id', userId)
      if (userError) return jsonResponse({ success: false, error: userError.message }, 500)
    }

    return jsonResponse({ success: true })
  }

  const updates = payload.updates || {}
  const nextRole = updates.role || 'vendedor'
  if (internalRoles.includes(nextRole)) {
    return jsonResponse({ success: false, error: 'Internal MX roles are not valid store team roles' }, 400)
  }

  if (!storeRoles.includes(nextRole) || (!isAdmin && typedCallerRole === 'gerente' && nextRole !== 'vendedor') || (!isAdmin && typedCallerRole === 'dono' && nextRole === 'dono')) {
    return jsonResponse({ success: false, error: `Caller role "${callerRole}" cannot set role "${nextRole}"` }, 403)
  }

  const userPayload: Record<string, unknown> = {}
  if (typeof updates.name !== 'undefined') userPayload.name = String(updates.name).trim().toLocaleUpperCase('pt-BR')
  if (typeof updates.email !== 'undefined') userPayload.email = String(updates.email).trim().toLowerCase()
  if (typeof updates.phone !== 'undefined') userPayload.phone = updates.phone || null
  if (typeof updates.active !== 'undefined') userPayload.active = Boolean(updates.active)
  if (typeof updates.is_venda_loja !== 'undefined') userPayload.is_venda_loja = Boolean(updates.is_venda_loja)
  userPayload.role = nextRole

  // usuarios.email e auth.users.email precisam ficar em sincronia: sem isto,
  // trocar o e-mail aqui derruba silenciosamente login e recuperação de senha
  // pro e-mail antigo (auth.users nunca muda) enquanto o resto do app já
  // mostra o e-mail novo.
  if (typeof userPayload.email === 'string') {
    const { error: authEmailError } = await adminClient.auth.admin.updateUserById(userId, {
      email: userPayload.email,
      email_confirm: true,
    })
    if (authEmailError) return jsonResponse({ success: false, error: authEmailError.message }, 500)
  }

  if (Object.keys(userPayload).length) {
    const { error: userError } = await adminClient.from('usuarios').update(userPayload).eq('id', userId)
    if (userError) return jsonResponse({ success: false, error: userError.message }, 500)
  }

  if (previousStoreId && previousStoreId !== targetStoreId) {
    const { error: previousMembershipError } = await adminClient
      .from('vinculos_loja')
      .update({ is_active: false, ended_at: updates.ended_at || todayISO() })
      .eq('user_id', userId)
      .eq('store_id', previousStoreId)
    if (previousMembershipError) return jsonResponse({ success: false, error: previousMembershipError.message }, 500)

    await adminClient
      .from('vendedores_loja')
      .update({ is_active: false, ended_at: updates.ended_at || todayISO() })
      .eq('store_id', previousStoreId)
      .eq('seller_user_id', userId)
  }

  const { error: membershipError } = await adminClient
    .from('vinculos_loja')
    .upsert({ user_id: userId, store_id: targetStoreId, role: nextRole, is_active: true, ended_at: null }, { onConflict: 'user_id,store_id' })
  if (membershipError) return jsonResponse({ success: false, error: membershipError.message }, 500)

  if (nextRole === 'vendedor') {
    const { error: tenureError } = await adminClient
      .from('vendedores_loja')
      .upsert({
        store_id: targetStoreId,
        seller_user_id: userId,
        started_at: updates.started_at || todayISO(),
        ended_at: updates.ended_at || null,
        is_active: updates.is_active ?? updates.active ?? true,
        closing_month_grace: updates.closing_month_grace ?? false,
      }, { onConflict: 'store_id,seller_user_id' })
    if (tenureError) return jsonResponse({ success: false, error: tenureError.message }, 500)
  } else {
    await adminClient
      .from('vendedores_loja')
      .update({ is_active: false, ended_at: updates.ended_at || todayISO() })
      .eq('store_id', targetStoreId)
      .eq('seller_user_id', userId)
  }

  return jsonResponse({ success: true })
})
