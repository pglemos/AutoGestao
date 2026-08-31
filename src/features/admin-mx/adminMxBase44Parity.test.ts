import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(`./${path}`, import.meta.url), 'utf8')

describe('Admin MX Base44 parity UI contracts', () => {
  test('produtos expandem in-place com ProductDetailPanel e ações inline', () => {
    const card = read('produtos/ConsultingProductCard.tsx')
    const page = read('AdminProdutosConsultoriaPage.tsx')
    expect(card).toContain('<ProductDetailPanel')
    expect(card).toContain("onAction('editar'")
    expect(card).toContain("onAction('duplicar'")
    expect(card).toContain("onAction('nova_versao'")
    expect(card).toContain('!isPublished')
    expect(page).not.toContain('ProductDetailDrawer')
  })

  test('equipe usa grid de cards e perfil com abas Base44', () => {
    const page = read('AdminEquipeMxPage.tsx')
    const card = read('equipe/TeamMemberCard.tsx')
    const modal = read('equipe/ConsultantProfileModal.tsx')
    expect(page).toContain('team-member-grid')
    expect(page).toContain('<TeamMemberCard')
    expect(card).toContain('Clientes ativos')
    expect(card).toContain('Capacidade')
    expect(modal).toContain("label: 'Visão Geral'")
    expect(modal).toContain("label: 'Programas e Especialidades'")
    expect(modal).toContain("label: 'Capacidade'")
    expect(modal).toContain("label: 'Histórico'")
  })

  test('clientes default lista Base44 sem tab strip visível no first paint', () => {
    const page = read('AdminClientesPage.tsx')
    const list = read('clientes/PortfolioBase44ListTab.tsx')
    expect(page).toContain("'lista'")
    expect(page).toContain("'carteira360'")
    expect(page).toContain('<PortfolioBase44ListTab')
    expect(page).toContain('Mais visões')
    expect(page).not.toContain('<TabNav\n          tabs={tabsConfig}\n          activeTab={activeTab}\n          onTabChange={setActiveTab}\n          scrollable\n        />')
    expect(list).toContain('portfolio-base44-list')
    expect(list).toContain('Onboarding')
  })

  test('início default expõe greeting Base44 e ações rápidas coloridas', () => {
    const page = read('AdminDashboardPage.tsx')
    expect(page).toContain('Administrador 👋')
    expect(page).toContain('Clientes Ativos')
    expect(page).toContain('Com Bloqueios')
    expect(page).toContain('Ações Rápidas')
    expect(page).toContain('Novo Cliente MX')
    expect(page).toContain('Validar Cadastros')
    expect(page).toContain('Ver Auditoria')
    expect(page).toContain("view') === 'operacional'")
    expect(page).toContain('Acesso Rápido aos Domínios MX')
  })

  test('produtos default oculta KPI row 7/61/27/53 do first paint', () => {
    const page = read('AdminProdutosConsultoriaPage.tsx')
    expect(page).toContain('showCatalogMetrics')
    expect(page).toContain('{showCatalogMetrics ? (')
    expect(page).not.toContain('detail="Catálogo completo incl. legado oculto" icon={Package} />\n              <MxMetricCard title="Encontros previstos"')
  })

  test('cliente 360 expõe Validar e Ativar, KPIs e Entrega da Consultoria Base44', () => {
    const page = read('AdminClienteDetalhePage.tsx')
    expect(page).toContain('showValidateActivate')
    expect(page).toContain('>Validar e Ativar</Button>')
    expect(page).toContain('title="Usuários"')
    expect(page).toContain('title="Encontros concluídos"')
    expect(page).toContain('title="Progresso da jornada"')
    expect(page).toContain('Entrega da Consultoria')
    expect(page).toContain('Plano de Ação')
    expect(page).toContain('Consultoria e Entregas')
  })

  test('cliente 360 visão geral expõe três blocos Base44', () => {
    const page = read('AdminClienteDetalhePage.tsx')
    expect(page).toContain('title="Informações Gerais"')
    expect(page).toContain('title="Contato Principal"')
    expect(page).toContain('title="Entrega da Consultoria"')
    expect(page).toContain('Início previsto')
    expect(page).not.toContain('Checklist de prontidão')
  })

  test('cliente 360 first paint mostra shell antes do enrich e checklist fica em Implantação', () => {
    const page = read('AdminClienteDetalhePage.tsx')
    const tabs = read('clientes/ClientHealthTabs.tsx')
    const hook = readFileSync(new URL('../../hooks/useConsultingClientBySlug.ts', import.meta.url), 'utf8')
    expect(hook).toContain('setEnriching(true)')
    expect(hook).toContain('setLoading(false)')
    expect(page).toContain('loading && !client')
    expect(page).toContain('enriching')
    expect(page).toContain('displayUnits')
    expect(page).toContain('checks={checks}')
    expect(tabs).toContain('Checklist de prontidão')
  })

  test('plano estratégico por slug hidrata clientId cycleId storeId na URL direta', () => {
    const repo = readFileSync(new URL('../strategic-plan/clientPlanningRepository.ts', import.meta.url), 'utf8')
    const page = readFileSync(new URL('../internal-mx-planning/InternalStrategicPlanPage.tsx', import.meta.url), 'utf8')
    expect(repo).toContain('resolveClientStrategicPlanRoute')
    expect(repo).toContain('primary_store_id')
    expect(page).toContain('resolveClientStrategicPlanRoute(clientSlug, resolveYear)')
    expect(page).toContain("next.set('clientId'")
    expect(page).toContain("next.set('cycleId'")
  })

  test('/universidade legado autoriza perfis internos antes do redirect', () => {
    const routeAccess = readFileSync(new URL('../../lib/auth/routeAccess.ts', import.meta.url), 'utf8')
    const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')
    expect(routeAccess).toContain("{ pattern: '/universidade', roles: USER_ROLES }")
    expect(app).toContain('<Navigate to="/universidade-mx" replace />')
  })

  test('kebab de clientes expõe cinco ações Base44 e extras em Mais', () => {
    const menu = read('clientes/ClientActionsMenu.tsx')
    expect(menu).toContain('BASE44_PRIMARY_ACTIONS')
    expect(menu).toContain("'abrir_visao360'")
    expect(menu).toContain("'adicionar_pessoa'")
    expect(menu).toContain("'gerar_link_autocadastro'")
    expect(menu).toContain("'abrir_jornada'")
    expect(menu).toContain("'abrir_auditoria'")
    expect(menu).toContain('Mais')
    expect(menu).toContain('EXTRA_ACTION_GROUPS')
    expect(menu).not.toContain('const ACTION_GROUPS')
  })

  test('consultoria operação usa lista Base44 em vez de tabela densa', () => {
    const page = read('consultoria/AdminConsultingOverviewPage.tsx')
    expect(page).toContain('Encontro {row.visitNumber}')
    expect(page).not.toContain('Encontros da consultoria')
    expect(page).not.toContain('<Table')
    expect(page).toContain('Acompanhe jornadas, encontros, entregas e evidências')
  })

  test('plano estratégico global força mode=catalogo no first paint', () => {
    const strategic = readFileSync(new URL('../internal-mx-planning/InternalStrategicPlanPage.tsx', import.meta.url), 'utf8')
    const indicators = read('AdminIndicadoresPage.tsx')
    const nav = readFileSync(new URL('../../design-system/internal-mx/internalMxNavigation.tsx', import.meta.url), 'utf8')
    expect(strategic).toContain("next.set('mode', 'catalogo')")
    expect(indicators).toContain("location.pathname === '/plano-estrategico'")
    expect(nav).toContain('/plano-estrategico?mode=catalogo')
  })

  test('universidade admin default usa catálogo Base44, não Academy learner', () => {
    const page = readFileSync(new URL('../../pages/ConsultorTreinamentos.tsx', import.meta.url), 'utf8')
    expect(page).toContain('Total matrículas')
    expect(page).toContain('Todos os níveis')
    expect(page).toContain('Todos os tipos')
    expect(page).toContain('Novo Conteúdo')
    expect(page).toContain("view') === 'editorial'")
    expect(page).toContain('showEditorial')
    expect(page).toContain('<AulasAoVivoSection />')
    expect(page).not.toContain('Curadoria Academy')
    expect(page).not.toContain('Academy MX')
  })

  test('plano estratégico global abre catálogo por padrão', () => {
    const strategic = readFileSync(new URL('../internal-mx-planning/InternalStrategicPlanPage.tsx', import.meta.url), 'utf8')
    const indicators = read('AdminIndicadoresPage.tsx')
    expect(strategic).toContain("return 'catalogo'")
    expect(indicators).toContain("initialTab = 'catalogo'")
  })

  test('universidade admin usa chrome Universidade MX, não Academy MX', () => {
    const page = readFileSync(new URL('../../pages/ConsultorTreinamentos.tsx', import.meta.url), 'utf8')
    expect(page).toContain('Universidade MX')
    expect(page).not.toContain('Academy MX')
    expect(page).not.toContain('Curadoria Academy')
  })

  test('plano de ação do cliente abre kanban Base44 dedicado', () => {
    const route = readFileSync(new URL('../internal-mx-planning/InternalActionPlanPage.tsx', import.meta.url), 'utf8')
    const page = read('clientes/ClientActionPlanPage.tsx')
    const panel = read('clientes/ClientActionPlanContextPanel.tsx')
    const kanban = read('planos-acao/ActionPlanKanban.tsx')
    expect(route).toContain('<ClientActionPlanPage />')
    expect(page).toContain('<ClientActionPlanContextPanel')
    expect(panel).toContain("setPanelView('quadro')")
    expect(panel).toContain('Reconciliar')
    expect(kanban).toContain('Arraste cards para cá')
  })

  test('criação de membro inclui programas habilitados e localização', () => {
    const create = read('equipe/memberCreate.ts')
    const modal = read('equipe/MemberCreateModal.tsx')
    expect(create).toContain('enabled_programs')
    expect(create).toContain('PMR Online')
    expect(create).toContain('capacidade_online')
    expect(modal).toContain('Programas Habilitados')
    expect(modal).toContain('Capacidade online')
    expect(modal).toContain('Cidade')
  })
})
