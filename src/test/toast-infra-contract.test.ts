import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * Contrato FASE Q 17.004/17.006/17.007 — infraestrutura canônica de toast.
 *
 * - 17.004: Toaster global posicionado `top-right`, com safe-area via `.mx-toaster`.
 * - 17.006: durações por tipo em `TOAST_DURATION_MS` e `toast.dismiss` exposto.
 * - 17.007: `closeButton` habilitado no provider; contraste semântico via tokens
 *   `--mx-status-*` (semantic-contrast já existente, reutilizado).
 */
const app = readFileSync('src/App.tsx', 'utf8')
const toastLib = readFileSync('src/lib/toast.ts', 'utf8')
const componentsCss = readFileSync('src/design-system/tokens/components.css', 'utf8')

describe('FASE Q — infraestrutura canônica de toast', () => {
  test('17.004 — Toaster global com position top-right e classe mx-toaster', () => {
    expect(app).toContain('position="top-right"')
    expect(app).toContain('className="mx-toaster"')
    expect(app).toContain('<Toaster')
  })

  test('17.006 — durations por tipo e dismiss exposto em lib/toast', () => {
    expect(toastLib).toContain('TOAST_DURATION_MS')
    expect(toastLib).toContain('success: 3000')
    expect(toastLib).toContain('info: 4000')
    expect(toastLib).toContain('warning: 6000')
    expect(toastLib).toContain('error: 8000')
    expect(toastLib).toContain('dismiss: sonnerToast.dismiss')
    expect(toastLib).toContain('promise: sonnerToast.promise')
    expect(toastLib).toContain('loading: sonnerToast.loading')
  })

  test('17.007 — closeButton habilitado no provider global', () => {
    expect(app).toContain('closeButton')
  })

  test('17.007/semantic-contrast — mx-toaster remapeia cores para tokens de status', () => {
    expect(componentsCss).toContain('--success-bg: hsl(var(--mx-status-success)')
    expect(componentsCss).toContain('--error-bg: hsl(var(--mx-status-error)')
    expect(componentsCss).toContain('--warning-bg: hsl(var(--mx-status-warning)')
    expect(componentsCss).toContain('[data-sonner-toaster].mx-toaster')
  })
})
