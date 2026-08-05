import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isOfficialLancamento } from '@/hooks/useRanking'
import { resolveClosingOperationalState } from '@/features/checkin/lib/closing-operational-state'
import type { CheckinCorrectionRequest, DailyCheckin } from '@/types/database'

const rankingSource = readFileSync(new URL('../hooks/useRanking.ts', import.meta.url), 'utf8')
const storesSource = readFileSync(new URL('../hooks/useStores.ts', import.meta.url), 'utf8')
const teamRoutineSource = readFileSync(
  new URL('../features/manager/team-routine/manager-team-routine.ts', import.meta.url),
  'utf8',
)
const dayRoutineSource = readFileSync(
  new URL('../features/manager/day-routine/manager-day-routine-sources.ts', import.meta.url),
  'utf8',
)
const viewsMigration = readFileSync(
  new URL('../../supabase/migrations/20260805223000_official_read_models_exclude_drafts.sql', import.meta.url),
  'utf8',
)

const row = (status: string): DailyCheckin => ({
  submission_status: status,
  submitted_at: '2026-08-05T11:00:00.000Z',
} as DailyCheckin)

const request = (status: CheckinCorrectionRequest['status']) => ({
  status,
  created_at: '2026-08-05T12:00:00.000Z',
} as CheckinCorrectionRequest)

/**
 * Contrato único de "o que conta como oficial". Cada linha desta tabela é uma
 * decisão de produto: se algum read model divergir dela, o número que a
 * liderança vê deixa de bater com o que o vendedor entregou.
 */
describe('contrato: o que entra em indicador oficial', () => {
  const cases: Array<[string, boolean]> = [
    ['draft não contabiliza', false],
    ['on_time contabiliza', true],
    ['late contabiliza', true],
  ]

  test.each(cases)('%s', (label, expected) => {
    const status = label.split(' ')[0]
    expect(resolveClosingOperationalState({ checkin: row(status) }).countsAsSubmitted).toBe(expected)
    expect(isOfficialLancamento(row(status))).toBe(expected)
  })

  test('regularização pendente não vira oficial sozinha', () => {
    expect(
      resolveClosingOperationalState({ checkin: null, latestRequest: request('pending') }).countsAsSubmitted,
    ).toBe(false)
  })

  test('regularização aprovada contabiliza', () => {
    expect(
      resolveClosingOperationalState({ checkin: row('draft'), latestRequest: request('approved') }).countsAsSubmitted,
    ).toBe(true)
  })

  test('regularização recusada não contabiliza', () => {
    expect(
      resolveClosingOperationalState({ checkin: null, latestRequest: request('rejected') }).countsAsSubmitted,
    ).toBe(false)
  })
})

describe('read models existentes seguem excluindo rascunho', () => {
  test('ranking filtra por isOfficialLancamento', () => {
    expect(rankingSource).toContain("return row.submission_status !== 'draft'")
    expect(rankingSource.match(/\.filter\(isOfficialLancamento\)/g)?.length).toBeGreaterThanOrEqual(2)
  })

  test('presença por loja ignora rascunho', () => {
    expect(storesSource).toContain(".neq('submission_status', 'draft')")
    expect(storesSource).toContain("c.submission_status !== 'draft'")
  })

  test('rotina da equipe só marca submitted fora de rascunho', () => {
    expect(teamRoutineSource).toContain("closing.submission_status !== 'draft'")
  })

  test('rotina do dia trata rascunho como pendente', () => {
    expect(dayRoutineSource).toContain("if (row.submission_status === 'draft') return 'pendente'")
  })

  test('views do schema deixam de somar rascunho', () => {
    const guards = viewsMigration.match(/COALESCE\(ld\.submission_status, ''\) <> 'draft'/g) ?? []
    expect(guards.length).toBe(3)
    expect(viewsMigration).toContain('CREATE OR REPLACE VIEW public.view_store_daily_production')
    expect(viewsMigration).toContain('CREATE OR REPLACE VIEW public.view_daily_team_status')
    expect(viewsMigration).toContain('CREATE OR REPLACE VIEW public.view_sem_registro')
  })
})
