import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

const sessionValues = new Map<string, string>()

beforeAll(() => {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      clear: () => sessionValues.clear(),
      getItem: (key: string) => sessionValues.get(key) ?? null,
      removeItem: (key: string) => sessionValues.delete(key),
      setItem: (key: string, value: string) => sessionValues.set(key, String(value)),
    },
  })
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('ManagerHomeReturnLink', () => {
  it('fica oculto sem contexto válido do dashboard gerencial', async () => {
    const module = await import('./ManagerHomeReturnLink').catch(() => ({}))
    const ManagerHomeReturnLink = 'ManagerHomeReturnLink' in module
      ? module.ManagerHomeReturnLink
      : undefined

    expect(typeof ManagerHomeReturnLink).toBe('function')
    if (!ManagerHomeReturnLink) return

    const { rerender } = render(
      <MemoryRouter initialEntries={['/meta-loja']}>
        <ManagerHomeReturnLink />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /voltar para o início/i })).toBeNull()

    sessionStorage.setItem('mx_contexto_navegacao', '{contexto-invalido')
    rerender(
      <MemoryRouter initialEntries={['/meta-loja']}>
        <ManagerHomeReturnLink />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /voltar para o início/i })).toBeNull()

    sessionStorage.setItem('mx_contexto_navegacao', JSON.stringify({
      origemNavegacao: 'MINHA_EQUIPE',
    }))
    rerender(
      <MemoryRouter initialEntries={['/meta-loja']}>
        <ManagerHomeReturnLink />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /voltar para o início/i })).toBeNull()
  })

  it('consome o contexto do dashboard e retorna para /home', async () => {
    const module = await import('./ManagerHomeReturnLink').catch(() => ({}))
    const ManagerHomeReturnLink = 'ManagerHomeReturnLink' in module
      ? module.ManagerHomeReturnLink
      : undefined

    expect(typeof ManagerHomeReturnLink).toBe('function')
    if (!ManagerHomeReturnLink) return

    sessionStorage.setItem('mx_contexto_navegacao', JSON.stringify({
      origemNavegacao: 'DASHBOARD_GERENCIAL',
      data: '2026-07-13',
      unidade: 'store-1',
    }))

    render(
      <MemoryRouter initialEntries={['/meta-loja']}>
        <ManagerHomeReturnLink />
        <LocationProbe />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /voltar para o início/i }))

    expect(screen.getByTestId('current-location').textContent).toBe('/home')
    expect(sessionStorage.getItem('mx_contexto_navegacao')).toBeNull()
  })

  it('preserva o contexto da Rotina do Dia até /rotina restaurar filtros e ordenação', async () => {
    const module = await import('./ManagerHomeReturnLink').catch(() => ({}))
    const ManagerHomeReturnLink = 'ManagerHomeReturnLink' in module
      ? module.ManagerHomeReturnLink
      : undefined

    expect(typeof ManagerHomeReturnLink).toBe('function')
    if (!ManagerHomeReturnLink) return

    const context = JSON.stringify({
      origemNavegacao: 'ROTINA_DO_DIA_GERENTE',
      filtros: { filtro: 'equipe', ordenacao: 'origem' },
    })
    sessionStorage.setItem('mx_contexto_navegacao', context)

    render(
      <MemoryRouter initialEntries={['/rotina-equipe']}>
        <ManagerHomeReturnLink />
        <LocationProbe />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /voltar para a rotina do dia/i }))

    expect(screen.getByTestId('current-location').textContent).toBe('/rotina')
    expect(sessionStorage.getItem('mx_contexto_navegacao')).toBe(context)
  })
})

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="current-location">{location.pathname}</output>
}
