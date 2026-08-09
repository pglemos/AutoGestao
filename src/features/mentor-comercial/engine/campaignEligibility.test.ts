import { describe, expect, it } from 'bun:test'

import {
  evaluateCampaignEligibility,
  countEligible,
  FINANCING_SEGMENT_CODES,
  familyOfStatus,
  type CampaignEligibilityInput,
} from './campaignEligibility'

/**
 * Fonte: PRODUCT DELTA 2026-08-07 §7 (motor de elegibilidade) + catálogo de
 * status `rules/mentor-comercial/v1/statuses.json` (famílias e códigos).
 */

const base = (overrides: Partial<CampaignEligibilityInput>): CampaignEligibilityInput => ({
  targeting: { kind: 'carteira' },
  statusCode: null,
  ...overrides,
})

describe('famílias por prefixo de código', () => {
  it('mapeia famílias do catálogo de status', () => {
    expect(familyOfStatus('TR-01')).toBe('Troca')
    expect(familyOfStatus('FIN-06')).toBe('Financiamento')
    expect(familyOfStatus('VEN-04')).toBe('Venda e Entrega')
    expect(familyOfStatus('PER-02')).toBe('Perda e Futuro')
    expect(familyOfStatus('REL-04')).toBe('Relacionamento')
    expect(familyOfStatus(null)).toBeNull()
  })
})

describe('exclusões — precedência máxima (§7.3)', () => {
  it('do_not_contact exclui qualquer targeting', () => {
    for (const kind of ['carteira', 'trade_interest', 'financing', 'vehicle_match'] as const) {
      const r = evaluateCampaignEligibility(base({
        targeting: { kind },
        doNotContact: true,
        statusCode: 'TR-03',
      }))
      expect(r.eligible).toBe(false)
      expect(r.reasons[0]).toBe('Cliente optou por não ser contatado')
    }
  })

  it('sale_date presente exclui', () => {
    const r = evaluateCampaignEligibility(base({ saleDate: '2026-08-01', statusCode: 'TR-03' }))
    expect(r.eligible).toBe(false)
  })

  it('closed_at com família Venda e Entrega exclui', () => {
    const r = evaluateCampaignEligibility(base({ closedAt: '2026-08-01', statusCode: 'VEN-03' }))
    expect(r.eligible).toBe(false)
  })

  it('closed_at com VEN-04 (Venda realizada) exclui mesmo sem closedAt explícito', () => {
    const r = evaluateCampaignEligibility(base({ closedAt: '2026-08-01', statusCode: 'VEN-04' }))
    expect(r.eligible).toBe(false)
  })

  it('closed_at fora da família Venda e Entrega NÃO exclui por venda fechada', () => {
    const r = evaluateCampaignEligibility(base({ closedAt: '2026-08-01', statusCode: 'TR-06' }))
    expect(r.eligible).toBe(true)
  })
})

describe('targeting carteira — comportamento legado (§7.1)', () => {
  it('carteira ativa é elegível', () => {
    const r = evaluateCampaignEligibility(base({ statusCode: 'INT-N03' }))
    expect(r.eligible).toBe(true)
    expect(r.reasons).toContain('Carteira ativa')
  })

  it('perda terminal (PER-02) não é elegível', () => {
    const r = evaluateCampaignEligibility(base({ statusCode: 'PER-02' }))
    expect(r.eligible).toBe(false)
  })

  it('cadência encerrada (PER-03) não é elegível', () => {
    const r = evaluateCampaignEligibility(base({ statusCode: 'PER-03' }))
    expect(r.eligible).toBe(false)
  })

  it('situação terminal por rótulo legado não é elegível', () => {
    const r = evaluateCampaignEligibility(base({ situacaoAtual: 'Venda cancelada' }))
    expect(r.eligible).toBe(false)
  })

  it('contato futuro programado (PER-05) NÃO é terminal', () => {
    const r = evaluateCampaignEligibility(base({ statusCode: 'PER-05' }))
    expect(r.eligible).toBe(true)
  })
})

