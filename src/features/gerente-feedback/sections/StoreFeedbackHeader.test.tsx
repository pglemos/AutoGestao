import { afterEach, describe, expect, test, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { StoreFeedbackHeader } from './StoreFeedbackHeader'
import type { FeedbackTab } from '../lib/helpers'

afterEach(cleanup)

function renderHeader(activeTab: FeedbackTab = 'individual') {
  return render(
    <StoreFeedbackHeader
      isOwner={false}
      canCreateFeedback
      activeTab={activeTab}
      onTabChange={mock<(tab: FeedbackTab) => void>()}
      searchTerm=""
      onSearchChange={mock<(term: string) => void>()}
      isRefetching={false}
      onRefresh={mock<() => void>()}
      onOpenForm={mock<() => void>()}
    />,
  )
}

function ControlledHarness() {
  const [active, setActive] = React.useState<FeedbackTab>('individual')
  return (
    <StoreFeedbackHeader
      isOwner={false}
      canCreateFeedback
      activeTab={active}
      onTabChange={setActive}
      searchTerm=""
      onSearchChange={() => {}}
      isRefetching={false}
      onRefresh={() => {}}
      onOpenForm={() => {}}
    />
  )
}

describe('FASE J — StoreFeedbackHeader usa a família canônica de tabs', () => {
  test('renderiza TabNavPill (role=tablist) em vez de nav à mão', () => {
    const { container } = renderHeader()
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeTruthy()
    expect(container.querySelector('nav[role="tablist"]')).not.toBeNull()
    expect(screen.getByRole('tab', { name: 'Individual' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Relatórios' })).toBeTruthy()
  })

  test('roving tabindex: só a aba ativa está na ordem de tabulação', () => {
    renderHeader('individual')
    const tabIndexes = Array.from(document.querySelectorAll('[role="tab"]')).map(
      (el) => el.getAttribute('tabindex'),
    )
    expect(tabIndexes.filter((v) => v === '0').length).toBe(1)
    expect(tabIndexes.filter((v) => v === '-1').length).toBe(1)
    expect(screen.getByRole('tab', { name: 'Individual' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'Relatórios' }).getAttribute('aria-selected')).toBe('false')
  })

  test('setas e Home/End movem a seleção e o foco', () => {
    render(<ControlledHarness />)
    const firstTab = screen.getByRole('tab', { name: 'Individual' })
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Relatórios' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Relatórios' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Relatórios' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Individual' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Individual' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Relatórios' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Relatórios' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Relatórios' }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: 'Individual' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Individual' }).getAttribute('aria-selected')).toBe('true')
  })
})
