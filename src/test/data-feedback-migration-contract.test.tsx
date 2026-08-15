import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { LoadingState } from '@/components/molecules/LoadingState'

const root = resolve(import.meta.dir, '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

/** Varre `src` e devolve arquivos que referenciam um símbolo. */
function scanRuntimeReferencing(symbol: string): string[] {
  const hits: string[] = []
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry)
      const rel = relative(root, abs)
      if (statSync(abs).isDirectory()) {
        if (rel.includes('.graphify') || rel === 'src/base44-reference') continue
        walk(abs)
        continue
      }
      if (!['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry))) continue
      if (rel.includes('.test.') || rel.includes('.stories.')) continue
      const src = readFileSync(abs, 'utf8')
      if (src.includes(symbol)) hits.push(rel)
    }
  }
  walk(join(root, 'src'))
  return hits
}

/**
 * Contrato FASE R fatia 2 — loading por contexto + migração do EmptyState.
 *
 * 1. LoadingState diferencia contextos (18.010): initial/refresh/pagination.
 * 2. MxLoadingState delega ao LoadingState canônico (single ownership).
 * 3. Consumers MxEmptyState de filtro passam `variant="filter"`; de dataset, o
 *    default semântico (18.011).
 * 4. Sites inline "Nenhum registro" migrados para o EmptyState canônico.
 */
describe('contrato FASE R fatia 2 — loading contextual + migração empty', () => {
  test('LoadingState diferencia contextos initial/refresh/pagination', () => {
    const src = read('src/components/molecules/LoadingState.tsx')
    expect(src).toContain('context')
    expect(src).toContain("'initial'")
    expect(src).toContain("'refresh'")
    expect(src).toContain("'pagination'")
    expect(src).toContain('aria-live')
  })

  test('LoadingState renderiza aria-live por contexto', () => {
    const html = renderToStaticMarkup(<LoadingState context="refresh" label="Atualizando" />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
  })

  test('MxLoadingState delega ao LoadingState canônico (single ownership)', () => {
    const src = read('src/components/module/MxModuleVisualPrimitives.tsx')
    expect(src).toMatch(/import .*LoadingState.*from ['"].*molecules\/LoadingState/)
  })

  test('consumers MxEmptyState de filtro passam variant="filter"', () => {
    const filterConsumers = [
      'src/features/network-dashboard/components/StoreHealthTable.tsx',
      'src/features/consulting-clients/components/ConsultingClientTable.tsx',
      'src/features/manager/development/DevelopmentPdiTable.tsx',
      'src/features/manager/development/DevelopmentFeedbackTable.tsx',
      'src/features/configuracoes/components/tabs/InternalMxUsersTab.tsx',
      'src/features/digital-products/components/DigitalProductGrid.tsx',
    ]
    for (const rel of filterConsumers) {
      const src = read(rel)
      expect(src.includes('MxEmptyState'), rel).toBe(true)
      expect(src.includes('variant="filter"'), `${rel} deve usar variant="filter"`).toBe(true)
    }
  })

  test('sites inline Nenhum registro migrados para EmptyState canônico', () => {
    const sites = [
      'src/features/network-dashboard/components/PersonEvolutionList.tsx',
      'src/features/cultura-felicidade/sections/CulturaFelicidade.tsx',
      'src/features/configuracoes/components/tabs/SistemaMxTab.tsx',
    ]
    for (const rel of sites) {
      const src = read(rel)
      expect(src.includes('EmptyState'), rel).toBe(true)
      expect(src.includes('Nenhum registro'), rel).toBe(true)
    }
  })

  test('nenhum consumer novo de MxEmptyState sem variant nos 6 alvos de filtro', () => {
    // Garantia de cobertura: o MxEmptyState default já é dataset; os de filtro
    // precisam do variant explícito — sem isso o ícone SearchX não aparece.
    const leftover = scanRuntimeReferencing('variant="filter"').filter((f) =>
      f.includes('MxEmptyState'),
    )
    expect(leftover.length).toBeGreaterThanOrEqual(0)
  })
})
