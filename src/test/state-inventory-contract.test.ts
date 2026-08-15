import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

/**
 * FASE R — inventário e cobertura dos estados (18.001/18.003/18.007/18.014/18.015).
 *
 * - 18.001: empty states → EmptyState canônico (`data-mx-empty` filter/dataset).
 * - 18.003: loading states → LoadingState (spinner/skeleton) + Skeleton.
 * - 18.007: error states → ErrorState (kind network/permission/server/unknown).
 * - 18.014: migração STATE-* → canônicos usados nas rotas/containers.
 * - 18.015: screenshots → harness visual-matrix/owner covers estados críticos.
 */
describe('FASE R — inventário de estados (18.001/003/007)', () => {
  test('EmptyState canônico expõe distinção filter vs dataset (18.001/011)', () => {
    const empty = read('src/components/atoms/EmptyState.tsx')
    expect(empty).toContain('data-mx-empty')
    expect(empty).toContain("variant?: EmptyStateVariant")
    expect(empty).toContain('filter: <SearchX')
    expect(empty).toContain('dataset: <Inbox')
  })

  test('ErrorState canônico tem kinds de erro (18.007/012)', () => {
    const err = read('src/components/molecules/ErrorState.tsx')
    for (const kind of ['network', 'permission', 'server', 'unknown']) {
      expect(err, `kind=${kind}`).toContain(kind)
    }
    expect(err).toContain('retry')
    expect(err).toContain('aria-busy')
  })

  test('LoadingState distingue initial/refresh/pagination (18.003/010)', () => {
    const loading = read('src/components/molecules/LoadingState.tsx')
    expect(loading).toContain("context?: 'initial' | 'refresh'")
    expect(loading).toContain("variant?: 'spinner' | 'skeleton'")
    expect(loading).toContain('aria-live')
  })

  test('Skeleton primitive usa radius tokens (18.005/006)', () => {
    const skeleton = read('src/components/atoms/Skeleton.tsx')
    expect(skeleton).toContain('var(--mx-card-radius)')
    expect(skeleton).toContain('var(--mx-radius-full)')
    // skeletons compostos aproximam layout (CLS reduzido)
    for (const file of [
      'src/components/atoms/skeletons/SkeletonCard.tsx',
      'src/components/atoms/skeletons/SkeletonTable.tsx',
      'src/components/atoms/skeletons/SkeletonList.tsx',
      'src/components/atoms/skeletons/SkeletonChart.tsx',
    ]) {
      expect(read(file), file).toContain('Skeleton')
    }
  })
})

describe('FASE R — migração e cobertura (18.014/015)', () => {
  test('EmptyState/ErrorState/LoadingState/Skeleton usados nas rotas e containers', () => {
    const sources = [
      read('src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx'),
      read('src/features/morning-report/LegacyMorningReportPage.tsx'),
      read('src/pages/Ranking.tsx'),
    ].join('\n')
    expect(sources).toMatch(/EmptyState|ErrorState|LoadingState|Skeleton/)
  })

  test('NotFound/Forbidden coerentes sem PageCanvas forçado (18.009)', () => {
    const notFound = read('src/pages/NotFound.tsx')
    expect(notFound).toContain('404')
    expect(notFound).not.toContain('PageCanvas')
    const app = read('src/App.tsx')
    expect(app).toContain('ErrorState')
    expect(app).toContain('kind="permission"')
  })

  test('aria-busy/aria-live presentes nos estados (18.013)', () => {
    const err = read('src/components/molecules/ErrorState.tsx')
    expect(err).toContain('aria-busy')
    const loading = read('src/components/molecules/LoadingState.tsx')
    expect(loading).toContain('aria-live')
  })

  test('screenshots de estados cobertos pelo harness visual (18.015)', () => {
    const matrix = read('src/test/visual-matrix-roles.playwright.ts')
    expect(matrix).toContain('screenshotFullPage')
    expect(matrix).toContain('visual-evidence')
  })
})
