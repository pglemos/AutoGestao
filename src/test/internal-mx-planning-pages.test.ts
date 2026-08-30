import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const read = (path: string) => readFileSync(path, 'utf8')

const pages = {
  strategic: 'src/features/internal-mx-planning/InternalStrategicPlanPage.tsx',
  action: 'src/features/internal-mx-planning/InternalActionPlanPage.tsx',
  consulting: 'src/features/internal-mx-planning/InternalConsultingPage.tsx',
}

describe('páginas de planejamento do módulo interno MX', () => {
  test('usa a fundação compartilhada sem importar páginas ou provider do Dono', () => {
    for (const page of Object.values(pages)) {
      const source = read(page)
      expect(source).not.toContain('@/pages/owner/')
      expect(source).not.toContain('OwnerProvider')
    }
    expect(read(pages.strategic)).toContain('InternalMxPlanningShell')
    expect(read(pages.action)).toContain('InternalMxPlanningShell')
    expect(read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')).toContain('PlanningWorkspaceProvider')
  })

  test('monta as três superfícies funcionais canônicas', () => {
    expect(read(pages.strategic)).toContain('StrategicPlanWorkspace')
    expect(read(pages.action)).toContain('ActionPlanWorkspace')
    expect(read(pages.consulting)).toContain('AdminConsultingOverviewPage')
  })

  test('abre o plano de ação administrativo no contexto do cliente', () => {
    const actionPage = read(pages.action)
    expect(actionPage).toContain("label: 'Gestão global'")
    expect(actionPage).toContain("fallback: isClientRoute ? 'cliente' : 'biblioteca'")
    expect(actionPage).toContain("location.pathname.startsWith('/clientes/')")
  })

  test('abre Plano Estratégico pelos planos do cliente e honra mode=catalogo', () => {
    const strategicPage = read(pages.strategic)
    const indicatorsPage = read('src/features/admin-mx/AdminIndicadoresPage.tsx')

    expect(strategicPage).not.toContain("label: 'Gestão global'")
    expect(strategicPage).toContain('fetchCurrentCycle')
    expect(strategicPage).toContain('resolveStrategicCatalogTab')
    expect(strategicPage).toContain("return 'planos'")
    expect(strategicPage).toContain('<AdminIndicadoresPage initialTab="planos" />')
    expect(strategicPage).toContain('fetchConsultingClientIdBySlug')
    expect(strategicPage).toContain('<AdminIndicadoresPage initialTab={catalogTab} />')
    expect(strategicPage).toContain('<AdminStrategicPlanEditor cycleId={cycleId} readOnly={preview} />')
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).toContain("label: 'Metas'")
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).toContain("label: 'Revisão Completa'")
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).toContain('embedded = false')
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).toContain('Parâmetros do Cliente')
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).toContain('Adicionar Indicador')
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).toContain('Revisar Cálculos')
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).toContain('Concluir Cadastro')
    expect(read('src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx')).not.toContain('Enviar para validação')
    expect(read('src/features/admin-mx/indicadores/indicatorFormulas.ts')).toContain('decideStrategicCellInput')
    expect(read('src/features/admin-mx/components/MetasRealizadosTab.tsx')).toContain('decideStrategicCellInput')
    expect(read('src/features/admin-mx/components/MetasRealizadosTab.tsx')).toContain('Baixar Tabela Modelo')
    expect(read('src/features/admin-mx/components/MetasRealizadosTab.tsx')).toContain('onNavigateToHistory')
    expect(read('src/features/admin-mx/components/MetasRealizadosTab.tsx')).toContain('>Histórico</Button>')
    expect(read('src/features/admin-mx/components/MetasRealizadosTab.tsx')).toContain('>Parâmetros</Button>')
    expect(read('src/features/admin-mx/AdminClienteDetalhePage.tsx')).toContain("setPlanningTab('estrategico')")
    expect(read('src/features/admin-mx/AdminClienteDetalhePage.tsx')).toContain("setTab('planejamento')")
    expect(read('src/features/admin-mx/AdminClienteDetalhePage.tsx')).not.toContain('openCurrentStrategicPlanHref')
    expect(read('src/features/admin-mx/planos-acao/ClientActionPlanWizard.tsx')).not.toContain('Mostrando o catálogo completo')
    expect(read('src/features/admin-mx/planos-acao/ClientActionPlanWizard.tsx')).toContain('indicatorsForDepartment')
    expect(read('src/features/admin-mx/clientes/ClientPlanningContextPanel.tsx')).toContain('<AdminStrategicPlanEditor cycleId={cycleId} embedded onCycleChange={props.onCycleChange} />')
    expect(read('src/features/admin-mx/produtos/ProductStrategicPlanTab.tsx')).toContain('não use Produtos como plano da empresa')
    expect(indicatorsPage).toContain('Criar Demo')
    expect(indicatorsPage).toContain('Criar Indicador')
    expect(indicatorsPage).toContain('Criar Plano Estratégico')
    expect(read('src/features/admin-mx/indicadores/StrategicPlanAdminPanels.tsx')).toContain('Planos Estratégicos por Cliente')
    expect(read('src/features/admin-mx/indicadores/StrategicPlanAdminPanels.tsx')).toContain('Crie e gerencie os exercícios estratégicos de cada cliente.')
    expect(indicatorsPage).not.toContain("tab === 'planos' ? (\n                <><Button variant=\"outline\" onClick={() => void createDemoPlan()}")
    expect(indicatorsPage).toContain('Arquivar')
    expect(indicatorsPage).toContain('buildAdminStrategicPlanHref')
    expect(indicatorsPage).toContain('clientSlug: row.clientSlug')
    expect(indicatorsPage).not.toContain('new URLSearchParams({ storeId: row.primaryStoreId')
    expect(indicatorsPage).not.toContain('if (client?.primaryStoreId) openStrategicPlan')
    expect(indicatorsPage).not.toContain("tab === 'metas'")
  })

  test('monta o overview administrativo no modo operação sem duplicar shell de planejamento', () => {
    const consultingPage = read(pages.consulting)
    expect(consultingPage).toContain('<AdminConsultingOverviewPage />')
    expect(consultingPage).not.toContain('ConsultingJourneyWorkspace')
    expect(consultingPage).not.toContain('InternalMxPlanningShell')
    expect(consultingPage).not.toContain('className="-mx-4 lg:-mx-6"')
  })

  test('mantém overlays nos próprios workspaces acima da navegação', () => {
    const meetingDialog = read('src/features/consulting-journey/components/ConsultingMeetingDialog.tsx')
    expect(meetingDialog).toContain('<DialogContent')
    expect(meetingDialog).toContain('<DialogBody')
    expect(meetingDialog).toContain('mx-overlay-close')
    expect(read('src/features/action-plan/components/DeleteActionDialog.tsx')).toContain('Dialog')
    expect(read('src/features/strategic-plan/StrategicPlanWorkspace.tsx')).not.toContain('fixed inset-0 z-[var(--mx-z-overlay)]')
  })

  test('mantém seleção global de loja e realtime compartilhado', () => {
    const shell = read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')
    const realtime = read('src/features/planning-workspace/usePlanningRealtime.ts')
    expect(shell).toContain('useStores')
    expect(shell).toContain("params.set('storeId'")
    expect(shell).toContain("navigate({ pathname: location.pathname")
    expect(shell).toContain('{ replace: true }')
    expect(realtime).toContain('strategic:')
    expect(realtime).toContain('action:')
    expect(realtime).toContain('consulting:')
  })

  // Decisão de produto (2026-08-05): o Plano de Ação saiu do módulo do gerente.
  // A rota atende apenas dono e perfis internos MX; gerente e vendedor caem em
  // ForbiddenRoute, e `ScopedActionPlanPage` foi removido por ficar sem uso.
  test('bloqueia gerente e vendedor na rota de plano de ação', () => {
    const app = read('src/App.tsx')
    const planRoute = app
      .split('\n')
      .find((line) => line.includes('path="plano-acao"')) || ''

    expect(planRoute).toContain('gerente={<ForbiddenRoute />}')
    expect(planRoute).toContain('vendedor={<ForbiddenRoute />}')
    expect(planRoute).toContain('dono={<OwnerPlanoDeAcao />}')
    expect(planRoute).toContain('admin={<InternalActionPlanPage />}')
    expect(app).not.toContain('ScopedActionPlanPage')
  })
})
