import React from 'react'
import { describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'bun:test'
import { FluxoFechamento } from './FluxoFechamento'

afterEach(cleanup)

describe('FluxoFechamento', () => {
  it('não aumenta o progresso ao apenas confirmar uma etapa sem informar dados', () => {
    render(
      <FluxoFechamento
        readValue={() => 0}
        updateField={() => {}}
        disabled={false}
        agdCartAtivos={0}
        agdNetAtivos={0}
        temClientesCadastrados={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Showroom/i }))

    expect(screen.getByText('0%')).toBeTruthy()
  })

  // O fluxo é único: mobile e desktop renderizam este mesmo componente, que
  // sempre abre em Showroom. Antes, mobile tinha um bloco próprio iniciando
  // por Internet.
  it('abre sempre na etapa Showroom, independente de viewport', () => {
    render(
      <FluxoFechamento
        readValue={() => 0}
        updateField={() => {}}
        disabled={false}
        agdCartAtivos={0}
        agdNetAtivos={0}
        temClientesCadastrados={false}
      />,
    )

    expect(screen.getByRole('button', { name: /Confirmar Showroom/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Confirmar Internet/i })).toBeNull()
  })

  it('percorre as etapas na ordem Showroom → Carteira → Internet → Vendas', () => {
    render(
      <FluxoFechamento
        readValue={() => 0}
        updateField={() => {}}
        disabled={false}
        agdCartAtivos={0}
        agdNetAtivos={0}
        temClientesCadastrados={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Showroom/i }))
    expect(screen.getByRole('button', { name: /Confirmar Carteira/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Carteira/i }))
    expect(screen.getByRole('button', { name: /Confirmar Internet/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Internet/i }))
    expect(screen.queryByRole('button', { name: /Confirmar Showroom/i })).toBeNull()
  })

  // Confirmar etapa passou a ser um ponto de persistência: antes o clique só
  // trocava de tela e o dado ficava apenas no estado React.
  it('avisa o autosave a cada etapa confirmada', () => {
    const confirmed: string[] = []
    render(
      <FluxoFechamento
        readValue={() => 0}
        updateField={() => {}}
        disabled={false}
        agdCartAtivos={0}
        agdNetAtivos={0}
        temClientesCadastrados={false}
        onStepConfirmed={step => confirmed.push(step)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Showroom/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Carteira/i }))

    expect(confirmed).toEqual(['showroom', 'carteira'])
  })
})
