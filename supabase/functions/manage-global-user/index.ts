import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://esm.sh/zod@3.23.8'
import { findSupabasePublishableKey, findSupabaseSecretKey } from '../_shared/api-keys.ts'
import { corsHeaders } from '../_shared/cors.ts'

const internalAdminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const
const supportedRoles = [...internalAdminRoles, 'dono', 'gerente', 'vendedor'] as const

type GlobalUserAction = 'update' | 'delete' | 'force_password_change'

const uuidSchema = z.string().uuid()
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const updatesSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.enum(supportedRoles).optional(),
  active: z.boolean().optional(),
  is_venda_loja: z.boolean().optional(),
  store_id: uuidSchema.nullable().optional(),
  previous_store_id: uuidSchema.nullable().optional(),
  started_at: dateSchema.optional(),
  ended_at: dateSchema.nullable().optional(),
  is_active: z.boolean().optional(),
  closing_month_grace: z.boolean().optional(),
}).strict()

const payloadSchema = z.object({
  action: z.enum(['update', 'delete', 'force_password_change']),
  user_id: uuidSchema,
  updates: updatesSchema.optional(),
  hard_delete: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
}).strict()

type GlobalUserPayload = z.infer<typeof payloadSchema>

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

function genericFailure(status = 500) {
  return jsonResponse({ success: false, error: 'Não foi possível concluir a operação global.' }, status)
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
    console.error('manage-global-user caller profile failure', { callerId: caller.user.id, callerProfileError })
    return genericFailure()
  }

  const callerRole = String(callerProfile?.role || '').toLowerCase()
  if (!callerProfile?.active || !internalAdminRoles.includes(callerRole as typeof internalAdminRoles[number])) {
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
    return jsonResponse({ success: false, error: 'Invalid payload' }, 400)
  }

  const payload: GlobalUserPayload = parsed.data
  const action: GlobalUserAction = payload.action
  const userId = payload.user_id

  const { data: rateLimitAllowed, error: rateLimitError } = await adminClient.rpc(
    'internal_mx_consume_admin_rate_limit',
    {
      p_actor_id: caller.user.id,
      p_action: `global-user:${action}`,
      p_max_attempts: 30,
      p_window_seconds: 60,
    },
  )

  if (rateLimitError) {
    console.error('manage-global-user rate limit failure', { callerId: caller.user.id, action, rateLimitError })
    return genericFailure()
  }
  if (!rateLimitAllowed) {
    return jsonResponse({ success: false, error: 'Muitas operações em sequência. Aguarde e tente novamente.' }, 429)
  }

  const { data: before, error: beforeError } = await adminClient
    .from('usuarios')
    .select('id, email, name, phone, role, role_id, active, is_venda_loja, must_change_password')
    .eq('id', userId)
    .maybeSingle()

  if (beforeError) {
    console.error('manage-global-user target lookup failure', { userId, beforeError })
    return genericFailure()
  }
  if (!before) return jsonResponse({ success: false, error: 'Target user not found' }, 404)

  const beforeProfile = before as UserProfile

  try {
    if (action === 'delete' && payload.hard_delete) {
      if (userId === caller.user.id) {
        return jsonResponse({ success: false, error: 'Não é permitido excluir definitivamente a própria conta.' }, 400)
      }

      const { data: blockers, error: blockersError } = await adminClient.rpc(
        'internal_mx_global_user_delete_preflight',
        { p_actor_id: caller.user.id, p_user_id: userId },
      )
      if (blockersError) throw blockersError

      const blockingReferences = Array.isArray(blockers) ? blockers : []
      if (blockingReferences.length > 0) {
        return jsonResponse({
          success: false,
          error: 'Exclusão definitiva bloqueada porque o usuário possui histórico operacional.',
          blocking_references: blockingReferences,
        }, 409)
      }

      const { data: auditRow, error: pendingAuditError } = await adminClient
        .from('internal_mx_admin_audit')
        .insert({
          actor_id: caller.user.id,
          actor_role: callerRole,
          action: 'hard_delete_requested',
          entity_type: 'usuario',
          entity_id: userId,
          before_data: beforeProfile,
          after_data: null,
          metadata: { reason: payload.reason || null, status: 'pending' },
        })
        .select('id')
        .single()
      if (pendingAuditError) throw pendingAuditError

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
      if (deleteError) {
        await adminClient
          .from('internal_mx_admin_audit')
          .update({
            action: 'hard_delete_failed',
            metadata: { reason: payload.reason || null, status: 'failed' },
          })
          .eq('id', auditRow.id)
        throw deleteError
      }

      const { error: completedAuditError } = await adminClient
        .from('internal_mx_admin_audit')
        .update({
          action: 'hard_delete',
          metadata: { reason: payload.reason || null, status: 'completed' },
        })
        .eq('id', auditRow.id)
      if (completedAuditError) {
        console.error('manage-global-user hard-delete audit completion failure', {
          auditId: auditRow.id,
          userId,
          completedAuditError,
        })
      }

      return jsonResponse({ success: true, hard_deleted: true })
    }

    const rpcAction = action === 'delete' ? 'deactivate' : action
    const updates = payload.updates || {}
    const nextEmail = action === 'update' && typeof updates.email === 'string'
      ? updates.email.trim().toLowerCase()
      : beforeProfile.email
    const emailChanged = nextEmail !== beforeProfile.email

    if (emailChanged) {
      const { error: authEmailError } = await adminClient.auth.admin.updateUserById(userId, {
        email: nextEmail,
        email_confirm: true,
      })
      if (authEmailError) throw authEmailError
    }

    const { data: result, error: mutationError } = await adminClient.rpc(
      'internal_mx_apply_global_user_mutation',
      {
        p_actor_id: caller.user.id,
        p_action: rpcAction,
        p_user_id: userId,
        p_updates: updates,
        p_reason: payload.reason || null,
      },
    )

    if (mutationError) {
      if (emailChanged) {
        const { error: compensationError } = await adminClient.auth.admin.updateUserById(userId, {
          email: beforeProfile.email,
          email_confirm: true,
        })
        if (compensationError) {
          console.error('manage-global-user email compensation failure', { userId, compensationError })
        }
      }
      throw mutationError
    }

    return jsonResponse({ success: true, hard_deleted: false, user: result })
  } catch (error) {
    console.error('manage-global-user failure', { action, userId, error })
    return genericFailure()
  }
})
