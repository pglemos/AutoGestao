import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('contrato do cockpit operacional do /painel', () => {
  test('promove operação comercial e mantém governança no mesmo shell', () => {
    const page = read('src/features/admin-mx/AdminDashboardPage.tsx')
    const content = read('src/features/network-dashboard/NetworkDashboardContent.tsx')

    expect(page).toContain('<NetworkDashboardContent scope="internal" />')
    expect(page).toContain('Governança da carteira')
    expect(page).toContain('Ações de governança')
    expect(page).not.toContain("searchParams.get('view') === 'operacional'")
    expect(content).toContain('Cockpit operacional')
    expect(content).toContain('Período:')
  })

  test('expõe ações contextuais para métricas e fila prioritária', () => {
    const metrics = read('src/features/network-dashboard/sections/NetworkMetricsSection.tsx')
    const priorities = read('src/features/network-dashboard/sections/NetworkPrioritiesSection.tsx')

    expect(metrics).toContain('Abrir fila de prioridades')
    expect(metrics).toContain('onShowPriorities')
    expect(priorities).toContain('id="network-priorities"')
    expect(priorities).toContain('aria-label="Fila de prioridades por loja"')
  })

  test('entrega cards operacionais no telefone e nomes acessíveis', () => {
    const table = read('src/features/network-dashboard/components/StoreHealthTable.tsx')

    expect(table).toContain('hidden md:block')
    expect(table).toContain('md:hidden')
    expect(table).toContain('aria-label={`Analisar ${row.name}`}')
    expect(table).toContain('Não configurada')
    expect(table).toContain('0 confirmado')
  })

  test('mantém alvos de toque confortáveis nos filtros mobile', () => {
    const filters = read('src/features/network-dashboard/sections/NetworkFiltersSection.tsx')

    expect(filters).toContain('h-mx-10 min-h-[var(--mx-touch-target-min)] pl-9 sm:min-h-[var(--mx-input-height)]')
    expect(filters).toContain('h-mx-10 min-h-[var(--mx-touch-target-min)] rounded-xl border border-border bg-white px-3 text-sm sm:min-h-[var(--mx-input-height)]')
    expect(filters).toContain('h-mx-10 min-h-[var(--mx-touch-target-min)] sm:min-h-[var(--mx-input-height)]')
  })

  test('não transforma falhas parciais em listas vazias', () => {
    const portfolio = read('src/features/admin-mx/clientes/useClientPortfolio.ts')
    const page = read('src/features/admin-mx/AdminDashboardPage.tsx')

    expect(portfolio).toContain('relatedQueryError')
    expect(portfolio).toContain('lastUpdatedAt')
    expect(portfolio).not.toContain('setRows([])\n    } catch')
    expect(page).toContain('Cadastros indisponíveis')
    expect(page).toContain('Alertas de meta indisponíveis')
  })

  test('mantém hierarquia sem headings redundantes nos cartões de métrica', () => {
    const primitives = read('src/components/module/MxModuleVisualPrimitives.tsx')

    expect(primitives).toContain('Typography as="h3" variant="h3"')
    expect(primitives).toContain('Typography as="div" variant="h2"')
  })
})
