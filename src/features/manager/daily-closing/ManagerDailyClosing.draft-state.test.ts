import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { CheckinWithTotals, DailyCheckin } from '@/types/database'
import { getClosingRows } from './ManagerDailyClosing.container'
import { getClosingStatus } from '@/features/manager/shared/manager-metrics'
import { buildClosingSummary, buildDisciplineTrend, onlyOfficialClosings } from './manager-closing-metrics'

const containerSource = readFileSync(new URL('./ManagerDailyClosing.container.tsx', import.meta.url), 'utf8')

const checkin = (overrides: Partial<DailyCheckin>) => ({
  id: `checkin-${overrides.seller_user_id ?? 'x'}`,
  seller_user_id: 'seller-1',
  store_id: 'store-1',
  reference_date: '2026-08-04',
  metric_scope: 'daily',
  submitted_at: '2026-08-05T11:00:00.000Z',
  submission_status: 'on_time',
  visit_prev_day: 3,
  pontuacao_disciplina_final: 90,
  vnd_porta_prev_day: 2,
  ...overrides,
}) as CheckinWithTotals

const sellers = [
  { id: 'seller-1', name: 'Vendedor Um' },
  { id: 'seller-2', name: 'Vendedor Dois' },
  { id: 'seller-3', name: 'Vendedor Três' },
]

describe('Central de Fechamento — rascunho não é fechamento entregue', () => {
  const rows = getClosingRows(
    sellers,
    [
      checkin({ seller_user_id: 'seller-1', submission_status: 'on_time' }),
      checkin({ seller_user_id: 'seller-2', submission_status: 'draft', pontuacao_disciplina_final: 40 }),
    ],
    [],
    [],
    '2026-08-04',
    false,
  )

  test('cada linha carrega o estado operacional canônico', () => {
    expect(rows.map(row => row.closingState.state)).toEqual([
      'submitted_on_time',
      'draft',
      'not_started',
    ])
  })

  test('só o fechamento oficial conta como entregue', () => {
    const submitted = rows.filter(row => row.closingState.countsAsSubmitted).length
    expect(submitted).toBe(1)
    // A linha do rascunho existe — Boolean(checkin) contaria 2.
    expect(rows.filter(row => row.checkin).length).toBe(2)
  })

  test('rascunho aparece como Em andamento, não como Finalizado', () => {
    expect(rows[1].status).toBe('Em andamento')
    expect(rows[1].closingState.managerLabel).toBe('Em andamento')
    expect(getClosingStatus(checkin({ submission_status: 'draft' }))).toBe('Em andamento')
  })

  test('rascunho segue visível e cobrável como pendente', () => {
    const pendentes = rows.filter(row => !row.closingState.countsAsSubmitted)
    expect(pendentes.map(row => row.seller.id)).toEqual(['seller-2', 'seller-3'])
  })

  test('o container usa countsAsSubmitted em vez de Boolean(checkin)', () => {
    expect(containerSource).toContain('rows.filter((row) => row.closingState.countsAsSubmitted)')
    expect(containerSource).not.toContain('rows.filter((row) => row.checkin).length')
    expect(containerSource).toContain('const draftRows')
    expect(containerSource).toContain('const notStartedRows')
  })

  test('a linha do gerente avisa que rascunho não entra em indicador oficial', () => {
    expect(containerSource).toContain('Ainda não contabilizado nos indicadores oficiais')
    expect(containerSource).toContain('Último salvamento')
  })
})

describe('métricas oficiais ignoram rascunho', () => {
  const mixed = [
    checkin({ seller_user_id: 'seller-1', submission_status: 'on_time', pontuacao_disciplina_final: 100, vnd_porta_prev_day: 2 }),
    checkin({ seller_user_id: 'seller-2', submission_status: 'draft', pontuacao_disciplina_final: 0, vnd_porta_prev_day: 50 }),
  ]

  test('onlyOfficialClosings remove draft', () => {
    expect(onlyOfficialClosings(mixed)).toHaveLength(1)
  })

  test('resumo não soma números de rascunho', () => {
    expect(buildClosingSummary(mixed).sales).toBe(2)
  })

  test('tendência de disciplina não é puxada para baixo pelo rascunho', () => {
    const trend = buildDisciplineTrend(mixed, '2026-08-04', '2026-08-04')
    expect(trend[0].value).toBe(100)
  })
})
