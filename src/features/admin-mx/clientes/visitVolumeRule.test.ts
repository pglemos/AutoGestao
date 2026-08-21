import { describe, expect, test } from 'bun:test'
import { resolveVisitVolumeRule, visitVolumeState } from './visitVolumeRule'

describe('regra de volume presencial por produto', () => {
  test('prioriza a faixa preenchida no catálogo', () => {
    const rule = resolveVisitVolumeRule({
      program_key: 'pmr_hibrido',
      modalidade: 'hibrido',
      min_presenciais: 3,
      max_presenciais: 7,
    })

    expect(rule.source).toBe('catalogo')
    expect(rule.label).toBe('de 3 a 7 presenciais')
  })

  test('PMR Online não permite presença', () => {
    const rule = resolveVisitVolumeRule({ program_key: 'pmr_online', total_visits: 12 })
    expect(rule.minPresenciais).toBe(0)
    expect(rule.maxPresenciais).toBe(0)
    expect(rule.label).toBe('0 presenciais')
  })

  test('aplica fallback oficial para PMR Plus sem faixa carregada', () => {
    const rule = resolveVisitVolumeRule({ program_key: 'pmr_plus', total_visits: 9 })
    expect(rule.source).toBe('regra-produto')
    expect(rule.minPresenciais).toBe(2)
    expect(rule.maxPresenciais).toBe(9)
  })

  test('mantém produto desconhecido como indefinido', () => {
    const rule = resolveVisitVolumeRule({ program_key: 'produto_novo', modalidade: 'hibrido' })
    expect(rule.source).toBe('indefinida')
    expect(rule.maxPresenciais).toBeNull()
  })

  test('calcula saldo, mínimo restante e excesso', () => {
    const rule = resolveVisitVolumeRule({ program_key: 'pmr_hibrido', min_presenciais: 2, max_presenciais: 4 })
    expect(visitVolumeState(rule, 1)).toMatchObject({ available: 3, minimumRemaining: 1, meetsMinimum: false, exceedsMaximum: false })
    expect(visitVolumeState(rule, 4)).toMatchObject({ available: 0, minimumRemaining: 0, meetsMinimum: true, exceedsMaximum: false })
    expect(visitVolumeState(rule, 5).exceedsMaximum).toBe(true)
  })
})
