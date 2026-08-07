import { describe, expect, it } from 'bun:test'

import { classifyScore, computeScore, SCORE_PILLAR_WEIGHTS } from './score'

/**
 * Fonte: aba `07 Score_Prioridade` da matriz v1.
 *
 * Pilares e valores (total / parcial / zero) vêm literalmente da planilha:
 *   Status definido e coerente          15 / 8  / 0
 *   Próximo passo, responsável e data   20 / 10 / 0
 *   Execução dentro do prazo            30 / 25 (vence hoje) / 10 (atraso <24h) / 0
 *   Cadência respeitada                 20 / 10 / 0
 *   Histórico atualizado                15 / 8  / 0
 */

describe('pesos dos pilares', () => {
  it('soma exatamente 100', () => {
    const total = Object.values(SCORE_PILLAR_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(total).toBe(100)
  })

  it('usa os pesos da planilha', () => {
    expect(SCORE_PILLAR_WEIGHTS).toEqual({
      status: 15,
      nextStep: 20,
      execution: 30,
      cadence: 20,
      history: 15,
    })
  })
})

describe('computeScore — condução perfeita', () => {
  it('dá 100 quando todos os pilares estão completos', () => {
    const result = computeScore({
      status: 'complete',
      nextStep: 'complete',
      execution: 'onTime',
      cadence: 'respected',
      history: 'complete',
    })
    expect(result.total).toBe(100)
    expect(result.breakdown).toEqual({
      status: 15,
      nextStep: 20,
      execution: 30,
      cadence: 20,
      history: 15,
    })
  })
})

describe('computeScore — valores parciais da planilha', () => {
  it('status válido com informação pendente vale 8', () => {
    expect(computeScore({ status: 'partial' }).breakdown.status).toBe(8)
  })

  it('próximo passo sem data/responsável vale 10', () => {
    expect(computeScore({ nextStep: 'partial' }).breakdown.nextStep).toBe(10)
  })

  it('ação que vence hoje vale 25', () => {
    expect(computeScore({ execution: 'dueToday' }).breakdown.execution).toBe(25)
  })

  it('atraso menor que 24h vale 10', () => {
    expect(computeScore({ execution: 'lateUnder24h' }).breakdown.execution).toBe(10)
  })

  it('atraso maior que 24h zera o pilar de execução', () => {
    expect(computeScore({ execution: 'lateOver24h' }).breakdown.execution).toBe(0)
  })

  it('cliente respondeu sem retorno do vendedor zera o pilar de execução', () => {
    expect(computeScore({ execution: 'awaitingSellerResponse' }).breakdown.execution).toBe(0)
  })

  it('uma tentativa fora do prazo vale 10', () => {
    expect(computeScore({ cadence: 'partial' }).breakdown.cadence).toBe(10)
  })

  it('histórico sem resultado suficiente vale 8', () => {
    expect(computeScore({ history: 'partial' }).breakdown.history).toBe(8)
  })
})

describe('computeScore — o cliente não responder não penaliza o vendedor', () => {
  /**
   * Exemplo obrigatório do prompt (§31) e regra da planilha
   * ("Não punir falta de resposta do cliente").
   */
  it('mantém score máximo quando o vendedor cumpriu toda a cadência e o cliente nunca respondeu', () => {
    const result = computeScore({
      status: 'complete',
      nextStep: 'complete',
      execution: 'onTime',
      cadence: 'respected',
      history: 'complete',
      clientNeverResponded: true,
    })
    expect(result.total).toBe(100)
    expect(result.classification).toBe('Excelente')
  })

  it('cadência concluída sem resposta não é tentativa ignorada', () => {
    const result = computeScore({
      cadence: 'completedWithoutResponse',
      clientNeverResponded: true,
    })
    expect(result.breakdown.cadence).toBe(SCORE_PILLAR_WEIGHTS.cadence)
  })
})

describe('computeScore — sem dupla penalização', () => {
  /**
   * A planilha traz uma tabela de perdas/recuperações (linhas 7-21) marcada como
   * "usar como alerta ALÉM da fórmula dos pilares". Portanto ela NÃO entra no total.
   */
  it('não aplica os deltas de alerta ao total dos pilares', () => {
    const result = computeScore({
      status: 'complete',
      nextStep: 'complete',
      execution: 'onTime',
      cadence: 'respected',
      history: 'complete',
      alerts: ['no_next_action', 'client_responded_untreated'],
    })
    expect(result.total).toBe(100)
    expect(result.alerts).toEqual(['no_next_action', 'client_responded_untreated'])
  })
})

describe('computeScore — limites', () => {
  it('nunca passa de 100 nem fica abaixo de 0', () => {
    expect(computeScore({}).total).toBeGreaterThanOrEqual(0)
    expect(
      computeScore({
        status: 'complete',
        nextStep: 'complete',
        execution: 'onTime',
        cadence: 'respected',
        history: 'complete',
      }).total,
    ).toBeLessThanOrEqual(100)
  })

  it('estado totalmente indefinido vale 0', () => {
    expect(computeScore({}).total).toBe(0)
  })
})

describe('classifyScore — fronteiras exatas (§62)', () => {
  const cases: Array<[number, string]> = [
    [100, 'Excelente'],
    [90, 'Excelente'],
    [89, 'Boa'],
    [75, 'Boa'],
    [74, 'Atenção'],
    [50, 'Atenção'],
    [49, 'Crítica'],
    [0, 'Crítica'],
  ]
  for (const [value, expected] of cases) {
    it(`${value} → ${expected}`, () => {
      expect(classifyScore(value)).toBe(expected)
    })
  }
})

describe('determinismo', () => {
  it('mesma entrada produz exatamente o mesmo resultado', () => {
    const input = {
      status: 'partial' as const,
      nextStep: 'complete' as const,
      execution: 'dueToday' as const,
      cadence: 'partial' as const,
      history: 'complete' as const,
    }
    expect(computeScore(input)).toEqual(computeScore(input))
  })
})
