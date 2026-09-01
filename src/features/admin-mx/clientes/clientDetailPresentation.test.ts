import { describe, expect, test } from 'bun:test'
import { buildClientAttentionSummary, resolveClientNextAction } from './clientDetailPresentation'

const baseNextAction = {
  requiresActivation: false,
  clientIsActive: true,
  blockerCount: 0,
  overdueVisitCount: 0,
  missingDataCount: 0,
  staleDataCount: 0,
  dataHealth: 'ready' as const,
  warningCount: 0,
  journeyIncomplete: false,
  totalVisits: 9,
}

describe('cockpit operacional do cliente', () => {
  test('resume pendências sem transformar carregamento em zero', () => {
    const summary = buildClientAttentionSummary({
      blockerCount: 1,
      warningCount: 2,
      overdueVisitCount: 1,
      missingDataCount: 2,
      staleDataCount: 1,
      dataHealth: 'ready',
    })

    expect(summary.count).toBe(7)
    expect(summary.items).toEqual([
      '1 bloqueio de ativação',
      '2 ajustes de configuração',
      '1 encontro atrasado',
      '2 fontes sem dados recebidos',
      '1 fonte desatualizada',
    ])
    expect(summary.detail).toContain('1 bloqueio de ativação')
    expect(summary.detail).toContain('+3 outros')
  })

  test('expõe a leitura como em verificação quando a fonte ainda está carregando', () => {
    const summary = buildClientAttentionSummary({
      blockerCount: 0,
      warningCount: 0,
      overdueVisitCount: 0,
      missingDataCount: null,
      staleDataCount: null,
      dataHealth: 'loading',
    })

    expect(summary.count).toBe(0)
    expect(summary.items).toEqual([])
    expect(summary.detail).toBe('Verificando as fontes de dados do cliente.')
  })

  test('prioriza ativação quando há bloqueio obrigatório', () => {
    expect(resolveClientNextAction({
      ...baseNextAction,
      requiresActivation: true,
      blockerCount: 2,
    })).toMatchObject({ key: 'ativacao', label: 'Revisar ativação' })
    expect(resolveClientNextAction({
      ...baseNextAction,
      requiresActivation: true,
      clientIsActive: false,
      blockerCount: 2,
    })).toMatchObject({ key: 'ativacao', label: 'Validar e ativar' })
  })

  test('prioriza jornada atrasada antes de plano e dados', () => {
    expect(resolveClientNextAction({
      ...baseNextAction,
      overdueVisitCount: 1,
      overdueActionCount: 3,
      missingDataCount: 2,
    })).toMatchObject({ key: 'jornada', label: 'Revisar jornada atrasada' })
  })

  test('leva erro de leitura do Plano de Ação para o próximo clique', () => {
    expect(resolveClientNextAction({
      ...baseNextAction,
      actionPlanError: true,
    })).toMatchObject({ key: 'plano-acao', label: 'Verificar Plano de Ação' })
  })

  test('encaminha fontes ausentes para Dados e metas pendentes para Planejamento', () => {
    expect(resolveClientNextAction({
      ...baseNextAction,
      missingDataCount: 1,
      strategicPlanPendingCount: 2,
    }).key).toBe('dados')
    expect(resolveClientNextAction({
      ...baseNextAction,
      strategicPlanPendingCount: 2,
    }).key).toBe('planejamento')
  })
})
