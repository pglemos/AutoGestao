import { supabase } from '@/lib/supabase'
import { validateAprovacaoDraft, INSCRICAO_STATUS_LABELS, type AprovacaoDraft, type InscricaoRow } from './inscricaoAutocadastro'

export async function fetchInscricoes(clientId: string): Promise<{ rows: InscricaoRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('inscricoes_autocadastro_cliente')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  return { rows: (data ?? []) as InscricaoRow[], error: error?.message ?? null }
}

export async function fetchInscricoesPendentes(): Promise<{ rows: InscricaoRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('inscricoes_autocadastro_cliente')
    .select('*')
    .eq('status', 'aguardando')
    .order('created_at', { ascending: false })
  return { rows: (data ?? []) as InscricaoRow[], error: error?.message ?? null }
}

export type ApproveInscricaoInput = {
  inscricao: InscricaoRow
  draft: AprovacaoDraft
  reviewedBy: string
}

/**
 * Aprova a inscrição: cria a pessoa em acessos_cliente_consultoria com os
 * dados confirmados e os papéis/visão aprovados, e marca a inscrição como
 * aprovada.
 *
 * `is_dono_master` é derivado de o papel aprovado incluir DONO — a UI de
 * aprovação não tem um toggle próprio de Master (só de papéis). Isso por si só
 * não distingue "tem perfil Dono" de "é O Dono Master" (a regra central do doc
 * de correção), então antes de gravar demovemos qualquer Master vigente do
 * mesmo jeito que `createClientPerson` faz — sem isso, aprovar um segundo
 * usuário com papel Dono cria dois is_dono_master=true silenciosamente.
 */
export async function approveInscricao(input: ApproveInscricaoInput): Promise<{ error: string | null }> {
  const invalid = validateAprovacaoDraft(input.draft)
  if (invalid) return { error: invalid }

  const willBeMaster = input.draft.papeis_aprovados.includes('DONO')
  if (willBeMaster) {
    const { error: demoteError } = await supabase
      .from('acessos_cliente_consultoria')
      .update({ is_dono_master: false, updated_at: new Date().toISOString() })
      .eq('client_id', input.inscricao.client_id)
      .eq('is_dono_master', true)
    if (demoteError) return { error: demoteError.message }
  }

  const { data: created, error: insertError } = await supabase
    .from('acessos_cliente_consultoria')
    .insert({
      client_id: input.inscricao.client_id,
      nome: input.inscricao.nome.trim(),
      email: input.inscricao.email.trim().toLowerCase(),
      telefone: input.inscricao.telefone ?? null,
      funcao_declarada: input.draft.equipe_aprovada || input.inscricao.funcao_declarada || null,
      papeis: input.draft.papeis_aprovados,
      lojas_autorizadas: input.draft.loja_aprovada_id ? [input.draft.loja_aprovada_id] : [],
      is_dono_master: willBeMaster,
      visao_padrao: input.draft.visao_padrao || null,
      status: 'ativo',
      created_by: input.reviewedBy,
    })
    .select('id')
    .maybeSingle()
  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase
    .from('inscricoes_autocadastro_cliente')
    .update({
      status: 'aprovado',
      loja_aprovada_id: input.draft.loja_aprovada_id,
      papeis_aprovados: input.draft.papeis_aprovados,
      visao_padrao: input.draft.visao_padrao || null,
      equipe_aprovada: input.draft.equipe_aprovada || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.reviewedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.inscricao.id)
  if (updateError) return { error: updateError.message }

  await appendInscricaoAudit(input.inscricao, 'INSCRICAO_APROVADA', input.reviewedBy, undefined, {
    pessoa_id: created?.id ?? null,
    loja: input.draft.loja_aprovada_id,
    papeis: input.draft.papeis_aprovados,
  })
  return { error: null }
}

export async function devolverInscricao(inscricaoId: string, motivo: string, reviewedBy: string): Promise<{ error: string | null }> {
  if (!motivo.trim()) return { error: 'Informe o motivo da devolução.' }
  const { error } = await supabase
    .from('inscricoes_autocadastro_cliente')
    .update({
      status: 'devolvido',
      motivo_devolucao: motivo.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inscricaoId)
  return { error: error?.message ?? null }
}

export async function rejeitarInscricao(inscricaoId: string, motivo: string, reviewedBy: string): Promise<{ error: string | null }> {
  if (!motivo.trim()) return { error: 'Informe o motivo da rejeição.' }
  const { error } = await supabase
    .from('inscricoes_autocadastro_cliente')
    .update({
      status: 'rejeitado',
      motivo_rejeicao: motivo.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inscricaoId)
  return { error: error?.message ?? null }
}

export async function mesclarInscricao(inscricaoId: string, mergedIntoId: string, reviewedBy: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('inscricoes_autocadastro_cliente')
    .update({
      status: 'mesclado',
      merged_into_id: mergedIntoId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inscricaoId)
  return { error: error?.message ?? null }
}

async function appendInscricaoAudit(
  inscricao: InscricaoRow,
  action: string,
  actorId: string,
  beforeData?: Record<string, unknown>,
  afterData?: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('internal_mx_admin_audit').insert({
    entity_type: 'inscricoes_autocadastro_cliente',
    entity_id: inscricao.id,
    action,
    actor_id: actorId,
    actor_role: 'administrador_mx',
    before_data: { inscricao_status: inscricao.status, ...(beforeData ?? {}) },
    after_data: afterData ?? null,
    metadata: { client_id: inscricao.client_id, email: inscricao.email },
  })
  return { error: error?.message ?? null }
}

export { INSCRICAO_STATUS_LABELS }