describe('targeting trade_interest (§7.1)', () => {
  it('família Troca é evidência', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'trade_interest' }, statusCode: 'TR-03' }))
    expect(r.eligible).toBe(true)
    expect(r.source).toBe('status_code')
  })

  it('REL-04/05/06 é troca potencial', () => {
    for (const code of ['REL-04', 'REL-05', 'REL-06']) {
      const r = evaluateCampaignEligibility(base({ targeting: { kind: 'trade_interest' }, statusCode: code }))
      expect(r.eligible).toBe(true)
      expect(r.reasons[0]).toContain('Troca potencial')
    }
  })

  it('sinal novo trade_interest=true é evidência', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'trade_interest' }, tradeInterest: true }))
    expect(r.eligible).toBe(true)
    expect(r.source).toBe('new_signal')
  })

  it('sinal novo trade_interest=false NÃO cai para legado (nunca misturar)', () => {
    const r = evaluateCampaignEligibility(base({
      targeting: { kind: 'trade_interest' },
      tradeInterest: false,
      legacyTradeInterest: true,
    }))
    expect(r.eligible).toBe(false)
  })

  it('sinal legado carro_avaliado é evidência só sem sinal novo', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'trade_interest' }, legacyTradeInterest: true }))
    expect(r.eligible).toBe(true)
    expect(r.source).toBe('legacy_signal')
  })

  it('sem evidência nenhuma não é elegível', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'trade_interest' } }))
    expect(r.eligible).toBe(false)
  })

  it('status FIN não é evidência de troca', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'trade_interest' }, statusCode: 'FIN-03' }))
    expect(r.eligible).toBe(false)
  })
})

describe('targeting financing — segmentos (§7.2)', () => {
  it('segmento all cobre FIN-01..FIN-09', () => {
    expect(FINANCING_SEGMENT_CODES.all).toEqual([
      'FIN-01', 'FIN-02', 'FIN-03', 'FIN-04', 'FIN-05', 'FIN-06', 'FIN-07', 'FIN-08', 'FIN-09',
    ])
  })

  it('approved = FIN-06', () => {
    expect(FINANCING_SEGMENT_CODES.approved).toEqual(['FIN-06'])
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'approved' }, statusCode: 'FIN-06' }))
    expect(r.eligible).toBe(true)
    const r2 = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'approved' }, statusCode: 'FIN-07' }))
    expect(r2.eligible).toBe(false)
  })

  it('approved_with_conditions = FIN-07', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'approved_with_conditions' }, statusCode: 'FIN-07' }))
    expect(r.eligible).toBe(true)
  })

  it('rejected = FIN-08', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'rejected' }, statusCode: 'FIN-08' }))
    expect(r.eligible).toBe(true)
  })

  it('pending = FIN-03/04/05', () => {
    for (const code of ['FIN-03', 'FIN-04', 'FIN-05']) {
      const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'pending' }, statusCode: code }))
      expect(r.eligible).toBe(true)
    }
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'pending' }, statusCode: 'FIN-02' }))
    expect(r.eligible).toBe(false)
  })

  it('new_simulation = FIN-09', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'new_simulation' }, statusCode: 'FIN-09' }))
    expect(r.eligible).toBe(true)
  })

  it('segmento específico exige código — sinal booleano não basta', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'approved' }, financingInterest: true }))
    expect(r.eligible).toBe(false)
  })

  it('all sem código usa sinal novo financing_interest', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'all' }, financingInterest: true }))
    expect(r.eligible).toBe(true)
    expect(r.source).toBe('new_signal')
  })

  it('all sem código e sem sinais não é elegível', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'financing', segment: 'all' } }))
    expect(r.eligible).toBe(false)
  })
})

describe('targeting vehicle_match (§7.1)', () => {
  it('cliente com veículo de interesse é elegível', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'vehicle_match' }, hasVehicleInterest: true }))
    expect(r.eligible).toBe(true)
  })

  it('sem veículo de interesse não é elegível', () => {
    const r = evaluateCampaignEligibility(base({ targeting: { kind: 'vehicle_match' }, hasVehicleInterest: false }))
    expect(r.eligible).toBe(false)
  })
})

describe('retorno determinístico (§7.4)', () => {
  it('propaga sourceOpportunityId', () => {
    const r = evaluateCampaignEligibility(base({ statusCode: 'TR-03', sourceOpportunityId: 'opp-123' }))
    expect(r.sourceOpportunityId).toBe('opp-123')
  })
})

describe('countEligible — prévia da campanha (§22.2)', () => {
  it('conta elegíveis e avaliações por fonte', () => {
    const clients = [
      { id: 'c1', statusCode: 'TR-03', situacaoAtual: null },
      { id: 'c2', statusCode: 'FIN-06', situacaoAtual: null },
      { id: 'c3', statusCode: null, situacaoAtual: 'Venda realizada' },
      { id: 'c4', statusCode: null, situacaoAtual: 'Em negociação', tradeInterest: true },
    ]
    const r = countEligible(clients, { kind: 'trade_interest' })
    expect(r.total).toBe(4)
    expect(r.eligible).toBe(2)
    expect(r.reasonsBySource.status_code).toBe(1)
    expect(r.reasonsBySource.new_signal).toBe(1)
  })
})
