import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ManagerTourLauncher } from './ManagerTourLauncher'
import { MANAGER_TOURS, getManagerTour } from './manager-tours'
import { TOUR_SKIPPED_KEY, TOUR_VISITS_KEY } from './useManagerTour'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  window.localStorage.clear()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManagerTourLauncher />
    </MemoryRouter>,
  )
}

function openTour() {
  act(() => { vi.advanceTimersByTime(800) })
}

describe('getManagerTour', () => {
  test('mapeia as rotas canônicas do módulo gerencial do MX', () => {
    expect(getManagerTour('/minha-equipe')).not.toBeNull()
    expect(getManagerTour('/mentor')).not.toBeNull()
    expect(getManagerTour('/home')).not.toBeNull()
    // O prefixo `/gerente/` saiu das telas do módulo (2026-08-05).
    expect(getManagerTour('/gerente/minha-equipe')).toBeNull()
    expect(getManagerTour('/configuracoes')).toBeNull()
  })

  test('todo seletor declarado aponta para uma âncora data-tour', () => {
    const selectors = Object.values(MANAGER_TOURS)
      .flat()
      .map(step => step.selector)
      .filter((selector): selector is string => Boolean(selector))

    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) {
      expect(selector).toMatch(/^\[data-tour='[a-z-]+'\]$/)
    }
  })
})

describe('ManagerTourLauncher', () => {
  test('não renderiza nada em rota sem roteiro', () => {
    const { container } = renderAt('/carteira')

    expect(container).toBeEmptyDOMElement()
  })

  test('abre sozinho na primeira visita e navega entre os passos', () => {
    renderAt('/minha-equipe')
    openTour()

    expect(screen.getByRole('dialog', { name: 'Tour do Gerente' })).toBeInTheDocument()
    expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Próximo/ }))
    expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Concluir/ }))
    expect(screen.queryByRole('dialog', { name: 'Tour do Gerente' })).not.toBeInTheDocument()
  })

  test('para de abrir sozinho depois da terceira visita', () => {
    window.localStorage.setItem(TOUR_VISITS_KEY, JSON.stringify({ '/mentor': 3 }))

    renderAt('/mentor')
    openTour()

    expect(screen.queryByRole('dialog', { name: 'Tour do Gerente' })).not.toBeInTheDocument()
  })

  test('"Pular tour" grava a preferência da rota', () => {
    renderAt('/ranking')
    openTour()

    fireEvent.click(screen.getByRole('button', { name: 'Pular tour' }))

    expect(screen.queryByRole('dialog', { name: 'Tour do Gerente' })).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(TOUR_SKIPPED_KEY) || '{}')).toEqual({ '/ranking': true })
  })

  test('a central de ajuda reabre o tour já pulado', () => {
    window.localStorage.setItem(TOUR_SKIPPED_KEY, JSON.stringify({ '/ranking': true }))
    renderAt('/ranking')
    openTour()
    expect(screen.queryByRole('dialog', { name: 'Tour do Gerente' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    fireEvent.click(screen.getByRole('button', { name: /Repetir tour desta página/ }))

    expect(screen.getByRole('dialog', { name: 'Tour do Gerente' })).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(TOUR_SKIPPED_KEY) || '{}')).toEqual({})
  })
})
