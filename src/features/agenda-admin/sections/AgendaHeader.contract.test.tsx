import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AgendaHeader } from './AgendaHeader'

afterEach(() => cleanup())

describe('contrato do cabeçalho da Agenda', () => {
  it('expõe o slot canônico com a superfície padrão do módulo', () => {
    render(<AgendaHeader monthLabel="Agosto 2026" />)

    const header = screen.getByRole('banner')

    expect(header).toHaveAttribute('data-mx-template-header', '')
    expect(header).toHaveAttribute('data-mx-template-slot', 'header')
    expect(header).toHaveClass('rounded-2xl', 'bg-white')
  })
})
