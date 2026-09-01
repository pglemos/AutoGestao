import { describe, expect, test } from 'bun:test'
import { buildStoreRiskReasons, calculateTraceableProgress } from './networkCockpitCalculations'

describe('network cockpit calculations', () => {
  test('explica cada risco sem score opaco', () => {
    expect(buildStoreRiskReasons({ disciplinePct: 40, projectionPct: 72, overdueActions: 3, blockedActions: 1, pendingClosures: 2, consultingEvidencePending: 1, consultingParticipantsPending: 2 })).toEqual([
      'Disciplina diária abaixo de 50%', 'Projeção abaixo de 80% da meta', '3 ações atrasadas', '1 ação bloqueada', '2 fechamentos pendentes', '1 evidência de consultoria pendente', '2 participantes obrigatórios sem confirmação',
    ])
  })
  test('mantém universo zero como ausência de percentual', () => {
    expect(calculateTraceableProgress({ completed: 6, total: 10 })).toEqual({ completed: 6, total: 10, percentage: 60 })
    expect(calculateTraceableProgress({ completed: 0, total: 0 })).toEqual({ completed: 0, total: 0, percentage: null })
  })

  test('não transforma qualidade desconhecida em risco numérico crítico', () => {
    expect(buildStoreRiskReasons({
      disciplinePct: 0,
      projectionPct: 100,
      overdueActions: 0,
      blockedActions: 0,
      pendingClosures: 0,
      consultingEvidencePending: 0,
      consultingParticipantsPending: 0,
      goalConfigured: true,
      operationalDataState: 'available',
      disciplineDataState: 'unknown',
    })).toEqual(['Disponibilidade da disciplina não confirmada'])
  })
})
