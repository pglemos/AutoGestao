import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Activity } from 'lucide-react'

import { SellerPageHeader } from './SellerPageHeader'

afterEach(() => cleanup())

describe('contrato do PageHeader canônico do vendedor', () => {
  test('preserva os slots de ícone, título, subtítulo e ações em uma única geometria tokenizada', () => {
    render(
      <SellerPageHeader
        icon={Activity}
        title="Minha equipe"
        subtitle="Acompanhe a rotina operacional"
        actions={<button type="button">Atualizar</button>}
      />,
    )

    const header = screen.getByRole('banner')
    expect(header).toHaveAttribute('data-mx-page-header', '')
    expect(header).toHaveClass('rounded-[var(--mx-card-radius)]', 'shadow-[var(--mx-card-shadow)]')
    expect(screen.getByRole('heading', { name: 'Minha equipe' })).toBeTruthy()
    expect(screen.getByText('Acompanhe a rotina operacional')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeTruthy()
  })
})
