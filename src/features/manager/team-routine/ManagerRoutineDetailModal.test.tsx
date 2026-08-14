import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ManagerRoutineDetailModal } from './ManagerRoutineDetailModal'
import type { OfficialRoutineScore } from './manager-team-routine'

globalThis.getComputedStyle ||= (() => ({ animationName: 'none' })) as typeof getComputedStyle
globalThis.MutationObserver ||= class { observe() {}; disconnect() {}; takeRecords() { return [] } } as unknown as typeof MutationObserver

describe('ManagerRoutineDetailModal', () => {
  afterEach(() => cleanup())

  test('reproduz o estado vazio do Base44 sem inventar ações', () => {
    render(<ManagerRoutineDetailModal open sellerName="Ana" date="2026-07-11" actions={[]} appointments={0} execution={0} onClose={() => undefined} />)

    expect(screen.getByText('Nenhuma rotina registrada para este vendedor nesta data.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-mx-overlay', 'modal')
    expect(screen.queryByText('Atividades da Central de Execução')).toBeNull()
  })

  test('exibe os seis componentes da pontuação oficial e o denominador aplicado', () => {
    const officialScore: OfficialRoutineScore = {
      score: 80,
      denominator: 80,
      components: [
        ['routineAccess', 10, 100],
        ['resolvedPendencies', 10, null],
        ['attackPlan', 20, 100],
        ['prospectingAgenda', 20, 50],
        ['updatedClients', 20, 100],
        ['dailyClosing', 20, 100],
      ].map(([key, weight, value]) => ({
        key: key as keyof import('./manager-team-routine').OfficialRoutineScoreInput,
        weight: weight as number,
        value: value as number | null,
        applicable: value !== null,
        source: 'fonte oficial',
        evidence: value === null ? null : 'evidência oficial',
        reason: value === null ? 'Não aplicável' : null,
      })),
    }

    render(<ManagerRoutineDetailModal open sellerName="Ana" date="2026-07-11" actions={[{ id: 'a1', title: 'Ação', status: 'concluida', due_at: '2026-07-11T10:00:00-03:00' }]} appointments={1} execution={80} officialScore={officialScore} onClose={() => undefined} />)

    expect(screen.getByRole('dialog')).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(screen.getByText('Pontuação oficial — 100 pontos')).toBeTruthy()
    expect(screen.getByText('Acessou a Rotina do Dia')).toBeTruthy()
    expect(screen.getByText('Não aplicável')).toBeTruthy()
    expect(screen.getByText('Denominador aplicado: 80 pontos.')).toBeTruthy()
  })
})
