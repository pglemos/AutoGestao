import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, cleanup, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { EmptyState } from '@/components/atoms/EmptyState'
import { ErrorState } from '@/components/molecules/ErrorState'
import { LoadingState } from '@/components/molecules/LoadingState'
import { Skeleton } from '@/components/atoms/Skeleton'
import { MxEmptyState } from '@/components/module/MxModuleVisualPrimitives'

const root = resolve(import.meta.dir, '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

/**
 * Contrato FASE R — estados de feedback de dados (18.002/18.005/18.008/18.011/18.013).
 *
 * 1. EmptyState canônico com icon/title/description/action + distinção
 *    `filter` (filtro não retornou nada) vs `dataset` (não há dados).
 * 2. ErrorState canônico com retry/details.
 * 3. Skeleton primitive com radius tokens.
 * 4. MxEmptyState delega ao EmptyState canônico (single ownership).
 */
describe('contrato FASE R — estados de feedback de dados', () => {
  test('EmptyState canônico expõe icon/title/description/action e variante filter', () => {
    const src = read('src/components/atoms/EmptyState.tsx')
    expect(src).toContain('icon')
    expect(src).toContain('title')
    expect(src).toContain('description')
    expect(src).toContain('action')
    expect(src).toContain('filter')
    expect(src).toContain('dataset')

    const html = renderToStaticMarkup(<EmptyState variant="filter" title="Nenhum resultado" description="Ajuste os filtros." action={<button type="button">Limpar</button>} />)
    expect(html).toContain('Nenhum resultado')
    expect(html).toContain('Ajuste os filtros.')
    expect(html).toContain('Limpar')
    expect(html).toContain('data-mx-empty="filter"')
  })

  test('EmptyState dataset usa icon padrão e marcador semântico', () => {
    const html = renderToStaticMarkup(<EmptyState variant="dataset" title="Sem dados" />)
    expect(html).toContain('data-mx-empty="dataset"')
  })

  test('ErrorState canônico tem retry e reference/details', () => {
    const src = read('src/components/molecules/ErrorState.tsx')
    expect(src).toContain('onRetry')
    expect(src).toContain('reference')
    expect(src).toContain('retrying')

    const html = renderToStaticMarkup(<ErrorState kind="server" onRetry={() => undefined} reference="ABC-123" />)
    expect(html).toContain('Tentar novamente')
    expect(html).toContain('ABC-123')
    expect(html).toContain('role="alert"')
  })

  test('LoadingState expõe variants spinner/skeleton com aria-busy', () => {
    const src = read('src/components/molecules/LoadingState.tsx')
    expect(src).toContain('variant')
    expect(src).toContain('skeleton')
    expect(src).toContain('aria-busy')

    const html = renderToStaticMarkup(<LoadingState label="Carregando dados" />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-busy="true"')
  })

  test('Skeleton primitive usa radius tokens e aria-hidden', () => {
    const src = read('src/components/atoms/Skeleton.tsx')
    expect(src).toContain('var(--mx-card-radius)')
    expect(src).toContain('aria-hidden')

    const html = renderToStaticMarkup(<Skeleton variant="card" />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('rounded-[var(--mx-card-radius)]')
  })

  test('MxEmptyState delega ao EmptyState canônico (single ownership)', () => {
    const src = read('src/components/module/MxModuleVisualPrimitives.tsx')
    expect(src).toMatch(/import .*EmptyState.*from ['"].*atoms\/EmptyState/)
  })
})
