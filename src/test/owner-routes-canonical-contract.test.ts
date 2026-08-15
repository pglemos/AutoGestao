import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE Y/Z — perfis Dono e Gerente usam o MESMO sistema (25.003/25.010).
 *
 * O `/home` é o golden (25.001/25.002). Nenhuma rota do Dono/Gerente deve ter
 * página "solta" fora do sistema: toda superfície monta em PageCanvas
 * (diretamente ou via PageTemplate/MxModulePage/workspace canônico) e o shell
 * emite `main#main-content` único. Este contrato fixa que cada rota-alvo usa a
 * fundação, para o drift regressivo não voltar.
 */
describe('FASE Y — rotas do Dono usam o mesmo sistema (25.003)', () => {
  test('/home (golden) monta em PageCanvas e não importa páginas legadas soltas', () => {
    const home = read('src/features/dashboard-loja/DashboardLoja.container.tsx')
    expect(home).toContain('PageCanvas')
    expect(home).toContain("resolveRouteLayout")
  })

  test('Plano Estratégico usa StrategicPlanWorkspace + PlanningWorkspaceProvider', () => {
    const page = read('src/pages/owner/PlanoEstrategico.jsx')
    expect(page).toContain('PlanningWorkspaceProvider')
    expect(page).toContain('StrategicPlanWorkspace')
    // o workspace canônico monta em PageCanvas
    const workspace = read('src/features/strategic-plan/StrategicPlanWorkspace.tsx')
    expect(workspace).toContain('PageCanvas')
  })

  test('Plano de Ação usa PageCanvas com layout canônico', () => {
    const page = read('src/pages/owner/PlanoDeAcao.jsx')
    expect(page).toContain('PageCanvas')
    expect(page).toContain('id="page-plano-acao"')
    expect(page).toContain('bottomClearance="navigation"')
  })

  test('Consultoria do Dono monta em PageCanvas', () => {
    const page = read('src/pages/owner/Consultoria.jsx')
    expect(page).toContain('PageCanvas')
    expect(page).toContain('width="wide"')
  })

  test('Minhas Lojas delega ao cockpit de rede canônico', () => {
    const page = read('src/features/owner/OwnerStoresNetworkPage.tsx')
    expect(page).toContain('NetworkDashboardPage')
    expect(page).toContain('scope="owner"')
    const network = read('src/features/network-dashboard/NetworkDashboardPage.tsx')
    expect(network).toContain('MxModulePage')
  })

  test('GerentePDI usa PageTemplate (PageCanvas) do sistema', () => {
    const page = read('src/pages/GerentePDI.tsx')
    expect(page).toContain('PageTemplate')
    const template = read('src/components/templates/PageTemplate.tsx')
    expect(template).toContain('PageCanvas')
  })

  test('Devolutivas/GerenteFeedback monta em PageCanvas nos containers internos (25.007)', () => {
    const admin = read('src/features/gerente-feedback/containers/AdminFeedback.container.tsx')
    const store = read('src/features/gerente-feedback/containers/StoreFeedback.container.tsx')
    expect(admin).toContain('PageCanvas')
    expect(store).toContain('PageCanvas')
    expect(admin).toContain('id="page-devolutivas"')
  })

  test('Funil do Gerente e Rotina da Equipe usam o sistema canônico (26.008/26.004)', () => {
    const funil = read('src/features/gerente/FunilVendasGerente.tsx')
    expect(funil).toContain('PageCanvas')
    const rotina = read('src/features/rotina-gerente/RotinaGerente.container.tsx')
    expect(rotina).toContain('PageCanvas')
  })

  test('Departamentos e /decisoes do Dono usam DashboardLoja (PageCanvas), não página solta', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('dono={<DashboardLoja />}')
  })
})

