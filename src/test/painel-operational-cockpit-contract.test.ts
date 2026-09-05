import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('contrato do cockpit operacional do /painel', () => {
  test('promove operação comercial e mantém governança no mesmo shell', () => {
    const page = read('src/features/admin-mx/AdminDashboardPage.tsx')
    const content = read('src/features/network-dashboard/NetworkDashboardContent.tsx')

    expect(page).toContain('scope="internal"')
    expect(page).toContain('Governança da carteira')
    expect(page).toContain('Ações de governança')
    expect(page).not.toContain("searchParams.get('view') === 'operacional'")
    expect(content).toContain('Cockpit operacional')
    expect(content).toContain('Período:')
  })

  test('une operação e governança numa única carteira operacional', () => {
    const page = read('src/features/admin-mx/AdminDashboardPage.tsx')
    const table = read('src/features/admin-mx/painel/CarteiraOperacionalTable.tsx')

    // A tabela única recebe as lojas do mesmo controller do cockpit: sem
    // segunda busca e sem duas leituras divergentes na mesma tela.
    expect(page).toContain('carteiraSlot={stores =>')
    expect(page).toContain('buildCarteiraOperacional')
    // Colunas dos dois domínios convivem na mesma linha.
    expect(table).toContain("label: 'Situação operacional'")
    expect(table).toContain("label: 'Contrato'")
    expect(table).toContain("label: 'Responsável MX'")
    // Linhas sem par continuam visíveis em vez de sumirem na junção.
    expect(table).toContain('linkageLabel(row.linkage)')
    expect(table).toContain('hidden md:block')
    expect(table).toContain('md:hidden')
  })

  test('recorte da carteira sobrevive ao reload pela URL', () => {
    const page = read('src/features/admin-mx/AdminDashboardPage.tsx')
    const urlState = read('src/features/admin-mx/painel/carteiraUrlState.ts')

    expect(page).toContain('useSearchParams')
    expect(page).toContain('readCarteiraParams(searchParams)')
    // Digitar na busca não é navegação: sem replace cada tecla vira histórico.
    expect(page).toContain('{ replace: true }')
    // A URL é entrada não confiável.
    expect(urlState).toContain('CARTEIRA_FILTERS.includes(value as CarteiraFilter)')
  })

  test('não apresenta atingimento calculado sobre base incompleta', () => {
    const metrics = read('src/features/network-dashboard/sections/NetworkMetricsSection.tsx')

    expect(metrics).toContain("if (metrics.attainmentState === 'partial') return '—'")
    expect(metrics).toContain('Sem base confiável')
    expect(metrics).toContain('Configurar metas')
  })

  test('um único controle de situação e busca governa a página', () => {
    const page = read('src/features/admin-mx/AdminDashboardPage.tsx')
    const table = read('src/features/admin-mx/painel/CarteiraOperacionalTable.tsx')

    // A carteira recebe o universo, não as linhas já filtradas pelo cockpit:
    // sem isso o "Exibindo N de M" mentia sobre o tamanho da rede.
    const content = read('src/features/network-dashboard/NetworkDashboardContent.tsx')
    expect(content).toContain('carteiraSlot(controller.allRows)')
    expect(page).toContain('controlledFilters')
    expect(page).toContain('CARTEIRA_FILTER_GROUPS')
    // A carteira não pode ter busca nem select próprios.
    expect(page).not.toContain('Buscar loja, cliente ou responsável"\n')
    // Ação primária exposta, resto colapsado, coluna fixa à direita.
    expect(table).toContain('Mais ações de')
    expect(table).toContain('sticky right-0')
    expect(table).toContain('sticky top-0')
  })

  test('entra com esqueleto, não com spinner vazio', () => {
    const content = read('src/features/network-dashboard/NetworkDashboardContent.tsx')

    expect(content).toContain('NetworkCockpitSkeleton')
    expect(content).toContain('MxSkeleton')
    // A saudação e o horário saem do parágrafo do cabeçalho: no telefone eles
    // custavam a primeira dobra inteira antes do primeiro número.
    expect(content).not.toContain("`${greeting}.`,")
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
