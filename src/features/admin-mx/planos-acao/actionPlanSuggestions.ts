import { supabase } from '@/lib/supabase'
import type { TemplateItemPriority } from './actionPlanTemplates'

export type SuggestionStatus = 'pendente_validacao' | 'validada' | 'exibida_dono' | 'convertida' | 'descartada' | 'expirada'

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  pendente_validacao: 'Pendente de validação',
  validada: 'Validada pelo consultor',
  exibida_dono: 'Exibida ao Dono',
  convertida: 'Convertida em Plano',
  descartada: 'Descartada',
  expirada: 'Expirada',
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
  converted_plano_id: string | null
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

export function isSuggestionPromoted(suggestion: Pick<ActionPlanSuggestion, 'source_plano_id' | 'converted_plano_id'>) {
  return Boolean(suggestion.source_plano_id || suggestion.converted_plano_id)
}

export function canConvertSuggestion(status: SuggestionStatus): boolean {
  return status === 'validada' || status === 'exibida_dono'
}

/** Transições permitidas no ciclo de vida da sugestão ao dono. */
export function nextSuggestionActions(status: SuggestionStatus): Array<'validar' | 'publicar' | 'converter' | 'descartar'> {
  if (status === 'pendente_validacao') return ['validar', 'descartar']
  if (status === 'validada') return ['publicar', 'converter', 'descartar']
  if (status === 'exibida_dono') return ['converter']
  return []
}

export async function fetchActionPlanSuggestions(): Promise<{ rows: ActionPlanSuggestion[]; error: string | null }> {
  const { data, error } = await supabase
    .from('consultor_solucoes')
    .select('id, problem, recommendation, rationale, priority, rule_code, scope_type, scope_id, source_plano_id, converted_plano_id, status, dismissed_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { rows: [], error: error.message }
  return {
    rows: (data ?? []).map(item => ({
      ...item,
      status: normalizeSuggestionStatus(item.status),
      dismissed_reason: item.dismissed_reason ?? null,
      converted_plano_id: item.converted_plano_id ?? null,
    })) as ActionPlanSuggestion[],
    error: null,
  }
}

function normalizeSuggestionStatus(value: string | null): SuggestionStatus {
  const normalized = String(value ?? 'pendente_validacao').toLowerCase()
  if (normalized === 'pendente_validacao' || normalized === 'validada' || normalized === 'exibida_dono' || normalized === 'convertida' || normalized === 'descartada' || normalized === 'expirada') return normalized
  return 'pendente_validacao'
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
  if (isSuggestionPromoted(suggestion)) return { error: null, planId: suggestion.source_plano_id ?? suggestion.converted_plano_id }
  if (!canConvertSuggestion(suggestion.status)) return { error: 'Valide ou publique a sugestão antes de convertê-la.', planId: null }
  if (!suggestion.scope_id || !suggestion.scope_type) return { error: 'A sugestão não tem escopo definido.', planId: null }
  if (!suggestion.recommendation?.trim()) return { error: 'A sugestão não tem recomendação para virar ação.', planId: null }

  const { data: planId, error } = await supabase.rpc('convert_action_plan_suggestion', {
    p_suggestion_id: suggestion.id,
    p_departamento: input.departamento.trim() || 'Geral',
    p_indicador: input.indicador.trim() || 'Não definido',
    p_prazo: input.prazo || null,
  })

  if (error || !planId) return { error: error?.message ?? 'Falha ao criar o plano de ação.', planId: null }
  return { error: null, planId }
}
