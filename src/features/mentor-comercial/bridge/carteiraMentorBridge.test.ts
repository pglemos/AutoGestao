import { describe, expect, it } from 'bun:test'

import {
  calcularPrioridadeOficial,
  calcularScoreOficial,
  classificacaoScoreOficial,
  derivarPilares,
  derivarPotencial,
  derivarQualidadeCadencia,
  derivarQualidadeExecucao,
  derivarUrgencia,
  objetivoEProximoPassoOficial,
  type ClienteCarteira,
} from './carteiraMentorBridge'
import { SCORE_PILLAR_WEIGHTS } from '../engine/score'

/**
 * A troca é do MOTOR, não das telas. Estes testes provam que a fachada devolve o
 * mesmo formato de antes, mas com as regras oficiais por trás.
 */

const AGORA = new Date('2026-08-10T12:00:00.000Z')

const cliente = (over: Partial<ClienteCarteira> = {}): ClienteCarteira => ({
  situacao_atual: 'Em negociação ativa',
  proximo_passo: 'Enviar proposta',
  proxima_acao_data: '2026-08-11',
  responsavel: 'Vendedor',
  ultimo_contato: '2026-08-09',
  ultimo_resultado: 'Cliente pediu proposta',
  cadencia_tentativa: 2,
  cadencia_total: 6,
  ...over,
})

describe('formato de retorno preservado', () => {
  it('calcularScoreOficial devolve { score, motivos }', () => {
    const r = calcularScoreOficial(cliente(), AGORA)
    expect(typeof r.score).toBe('number')
    expect(Array.isArray(r.motivos)).toBe(true)
  })

  it('cliente nulo não quebra a tela', () => {
    expect(calcularScoreOficial(null, AGORA)).toEqual({ score: 100, motivos: [] })
    expect(calcularPrioridadeOficial(null, AGORA)).toBe('Baixa')
  })

  it('calcularPrioridadeOficial devolve rótulo em português', () => {
    expect(['Máxima', 'Alta', 'Média', 'Baixa']).toContain(
      calcularPrioridadeOficial(cliente(), AGORA),
    )
  })
})