describe('FASE Z — rotas do Gerente usam o mesmo sistema (26.x)', () => {
  test('/home Gerente resolve width/clearance da metadata via DashboardLoja dinâmico', () => {
    const dashboard = read('src/features/dashboard-loja/DashboardLoja.container.tsx')
    expect(dashboard).toContain('resolveRouteLayout(location.pathname)')
    expect(dashboard).toContain('bottomClearance={pageBottomClearance}')
    const meta = read('src/design-system/page/routeLayoutMetadata.ts')
    expect(meta).toMatch(/home:\s*\{ width: 'dashboard', bottomClearance: 'navigation', adopted: true \}/)
  })

  test('/fechamento-diario usa ManagerDailyClosing (PageCanvas actions) e Checkin resolve clearance da metadata', () => {
    const closing = read('src/features/manager/daily-closing/ManagerDailyClosing.container.tsx')
    expect(closing).toContain('PageCanvas')
    expect(closing).toContain('bottomClearance="actions"')
    const checkin = read('src/features/checkin/Checkin.container.tsx')
    expect(checkin).toContain('resolveRouteLayout(location.pathname).bottomClearance')
    const meta = read('src/design-system/page/routeLayoutMetadata.ts')
    expect(meta).toMatch(/'fechamento-diario': \{ width: 'dashboard', bottomClearance: 'actions', adopted: true \}/)
  })

  test('/rotina Gerente usa ManagerDayRoutineCanonical com width/clearance da metadata', () => {
    const rotina = read('src/features/manager/day-routine/ManagerDayRoutineCanonical.container.tsx')
    expect(rotina).toContain('PageCanvas')
    expect(rotina).toContain('width={pageLayout.width}')
    const meta = read('src/design-system/page/routeLayoutMetadata.ts')
    expect(meta).toMatch(/rotina:\s*\{ width: 'focused', bottomClearance: 'navigation', adopted: true \}/)
  })

  test('/devolutivas é focused/navigation para todos os perfis (paridade Dono/Gerente)', () => {
    for (const f of [
      'src/features/gerente-feedback/containers/AdminFeedback.container.tsx',
      'src/features/gerente-feedback/containers/StoreFeedback.container.tsx',
      'src/features/gerente-feedback/sections/FeedbackLoadingSkeleton.tsx',
    ]) {
      const page = read(f)
      expect(page).toContain('resolveRouteLayout')
      expect(page).toContain('width={pageLayout.width}')
    }
    const vendedor = read('src/pages/VendedorDesenvolvimento.tsx')
    expect(vendedor).toContain('width={pageLayout.width}')
    const meta = read('src/design-system/page/routeLayoutMetadata.ts')
    expect(meta).toMatch(/devolutivas:\s*\{ width: 'focused', bottomClearance: 'navigation', adopted: true \}/)
  })
})

describe('FASE Y/Z — sem drift regressivo (25.010)', () => {
  test('shell emite main#main-content único e monta Dono sem shell separado', () => {
    const shell = read('src/components/MxSidebarShell.tsx')
    const appShell = read('src/components/AppShell.tsx')
    const layout = read('src/components/Layout.tsx')
    expect(shell).toContain('id="main-content"')
    expect(appShell).toContain('AppShellFrame')
    expect(layout).toContain('<OwnerProvider>')
    // sem identidade visual por perfil (§5 proíbe)
    expect(appShell).not.toContain('OwnerShell')
  })

  test('rotas do Dono não importam páginas legadas soltas de perfis internos', () => {
    for (const file of [
      'src/pages/owner/PlanoEstrategico.jsx',
      'src/pages/owner/PlanoDeAcao.jsx',
      'src/pages/owner/Consultoria.jsx',
    ]) {
      const source = read(file)
      expect(source, `${file} não deve importar páginas do módulo interno`).not.toContain('internal-mx-planning')
    }
  })

  test('Ranking/PDI/Universidade do Dono compartilham os mesmos containers do Gerente', () => {
    const app = read('src/App.tsx')
    // ranking/classificacao e universidade-mx usam os mesmos componentes canônicos
    expect(app).toContain('path="ranking"')
    expect(app).toContain('path="universidade-mx"')
  })
})
