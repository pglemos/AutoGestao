import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import {
  MAPEAMENTOS_COM_PROVA,
  RESOLUCOES,
  SITUACOES_APOSENTADAS,
  ehSituacaoAposentada,
  ehTerminalTecnico,
  resolucaoDaSituacao,
  resolverSituacaoLegada,
  statusOficialDaSituacao,
} from './situacaoLegadaMap'

/**
 * Cada resolução declara a evidência que a sustenta. Estes testes VERIFICAM a
 * evidência contra o catálogo real — foi assim que se descobriu que "Venda perdida"
 * apontava PER-01 ("Motivo da perda pendente") quando o rótulo exato é do PER-02.
 */

const RULES_DIR = path.resolve(import.meta.dir, '../../../../rules/mentor-comercial/v1')
const read = (n: string) =>
  JSON.parse(readFileSync(path.join(RULES_DIR, n), 'utf8')).records as Array<Record<string, string>>

const statuses = read('statuses.json')
const transitions = read('transitions.json')
const byId = new Map(statuses.map((s) => [s.statusId, s]))

const diretos = RESOLUCOES.filter((r) => r.kind === 'DIRECT_MAPPING')
const contextuais = RESOLUCOES.filter((r) => r.kind === 'CONTEXTUAL_MIGRATION')

describe('todo status apontado existe no catálogo', () => {
  for (const m of diretos) {
    if (m.kind !== 'DIRECT_MAPPING') continue
    it(`${m.situacaoLegada} → ${m.statusId}`, () => {
      expect(byId.has(m.statusId)).toBe(true)
    })
  }
})

describe('evidência label é igualdade literal', () => {
  for (const m of diretos) {
    if (m.kind !== 'DIRECT_MAPPING' || m.evidencia !== 'label') continue
    it(`${m.statusId} tem rótulo exatamente "${m.situacaoLegada}"`, () => {
      expect(byId.get(m.statusId)?.label).toBe(m.situacaoLegada)
    })
  }
})

describe('evidência labelPrefixoUnico exige prefixo E unicidade', () => {
  for (const m of diretos) {
    if (m.kind !== 'DIRECT_MAPPING' || m.evidencia !== 'labelPrefixoUnico') continue
    it(`"${m.situacaoLegada}" prefixa apenas ${m.statusId}`, () => {
      const candidatos = statuses.filter((s) => s.label.startsWith(m.situacaoLegada))
      expect(candidatos.map((c) => c.statusId)).toEqual([m.statusId])
    })
  }
})

describe('evidência transition exige regra única', () => {
  for (const m of diretos) {
    if (m.kind !== 'DIRECT_MAPPING' || m.evidencia !== 'transition') continue
    it(`resultado "${m.situacaoLegada}" tem uma única regra apontando ${m.statusId}`, () => {
      const regras = transitions.filter((t) => t.result === m.situacaoLegada)
      expect(regras.length).toBe(1)
      expect(regras[0].toStatus).toBe(byId.get(m.statusId)?.label)
    })
  }
})

// ── Os 13 casos da decisão do proprietário ─────────────────────────────────────

describe('1. Lead sem resposta — contextual', () => {
  it('nenhuma tentativa → INT-C01', () => {
    expect(statusOficialDaSituacao('Lead sem resposta', { tentativasExecutadas: 0 })).toBe('INT-C01')
  })

  it('tentativas executadas sem resposta → INT-C02', () => {
    expect(
      statusOficialDaSituacao('Lead sem resposta', {
        tentativasExecutadas: 3,
        clienteRespondeu: false,
      }),
    ).toBe('INT-C02')
  })

  it('cadência ativa sem resposta → INT-C02', () => {
    expect(
      statusOficialDaSituacao('Lead sem resposta', {
        cadenciaStatus: 'ativa',
        clienteRespondeu: false,
      }),
    ).toBe('INT-C02')
  })

  it('cadência encerrada → PER-03', () => {
    expect(statusOficialDaSituacao('Lead sem resposta', { cadenciaStatus: 'encerrada' })).toBe(
      'PER-03',
    )
  })

  it('sem dados suficientes → precisa classificação, não adivinha', () => {
    const r = resolverSituacaoLegada('Lead sem resposta', {})
    expect(r.tipo).toBe('PRECISA_CLASSIFICACAO')
  })
})

describe('2 a 6, 8. Mapeamentos diretos aprovados', () => {
  const casos: Array<[string, string]> = [
    ['Em cadência sem resposta', 'INT-C02'],
    ['Necessidade em qualificação', 'INT-Q01'],
    ['Veículo definido', 'INT-Q03'],
    ['Financiamento aprovado sem compra', 'FIN-06'],
    ['Vai pensar', 'INT-N09'],
  ]
  for (const [legada, esperado] of casos) {
    it(`${legada} → ${esperado}`, () => {
      expect(statusOficialDaSituacao(legada)).toBe(esperado)
    })
  }
})

