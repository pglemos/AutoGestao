import { describe, expect, test } from 'bun:test'
import {
  allowedProductTransitions,
  canDeleteProduct,
  emptyProductDraft,
  encounterTimeStatus,
  nextVersionKey,
  summarizeTimes,
  validateProductDraft,
  type EncounterTime,
} from './consultingProducts'

function time(overrides: Partial<EncounterTime> = {}): EncounterTime {
  return { visit_number: 1, horas_online: null, horas_presencial: null, origem: 'manual', observacao: null, ...overrides }
}

describe('produto de consultoria — validação', () => {
  test('cobra chave e nome', () => {
    expect(validateProductDraft(emptyProductDraft())).toBe('Informe a chave do programa.')
    expect(validateProductDraft({ ...emptyProductDraft(), program_key: 'pmr_7' })).toBe('Informe o nome do produto.')
  })

  test('faixa de presenciais precisa caber na jornada', () => {
    const base = { ...emptyProductDraft(), program_key: 'pmr_7', name: 'PMR 7', total_visits: 7 }
    expect(validateProductDraft({ ...base, min_presenciais: 9 })).toBe('Mínimo de presenciais maior que o total de encontros.')
    expect(validateProductDraft({ ...base, max_presenciais: 9 })).toBe('Máximo de presenciais maior que o total de encontros.')
    expect(validateProductDraft({ ...base, min_presenciais: 4, max_presenciais: 2 })).toBe('Máximo de presenciais menor que o mínimo.')
    expect(validateProductDraft({ ...base, min_presenciais: 2, max_presenciais: 4 })).toBeNull()
  })
})

describe('ciclo de vida do produto', () => {
  test('rascunho publica ou arquiva; publicado só arquiva; arquivado volta a rascunho', () => {
    expect(allowedProductTransitions('rascunho')).toEqual(['publicado', 'arquivado'])
    expect(allowedProductTransitions('publicado')).toEqual(['arquivado'])
    expect(allowedProductTransitions('arquivado')).toEqual(['rascunho'])
  })

  test('só exclui rascunho sem cliente', () => {
    expect(canDeleteProduct({ status: 'rascunho', clients: 0 })).toBe(true)
    expect(canDeleteProduct({ status: 'rascunho', clients: 3 })).toBe(false)
    expect(canDeleteProduct({ status: 'publicado', clients: 0 })).toBe(false)
  })

  test('nova versão gera chave sem empilhar sufixo', () => {
    expect(nextVersionKey('pmr_7', 1)).toBe('pmr_7_v2')
    expect(nextVersionKey('pmr_7_v2', 2)).toBe('pmr_7_v3')
  })
})

describe('tempos por encontro', () => {
  test('situação espelha as combinações do Base44', () => {
    expect(encounterTimeStatus(time())).toBe('Pendente')
    expect(encounterTimeStatus(time({ horas_online: 2 }))).toBe('Só Online')
    expect(encounterTimeStatus(time({ horas_presencial: 4 }))).toBe('Só Presencial')
    expect(encounterTimeStatus(time({ horas_online: 2, horas_presencial: 4 }))).toBe('Completo')
  })

  test('resumo soma horas e conta pendências', () => {
    const resumo = summarizeTimes([
      time({ visit_number: 1, horas_online: 2, horas_presencial: 4 }),
      time({ visit_number: 2, horas_online: 1.5 }),
      time({ visit_number: 3 }),
    ])
    expect(resumo).toEqual({ totalOnline: 3.5, totalPresencial: 4, encontros: 3, pendencias: 1 })
  })
})
