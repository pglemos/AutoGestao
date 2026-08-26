import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { WeeklyReportsList } from './WeeklyReportsList'
import type { WeeklyFeedbackReport } from '@/types/database'

/**
 * Em produção, os 30 relatórios semanais da rede (10 lojas × 3 semanas) estavam
 * todos com `email_status = 'not_sent'` — ou seja, ainda não enviados — e a tela
 * pintava os 30 de vermelho com o rótulo "FALHA". "Ainda não enviei" não é
 * "tentei e falhou": o Admin lia 30 falhas de envio que nunca existiram.
 */
function relatorio(overrides: Partial<WeeklyFeedbackReport>): WeeklyFeedbackReport {
  return {
    id: 'r1',
    store_id: 's1',
    week_start: '2026-04-20',
    week_end: '2026-04-26',
    weekly_goal: 10,
    team_avg_json: null,
    email_status: 'not_sent',
    recipients: null,
    created_at: '2026-04-27T00:00:00Z',
    updated_at: '2026-04-27T00:00:00Z',
    ...overrides,
  } as WeeklyFeedbackReport
}

// Sem cleanup, os renders se acumulam no mesmo document e as buscas por texto
// passam a encontrar cards de testes anteriores.
afterEach(cleanup)

describe('WeeklyReportsList — status de envio', () => {
  test('not_sent não é falha', () => {
    render(<WeeklyReportsList reports={[relatorio({ email_status: 'not_sent' })]} />)
    expect(screen.getByText('NÃO ENVIADO')).toBeDefined()
    expect(screen.queryByText('FALHA')).toBeNull()
  })

  test('sent continua ENVIADO', () => {
    render(<WeeklyReportsList reports={[relatorio({ id: 'r2', email_status: 'sent' })]} />)
    expect(screen.getByText('ENVIADO')).toBeDefined()
  })

  test('falha de verdade continua aparecendo como falha', () => {
    render(<WeeklyReportsList reports={[relatorio({ id: 'r3', email_status: 'failed' })]} />)
    expect(screen.getByText('FALHA')).toBeDefined()
  })

  test('cada card usa a própria semana do relatório', () => {
    render(
      <WeeklyReportsList
        reports={[
          relatorio({ id: 'a', week_start: '2026-04-06', week_end: '2026-04-12' }),
          relatorio({ id: 'b', week_start: '2026-04-20', week_end: '2026-04-26' }),
        ]}
      />,
    )
    expect(screen.getByText(/06\/04/)).toBeDefined()
    expect(screen.getByText(/20\/04/)).toBeDefined()
  })
})
