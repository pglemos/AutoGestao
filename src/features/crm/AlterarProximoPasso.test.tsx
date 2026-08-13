import React from 'react'
import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { AlterarProximoPasso } from './AlterarProximoPasso'

afterEach(cleanup)

describe('AlterarProximoPasso', () => {
  it('fica acima da ficha do cliente para receber os cliques', () => {
    render(
      <AlterarProximoPasso
        open
        cliente={{ id: 'cliente-1', nome: 'Lara', proxima_acao: null, proxima_acao_em: null } as any}
        onClose={() => {}}
        onSalvar={async () => ({ error: null })}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Alterar próximo passo' })
    expect(dialog).toHaveAttribute('data-mx-overlay', 'modal')
    expect(dialog.className).toContain('z-[var(--mx-z-modal')
  })
})