describe('score agora são os cinco pilares oficiais', () => {
  it('condução perfeita dá exatamente 100', () => {
    const r = calcularScoreOficial(
      cliente({ proxima_acao_data: '2026-08-15', cadencia_status: 'ativa' }),
      AGORA,
    )
    expect(r.score).toBe(100)
  })

  it('o total nunca ultrapassa a soma dos pesos', () => {
    const soma = Object.values(SCORE_PILLAR_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(calcularScoreOficial(cliente(), AGORA).score).toBeLessThanOrEqual(soma)
  })

  it('sem próximo passo perde exatamente o pilar de próximo passo', () => {
    const semPasso = cliente({ proximo_passo: null, proxima_acao: null })
    const pilares = derivarPilares(semPasso, AGORA)
    expect(pilares.nextStep).toBe('missing')
  })
})

describe('oportunidade encerrada sai do ranking', () => {
  for (const situacao of ['Venda realizada', 'Venda perdida', 'Cadência encerrada sem resposta']) {
    it(`"${situacao}" devolve 100 e não vira Crítica`, () => {
      const r = calcularScoreOficial(cliente({ situacao_atual: situacao }), AGORA)
      expect(r.score).toBe(100)
      expect(r.motivos).toEqual(['Oportunidade encerrada.'])
      expect(calcularPrioridadeOficial(cliente({ situacao_atual: situacao }), AGORA)).toBe('Baixa')
    })
  }
})

describe('o cliente não responder não penaliza o vendedor', () => {
  it('cadência concluída sem resposta mantém o pilar de cadência cheio', () => {
    expect(derivarQualidadeCadencia({ cadencia_status: 'Cadência encerrada' })).toBe(
      'completedWithoutResponse',
    )
  })

  it('sem informação de cadência não presume quebra', () => {
    expect(derivarQualidadeCadencia({})).toBe('partial')
  })
})

describe('cliente respondeu e vendedor não tratou', () => {
  const parado = cliente({
    situacao_atual: 'Aguardando ação do vendedor',
    ultimo_contato: '2026-08-08',
    proxima_acao_data: '2026-08-08',
  })

  it('zera o pilar de execução', () => {
    expect(derivarQualidadeExecucao(parado, AGORA)).toBe('awaitingSellerResponse')
  })

  it('vira a urgência máxima', () => {
    expect(derivarUrgencia(parado, AGORA)).toBe('clientRespondedAwaitingSeller')
  })

  it('garante prioridade mínima Alta', () => {
    expect(['Alta', 'Máxima']).toContain(calcularPrioridadeOficial(parado, AGORA))
  })
})

describe('prioridade usa a fórmula oficial 45/35/20', () => {
  it('visita hoje eleva a prioridade', () => {
    const comVisita = cliente({
      situacao_atual: 'Visita hoje',
      visita_agendada_em: '2026-08-10',
      proxima_acao_data: '2026-08-10',
    })
    expect(['Alta', 'Máxima']).toContain(calcularPrioridadeOficial(comVisita, AGORA))
  })

  it('financiamento aprovado eleva a prioridade', () => {
    const aprovado = cliente({
      situacao_atual: 'Financiamento aprovado',
      financiamento_status: 'Aprovado',
    })
    expect(['Alta', 'Máxima']).toContain(calcularPrioridadeOficial(aprovado, AGORA))
  })

  it('ação futura e potencial baixo dá prioridade baixa', () => {
    const frio = cliente({
      situacao_atual: 'Em qualificação',
      proxima_acao_data: '2026-09-30',
      proximo_passo: 'Retomar contato',
    })
    expect(['Baixa', 'Média']).toContain(calcularPrioridadeOficial(frio, AGORA))
  })

  it('potencial vem da situação, conforme a aba 07', () => {
    expect(derivarPotencial({ situacao_atual: 'Visita hoje' })).toBe('Muito alto')
    expect(derivarPotencial({ situacao_atual: 'Proposta enviada' })).toBe('Alto')
    expect(derivarPotencial({ situacao_atual: 'Cliente respondeu' })).toBe('Médio')
    expect(derivarPotencial({ situacao_atual: 'situação desconhecida' })).toBe('Baixo')
  })
})

describe('classificação de score mantém as faixas da tela', () => {
  const casos: Array<[number, string]> = [
    [100, 'Excelente'],
    [90, 'Excelente'],
    [89, 'Boa'],
    [75, 'Boa'],
    [74, 'Atenção'],
    [50, 'Atenção'],
    [49, 'Crítica'],
  ]
  for (const [valor, esperado] of casos) {
    it(`${valor} → ${esperado}`, () => {
      expect(classificacaoScoreOficial(valor)).toBe(esperado)
    })
  }
})

describe('determinismo', () => {
  it('mesma entrada e mesmo instante dão o mesmo resultado', () => {
    const c = cliente()
    expect(calcularScoreOficial(c, AGORA)).toEqual(calcularScoreOficial(c, AGORA))
    expect(calcularPrioridadeOficial(c, AGORA)).toBe(calcularPrioridadeOficial(c, AGORA))
  })
})

describe('objetivo e próximo passo vêm do catálogo quando há prova', () => {
  it('"Visita hoje" usa o objetivo oficial, não o legado', () => {
    const r = objetivoEProximoPassoOficial('Visita hoje')
    expect(r?.statusId).toBe('INT-V05')
    expect(r?.objetivo).toBe('Realizar atendimento')
    expect(r?.proximoPasso).toBe('Recepcionar cliente')
  })

  it('"Cadência encerrada" manda retirar da Carteira Ativa', () => {
    expect(objetivoEProximoPassoOficial('Cadência encerrada')?.proximoPasso).toBe(
      'Retirar da Carteira Ativa',
    )
  })

  it('situação sem mapeamento provado devolve null — a tela mantém o texto legado', () => {
    for (const semProva of ['Em negociação ativa', 'Pós-venda ativo', 'Vai pensar']) {
      expect(objetivoEProximoPassoOficial(semProva)).toBeNull()
    }
  })

  it('entrada vazia não resolve', () => {
    expect(objetivoEProximoPassoOficial(null)).toBeNull()
    expect(objetivoEProximoPassoOficial('')).toBeNull()
  })

  it('devolve o statusId para auditoria do que decidiu', () => {
    expect(objetivoEProximoPassoOficial('Venda perdida')?.statusId).toBe('PER-02')
  })
})
