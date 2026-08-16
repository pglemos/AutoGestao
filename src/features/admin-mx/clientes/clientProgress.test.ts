import { describe, expect, test } from 'bun:test'
import { buildProgressBars, classifyDataSource, dataIntegritySummary, mergeTimeline } from './clientProgress'

const HOJE = new Date('2026-08-16T12:00:00Z')

describe('três progressos do cliente', () => {
  test('separa onboarding, liberação e jornada', () => {
    const bars = buildProgressBars({
      onboardingStep: 3, onboardingCompleted: false,
      modulesEnabled: 2, modulesTotal: 6,
      visitsDone: 1, visitsTotal: 12,
    })
    expect(bars.map(bar => bar.kind)).toEqual(['onboarding', 'liberacao', 'jornada'])
    expect(bars[0].percent).toBe(43)
    expect(bars[1].percent).toBe(33)
    expect(bars[2].percent).toBe(8)
  })

  test('onboarding concluído fecha a barra mesmo com etapa antiga', () => {
    const [onboarding] = buildProgressBars({
      onboardingStep: 2, onboardingCompleted: true,
      modulesEnabled: 0, modulesTotal: 0, visitsDone: 0, visitsTotal: 0,
    })
    expect(onboarding.percent).toBe(100)
    expect(onboarding.detail).toBe('Cadastro concluído.')
  })

  test('sem total não divide por zero', () => {
    const bars = buildProgressBars({
      onboardingStep: null, onboardingCompleted: null,
      modulesEnabled: 0, modulesTotal: 0, visitsDone: 0, visitsTotal: 0,
    })
    expect(bars[1].percent).toBe(0)
    expect(bars[2].detail).toBe('Jornada ainda não gerada.')
  })
})

describe('integridade dos dados', () => {
  test('fonte sem registro é vazia', () => {
    const health = classifyDataSource({ key: 'metas', label: 'Metas', rows: 0, lastAt: null, today: HOJE })
    expect(health.status).toBe('vazio')
  })

  test('registro recente é ok', () => {
    const health = classifyDataSource({ key: 'lanc', label: 'Lançamentos', rows: 120, lastAt: '2026-08-10', today: HOJE })
    expect(health.status).toBe('ok')
    expect(health.detail).toContain('6 dia(s)')
  })

  test('último registro além da janela fica desatualizado', () => {
    const health = classifyDataSource({ key: 'lanc', label: 'Lançamentos', rows: 120, lastAt: '2026-05-01', today: HOJE })
    expect(health.status).toBe('desatualizado')
    expect(health.detail).toContain('107 dias')
  })

  test('resumo conta cada situação', () => {
    const resumo = dataIntegritySummary([
      classifyDataSource({ key: 'a', label: 'A', rows: 1, lastAt: '2026-08-15', today: HOJE }),
      classifyDataSource({ key: 'b', label: 'B', rows: 0, lastAt: null, today: HOJE }),
      classifyDataSource({ key: 'c', label: 'C', rows: 5, lastAt: '2026-01-01', today: HOJE }),
    ])
    expect(resumo).toEqual({ ok: 1, vazios: 1, desatualizados: 1, total: 3 })
  })
})

describe('linha do tempo', () => {
  test('junta fontes e ordena do mais recente', () => {
    const eventos = mergeTimeline([
      [{ id: '1', at: '2026-08-01T10:00:00Z', actor: 'Ana', action: 'criou', entity: 'plano', detail: null }],
      [{ id: '2', at: '2026-08-10T10:00:00Z', actor: 'Bruno', action: 'concluiu', entity: 'visita', detail: null }],
    ])
    expect(eventos.map(evento => evento.id)).toEqual(['2', '1'])
  })

  test('descarta evento sem data e respeita o limite', () => {
    const eventos = mergeTimeline([
      [{ id: 'x', at: '', actor: null, action: 'a', entity: 'e', detail: null }],
      Array.from({ length: 5 }, (_, index) => ({ id: `e${index}`, at: `2026-08-0${index + 1}T10:00:00Z`, actor: null, action: 'a', entity: 'e', detail: null })),
    ], 3)
    expect(eventos).toHaveLength(3)
    expect(eventos.some(evento => evento.id === 'x')).toBe(false)
  })
})
