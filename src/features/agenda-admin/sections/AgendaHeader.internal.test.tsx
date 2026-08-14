import { afterEach, describe, expect, test, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { AgendaHeader } from './AgendaHeader'
import type { AdminCalendarViewMode } from './AgendaFiltersBar'

afterEach(cleanup)

/**
 * FASE J — 10.011/10.013 (AgendaAdmin `/agenda`)
 *
 * O view-mode (Dia/Semana/Mês/Lista) deixou de ser um grupo de `<button>` à mão
 * e agora usa a família canônica `TabNavPill` (roving tabindex + setas/Home/End),
 * e os status do popover de filtros usam `FilterChip` (aria-pressed).
 */
function Harness() {
  const [view, setView] = React.useState<AdminCalendarViewMode>('week')
  return (
    <AgendaHeader
      monthLabel="Agosto 2026"
      calendarViewMode={view}
      setCalendarViewMode={setView}
      dateFilter="semana"
      setDateFilter={mock<() => void>()}
      searchQuery=""
      onSearchChange={mock<() => void>()}
      onRefresh={mock<() => void>()}
      statusFilter="todos"
      setStatusFilter={mock<() => void>()}
      consultantFilter="todos"
      setConsultantFilter={mock<() => void>()}
      activeFilters={0}
      clearFilters={mock<() => void>()}
      consultants={[]}
      canViewAllAgendas
    />
  )
}

describe('FASE J — AgendaHeader view-mode e filtros canônicos', () => {
  test('view-mode renderiza como TabNavPill com roving tabindex', () => {
    const { container } = render(<Harness />)
    const tablist = screen.getByRole('tablist', { name: 'Modo de exibição da agenda' })
    expect(tablist).toBeTruthy()
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(tabs.filter((el) => el.getAttribute('tabindex') === '0').length).toBe(1)
    expect(screen.getByRole('tab', { name: 'Semana' }).getAttribute('aria-selected')).toBe('true')
  })

  test('setas e Home/End movem a seleção e o foco do view-mode', () => {
    render(<Harness />)
    const semana = screen.getByRole('tab', { name: 'Semana' })
    fireEvent.keyDown(semana, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Dia' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Dia' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Lista' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Lista' }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: 'Dia' }).getAttribute('aria-selected')).toBe('true')
  })
})
