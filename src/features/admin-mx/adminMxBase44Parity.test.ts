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
