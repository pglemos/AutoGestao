import { describe, expect, test } from 'bun:test'
import type { CheckinCorrectionRequest, DailyCheckin } from '@/types/database'
import {
  CLOSING_OPERATIONAL_STATE_LABEL,
  resolveClosingOperationalState,
} from './closing-operational-state'

const row = (overrides: Partial<DailyCheckin>) => ({
  id: 'checkin-1',
  reference_date: '2026-08-04',
  metric_scope: 'daily',
  submitted_at: '2026-08-05T11:00:00.000Z',
  submission_status: 'on_time',
  visit_prev_day: 1,
  ...overrides,
}) as DailyCheckin

const request = (status: CheckinCorrectionRequest['status']) => ({
  id: 'req-1',
  checkin_id: 'checkin-1',
  status,
  created_at: '2026-08-05T12:00:00.000Z',
}) as CheckinCorrectionRequest

describe('resolveClosingOperationalState', () => {
  test('ausência de linha é not_started, não oficial e editável', () => {
    const resolution = resolveClosingOperationalState({ checkin: null, latestRequest: null })
    expect(resolution.state).toBe('not_started')
    expect(resolution.official).toBe(false)
    expect(resolution.countsAsSubmitted).toBe(false)
    expect(resolution.editable).toBe(true)
    expect(resolution.managerLabel).toBe('Não iniciado')
  })

  test('draft nunca é oficial nem conta como submitted', () => {
    const resolution = resolveClosingOperationalState({
      checkin: row({ submission_status: 'draft' as DailyCheckin['submission_status'] }),
      latestRequest: null,
    })
    expect(resolution.state).toBe('draft')
    expect(resolution.official).toBe(false)
    expect(resolution.countsAsSubmitted).toBe(false)
    expect(resolution.editable).toBe(true)
    expect(resolution.managerLabel).toBe('Em andamento')
  })

  test('draft com submitted_at legado continua draft', () => {
    // Antes da migration 20260708124500 submitted_at era NOT NULL DEFAULT now(),
    // então existem rascunhos antigos com timestamp preenchido.
    const resolution = resolveClosingOperationalState({
      checkin: row({
        submission_status: 'draft' as DailyCheckin['submission_status'],
        submitted_at: '2026-08-05T09:00:00.000Z',
      }),
      latestRequest: null,
    })
    expect(resolution.state).toBe('draft')
    expect(resolution.countsAsSubmitted).toBe(false)
  })

  test('on_time é oficial, conta como submitted e bloqueia edição direta', () => {
    const resolution = resolveClosingOperationalState({ checkin: row({}), latestRequest: null })
    expect(resolution.state).toBe('submitted_on_time')
    expect(resolution.official).toBe(true)
    expect(resolution.countsAsSubmitted).toBe(true)
    expect(resolution.editable).toBe(false)
    expect(resolution.managerLabel).toBe('Finalizado no prazo')
  })

  test('late é oficial e marcado como atraso', () => {
    const resolution = resolveClosingOperationalState({
      checkin: row({ submission_status: 'late' }),
      latestRequest: null,
    })
    expect(resolution.state).toBe('submitted_late')
    expect(resolution.official).toBe(true)
    expect(resolution.countsAsSubmitted).toBe(true)
    expect(resolution.managerLabel).toBe('Finalizado em atraso')
  })

  test('submitted_late/finalizado_apos_prazo também classificam como atraso', () => {
    expect(
      resolveClosingOperationalState({
        checkin: row({ submitted_late: true }),
        latestRequest: null,
      }).state,
    ).toBe('submitted_late')
    expect(
      resolveClosingOperationalState({
        checkin: row({ finalizado_apos_prazo: true }),
        latestRequest: null,
      }).state,
    ).toBe('submitted_late')
  })

  test('regularização pendente não muda a oficialidade do fechamento e trava edição', () => {
    const semFechamento = resolveClosingOperationalState({
      checkin: null,
      latestRequest: request('pending'),
    })
    expect(semFechamento.state).toBe('regularization_pending')
    expect(semFechamento.official).toBe(false)
    expect(semFechamento.countsAsSubmitted).toBe(false)
    expect(semFechamento.editable).toBe(false)

    const comFechamento = resolveClosingOperationalState({
      checkin: row({}),
      latestRequest: request('pending'),
    })
    expect(comFechamento.state).toBe('regularization_pending')
    expect(comFechamento.official).toBe(true)
    expect(comFechamento.countsAsSubmitted).toBe(true)
  })

  test('regularização aprovada é oficial e conta', () => {
    const resolution = resolveClosingOperationalState({
      checkin: row({ submission_status: 'draft' as DailyCheckin['submission_status'] }),
      latestRequest: request('approved'),
    })
    expect(resolution.state).toBe('regularization_approved')
    expect(resolution.official).toBe(true)
    expect(resolution.countsAsSubmitted).toBe(true)
  })

  test('regularização recusada preserva o estado do fechamento subjacente', () => {
    const resolution = resolveClosingOperationalState({
      checkin: null,
      latestRequest: request('rejected'),
    })
    expect(resolution.state).toBe('regularization_rejected')
    expect(resolution.official).toBe(false)
    expect(resolution.countsAsSubmitted).toBe(false)
  })

  test('status desconhecido não é promovido a oficial', () => {
    const resolution = resolveClosingOperationalState({
      checkin: row({ submission_status: 'quem_sabe' as DailyCheckin['submission_status'] }),
      latestRequest: null,
    })
    expect(resolution.official).toBe(false)
    expect(resolution.countsAsSubmitted).toBe(false)
    expect(resolution.editable).toBe(false)
  })

  test('Boolean(checkin) não é critério: linha draft existe e mesmo assim não conta', () => {
    const draft = row({ submission_status: 'draft' as DailyCheckin['submission_status'] })
    expect(Boolean(draft)).toBe(true)
    expect(resolveClosingOperationalState({ checkin: draft, latestRequest: null }).countsAsSubmitted).toBe(false)
  })

  test('todo estado tem rótulo gerencial', () => {
    const states = Object.keys(CLOSING_OPERATIONAL_STATE_LABEL)
    expect(states).toContain('not_started')
    expect(states).toContain('draft')
    expect(states).toContain('submitted_on_time')
    expect(states).toContain('submitted_late')
    expect(states).toContain('regularization_pending')
    expect(states).toContain('regularization_approved')
    expect(states).toContain('regularization_rejected')
    for (const label of Object.values(CLOSING_OPERATIONAL_STATE_LABEL)) {
      expect(label.length).toBeGreaterThan(0)
    }
  })
})
