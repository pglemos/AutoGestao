import { supabase } from '@/lib/supabase'
import type { TemplateItemPriority } from './actionPlanTemplates'

export type SuggestionStatus = 'pendente_validacao' | 'validada' | 'exibida_dono' | 'convertida' | 'descartada'

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  pendente_validacao: 'Pendente de validação',
  validada: 'Validada pelo consultor',
  exibida_dono: 'Exibida ao Dono',
  convertida: 'Convertida em Plano',
  descartada: 'Descartada',
}

export type ActionPlanSuggestion = {
  id: string
  problem: string | null
  recommendation: string | null
  rationale: string | null
  priority: string | number | null
  rule_code: string | null
  scope_type: string | null
  scope_id: string | null
  source_plano_id: string | null
  status: SuggestionStatus
  dismissed_reason: string | null
  created_at: string
}

/**
 * Prioridade da sugestão para a escala de plano de ação. O banco guarda o
 * enum action_priority (texto) — esse é o caminho principal; números são
 * aceitos por compatibilidade com a leitura antiga do motor.
 */
export function suggestionPriorityToPlanPriority(priority: string | number | null): TemplateItemPriority {
  if (typeof priority === 'string') {
    if (['critica', 'alta', 'media', 'baixa'].includes(priority)) return priority as TemplateItemPriority
    if (priority === 'ATENCAO' || priority === 'ALTA') return 'alta'
    if (priority === 'CRITICA') return 'critica'
    if (priority === 'EVOLUCAO' || priority === 'BAIXA') return 'baixa'
    return 'media'
  }
  if (priority === null) return 'media'
  if (priority <= 1) return 'critica'
  if (priority === 2) return 'alta'
  if (priority === 3) return 'media'
  return 'baixa'
}

export function isSuggestionPromoted(suggestion: Pick<ActionPlanSuggestion, 'source_plano_id'>) {
  return Boolean(suggestion.source_plano_id)
}

/** Transições permitidas no ciclo de vida da sugestão ao dono. */
export function nextSuggestionActions(status: SuggestionStatus): Array<'validar' | 'publicar' | 'descartar'> {
  if (status === 'pendente_validacao') return ['validar', 'descartar']
  if (status === 'validada') return ['publicar', 'descartar']
  return []
}

export async function fetchActionPlanSuggestions(): Promise<{ rows: ActionPlanSuggestion[]; error: string | null }> {
  const { data, error } = await supabase
    .from('consultor_solucoes')
    .select('id, problem, recommendation, rationale, priority, rule_code, scope_type, scope_id, source_plano_id, status, dismissed_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { rows: [], error: error.message }
  return {
    rows: (data ?? []).map(item => ({
      ...item,
      status: (item.status ?? 'pendente_validacao') as SuggestionStatus,
      dismissed_reason: item.dismissed_reason ?? null,
    })) as ActionPlanSuggestion[],
    error: null,
  }
}

/** Valida a sugestão como consultor (pendente → validada). */
export async function validateSuggestion(suggestionId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('consultor_solucoes')
    .update({ status: 'validada', validated_by: userId, validated_at: new Date().toISOString() })
    .eq('id', suggestionId)
  return { error: error?.message ?? null }
}

/** Publica a sugestão validada para o Dono (validada → exibida_dono). */
export async function publishSuggestionToOwner(suggestionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('consultor_solucoes')
    .update({ status: 'exibida_dono', shown_to_owner_at: new Date().toISOString() })
    .eq('id', suggestionId)
  return { error: error?.message ?? null }
}

/** Descarta a sugestão com justificativa. */
export async function dismissSuggestion(suggestionId: string, reason: string): Promise<{ error: string | null }> {
  if (!reason.trim()) return { error: 'Informe o motivo do descarte.' }
  const { error } = await supabase
    .from('consultor_solucoes')
    .update({ status: 'descartada', dismissed_reason: reason.trim() })
    .eq('id', suggestionId)
  return { error: error?.message ?? null }
}

/**
 * Converte uma sugestão do motor determinístico em plano de ação e marca a
 * sugestão como promovida, para não virar plano duplicado no próximo ciclo.
 */
export async function promoteSuggestionToPlan(input: {
  suggestion: ActionPlanSuggestion
  departamento: string
  indicador: string
  prazo: string | null
  userId: string
}): Promise<{ error: string | null; planId: string | null }> {
  const { suggestion } = input
  if (isSuggestionPromoted(suggestion)) return { error: 'Esta sugestão já virou plano de ação.', planId: null }
  if (!suggestion.scope_id || !suggestion.scope_type) return { error: 'A sugestão não tem escopo definido.', planId: null }
  if (!suggestion.recommendation?.trim()) return { error: 'A sugestão não tem recomendação para virar ação.', planId: null }

  const { data: plan, error } = await supabase
    .from('planos_acao')
    .insert({
      scope_type: suggestion.scope_type as 'store' | 'department' | 'individual' | 'process',
      scope_id: suggestion.scope_id,
      departamento: input.departamento.trim() || 'Geral',
      indicador: input.indicador.trim() || 'Não definido',
      problema: suggestion.problem?.trim() || 'Problema identificado pelo motor de regras.',
      acao: suggestion.recommendation.trim(),
      como: suggestion.rationale?.trim() || null,
      prazo: input.prazo || null,
      prioridade: suggestionPriorityToPlanPriority(suggestion.priority),
      origem: 'consultor' as const,
      origem_ref_id: suggestion.id,
      origem_ref_table: 'consultor_solucoes',
      created_by: input.userId,
    })
    .select('id')
    .single()

  if (error || !plan) return { error: error?.message ?? 'Falha ao criar o plano de ação.', planId: null }

  const { error: linkError } = await supabase
    .from('consultor_solucoes')
    .update({ source_plano_id: plan.id, converted_plano_id: plan.id, status: 'convertida' })
    .eq('id', suggestion.id)
  if (linkError) return { error: `Plano criado, mas o vínculo com a sugestão falhou: ${linkError.message}`, planId: plan.id }

  return { error: null, planId: plan.id }
}
