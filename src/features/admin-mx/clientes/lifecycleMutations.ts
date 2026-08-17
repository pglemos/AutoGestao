import { supabase } from '@/lib/supabase'

export type SuspendClientInput = {
  clientId: string
  reason: string
  suspendedBy: string
}

/**
 * Suspende o cliente: grava suspended_at + motivo e deriva o status para
 * suspenso. O valor original é preservado nos campos de paridade.
 */
export async function suspendClient(input: SuspendClientInput): Promise<{ error: string | null }> {
  const reason = input.reason.trim()
  if (!reason) return { error: 'Informe o motivo da suspensão.' }
  const { data: current, error: fetchError } = await supabase
    .from('clientes_consultoria')
    .select('status')
    .eq('id', input.clientId)
    .maybeSingle()
  if (fetchError) return { error: fetchError.message }
  const previousStatus = String(current?.status ?? 'ativo')
  const { error } = await supabase
    .from('clientes_consultoria')
    .update({
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
      status: 'suspenso',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.clientId)
  if (error) return { error: error.message }
  await appendClientAudit({
    clientId: input.clientId,
    action: 'CLIENTE_SUSPENSO',
    actorId: input.suspendedBy,
    beforeData: { status: previousStatus },
    afterData: { status: 'suspenso', reason },
  })
  return { error: null }
}

export type ReactivateClientInput = {
  clientId: string
  activatedBy: string
}

/** Reativa um cliente suspenso: limpa suspensão e volta para ativo. */
export async function reactivateClient(input: ReactivateClientInput): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('clientes_consultoria')
    .update({
      suspended_at: null,
      suspended_reason: null,
      status: 'ativo',
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.clientId)
  if (error) return { error: error.message }
  await appendClientAudit({
    clientId: input.clientId,
    action: 'CLIENTE_REATIVADO',
    actorId: input.activatedBy,
    afterData: { status: 'ativo' },
  })
  return { error: null }
}

export type ScheduleActivationInput = {
  clientId: string
  scheduledFor: string
  scheduledBy: string
}

/** Programa a ativação sem ativar imediatamente (data prevista). */
export async function scheduleActivation(input: ScheduleActivationInput): Promise<{ error: string | null }> {
  const scheduledFor = input.scheduledFor
  if (!scheduledFor) return { error: 'Informe a data prevista da ativação.' }
  const { error } = await supabase
    .from('clientes_consultoria')
    .update({
      scheduled_activation_at: scheduledFor,
      status: 'inativo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.clientId)
  if (error) return { error: error.message }
  await appendClientAudit({
    clientId: input.clientId,
    action: 'ATIVACAO_PROGRAMADA',
    actorId: input.scheduledBy,
    afterData: { scheduled_activation_at: scheduledFor },
  })
  return { error: null }
}

/** Ativa imediatamente, registrando activated_at e limpando agendamento. */
export async function activateClientNow(clientId: string, activatedBy: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('clientes_consultoria')
    .update({
      status: 'ativo',
      activated_at: new Date().toISOString(),
      scheduled_activation_at: null,
      suspended_at: null,
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
  if (error) return { error: error.message }
  await appendClientAudit({
    clientId,
    action: 'CLIENTE_ATIVADO',
    actorId: activatedBy,
    afterData: { status: 'ativo' },
  })
  return { error: null }
}

/** Registra um evento no histórico do cliente (internal_mx_admin_audit). */
export async function appendClientAudit(input: {
  clientId: string
  action: string
  actorId: string
  beforeData?: Record<string, unknown>
  afterData?: Record<string, unknown>
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('internal_mx_admin_audit').insert({
    entity_type: 'clientes_consultoria',
    entity_id: input.clientId,
    action: input.action,
    actor_id: input.actorId,
    actor_role: 'administrador_mx',
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    metadata: {},
  })
  return { error: error?.message ?? null }
}

export type ClientAuditEvent = {
  id: string
  action: string
  actor_id: string | null
  created_at: string
  before_data: unknown
  after_data: unknown
}

/** Lê o histórico de auditoria de um cliente (mais recente primeiro). */
export async function fetchClientAudit(clientId: string): Promise<{ rows: ClientAuditEvent[]; error: string | null }> {
  const { data, error } = await supabase
    .from('internal_mx_admin_audit')
    .select('id, action, actor_id, created_at, before_data, after_data')
    .eq('entity_type', 'clientes_consultoria')
    .eq('entity_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)
  return { rows: (data ?? []) as ClientAuditEvent[], error: error?.message ?? null }
}