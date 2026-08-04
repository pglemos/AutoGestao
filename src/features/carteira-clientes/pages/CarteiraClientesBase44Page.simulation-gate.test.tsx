import { afterAll, afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'

let authState = {
  simulationRole: 'vendedor' as 'vendedor' | null,
  simulationLoading: true,
  isSimulating: false,
}

mock.module('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

mock.module('@/api/base44Client', () => ({
  base44: { entities: {} },
}))

mock.module('@/features/carteira-clientes/lib/installCarteiraBase44Adapter', () => ({
  installCarteiraBase44Adapter: mock(() => {}),
}))

mock.module('@/base44-reference/pages/CarteiraClientes.jsx', () => ({
  default: () => <div data-testid="carteira-reference">Carteira carregada</div>,
}))

const { CarteiraClientesBase44Page } = await import('./CarteiraClientesBase44Page')

afterAll(() => mock.restore())
afterEach(() => cleanup())

describe('CarteiraClientesBase44Page seller simulation gate', () => {
  test('does not mount the Base44 page before the simulated seller is ready after reload', () => {
    authState = {
      simulationRole: 'vendedor',
      simulationLoading: true,
      isSimulating: false,
    }

    render(<CarteiraClientesBase44Page />)

    expect(screen.getByRole('status').textContent).toContain('Preparando carteira')
    expect(screen.queryByTestId('carteira-reference')).toBeNull()
  })

  test('does not mount while simulation identity is pending before the role is exposed', () => {
    authState = {
      simulationRole: null,
      simulationLoading: true,
      isSimulating: false,
    }

    render(<CarteiraClientesBase44Page />)

    expect(screen.getByRole('status').textContent).toContain('Preparando carteira')
    expect(screen.queryByTestId('carteira-reference')).toBeNull()
  })

  test('mounts the Base44 page after seller identity and store are resolved', () => {
    authState = {
      simulationRole: 'vendedor',
      simulationLoading: false,
      isSimulating: true,
    }

    render(<CarteiraClientesBase44Page />)

    expect(screen.getByTestId('carteira-reference')).not.toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
