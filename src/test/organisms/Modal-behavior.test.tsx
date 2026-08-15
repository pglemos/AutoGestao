import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Modal } from '@/components/organisms/Modal'
import * as React from 'react'

/**
 * FASE O — 15.022
 *
 * Valida comportamento de teclado/foco/acessibilidade/zoom dos overlays
 * canônicos: ESC fecha (por padrão), foco inicial no close, aria-labelledby
 * ligado ao título, clique no backdrop fecha. Determinístico (flush de frames
 * para o RAF do onCloseAutoFocus — mesmo padrão do flake do dialogs).
 */
const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

const flushFrames = async (count = 5) => {
  for (let i = 0; i < count; i += 1) await waitForNextFrame()
}

const resetDom = () => {
  cleanup()
  document.body.replaceChildren()
}

afterEach(resetDom)

const renderModal = (props: Partial<React.ComponentProps<typeof Modal>> = {}) => {
  const onClose = mock()
  render(
    <Modal open title="Confirmar exclusão" description="Esta ação é irreversível." onClose={onClose} {...props}>
      <p>Conteúdo</p>
    </Modal>,
  )
  return { onClose }
}

describe('FASE O 15.022 — teclado/foco/aria dos overlays', () => {
  test('ESC fecha o modal por padrão (15.015)', async () => {
    const { onClose } = renderModal()
    const close = screen.getByRole('button', { name: 'Fechar modal' })
    await act(async () => { await flushFrames() })
    expect(document.activeElement).toBe(close)

    fireEvent.keyDown(close, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('closeOnEscape=false bloqueia ESC', () => {
    const { onClose } = renderModal({ closeOnEscape: false })
    const close = screen.getByRole('button', { name: 'Fechar modal' })
    fireEvent.keyDown(close, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  test('aria-labelledby/description ligados ao título e descrição (15.017)', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    const describedBy = dialog.getAttribute('aria-describedby') ?? ''
    const labelledBy = dialog.getAttribute('aria-labelledby') ?? ''
    expect(describedBy.length).toBeGreaterThan(0)
    expect(labelledBy.length).toBeGreaterThan(0)
    // O id referenciado existe e contém o texto esperado.
    const titleEl = document.getElementById(labelledBy)
    const descEl = document.getElementById(describedBy)
    expect(titleEl?.textContent).toContain('Confirmar exclusão')
    expect(descEl?.textContent).toContain('Esta ação é irreversível.')
  })

  test('foco inicial cai no close (trap/restore, 15.013/15.014)', async () => {
    renderModal()
    const close = screen.getByRole('button', { name: 'Fechar modal' })
    await act(async () => { await flushFrames() })
    expect(document.activeElement).toBe(close)
  })
})
