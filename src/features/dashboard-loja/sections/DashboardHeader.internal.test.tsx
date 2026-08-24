import { afterEach, describe, expect, test, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardHeader, type DashboardTab } from './DashboardHeader'
import type { ViewMode } from '../hooks/useDashboardLojaData'
import type { UserRole } from '@/types/database'

afterEach(cleanup)

const INTERNAL_ROLE: UserRole = 'administrador_mx'

/**
 * A ramificação `isPerfilInternoMx` do DashboardHeader deve usar a MESMA família
 * canônica `TabNavPill` da ramificação owner/gerente — roving tabindex, setas,
 * Home/End. (FASE J 10.011/10.013.)
 */
function InternalMxHarness() {
  const [tab, setTab] = React.useState<DashboardTab>('performance')
  const [view, setView] = React.useState<ViewMode>('month')
  return (
    <MemoryRouter>
      <DashboardHeader
        role={INTERNAL_ROLE}
        isOwner={false}
        storeName="Loja Teste"
        selectedStoreId="s1"
        selectableStores={[{ id: 's1', name: 'Loja Teste' }] as never}
        setActiveStoreId={mock<(id: string) => void>()}
        activeTab={tab}
        onTabChange={setTab}
        isRefetching={false}
        syncWarning={null}
        lastSyncAt={null}
        lastSyncLabel=""
        onRefresh={mock<() => void>()}
        viewMode={view}
        setViewMode={setView}
        referenceDate="2026-08-14"
        startDate="2026-08-01"
        setStartDate={mock<(d: string) => void>()}
        endDate="2026-08-31"
        setEndDate={mock<(d: string) => void>()}
      />
    </MemoryRouter>
  )
}

describe('FASE J — DashboardHeader ramificação interna usa TabNavPill canônico', () => {
  test('renderiza abas da loja e do período como tablist com roving tabindex', () => {
    const { container } = render(<InternalMxHarness />)
    const tablists = container.querySelectorAll('[role="tablist"]')
    expect(tablists.length).toBeGreaterThanOrEqual(2)

    const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
    // Só a aba ativa de cada tablist tem tabIndex=0.
    const active = tabs.filter((el) => el.getAttribute('tabindex') === '0')
    expect(active.length).toBe(2)
    expect(screen.getByRole('tab', { name: /Performance/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Mês/ })).toBeTruthy()
  })

  test('setas e Home/End movem seleção e foco nas abas da loja', () => {
    render(<InternalMxHarness />)
    const performance = screen.getByRole('tab', { name: /Performance/ })
    fireEvent.keyDown(performance, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /Metas/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: /Metas/ }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /Equipe/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: /Equipe/ }), { key: 'End' })
    expect(screen.getByRole('tab', { name: /Vendas/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: /Vendas/ }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: /Performance/ }).getAttribute('aria-selected')).toBe('true')
  })

  test('setas movem a seleção do período (Mês/D-1)', () => {
    render(<InternalMxHarness />)
    const mes = screen.getByRole('tab', { name: 'Mês' })
    fireEvent.keyDown(mes, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'D-1' }).getAttribute('aria-selected')).toBe('true')
  })
})
