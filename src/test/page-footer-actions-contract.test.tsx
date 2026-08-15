import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PageFooterActions } from '@/components/molecules/PageFooterActions'

const root = resolve(import.meta.dir, '..', '..')

afterEach(cleanup)

describe('FASE J 10.016-10.018 — PageFooterActions', () => {
  test('10.016 — componente existe e é exportado pelo índice de molecules', () => {
    const source = readFileSync(
      resolve(root, 'src/components/molecules/PageFooterActions.tsx'),
      'utf8',
    )
    const index = readFileSync(resolve(root, 'src/components/molecules/index.ts'), 'utf8')
    expect(source).toContain('PageFooterActions')
    expect(index).toContain("export { PageFooterActions } from './PageFooterActions'")
  })

  test('10.016 — é sticky bottom com z-index de topo (barra persistente em fluxo)', () => {
    const { container } = render(
      <PageFooterActions>
        <button type="button">Confirmar</button>
      </PageFooterActions>,
    )
    const bar = container.querySelector('[data-mx-page-footer-actions]')
    expect(bar).toBeTruthy()
    expect(bar?.getAttribute('class')).toContain('sticky bottom-0')
    expect(bar?.getAttribute('class')).toContain('z-[var(--mx-z-topbar)]')
    expect(bar?.getAttribute('class')).toContain('border-t')
  })

  test('10.017 — reserva safe-area inferior com respiro mínimo', () => {
    const source = readFileSync(
      resolve(root, 'src/components/molecules/PageFooterActions.tsx'),
      'utf8',
    )
    expect(source).toContain('env(safe-area-inset-bottom')
    expect(source).toContain('max(env(safe-area-inset-bottom, 0px), 8px)')
  })

  test('10.018 — barra é sticky (não fixed) e depende do bottomClearance do PageCanvas', () => {
    const source = readFileSync(
      resolve(root, 'src/components/molecules/PageFooterActions.tsx'),
      'utf8',
    )
    const pageCanvas = readFileSync(resolve(root, 'src/design-system/page/PageCanvas.tsx'), 'utf8')
    // Sticky, nunca fixed: em fluxo, não cobre o último campo.
    expect(source).toContain("'sticky bottom-0 z-[var(--mx-z-topbar)] mt-auto'")
    expect(source).not.toContain('fixed bottom-0')
    // O PageCanvas interpola o clearance do token; a reserva semântica de
    // ações + safe-area é publicada em semantic.css.
    expect(pageCanvas).toContain('var(--mx-page-clearance-')
    const semantic = readFileSync(
      resolve(root, 'src/design-system/tokens/semantic.css'),
      'utf8',
    )
    expect(semantic).toContain('--mx-page-clearance-actions')
  })

  test('10.016 — renderiza as ações e o degradê de superfície', () => {
    const { container, getByText } = render(
      <PageFooterActions>
        <button type="button">Confirmar</button>
        <button type="button">Cancelar</button>
      </PageFooterActions>,
    )
    expect(getByText('Confirmar')).toBeTruthy()
    expect(getByText('Cancelar')).toBeTruthy()
    expect(container.querySelector('[data-mx-page-footer-actions]')?.getAttribute('class')).toContain(
      'bg-gradient-to-t from-surface',
    )
  })
})
