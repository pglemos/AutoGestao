import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const internalAdminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']
const supportedRoles = [...internalAdminRoles, 'dono', 'gerente', 'vendedor']
const roleCodeByLegacyRole: Record<string, string> = {
  administrador_geral: 'admin_mx',
  administrador_mx: 'admin_mx',
  consultor_mx: 'consultant',
  dono: 'master',
  gerente: 'sales_manager',
  vendedor: 'seller',
}

type GlobalUserAction = 'update' | 'delete' | 'force_password_change'

type GlobalUserUpdates = {
  name?: string
  email?: string
  phone?: string | null
  role?: string
  active?: boolean
  is_venda_loja?: boolean
  store_id?: string | null
  previous_store_id?: string | null
  started_at?: string
  ended_at?: string | null
  is_active?: boolean
  closing_month_grace?: boolean
}

type GlobalUserPayload = {
  action?: GlobalUserAction
  user_id?: string
  updates?: GlobalUserUpdates
  hard_delete?: boolean
  reason?: string
}

type UserProfile = {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  role_id: string | null
  active: boolean
  is_venda_loja: boolean
  must_change_password: boolean
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

async function writeAudit(
  adminClient: SupabaseClient,
  input: {
    actorId: string
    actorRole: string
    action: string
    entityId: string
    storeId?: string | null
    beforeData?: unknown
    afterData?: unknown
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await adminClient.from('internal_mx_admin_audit').insert({
    actor_id: input.actorId,
    actor_role: input.actorRole,
    action: input.action,
    entity_type: 'usuario',
    entity_id: input.entityId,
    store_id: input.storeId || null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    metadata: input.metadata || {},
  })
  if (error) throw error
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

async function findHardDeleteBlockers(adminClient: SupabaseClient, userId: string) {
  const checks = [
    ['lancamentos_diarios', 'seller_user_id'],
    ['clientes', 'seller_user_id'],
    ['oportunidades', 'seller_user_id'],
    ['agendamentos', 'seller_user_id'],
    ['atendimentos', 'seller_user_id'],
    ['seller_routine_snapshots', 'seller_user_id'],
    ['manager_routine_snapshots', 'manager_user_id'],
    ['pdis', 'seller_id'],
    ['pdis', 'manager_id'],
    ['devolutivas', 'seller_id'],
    ['devolutivas', 'manager_id'],
    ['planos_acao', 'responsavel_id'],
  ] as const

  const blockers: Array<{ table: string; column: string; count: number }> = []
  for (const [table, column] of checks) {
    const { count, error } = await adminClient
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(column, userId)
    if (error) throw error
    if ((count || 0) > 0) blockers.push({ table, column, count: count || 0 })
  }
  return blockers
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

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('usuarios')
    .select('role, active')
    .eq('id', caller.user.id)
    .maybeSingle()
  if (callerProfileError) return jsonResponse({ success: false, error: callerProfileError.message }, 500)

  const callerRole = String(callerProfile?.role || '').toLowerCase()
  if (!callerProfile?.active || !internalAdminRoles.includes(callerRole)) {
    return jsonResponse({ success: false, error: 'Insufficient privileges' }, 403)
  }

  let payload: GlobalUserPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const action = payload.action
  const userId = payload.user_id
  if (!action || !['update', 'delete', 'force_password_change'].includes(action) || !userId) {
    return jsonResponse({ success: false, error: 'Missing required fields (action, user_id)' }, 400)
  }

  const { data: before, error: beforeError } = await adminClient
    .from('usuarios')
    .select('id, email, name, phone, role, role_id, active, is_venda_loja, must_change_password')
    .eq('id', userId)
    .maybeSingle()
  if (beforeError) return jsonResponse({ success: false, error: beforeError.message }, 500)
  if (!before) return jsonResponse({ success: false, error: 'Target user not found' }, 404)
  const beforeProfile = before as UserProfile

  try {
    if (action === 'force_password_change') {
      const { error } = await adminClient
        .from('usuarios')
        .update({ must_change_password: true, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error

      await writeAudit(adminClient, {
        actorId: caller.user.id,
        actorRole: callerRole,
        action: 'force_password_change',
        entityId: userId,
        beforeData: { must_change_password: beforeProfile.must_change_password },
        afterData: { must_change_password: true },
        metadata: { reason: payload.reason || null },
      })
      return jsonResponse({ success: true })
    }

    if (action === 'delete') {
      if (payload.hard_delete) {
        const blockers = await findHardDeleteBlockers(adminClient, userId)
        if (blockers.length) {
          return jsonResponse({
            success: false,
            error: 'Exclusão definitiva bloqueada porque o usuário possui histórico operacional.',
            blocking_references: blockers,
          }, 409)
        }

        await writeAudit(adminClient, {
          actorId: caller.user.id,
          actorRole: callerRole,
          action: 'hard_delete_requested',
          entityId: userId,
          beforeData: beforeProfile,
          metadata: { reason: payload.reason || null },
        })

        const { error } = await adminClient.auth.admin.deleteUser(userId)
        if (error) throw error
        return jsonResponse({ success: true, hard_deleted: true })
      }

      const endedAt = todayISO()
      const { error: membershipsError } = await adminClient
        .from('vinculos_loja')
        .update({ is_active: false, ended_at: endedAt })
        .eq('user_id', userId)
      if (membershipsError) throw membershipsError

      const { error: tenuresError } = await adminClient
        .from('vendedores_loja')
        .update({ is_active: false, ended_at: endedAt })
        .eq('seller_user_id', userId)
      if (tenuresError) throw tenuresError

      const { error: profileError } = await adminClient
        .from('usuarios')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (profileError) throw profileError

      await writeAudit(adminClient, {
        actorId: caller.user.id,
        actorRole: callerRole,
        action: 'deactivate',
        entityId: userId,
        beforeData: beforeProfile,
        afterData: { ...beforeProfile, active: false },
        metadata: { reason: payload.reason || null },
      })
      return jsonResponse({ success: true, hard_deleted: false })
    }

    const updates = payload.updates || {}
    const nextRole = String(updates.role || beforeProfile.role).toLowerCase()
    if (!supportedRoles.includes(nextRole)) {
      return jsonResponse({ success: false, error: `Unsupported role "${nextRole}"` }, 400)
    }

    const nextStoreId = updates.store_id || null
    if (!internalAdminRoles.includes(nextRole) && !nextStoreId) {
      return jsonResponse({ success: false, error: 'store_id is required for store-scoped roles' }, 400)
    }

    const roleId = await resolveRoleId(adminClient, nextRole)
    const nextEmail = typeof updates.email === 'string'
      ? updates.email.trim().toLowerCase()
      : beforeProfile.email
    const nextName = typeof updates.name === 'string'
      ? updates.name.trim().toLocaleUpperCase('pt-BR')
      : beforeProfile.name

    if (nextEmail !== beforeProfile.email) {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        email: nextEmail,
        email_confirm: true,
      })
      if (error) throw error
    }

    const userUpdate = {
      email: nextEmail,
      name: nextName,
      phone: typeof updates.phone === 'undefined' ? beforeProfile.phone : updates.phone || null,
      role: nextRole,
      role_id: roleId,
      active: typeof updates.active === 'boolean' ? updates.active : beforeProfile.active,
      is_venda_loja: typeof updates.is_venda_loja === 'boolean'
        ? updates.is_venda_loja
        : beforeProfile.is_venda_loja,
      updated_at: new Date().toISOString(),
    }

    const { error: profileError } = await adminClient
      .from('usuarios')
      .update(userUpdate)
      .eq('id', userId)
    if (profileError) {
      if (nextEmail !== beforeProfile.email) {
        await adminClient.auth.admin.updateUserById(userId, {
          email: beforeProfile.email,
          email_confirm: true,
        })
      }
      throw profileError
    }

    const endedAt = updates.ended_at || todayISO()
    if (internalAdminRoles.includes(nextRole)) {
      const { error: membershipError } = await adminClient
        .from('vinculos_loja')
        .update({ is_active: false, ended_at: endedAt })
        .eq('user_id', userId)
      if (membershipError) throw membershipError

      const { error: tenureError } = await adminClient
        .from('vendedores_loja')
        .update({ is_active: false, ended_at: endedAt })
        .eq('seller_user_id', userId)
      if (tenureError) throw tenureError
    } else {
      const previousStoreId = updates.previous_store_id || null
      if (previousStoreId && previousStoreId !== nextStoreId) {
        const { error: previousMembershipError } = await adminClient
          .from('vinculos_loja')
          .update({ is_active: false, ended_at: endedAt })
          .eq('user_id', userId)
          .eq('store_id', previousStoreId)
        if (previousMembershipError) throw previousMembershipError

        const { error: previousTenureError } = await adminClient
          .from('vendedores_loja')
          .update({ is_active: false, ended_at: endedAt })
          .eq('seller_user_id', userId)
          .eq('store_id', previousStoreId)
        if (previousTenureError) throw previousTenureError
      }

      const { error: membershipError } = await adminClient
        .from('vinculos_loja')
        .upsert({
          user_id: userId,
          store_id: nextStoreId,
          role: nextRole,
          is_active: true,
          ended_at: null,
        }, { onConflict: 'user_id,store_id' })
      if (membershipError) throw membershipError

      if (nextRole === 'vendedor') {
        const { error: tenureError } = await adminClient
          .from('vendedores_loja')
          .upsert({
            store_id: nextStoreId,
            seller_user_id: userId,
            started_at: updates.started_at || todayISO(),
            ended_at: updates.ended_at || null,
            is_active: updates.is_active ?? updates.active ?? true,
            closing_month_grace: updates.closing_month_grace ?? false,
          }, { onConflict: 'store_id,seller_user_id' })
        if (tenureError) throw tenureError
      } else {
        const { error: tenureError } = await adminClient
          .from('vendedores_loja')
          .update({ is_active: false, ended_at: endedAt })
          .eq('seller_user_id', userId)
          .eq('store_id', nextStoreId)
        if (tenureError) throw tenureError
      }
    }

    const afterProfile = { ...beforeProfile, ...userUpdate }
    await writeAudit(adminClient, {
      actorId: caller.user.id,
      actorRole: callerRole,
      action: 'update',
      entityId: userId,
      storeId: nextStoreId,
      beforeData: beforeProfile,
      afterData: afterProfile,
      metadata: { reason: payload.reason || null },
    })

    return jsonResponse({ success: true, user: afterProfile })
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected global user management error',
    }, 500)
  }
})
