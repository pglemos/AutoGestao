import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('contrato da classificação global', () => {
  test('usa somente o scroll vertical do shell da aplicação', () => {
    const view = read('src/features/ranking/views/GlobalRankingView.tsx')

    expect(view).not.toContain('<main')
    expect(view).not.toContain('h-full flex flex-col')
    expect(view).not.toContain('overflow-y-auto no-scrollbar')
    expect(view).toContain('min-h-full w-full min-w-0')
    expect(view).toContain('pb-32')
  })

  test('sincroniza ranking e métricas da rede pelas fontes Realtime', () => {
    const hook = read('src/features/ranking/hooks/useGlobalRankingPageData.ts')

    for (const table of [
      'lancamentos_diarios',
      'vendedores_loja',
      'vinculos_loja',
      'regras_metas_loja',
      'lojas',
      'usuarios',
    ]) {
      expect(hook).toContain(`'${table}'`)
    }

    expect(hook).toContain("supabase.channel(`ranking-global-live:")
    expect(hook).toContain("'postgres_changes'")
    expect(hook).toContain('Promise.all([refetch(), refetchNetwork()])')
    expect(hook).toContain('supabase.removeChannel(channel)')
  })

  test('o filtro de lojas considera a rede completa e não só vendedores com ranking', () => {
    const hook = read('src/features/ranking/hooks/useGlobalRankingPageData.ts')

    expect(hook).toContain('for (const store of networkMetrics.byStore)')
    expect(hook).toContain('set.add(store.storeName)')
    expect(hook).toContain('for (const entry of ranking)')
  })

  test('a lupa nunca intercepta clique ou toque nos campos de busca', () => {
    const css = read('src/styles/search-interactions.css')
    const main = read('src/main.tsx')
    const filters = read('src/features/ranking/sections/GlobalFiltersBar.tsx')

    expect(css).toContain('svg.lucide-search')
    expect(css).toContain('pointer-events: none')
    expect(main).toContain("./styles/search-interactions.css")
    expect(filters).toContain('type="search"')
    expect(filters).toContain('pointer-events-none')
  })
})
