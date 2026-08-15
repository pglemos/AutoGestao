import { describe, expect, test } from 'bun:test'
import { isSuggestionPromoted, suggestionPriorityToPlanPriority } from './actionPlanSuggestions'

describe('sugestões do motor determinístico', () => {
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
  })

  test('sugestão com plano vinculado conta como promovida', () => {
    expect(isSuggestionPromoted({ source_plano_id: null })).toBe(false)
    expect(isSuggestionPromoted({ source_plano_id: 'plan-1' })).toBe(true)
  })
})
