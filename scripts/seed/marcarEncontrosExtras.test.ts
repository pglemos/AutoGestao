import { describe, expect, test } from 'bun:test'
import { classificarEncontro, decidirExtras } from './encontrosExtras.mjs'

const enc = (id: string, objective: string | null) => ({ id, objective })

describe('classificação do encontro', () => {
  test('separa temático, acompanhamento e sem objetivo', () => {
    expect(classificarEncontro('Diagnóstico')).toBe('tematico')
    expect(classificarEncontro('Acompanhamento Mensal')).toBe('acompanhamento')
    expect(classificarEncontro(null)).toBe('sem_objetivo')
    expect(classificarEncontro('   ')).toBe('sem_objetivo')
  })

  test('temático que cita acompanhamento no meio continua temático', () => {
    // Caso real do Gandini, encontro 2 do PMR.
    expect(classificarEncontro('Planejamento Estratégico, Metodologia de Vendas por Multicanal, Acompanhamento Diário de Vendas')).toBe('tematico')
    expect(classificarEncontro('Acompanhamento 1')).toBe('acompanhamento')
    expect(classificarEncontro('Acompanhamento Mensal')).toBe('acompanhamento')
  })
})

describe('decisão de encontros extras', () => {
  test('jornada dentro do contrato não gera extra, mesmo sem objetivo', () => {
    expect([...decidirExtras([enc('a', 'Diagnóstico'), enc('b', null)], 9, 3)]).toEqual([])
  })

  test('temático nunca perde vaga para acompanhamento anterior', () => {
    const encontros = [
      enc('t1', 'Diagnóstico'), enc('a1', 'Acompanhamento'), enc('t2', 'Análise das Implementações'),
      enc('a2', 'Acompanhamento'),
    ]
    const extras = [...decidirExtras(encontros, 2, 3)]
    expect(extras).toContain('a1')
    expect(extras).toContain('a2')
    expect(extras).not.toContain('t2')
  })

  test('acompanhamento além do previsto vira extra', () => {
    const encontros = [
      enc('a1', 'Acompanhamento'), enc('a2', 'Acompanhamento'),
      enc('a3', 'Acompanhamento'), enc('a4', 'Acompanhamento'),
    ]
    expect([...decidirExtras(encontros, 3, 3)]).toEqual(['a4'])
  })

  test('encontro sem objetivo fecha vaga antes de sobrar vaga ociosa', () => {
    const encontros = [enc('t1', 'Diagnóstico'), enc('s1', null), enc('s2', null)]
    expect([...decidirExtras(encontros, 2, 3)]).toEqual(['s2'])
  })

  test('temático excedente é cortado do mais recente', () => {
    const encontros = [enc('t1', 'Diagnóstico'), enc('t2', 'Planejamento'), enc('t3', 'Marketing')]
    expect([...decidirExtras(encontros, 2, 3)]).toEqual(['t3'])
  })
})