describe('5. Financiamento em análise — contextual, nunca presume FIN-04', () => {
  it('pediu financiamento sem fato posterior → FIN-01', () => {
    expect(
      statusOficialDaSituacao('Financiamento em análise', {
        financiamentoEstagio: 'Pediu financiamento',
      }),
    ).toBe('FIN-01')
  })

  it('simulação enviada → FIN-02', () => {
    expect(
      statusOficialDaSituacao('Financiamento em análise', { simulacaoEnviada: true }),
    ).toBe('FIN-02')
  })

  it('documentos faltando → FIN-03', () => {
    expect(
      statusOficialDaSituacao('Financiamento em análise', {
        financiamentoEstagio: 'Documentos pendentes',
      }),
    ).toBe('FIN-03')
  })

  it('ficha em análise → FIN-04', () => {
    expect(
      statusOficialDaSituacao('Financiamento em análise', {
        financiamentoEstagio: 'Ficha em análise',
      }),
    ).toBe('FIN-04')
  })

  it('financeira pediu complemento → FIN-05', () => {
    expect(
      statusOficialDaSituacao('Financiamento em análise', {
        financiamentoEstagio: 'Financeira pediu complemento',
      }),
    ).toBe('FIN-05')
  })

  it('apenas "pendente" NÃO vira FIN-04', () => {
    const r = resolverSituacaoLegada('Financiamento em análise', {
      financiamentoEstagio: 'pendente',
    })
    expect(r.tipo).toBe('PRECISA_CLASSIFICACAO')
  })
})

describe('7. Em negociação ativa — específico vence o fallback', () => {
  const casos: Array<[string, string]> = [
    ['preco', 'INT-N05'],
    ['entrada', 'INT-N06'],
    ['parcela', 'INT-N07'],
    ['comparacao', 'INT-N08'],
    ['decisao', 'INT-N09'],
    ['terceiro', 'INT-N10'],
    ['loja', 'INT-N11'],
  ]
  for (const [bloqueador, esperado] of casos) {
    it(`bloqueador "${bloqueador}" → ${esperado}`, () => {
      expect(
        statusOficialDaSituacao('Em negociação ativa', { bloqueadorNegociacao: bloqueador }),
      ).toBe(esperado)
    })
  }

  it('sem bloqueador registrado → INT-N04 (fallback oficial)', () => {
    expect(statusOficialDaSituacao('Em negociação ativa', {})).toBe('INT-N04')
  })
})

describe('9. Aguardando resposta do cliente — preserva o contexto', () => {
  it('proposta enviada sem retorno → INT-N03', () => {
    expect(
      statusOficialDaSituacao('Aguardando resposta do cliente', { propostaEnviada: true }),
    ).toBe('INT-N03')
  })

  it('simulação enviada → FIN-02', () => {
    expect(
      statusOficialDaSituacao('Aguardando resposta do cliente', { simulacaoEnviada: true }),
    ).toBe('FIN-02')
  })

  it('aguardando decisão → INT-N09', () => {
    expect(
      statusOficialDaSituacao('Aguardando resposta do cliente', {
        bloqueadorNegociacao: 'decisao',
      }),
    ).toBe('INT-N09')
  })

  it('contato inicial sem resposta → INT-C02', () => {
    expect(
      statusOficialDaSituacao('Aguardando resposta do cliente', { tentativasExecutadas: 2 }),
    ).toBe('INT-C02')
  })

  it('NÃO converte tudo para INT-C02 quando não há contexto', () => {
    expect(resolverSituacaoLegada('Aguardando resposta do cliente', {}).tipo).toBe(
      'PRECISA_CLASSIFICACAO',
    )
  })
})

describe('10. Aguardando ação do vendedor — não é universalmente INT-C03', () => {
  it('cliente respondeu ao primeiro contato → INT-C03', () => {
    expect(
      statusOficialDaSituacao('Aguardando ação do vendedor', { clienteRespondeu: true }),
    ).toBe('INT-C03')
  })

  it('pendência em negociação NÃO vira INT-C03', () => {
    expect(
      statusOficialDaSituacao('Aguardando ação do vendedor', {
        clienteRespondeu: true,
        propostaEnviada: true,
      }),
    ).toBe('INT-N03')
  })

  it('sem contexto → precisa classificação', () => {
    expect(resolverSituacaoLegada('Aguardando ação do vendedor', {}).tipo).toBe(
      'PRECISA_CLASSIFICACAO',
    )
  })
})

