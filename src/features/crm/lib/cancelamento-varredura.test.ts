import { describe, expect, test } from 'bun:test'
import { CRM_ETAPAS_ATIVAS, CRM_ETAPAS_FUNIL, isEtapaTerminal } from '@/lib/schemas/crm.schema'
import { buildOportunidadePayload } from '@/features/crm/hooks/useOportunidades'
import { derivarProgresso } from '@/features/crm/lib/cadencia'
import { derivarSituacao, derivarTemperatura } from '@/features/crm/lib/mentorComercial'

/**
 * Varredura sistêmica: os primeiros commits corrigiram a carteira, mas a etapa
 * `cancelada` continuava desconhecida em vários outros pontos que decidiam
 * "esta oportunidade ainda está viva?" com uma lista literal de duas etapas.
 */

describe('cancelada é conhecida pelo vocabulário do CRM', () => {
  test('o enum do schema espelha o enum crm_etapa_funil de produção', () => {
    // z.enum(CRM_ETAPAS_FUNIL) valida OportunidadeSchema: sem 'cancelada' a
    // validação rejeitava qualquer oportunidade cancelada vinda do banco.
    expect(CRM_ETAPAS_FUNIL).toContain('cancelada')
  })

  test('cancelada não é etapa ativa do funil', () => {
    expect(CRM_ETAPAS_ATIVAS).not.toContain('cancelada')
  })

  test('isEtapaTerminal cobre as três etapas terminais', () => {
    expect(isEtapaTerminal('ganho')).toBe(true)
    expect(isEtapaTerminal('perdido')).toBe(true)
    expect(isEtapaTerminal('cancelada')).toBe(true)
    expect(isEtapaTerminal('negociacao')).toBe(false)
    expect(isEtapaTerminal(null)).toBe(false)
  })
})

describe('cancelada encerra a oportunidade nos fluxos do CRM', () => {
  test('buildOportunidadePayload fecha a oportunidade cancelada', () => {
    const payload = buildOportunidadePayload(
      { cliente_id: 'c1', etapa: 'cancelada' },
      { loja_id: 'l1', seller_user_id: 's1' },
      () => '2026-07-27T12:00:00Z',
    )
    expect(payload.closed_at).toBe('2026-07-27T12:00:00Z')
  })

  test('a cadência encerra quando a única oportunidade foi cancelada', () => {
    const progresso = derivarProgresso(
      { id: 'c1', canal_origem: 'internet', ultima_interacao: null },
      [{ id: 'o1', cliente_id: 'c1', etapa: 'cancelada' }] as never,
      [],
    )
    expect(progresso.encerramento).toBe('cancelada')
  })

  test('a cadência não trata cancelada como progresso de funil', () => {
    // ETAPA_FUNIL_ORDEM não conhecia 'cancelada', então o `?? 0` a colocava no
    // nível de prospecção e o cliente parecia estar avançando.
    const progresso = derivarProgresso(
      { id: 'c1', canal_origem: 'internet', ultima_interacao: null },
      [{ id: 'o1', cliente_id: 'c1', etapa: 'cancelada' }] as never,
      [],
    )
    expect(progresso.etapas[progresso.etapaAtualIndex].id).not.toBe('negociacao')
  })
})

describe('o mentor comercial reconhece a venda cancelada', () => {
  const cliente = { id: 'c1', status: 'oportunidade', ultima_interacao: null } as never

  test('a situação derivada é Venda cancelada', () => {
    expect(derivarSituacao(cliente, { etapa: 'cancelada' } as never)).toBe('Venda cancelada')
  })

  test('a etapa da cadência não sobrescreve o desfecho cancelado', () => {
    expect(derivarSituacao(cliente, { etapa: 'cancelada' } as never, 'negociacao')).toBe('Venda cancelada')
  })

  test('a temperatura de uma oportunidade cancelada é fria', () => {
    expect(derivarTemperatura({ etapa: 'cancelada' } as never)).toBe('frio')
  })
})
