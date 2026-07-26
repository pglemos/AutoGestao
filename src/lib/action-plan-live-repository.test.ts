import { describe, expect, it } from 'bun:test'

import {
  buildActionUpdatePatch,
  mapLiveAction,
} from '../components/owner/actionplan/actionPlanLiveRepository.js'

describe('mapLiveAction', () => {
  it('preserves a persisted blocked status instead of treating it as late', () => {
    const action = mapLiveAction({
      id: 'action-1',
      codigo: 'PA-00000001',
      acao: 'Destravar aprovação',
      problema: 'Aprovação pendente',
      departamento: 'commercial',
      status: 'bloqueada',
      prioridade: 'alta',
      progresso: 42,
      blocked_reason: 'Decisão do Dono',
      block_category: 'owner_decision',
      block_responsible_id: 'owner-1',
      expected_unblock_date: '2026-07-30',
      block_note: 'Aguardar reunião',
      impact_status: 'partial',
      impact_value_before: 10,
      impact_value_after: 14,
      realized_impact: 'Conversão subiu',
      impact_measurement_date: '2026-07-25',
      retorno_motivo: null,
      retorno_orientacao: null,
      reabertura_motivo: null,
      cancelamento_motivo: null,
      progress_note: 'Em validação',
      next_step: 'Reunir com o Dono',
      projected_date: '2026-08-01',
    })

    expect(action.status).toBe('blocked')
    expect(action.statusLabel).toBe('Bloqueada')
    expect(action.blockedReason).toBe('Decisão do Dono')
    expect(action.blockCategory).toBe('owner_decision')
    expect(action.expectedUnblockDate).toBe('30/07/2026')
    expect(action.blockNote).toBe('Aguardar reunião')
    expect(action.impactStatus).toBe('partial')
    expect(action.impactValueBefore).toBe(10)
    expect(action.impactValueAfter).toBe(14)
    expect(action.realizedImpact).toBe('Conversão subiu')
    expect(action.impactMeasurementDate).toBe('25/07/2026')
    expect(action.progressNote).toBe('Em validação')
    expect(action.nextStep).toBe('Reunir com o Dono')
    expect(action.projectedDate).toBe('01/08/2026')
  })

  it('maps history event type and preserves event metadata', () => {
    const action = mapLiveAction(
      {
        id: 'action-2',
        acao: 'Atualizar preço',
        problema: 'Preço desatualizado',
        departamento: 'commercial',
        status: 'pendente',
        prioridade: 'media',
        progresso: 0,
      },
      {
        historyByAction: new Map([
          [
            'action-2',
            [
              {
                id: 'event-1',
                event_type: 'delegated',
                event_note: 'Delegada ao gerente',
                changed_at: '2026-07-25T12:00:00Z',
                changed_by: 'user-1',
                changed_fields: ['responsavel_id'],
                old_values: { responsavel_id: null },
                new_values: { responsavel_id: 'user-2' },
              },
            ],
          ],
        ]),
      },
    )

    expect(action.history[0]).toMatchObject({
      type: 'delegated',
      description: 'Delegada ao gerente',
      metadata: {
        oldValues: { responsavel_id: null },
        newValues: { responsavel_id: 'user-2' },
      },
    })
  })

  it('keeps explicit nulls in an update patch so values can be cleared', () => {
    expect(buildActionUpdatePatch({
      responsibleId: null,
      dueDate: null,
      impactStatus: 'none',
      impactValueBefore: null,
      impactValueAfter: 0,
      blockNote: null,
    })).toEqual({
      responsavel_id: null,
      prazo: null,
      impact_status: 'none',
      impact_value_before: null,
      impact_value_after: 0,
      block_note: null,
      eficacia_score: 0,
    })
  })
})
