import { describe, expect, test } from 'bun:test'
import { createConsultingJourneyRepository } from './consultingJourneyRepository'

function fakeClient() {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const uploaded: string[] = []
  const removed: string[] = []
  return {
    calls,
    uploaded,
    removed,
    client: {
      rpc: (async (name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }> => {
        calls.push({ name, args })
        if (name === 'get_consultoria_jornada_loja') return { data: {
          clientId: 'client-1', storeId: 'store-1', programKey: 'pmr', programName: 'PMR', clientStatus: 'ativo',
          visitsCompleted: 1, totalVisits: 7, nextVisitNumber: 2, nextStep: 'Preparar indicadores', canViewStrategicContent: true,
          visits: [{
            id: 'visit-2', visitNumber: 2, scheduledAt: null, status: 'agendada', objective: 'Objetivo', googleMeetLink: null,
            lesson: { id: 'lesson-1', title: 'Aula', videoUrl: 'https://video' }, lessonProgress: null,
            deliveryItems: [{ id: 'item-1', item_type: 'task', required: true, status: 'pending', title: 'Enviar DRE' }],
            participants: [{ id: 'part-1', visit_id: 'visit-2', participant_key: 'owner', user_id: null, name: 'Dono', role_label: 'Dono', required: true, confirmed: false, confirmed_at: null, note: null }],
            evidences: [], anticipation: null,
          }],
        }, error: null }
        if (name === 'registrar_evidencia_consultoria') return { data: { id: 'evidence-1' }, error: null }
        return { data: { ok: true }, error: null }
      }) as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>,
      storage: {
        from: () => ({
          upload: async (path: string) => { uploaded.push(path); return { data: { path }, error: null } },
          remove: async (paths: string[]) => { removed.push(...paths); return { data: null, error: null } },
        }),
      },
    },
  }
}

describe('consultingJourneyRepository', () => {
  test('mapeia snapshot seguro para contrato camelCase', async () => {
    const fake = fakeClient()
    const repository = createConsultingJourneyRepository(fake.client)
    const snapshot = await repository.load('store-1')
    expect(snapshot?.visits[0].deliveryItems[0]).toMatchObject({ id: 'item-1', itemType: 'task' })
    expect(snapshot?.visits[0].participants[0]).toMatchObject({ participantKey: 'owner', visitId: 'visit-2' })
  })

  test('envia progresso pelos argumentos canônicos', async () => {
    const fake = fakeClient()
    const repository = createConsultingJourneyRepository(fake.client)
    await repository.saveLessonProgress({ storeId: 'store-1', clientId: 'client-1', visitId: 'visit-2', lessonId: 'lesson-1', positionSeconds: 30, durationSeconds: 600, playedDeltaSeconds: 5 })
    expect(fake.calls.at(-1)).toEqual({ name: 'salvar_progresso_aula_consultoria', args: {
      p_store_id: 'store-1', p_client_id: 'client-1', p_visit_id: 'visit-2', p_lesson_id: 'lesson-1',
      p_position_seconds: 30, p_duration_seconds: 600, p_played_delta_seconds: 5,
    } })
  })

  test('remove upload quando o registro RPC falha', async () => {
    const fake = fakeClient()
    fake.client.rpc = async (name: string, args: Record<string, unknown>) => {
      fake.calls.push({ name, args })
      return { data: null, error: { message: 'falha no banco' } }
    }
    const repository = createConsultingJourneyRepository(fake.client)
    const file = new File(['conteúdo'], 'relatorio.pdf', { type: 'application/pdf' })
    await expect(repository.uploadEvidence({ storeId: 'store-1', clientId: 'client-1', visitId: 'visit-2', file, note: 'Relatório' })).rejects.toThrow('falha no banco')
    expect(fake.uploaded).toHaveLength(1)
    expect(fake.removed).toEqual(fake.uploaded)
  })
})