describe('11. Venda cancelada — terminal técnico, nunca status comercial', () => {
  it('é SYSTEM_TERMINAL', () => {
    expect(resolucaoDaSituacao('Venda cancelada')?.kind).toBe('SYSTEM_TERMINAL')
    expect(ehTerminalTecnico('Venda cancelada')).toBe(true)
  })

  it('NUNCA vira PER-02 nem qualquer status', () => {
    expect(statusOficialDaSituacao('Venda cancelada')).toBeNull()
    const r = resolverSituacaoLegada('Venda cancelada')
    expect(r.tipo).toBe('TERMINAL_TECNICO')
    if (r.tipo === 'TERMINAL_TECNICO') expect(r.terminal).toBe('cancelada')
  })

  it('venda perdida e venda cancelada são fatos diferentes', () => {
    expect(statusOficialDaSituacao('Venda perdida')).toBe('PER-02')
    expect(statusOficialDaSituacao('Venda cancelada')).toBeNull()
  })
})

describe('12. Pós-venda ativo — não inventa marco', () => {
  it('marco configurado pela loja é respeitado', () => {
    expect(statusOficialDaSituacao('Pós-venda ativo', { marcoPosVenda: 'REL-02' })).toBe('REL-02')
  })

  it('sem configuração da loja, NÃO inventa D+7 nem D+30', () => {
    const r = resolverSituacaoLegada('Pós-venda ativo', {})
    expect(r.tipo).toBe('PRECISA_CLASSIFICACAO')
  })

  it('marco fora do intervalo REL-01..REL-06 não é aceito', () => {
    expect(resolverSituacaoLegada('Pós-venda ativo', { marcoPosVenda: 'REL-09' }).tipo).toBe(
      'PRECISA_CLASSIFICACAO',
    )
  })
})

describe('13. Oportunidade futura — depende de existir data real', () => {
  it('sem data de retomada → INT-Q05', () => {
    expect(statusOficialDaSituacao('Oportunidade futura', {})).toBe('INT-Q05')
  })

  it('com data válida → PER-05', () => {
    expect(statusOficialDaSituacao('Oportunidade futura', { dataRetomada: '2026-12-01' })).toBe(
      'PER-05',
    )
  })

  it('data inválida não vira PER-05', () => {
    expect(statusOficialDaSituacao('Oportunidade futura', { dataRetomada: 'qualquer coisa' })).toBe(
      'INT-Q05',
    )
  })
})

describe('situações aposentadas', () => {
  it('as seis estão marcadas', () => {
    expect([...SITUACOES_APOSENTADAS].sort()).toEqual(
      [
        'Aguardando ação do vendedor',
        'Aguardando resposta do cliente',
        'Financiamento em análise',
        'Lead sem resposta',
        'Oportunidade futura',
        'Pós-venda ativo',
      ].sort(),
    )
  })

  it('toda aposentada é resolvida por contexto, nunca por mapeamento fixo', () => {
    for (const s of SITUACOES_APOSENTADAS) {
      expect(resolucaoDaSituacao(s)?.kind).toBe('CONTEXTUAL_MIGRATION')
      expect(ehSituacaoAposentada(s)).toBe(true)
    }
  })
})

describe('cobertura das 27 situações da Carteira', () => {
  it('todas estão classificadas em alguma das três formas', () => {
    const utils = readFileSync(
      path.resolve(import.meta.dir, '../../../components/carteira/carteiraUtils.jsx'),
      'utf8',
    )
    const bloco = utils.match(/export const SITUACOES_ATUAIS = \[([\s\S]*?)\];/)
    expect(bloco).not.toBeNull()
    const legadas = [...bloco![1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
    const classificadas = new Set(RESOLUCOES.map((r) => r.situacaoLegada))
    // Situação nova na tela sem decisão explícita quebra o build de propósito.
    expect(legadas.filter((l) => !classificadas.has(l))).toEqual([])
  })

  it('nenhuma situação aparece duas vezes', () => {
    const todas = RESOLUCOES.map((r) => r.situacaoLegada)
    expect(new Set(todas).size).toBe(todas.length)
  })

  it('MAPEAMENTOS_COM_PROVA só contém mapeamentos diretos', () => {
    expect(MAPEAMENTOS_COM_PROVA.every((m) => m.kind === 'DIRECT_MAPPING')).toBe(true)
    expect(MAPEAMENTOS_COM_PROVA.length).toBe(contextuais.length > 0 ? diretos.length : 0)
  })
})
