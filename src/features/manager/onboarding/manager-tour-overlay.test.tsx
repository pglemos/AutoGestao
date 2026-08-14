import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useState } from 'react'
import { ManagerTourOverlay } from './ManagerTourOverlay'
import type { ManagerTourStep } from './manager-tours'

// jsdom/Bun não implementam rAF — estabilizar para o segundo passe do focus trap.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  ;(globalThis as unknown as { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame =
    (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number
}

const STEPS: ManagerTourStep[] = [
  { title: 'Passo um', description: 'Primeiro', selector: "[data-tour='meta-loja']" },
  { title: 'Passo dois', description: 'Segundo' },
  { title: 'Passo tres', description: 'Terceiro' },
]

function renderOverlay({
  onClose = vi.fn(),
  onSkip = vi.fn(),
  steps = STEPS,
}: { onClose?: () => void; onSkip?: () => void; steps?: ManagerTourStep[] } = {}) {
  return render(
    <div>
      <div data-tour="meta-loja" />
      <ManagerTourOverlay steps={steps} onClose={onClose} onSkip={onSkip} />
    </div>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ManagerTourOverlay — foco e teclado (TDD FASE J/ManagerTour)', () => {
  test('foco inicial cai em um elemento focável dentro do diálogo', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog', { name: 'Tour do Gerente' })
    const first = screen.getByRole('button', { name: /Fechar tour/ })
    expect(document.activeElement === first).toBe(true)
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  test('Tab no último e Shift+Tab no primeiro fazem wrap dentro do diálogo', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog', { name: 'Tour do Gerente' })
    const buttons = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[]
    const first = buttons[0]
    const last = buttons[buttons.length - 1]

    last.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement === first).toBe(true)

    first.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement === last).toBe(true)
  })

  test('desmontar o overlay restaura o foco no gatilho externo', () => {
    function Host() {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button onClick={() => setOpen(true)}>Abrir</button>
          {open && (
            <div>
              <div data-tour="meta-loja" />
              <ManagerTourOverlay steps={STEPS} onClose={() => setOpen(false)} onSkip={() => setOpen(false)} />
            </div>
          )}
        </div>
      )
    }
    render(<Host />)
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    trigger.focus()

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Tour do Gerente' })).toBeInTheDocument()

    // Foco dentro do diálogo antes de fechar — o restore do trap precisa trazer
    // o foco de volta ao gatilho.
    const closeButton = screen.getByRole('button', { name: /Fechar tour/ })
    closeButton.focus()
    fireEvent.click(closeButton)

    expect(screen.queryByRole('dialog', { name: 'Tour do Gerente' })).not.toBeInTheDocument()
    expect(document.activeElement === trigger).toBe(true)
  })

  test('Enter no botão Próximo + clique nativo avança exatamente um passo', () => {
    renderOverlay()
    const nextButton = screen.getByRole('button', { name: /Próximo/ })
    nextButton.focus()

    fireEvent.keyDown(nextButton, { key: 'Enter' })
    fireEvent.click(nextButton)

    expect(screen.getByText('Passo 2 de 3')).toBeInTheDocument()
    expect(screen.queryByText('Passo 3 de 3')).not.toBeInTheDocument()
  })

  test('Escape chama skip; setas direita/esquerda preservadas', () => {
    const onSkip = vi.fn()
    renderOverlay({ onSkip })

    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onSkip).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(screen.getByText('Passo 2 de 3')).toBeInTheDocument()

    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument()
  })

  test('scrollIntoView respeita prefers-reduced-motion (auto) e usa smooth caso contrário', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    const makeMedia = (reduce: boolean) =>
      vi.fn((query: string) => ({
        matches: reduce,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
      }))

    const originalMatchMedia = window.matchMedia
    window.matchMedia = makeMedia(true) as unknown as typeof window.matchMedia
    const first = renderOverlay()
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'center' })
    first.unmount()

    window.matchMedia = makeMedia(false) as unknown as typeof window.matchMedia
    renderOverlay()
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'center' })

    window.matchMedia = originalMatchMedia
  })
})
