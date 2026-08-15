import { supabase } from '@/lib/supabase'
import type { TemplateItemPriority } from './actionPlanTemplates'

export type ActionPlanSuggestion = {
  id: string
  problem: string | null
  recommendation: string | null
  rationale: string | null
  priority: number | null
  rule_code: string | null
  scope_type: string | null
  scope_id: string | null
  source_plano_id: string | null
  created_at: string
}

/**
 * Prioridade numérica do motor determinístico (1 = mais urgente) para a escala
 * de plano de ação. Fora da faixa conhecida, cai em 'media'.
 */
export function suggestionPriorityToPlanPriority(priority: number | null): TemplateItemPriority {
  if (priority === null) return 'media'
  if (priority <= 1) return 'critica'
  if (priority === 2) return 'alta'
  if (priority === 3) return 'media'
  return 'baixa'
}

export function isSuggestionPromoted(suggestion: Pick<ActionPlanSuggestion, 'source_plano_id'>) {
  return Boolean(suggestion.source_plano_id)
}

export async function fetchActionPlanSuggestions(): Promise<{ rows: ActionPlanSuggestion[]; error: string | null }> {
  const { data, error } = await supabase
    .from('consultor_solucoes')
    .select('id, problem, recommendation, rationale, priority, rule_code, scope_type, scope_id, source_plano_id, created_at')
    .order('priority', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as ActionPlanSuggestion[], error: null }
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
    .update({ source_plano_id: plan.id })
    .eq('id', suggestion.id)
  if (linkError) return { error: `Plano criado, mas o vínculo com a sugestão falhou: ${linkError.message}`, planId: plan.id }

  return { error: null, planId: plan.id }
}
