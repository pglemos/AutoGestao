import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const containerSource = readFileSync(
  new URL('./ManagerDayRoutineCanonical.container.tsx', import.meta.url),
  'utf8',
)
const routeSource = readFileSync(
  new URL('../../../pages/RotinaGerente.tsx', import.meta.url),
  'utf8',
)
const viewSource = readFileSync(
  new URL('./ManagerDayRoutineView.tsx', import.meta.url),
  'utf8',
)

describe('ManagerDayRoutine canonical sources', () => {
  test('routes the manager page through the canonical container', () => {
    expect(routeSource).toContain('ManagerDayRoutineCanonical')
    expect(routeSource).not.toContain('ManagerDayRoutine as RotinaGerente')
  })

  test('refreshes persisted automatic manager tasks through the canonical RPC', () => {
    expect(containerSource).toContain("supabase.rpc('refresh_manager_daily_tasks'")
    expect(containerSource).toContain('p_manager_user_id: profile.id')
    expect(containerSource).toContain('p_store_id: storeId')
  })

  test('reads automatic tasks from the canonical table instead of reconstructing them from legacy rows', () => {
    expect(containerSource).toContain(".from('manager_daily_tasks')")
    expect(containerSource).not.toContain(".from('regularizacao_fechamento')")
    expect(containerSource).not.toContain('composeManagerRoutineSourceData')
  })

  test('keeps personal manual activities separate from official score', () => {
    expect(containerSource).toContain(".from('execution_actions')")
    expect(containerSource).toContain(".eq('source_type', 'manual')")
    expect(containerSource).toContain('countsForScore: row.counts_for_score')
  })

  test('uses the canonical PageCanvas and leaves page spacing to the shared layout', () => {
    expect(containerSource).toContain("from '@/design-system/page'")
    expect(containerSource).toContain('PageCanvas')
    // width/clearance resolvidos da metadata da rota (Padrão A C7 / FASE Z),
    // não literal fixo.
    expect(containerSource).toContain(
      '<PageCanvas as="div" width={pageLayout.width} bottomClearance={pageLayout.bottomClearance}',
    )
    expect(containerSource).toContain('resolveRouteLayout')
    expect(containerSource).not.toContain('min-h-full bg-gray-50')
    const viewComponentSource = viewSource.slice(viewSource.indexOf('export function ManagerDayRoutineView'))
    const viewRoot = viewComponentSource.match(/return\s*\(\s*(<div className="[^"]+">)/)?.[1]
    expect(viewRoot).toBe('<div className="flex flex-col gap-5">')
    expect(viewRoot).not.toMatch(/(?:mx-auto|max-w-7xl|px-4|py-6)/)
  })
})
