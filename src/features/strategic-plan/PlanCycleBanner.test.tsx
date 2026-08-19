import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { PlanCycleBanner } from './PlanCycleBanner'
import type { PlanCycleState } from './usePlanCycle'

function mockState(overrides: Partial<PlanCycleState> = {}): PlanCycleState {
  return {
    cycle: null,
    readiness: null,
    summary: null,
    loading: false,
    transitioning: false,
    error: null,
    clientId: 'client-1',
    canManageCycle: true,
    initCycle: mock(() => Promise.resolve()),
    submitForValidation: mock(() => Promise.resolve()),
    publishCycle: mock(() => Promise.resolve()),
    reload: mock(() => {}),
    ...overrides,
  }
}

// Este arquivo afirma ausência de botão, e sem desmontar entre casos a consulta
// alcança o que o caso anterior deixou no document.body. O cleanup não é global
// porque boa parte da suíte renderiza uma vez e consulta em vários casos.
afterEach(cleanup)

describe('PlanCycleBanner', () => {
  it('não renderiza nada se clientId for nulo', () => {
    const { container } = render(
      <PlanCycleBanner state={mockState({ clientId: null })} year={2026} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza skeleton quando está carregando', () => {
    render(
      <PlanCycleBanner state={mockState({ loading: true })} year={2026} />
    )
    expect(screen.getByLabelText('Carregando ciclo do plano')).toBeTruthy()
  })

  it('renderiza alerta em caso de erro', () => {
    render(
      <PlanCycleBanner state={mockState({ error: 'Falha de conexão' })} year={2026} />
    )
    expect(screen.getByText(/Falha de conexão/)).toBeTruthy()
  })

  it('mostra status "Sem ciclo" e botão "Iniciar Ciclo" quando não há ciclo', () => {
    render(
      <PlanCycleBanner state={mockState({ cycle: null, summary: 'Plano sem indicadores.' })} year={2026} />
    )
    expect(screen.getByText('Sem ciclo 2026')).toBeTruthy()
    expect(screen.getByText('Iniciar Ciclo')).toBeTruthy()
    expect(screen.getByText('Plano sem indicadores.')).toBeTruthy()
  })

  it('mostra status "Rascunho" e botão "Enviar para Validação"', () => {
    render(
      <PlanCycleBanner
        state={mockState({
          cycle: {
            id: 'cycle-1',
            client_id: 'client-1',
            year: 2026,
            status: 'rascunho',
            version_number: 1,
            package_version_id: null,
            revised_from_id: null,
            published_at: null,
            published_by: null,
            created_at: '2026-08-19T00:00:00Z',
          },
          summary: '10 de 10 indicadores prontos. Plano pode ser publicado.',
        })}
        year={2026}
      />
    )
    expect(screen.getByText('Rascunho')).toBeTruthy()
    expect(screen.getByText('Enviar para Validação')).toBeTruthy()
  })

  it('mostra status "Em validação" e botão "Publicar Plano" quando canPublish é true', () => {
    render(
      <PlanCycleBanner
        state={mockState({
          cycle: {
            id: 'cycle-1',
            client_id: 'client-1',
            year: 2026,
            status: 'em_validacao',
            version_number: 1,
            package_version_id: null,
            revised_from_id: null,
            published_at: null,
            published_by: null,
            created_at: '2026-08-19T00:00:00Z',
          },
          readiness: {
            total: 10,
            ready: 10,
            pending: 0,
            issues: [],
            canPublish: true,
          },
          summary: '10 de 10 indicadores prontos. Plano pode ser publicado.',
        })}
        year={2026}
      />
    )
    expect(screen.getByText('Em validação')).toBeTruthy()
    expect(screen.getByText('Publicar Plano')).toBeTruthy()
  })

  it('não exibe botões de transição quando canManageCycle é falso', () => {
    render(
      <PlanCycleBanner
        state={mockState({
          canManageCycle: false,
          cycle: {
            id: 'cycle-1',
            client_id: 'client-1',
            year: 2026,
            status: 'rascunho',
            version_number: 1,
            package_version_id: null,
            revised_from_id: null,
            published_at: null,
            published_by: null,
            created_at: '2026-08-19T00:00:00Z',
          },
        })}
        year={2026}
      />
    )
    expect(screen.getByText('Rascunho')).toBeTruthy()
    expect(screen.queryByText('Enviar para Validação')).toBeNull()
  })
})
