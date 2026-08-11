/**
 * Story 3.12 — useFocusTrap hook tests
 * Garante WCAG 2.1 AA §2.1.2 (No Keyboard Trap) e §2.4.3 (Focus Order)
 */
import { describe, it, expect, afterEach } from 'bun:test'
import { useRef } from 'react'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { useFocusTrap } from './useFocusTrap'

// Polyfill rAF para Bun + happy-dom
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  ;(globalThis as unknown as { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame =
    (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number
}

function TestModal({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, active)
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Test">
      <button>First</button>
      <input aria-label="middle" />
      <button>Last</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  afterEach(() => cleanup())

  it('foca o primeiro elemento imediatamente ao ativar', async () => {
    const { findByText } = render(<TestModal active={true} />)
    const first = await findByText('First') as HTMLButtonElement

    expect(document.activeElement).toBe(first)
  })

  it('foca o primeiro elemento focável quando ativo', async () => {
    const { findByText } = render(<TestModal active={true} />)
    const first = await findByText('First') as HTMLButtonElement
    // requestAnimationFrame agendado — aguarda 1 frame
    await new Promise(r => requestAnimationFrame(() => r(null)))
    expect(document.activeElement).toBe(first)
  })

  it('não sobrescreve um foco interno escolhido antes do segundo passe', async () => {
    const { container } = render(<TestModal active={true} />)
    const middle = container.querySelector<HTMLInputElement>('input[aria-label="middle"]')!

    middle.focus()
    await new Promise(r => requestAnimationFrame(() => r(null)))

    expect(document.activeElement).toBe(middle)
  })

  it('não trapa foco quando inativo', () => {
    render(<TestModal active={false} />)
    expect(document.activeElement).not.toHaveProperty('textContent', 'First')
  })

  it('Tab no último elemento volta ao primeiro', async () => {
    const { findByText } = render(<TestModal active={true} />)
    const first = await findByText('First') as HTMLButtonElement
    const last = await findByText('Last') as HTMLButtonElement
    last.focus()
    fireEvent.keyDown(last.parentElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('Shift+Tab no primeiro vai para o último', async () => {
    const { findByText } = render(<TestModal active={true} />)
    const first = await findByText('First') as HTMLButtonElement
    const last = await findByText('Last') as HTMLButtonElement
    first.focus()
    fireEvent.keyDown(first.parentElement!, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
