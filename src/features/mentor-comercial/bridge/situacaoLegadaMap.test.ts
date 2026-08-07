import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import {
  MAPEAMENTOS_COM_PROVA,
  SITUACOES_LEGADAS_SEM_MAPEAMENTO,
  evidenciaDoMapeamento,
  statusOficialDaSituacao,
  temMapeamento,
} from './situacaoLegadaMap'

/**
 * Cada mapeamento declara uma evidência. Estes testes VERIFICAM a evidência contra o
 * catálogo real, para que uma afirmação errada não sobreviva — foi exatamente assim
 * que se descobriu que "Venda perdida" apontava PER-01 ("Motivo da perda pendente")
 * quando o rótulo exato pertence a PER-02.
 */

const RULES_DIR = path.resolve(import.meta.dir, '../../../../rules/mentor-comercial/v1')
const read = (n: string) =>
  JSON.parse(readFileSync(path.join(RULES_DIR, n), 'utf8')).records as Array<
    Record<string, string>
  >

const statuses = read('statuses.json')
const transitions = read('transitions.json')
const byId = new Map(statuses.map((s) => [s.statusId, s]))

describe('todo status apontado existe no catálogo', () => {
  for (const m of MAPEAMENTOS_COM_PROVA) {
    it(`${m.situacaoLegada} → ${m.statusId}`, () => {
      expect(byId.has(m.statusId)).toBe(true)
    })
  }
})

describe('evidência do tipo label é igualdade literal', () => {
  for (const m of MAPEAMENTOS_COM_PROVA.filter((x) => x.evidencia === 'label')) {
    it(`${m.statusId} tem rótulo exatamente "${m.situacaoLegada}"`, () => {
      expect(byId.get(m.statusId)?.label).toBe(m.situacaoLegada)
    })
  }
})

describe('evidência do tipo labelPrefixoUnico exige prefixo E unicidade', () => {
  for (const m of MAPEAMENTOS_COM_PROVA.filter((x) => x.evidencia === 'labelPrefixoUnico')) {
    it(`"${m.situacaoLegada}" prefixa apenas ${m.statusId}`, () => {
      const candidatos = statuses.filter((s) => s.label.startsWith(m.situacaoLegada))
      // Unicidade é o que torna a leitura determinística. Dois candidatos = sem prova.
      expect(candidatos.map((c) => c.statusId)).toEqual([m.statusId])
    })
  }
})

describe('evidência do tipo transition exige regra única na aba 06', () => {
  for (const m of MAPEAMENTOS_COM_PROVA.filter((x) => x.evidencia === 'transition')) {
    it(`resultado "${m.situacaoLegada}" tem uma única regra, apontando ${m.statusId}`, () => {
      const regras = transitions.filter((t) => t.result === m.situacaoLegada)
      expect(regras.length).toBe(1)
      expect(regras[0].toStatus).toBe(byId.get(m.statusId)?.label)
    })
  }
})

describe('nada é mapeado duas vezes', () => {
  it('cada situação legada aparece uma vez só', () => {
    const vistos = MAPEAMENTOS_COM_PROVA.map((m) => m.situacaoLegada)
    expect(new Set(vistos).size).toBe(vistos.length)
  })

  it('uma situação sem prova nunca aparece também na lista com prova', () => {
    const comProva = new Set(MAPEAMENTOS_COM_PROVA.map((m) => m.situacaoLegada))
    const conflito = SITUACOES_LEGADAS_SEM_MAPEAMENTO.filter((s) => comProva.has(s))
    expect(conflito).toEqual([])
  })
})

describe('as situações sem prova não são adivinhadas', () => {
  for (const situacao of SITUACOES_LEGADAS_SEM_MAPEAMENTO) {
    it(`"${situacao}" não resolve para status nenhum`, () => {
      expect(statusOficialDaSituacao(situacao)).toBeNull()
      expect(temMapeamento(situacao)).toBe(false)
    })
  }
})

describe('cobertura declarada bate com as situações da Carteira', () => {
  it('as 27 situações legadas estão todas classificadas: com prova ou sem prova', () => {
    const utils = readFileSync(
      path.resolve(import.meta.dir, '../../../components/carteira/carteiraUtils.jsx'),
      'utf8',
    )
    const bloco = utils.match(/export const SITUACOES_ATUAIS = \[([\s\S]*?)\];/)
    expect(bloco).not.toBeNull()
    const legadas = [...bloco![1].matchAll(/"([^"]+)"/g)].map((x) => x[1])

    const classificadas = new Set<string>([
      ...MAPEAMENTOS_COM_PROVA.map((m) => m.situacaoLegada),
      ...SITUACOES_LEGADAS_SEM_MAPEAMENTO,
    ])
    const naoClassificadas = legadas.filter((l) => !classificadas.has(l))
    // Uma situação nova na tela sem decisão explícita quebra o build de propósito.
    expect(naoClassificadas).toEqual([])
  })
})

describe('consulta', () => {
  it('devolve o status oficial quando há prova', () => {
    expect(statusOficialDaSituacao('Visita hoje')).toBe('INT-V05')
  })

  it('devolve a evidência para auditoria', () => {
    expect(evidenciaDoMapeamento('Venda perdida')?.statusId).toBe('PER-02')
  })

  it('entrada vazia não resolve', () => {
    expect(statusOficialDaSituacao(null)).toBeNull()
    expect(statusOficialDaSituacao('')).toBeNull()
  })
})
