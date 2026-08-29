import { supabase } from '@/lib/supabase'

export const MX_TEAM_ROLES = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const
export type MxTeamRole = (typeof MX_TEAM_ROLES)[number]

export type TeamMemberDraft = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  active: boolean
}

/** Erros bloqueantes da edição de um membro da equipe MX. */
export function validateTeamMemberDraft(draft: TeamMemberDraft): string[] {
  const errors: string[] = []
  if (!draft.name.trim()) errors.push('Informe o nome.')
  if (!draft.email.trim()) errors.push('Informe o e-mail.')
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) errors.push('E-mail inválido.')
  if (!MX_TEAM_ROLES.includes(draft.role as MxTeamRole)) errors.push('Selecione um papel interno MX válido.')
  return errors
}

export async function saveTeamMember(draft: TeamMemberDraft): Promise<{ error: string | null }> {
  const errors = validateTeamMemberDraft(draft)
  if (errors.length) return { error: errors[0] }

  const { data, error } = await supabase.rpc('admin_update_usuario', {
    p_user_id: draft.id,
    p_payload: {
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      phone: draft.phone.trim() || null,
      role: draft.role,
      active: draft.active,
    },
  })
  if (error) return { error: error.message }
  if (data && typeof data === 'object' && 'ok' in data && !(data as { ok: boolean }).ok) {
    return { error: (data as { error?: string }).error ?? 'Falha ao atualizar usuário.' }
  }
  return { error: null }
}

/**
 * Desativa um membro sem apagar histórico: o acesso cai, mas as atribuições e
 * os planos criados continuam rastreáveis.
 */
export async function deactivateTeamMember(userId: string, reason: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('admin_update_usuario', {
    p_user_id: userId,
    p_payload: {
      active: false,
      deactivated_at: new Date().toISOString(),
      deactivation_reason: reason.trim() || 'Desativado pela administração MX.',
    },
  })
  if (error) return { error: error.message }
  if (data && typeof data === 'object' && 'ok' in data && !(data as { ok: boolean }).ok) {
    return { error: (data as { error?: string }).error ?? 'Falha ao desativar usuário.' }
  }

  const { error: assignmentsError } = await supabase
    .from('atribuicoes_consultoria')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('active', true)
  return { error: assignmentsError?.message ?? null }
}

export async function reactivateTeamMember(userId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('admin_update_usuario', {
    p_user_id: userId,
    p_payload: {
      active: true,
      deactivated_at: null,
      deactivation_reason: null,
    },
  })
  if (error) return { error: error.message }
  if (data && typeof data === 'object' && 'ok' in data && !(data as { ok: boolean }).ok) {
    return { error: (data as { error?: string }).error ?? 'Falha ao reativar usuário.' }
  }
  return { error: null }
}

export type TeamAssignment = { id: string; client_id: string | null; assignment_role: string | null; active: boolean | null }

export async function fetchMemberAssignments(userId: string): Promise<TeamAssignment[]> {
  const { data } = await supabase
    .from('atribuicoes_consultoria')
    .select('id, client_id, assignment_role, active')
    .eq('user_id', userId)
  return (data ?? []) as TeamAssignment[]
}

/**
 * Sincroniza a carteira do consultor: reativa o que já existia, cria o que
 * falta e desativa o que saiu — nunca apaga, para preservar o histórico.
 */
export async function syncMemberAssignments(userId: string, clientIds: string[]): Promise<{ error: string | null }> {
  const plan = planAssignmentSync(await fetchMemberAssignments(userId), clientIds)
  const now = new Date().toISOString()

  if (plan.reactivate.length) {
    const { error } = await supabase.from('atribuicoes_consultoria').update({ active: true, updated_at: now }).in('id', plan.reactivate)
    if (error) return { error: error.message }
  }

  if (plan.deactivate.length) {
    const { error } = await supabase.from('atribuicoes_consultoria').update({ active: false, updated_at: now }).in('id', plan.deactivate)
    if (error) return { error: error.message }
  }

  if (plan.create.length) {
    const { error } = await supabase
      .from('atribuicoes_consultoria')
      .insert(plan.create.map(clientId => ({ user_id: userId, client_id: clientId, assignment_role: 'responsavel', active: true })))
    if (error) return { error: error.message }
  }

  return { error: null }
}

/** Plano de sincronização — extraído para poder ser testado sem banco. */
export function planAssignmentSync(
  current: Array<{ id: string; client_id: string | null; active: boolean | null }>,
  clientIds: string[],
) {
  const wanted = new Set(clientIds)
  const existing = new Set(current.map(item => item.client_id).filter(Boolean) as string[])
  return {
    reactivate: current.filter(item => item.client_id && wanted.has(item.client_id) && item.active === false).map(item => item.id),
    deactivate: current.filter(item => item.client_id && !wanted.has(item.client_id) && item.active !== false).map(item => item.id),
    create: clientIds.filter(clientId => !existing.has(clientId)),
  }
}
