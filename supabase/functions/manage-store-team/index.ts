import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://esm.sh/zod@3.23.8'
import { findSupabasePublishableKey, findSupabaseSecretKey } from '../_shared/api-keys.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentryForEdge, withSentry } from '../_shared/sentry.ts'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const
const storeRoles = ['dono', 'gerente', 'vendedor'] as const
const adminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const

type TeamAction = 'update' | 'delete'

const uuidSchema = z.string().uuid()
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const updatesSchema = z.object({
  role: z.enum(storeRoles).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  active: z.boolean().optional(),
  is_venda_loja: z.boolean().optional(),
  started_at: dateSchema.optional(),
  ended_at: dateSchema.nullable().optional(),
  is_active: z.boolean().optional(),
  closing_month_grace: z.boolean().optional(),
}).strict()

const payloadSchema = z.object({
  action: z.enum(['update', 'delete']),
  user_id: uuidSchema,
  store_id: uuidSchema,
  previous_store_id: uuidSchema.optional(),
  updates: updatesSchema.optional(),
}).strict()

type TeamPayload = z.infer<typeof payloadSchema>

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function genericFailure(status = 500) {
  return jsonResponse({ success: false, error: 'Não foi possível concluir a alteração da equipe.' }, status)
}

initSentryForEdge()

serve((req) => withSentry('manage-store-team', req, async () => {
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
    console.error('manage-store-team caller lookup failure', { callerId: caller.user.id, callerProfileError })
    return genericFailure()
  }

  const callerRole = String(callerProfile?.role || '').toLowerCase()
  const allowedCallerRoles = [...adminRoles, 'dono', 'gerente']
  if (!callerProfile?.active || !allowedCallerRoles.includes(callerRole)) {
    return jsonResponse({ success: false, error: 'Insufficient privileges' }, 403)
  }

  let rawPayload: unknown
  try {
    rawPayload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const parsed = payloadSchema.safeParse(rawPayload)
  if (!parsed.success) return jsonResponse({ success: false, error: 'Invalid payload' }, 400)

  const payload: TeamPayload = parsed.data
  const action: TeamAction = payload.action

  const { data: rateLimitAllowed, error: rateLimitError } = await adminClient.rpc(
    'internal_mx_consume_admin_rate_limit',
    {
      p_actor_id: caller.user.id,
      p_action: `store-team:${action}`,
      p_max_attempts: 40,
      p_window_seconds: 60,
    },
  )

  if (rateLimitError) {
    console.error('manage-store-team rate limit failure', { callerId: caller.user.id, action, rateLimitError })
    return genericFailure()
  }
  if (!rateLimitAllowed) {
    return jsonResponse({ success: false, error: 'Muitas operações em sequência. Aguarde e tente novamente.' }, 429)
  }

  const { data: before, error: beforeError } = await adminClient
    .from('usuarios')
    .select('id, email, name, role, active')
    .eq('id', payload.user_id)
    .maybeSingle()

  if (beforeError) {
    console.error('manage-store-team target lookup failure', { userId: payload.user_id, beforeError })
    return genericFailure()
  }
  if (!before) return jsonResponse({ success: false, error: 'Target user not found' }, 404)

  const updates = payload.updates || {}
  const nextEmail = action === 'update' && typeof updates.email === 'string'
    ? updates.email.trim().toLowerCase()
    : before.email
  const emailChanged = nextEmail !== before.email

  try {
    if (emailChanged) {
      const { error: authEmailError } = await adminClient.auth.admin.updateUserById(payload.user_id, {
        email: nextEmail,
        email_confirm: true,
      })
      if (authEmailError) throw authEmailError
    }

    const { data: result, error: mutationError } = await adminClient.rpc(
      'internal_mx_apply_store_team_mutation',
      {
        p_actor_id: caller.user.id,
        p_action: action,
        p_user_id: payload.user_id,
        p_store_id: payload.store_id,
        p_previous_store_id: payload.previous_store_id || payload.store_id,
        p_updates: updates,
      },
    )

    if (mutationError) {
      if (emailChanged) {
        const { error: compensationError } = await adminClient.auth.admin.updateUserById(payload.user_id, {
          email: before.email,
          email_confirm: true,
        })
        if (compensationError) {
          console.error('manage-store-team email compensation failure', {
            userId: payload.user_id,
            compensationError,
          })
        }
      }
      throw mutationError
    }

    if (action === 'delete') {
      // Remove o histórico de pré-cadastro da loja junto com a exclusão do
      // integrante (fila de pré-cadastro do painel de equipe).
      const { error: preRegDeleteError } = await adminClient
        .from('pre_cadastros_loja')
        .delete()
        .eq('store_id', payload.store_id)
        .eq('auth_user_id', payload.user_id)

      if (preRegDeleteError) {
        console.error('manage-store-team pre-registration cleanup failure', {
          userId: payload.user_id,
          storeId: payload.store_id,
          preRegDeleteError,
        })
      } else if (before.email) {
        const { error: preRegByEmailError } = await adminClient
          .from('pre_cadastros_loja')
          .delete()
          .eq('store_id', payload.store_id)
          .is('auth_user_id', null)
          .eq('email', before.email)

        if (preRegByEmailError) {
          console.error('manage-store-team pre-registration email cleanup failure', {
            userId: payload.user_id,
            storeId: payload.store_id,
            preRegByEmailError,
          })
        }
      }
    }

    return jsonResponse({ success: true, user: result })
  } catch (error) {
    console.error('manage-store-team failure', {
      action,
      userId: payload.user_id,
      storeId: payload.store_id,
      error,
    })

    const rpcMessage = (error as { message?: string } | null)?.message || ''
    const rpcCode = (error as { code?: string } | null)?.code || ''

    if (rpcMessage === 'forbidden' || rpcMessage === 'self_mutation_forbidden' || rpcMessage === 'cross_store_move_forbidden') {
      return jsonResponse({
        success: false,
        error: 'Seu perfil não está vinculado como dono ou gerente desta loja, ou não pode operar esta alteração.',
      }, 403)
    }
    if (rpcMessage === 'manager_scope_forbidden') {
      return jsonResponse({ success: false, error: 'Gerentes só podem gerenciar vendedores.' }, 403)
    }
    if (rpcMessage === 'owner_scope_forbidden') {
      return jsonResponse({ success: false, error: 'Um dono não pode alterar o vínculo de outro dono.' }, 403)
    }
    if (rpcMessage === 'user_not_found' || rpcCode === 'P0002') {
      return jsonResponse({ success: false, error: 'Integrante não encontrado no sistema.' }, 404)
    }
    if (rpcMessage === 'store_not_found') {
      return jsonResponse({ success: false, error: 'Loja não encontrada no sistema.' }, 404)
    }
    if (rpcMessage === 'invalid_store_role' || rpcMessage === 'invalid_action') {
      return jsonResponse({ success: false, error: 'Dados inválidos para a alteração da equipe.' }, 400)
    }

    return genericFailure()
  }
}))
