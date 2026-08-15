import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * Contrato FASE R 18.009/18.012 — NotFound/Forbidden coerentes + destructive vs recoverable.
 *
 * - 18.009: 404 é página própria (`pages/NotFound.tsx`) sem forçar PageCanvas;
 *   403 é coberto por `ErrorState kind="permission"` (Lock + hint de liberação).
 * - 18.012: erro recuperável tem `onRetry`; erro não-recuperável usa `action`/
 *   `reference` em vez de retry — o ErrorState nunca exibe stack trace.
 */
const notFound = readFileSync('src/pages/NotFound.tsx', 'utf8')
const errorState = readFileSync('src/components/molecules/ErrorState.tsx', 'utf8')

describe('FASE R 18.009 — NotFound/Forbidden coerentes', () => {
  test('404 é página própria, sem PageCanvas forçado', () => {
    expect(notFound).toContain('404')
    expect(notFound).toContain('Ponto Fora da Malha')
    expect(notFound).toContain('lint-page-roots-ignore')
    expect(notFound).not.toContain('PageCanvas')
  })

  test('403 é coberto por ErrorState kind=permission', () => {
    expect(errorState).toContain("permission: {")
    expect(errorState).toContain("title: 'Você não tem acesso a este conteúdo'")
    expect(errorState).toContain('Lock')
    expect(errorState).toContain('Peça liberação ao responsável pela sua loja')
  })
})

describe('FASE R 18.012 — destructive vs recoverable error', () => {
  test('erro recuperável expõe onRetry/retrying', () => {
    expect(errorState).toContain('onRetry?: () => void')
    expect(errorState).toContain('retrying?: boolean')
    expect(errorState).toContain('aria-busy={retrying || undefined}')
  })

  test('erro não-recuperável usa action/reference em vez de retry', () => {
    expect(errorState).toContain('action?: React.ReactNode')
    expect(errorState).toContain('reference?: string')
    expect(errorState).toContain('Nunca exiba stack trace ao usuário')
  })
})
