import { describe, expect, test } from 'bun:test'
import {
  canConvertSuggestion,
  isSuggestionPromoted,
  nextSuggestionActions,
  suggestionPriorityToPlanPriority,
  SUGGESTION_STATUS_LABEL,
} from './actionPlanSuggestions'

describe('sugestões do motor determinístico', () => {
  test('prioridade de texto (enum action_priority) é mantida', () => {
    expect(suggestionPriorityToPlanPriority('critica')).toBe('critica')
    expect(suggestionPriorityToPlanPriority('alta')).toBe('alta')
    expect(suggestionPriorityToPlanPriority('media')).toBe('media')
    expect(suggestionPriorityToPlanPriority('baixa')).toBe('baixa')
  })

  test('prioridade em maiúsculas do Base44 é traduzida', () => {
    expect(suggestionPriorityToPlanPriority('CRITICA')).toBe('critica')
    expect(suggestionPriorityToPlanPriority('ATENCAO')).toBe('alta')
    expect(suggestionPriorityToPlanPriority('EVOLUCAO')).toBe('baixa')
  })

  test('prioridade numérica vira escala de plano de ação', () => {
    expect(suggestionPriorityToPlanPriority(1)).toBe('critica')
    expect(suggestionPriorityToPlanPriority(2)).toBe('alta')
    expect(suggestionPriorityToPlanPriority(3)).toBe('media')
    expect(suggestionPriorityToPlanPriority(4)).toBe('baixa')
  })

  test('prioridade ausente ou fora da faixa cai em média/baixa sem quebrar', () => {
    expect(suggestionPriorityToPlanPriority(null)).toBe('media')
    expect(suggestionPriorityToPlanPriority(0)).toBe('critica')
    expect(suggestionPriorityToPlanPriority(99)).toBe('baixa')
    expect(suggestionPriorityToPlanPriority('desconhecida')).toBe('media')
  })

  test('sugestão com plano vinculado conta como promovida', () => {
    expect(isSuggestionPromoted({ source_plano_id: null, converted_plano_id: null })).toBe(false)
    expect(isSuggestionPromoted({ source_plano_id: 'plan-1', converted_plano_id: null })).toBe(true)
    expect(isSuggestionPromoted({ source_plano_id: null, converted_plano_id: 'plan-2' })).toBe(true)
  })
})

describe('ciclo de vida da sugestão ao dono', () => {
  test('só sugestões validadas ou exibidas ao Dono podem virar plano', () => {
    expect(canConvertSuggestion('validada')).toBe(true)
    expect(canConvertSuggestion('exibida_dono')).toBe(true)
    expect(canConvertSuggestion('pendente_validacao')).toBe(false)
    expect(canConvertSuggestion('convertida')).toBe(false)
    expect(canConvertSuggestion('descartada')).toBe(false)
  })

  test('pendente pode validar ou descartar', () => {
    expect(nextSuggestionActions('pendente_validacao')).toEqual(['validar', 'descartar'])
  })

  test('validada pode publicar ou descartar', () => {
    expect(nextSuggestionActions('validada')).toEqual(['publicar', 'converter', 'descartar'])
  })

  test('exibida ao dono pode ser convertida', () => {
    expect(nextSuggestionActions('exibida_dono')).toEqual(['converter'])
    expect(nextSuggestionActions('convertida')).toEqual([])
    expect(nextSuggestionActions('descartada')).toEqual([])
  })

  test('rótulos de status existem', () => {
    expect(SUGGESTION_STATUS_LABEL.pendente_validacao).toBe('Pendente de validação')
    expect(SUGGESTION_STATUS_LABEL.convertida).toBe('Convertida em Plano')
  })
})
