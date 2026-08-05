/**
 * Manifesto executável das superfícies de gestão.
 * Mantém a auditoria estática e a matriz visual olhando para as mesmas rotas.
 */
export const MANAGEMENT_ROLES = [
  'administrador_geral',
  'administrador_mx',
  'consultor_mx',
  'dono',
  'gerente',
]

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']
const allManagementRoles = [...internalRoles, 'dono', 'gerente']

export const managementRouteManifest = [
  { key: 'painel', path: '/painel', source: 'pages/PainelConsultor.tsx', roles: internalRoles, surface: 'dashboard' },
  { key: 'lojas', path: '/lojas', source: 'pages/Lojas.tsx', roles: allManagementRoles, surface: 'stores' },
  { key: 'loja-detalhe', path: '/lojas/sandbox-mx', source: 'pages/DashboardLoja.tsx', roles: allManagementRoles, surface: 'store-dashboard' },
  { key: 'simulacao', path: '/simulacao', source: 'pages/Simulacao.tsx', roles: internalRoles, surface: 'simulation' },
  { key: 'agenda', path: '/agenda', source: 'pages/AgendaAdmin.tsx', roles: internalRoles, surface: 'agenda' },
  { key: 'consultoria', path: '/consultoria', source: 'pages/Consultoria.tsx', roles: internalRoles, surface: 'consulting' },
  { key: 'consultoria-clientes', path: '/consultoria/clientes', source: 'pages/ConsultoriaClientes.tsx', roles: internalRoles, surface: 'consulting-clients' },
  { key: 'consultoria-cliente', path: '/consultoria/clientes/sandbox-mx', source: 'pages/ConsultoriaClienteDetalhe.tsx', roles: internalRoles, surface: 'consulting-client-detail' },
  { key: 'consultoria-visita', path: '/consultoria/clientes/sandbox-mx/visitas/1', source: 'pages/ConsultoriaVisitaExecucao.tsx', roles: internalRoles, surface: 'consulting-visit' },
  { key: 'produtos', path: '/produtos', source: 'pages/ProdutosDigitais.tsx', roles: allManagementRoles, surface: 'products' },
  { key: 'configuracoes', path: '/configuracoes', source: 'pages/Configuracoes.tsx', roles: allManagementRoles, surface: 'settings' },
  { key: 'configuracoes-operacional', path: '/configuracoes/operacional', source: 'pages/OperationalSettings.tsx', roles: internalRoles, surface: 'operational-settings' },
  { key: 'configuracoes-consultoria', path: '/configuracoes/consultoria-pmr', source: 'pages/ConsultoriaParametros.tsx', roles: internalRoles, surface: 'consulting-settings' },
  { key: 'reprocessamento', path: '/configuracoes/reprocessamento', source: 'pages/Reprocessamento.tsx', roles: ['administrador_geral', 'administrador_mx'], surface: 'reprocessing' },
  { key: 'relatorio-matinal', path: '/relatorio-matinal', source: 'pages/MorningReport.tsx', roles: allManagementRoles, surface: 'morning-report' },
  { key: 'performance-vendas', path: '/relatorios/performance-vendas', source: 'pages/SalesPerformance.tsx', roles: allManagementRoles, surface: 'sales-performance' },
  { key: 'performance-vendedor', path: '/relatorios/performance-vendedor', source: 'pages/SellerPerformance.tsx', roles: allManagementRoles, surface: 'seller-performance' },
  { key: 'auditoria', path: '/auditoria', source: 'pages/AiDiagnostics.tsx', roles: internalRoles, surface: 'audit' },
  { key: 'mentor', path: '/mentor', source: 'pages/ManagerMentor.tsx', roles: allManagementRoles, surface: 'mentor' },
  { key: 'desenvolvimento-gerencial', path: '/feedbacks-pdis', source: 'pages/ManagerDevelopment.tsx', roles: allManagementRoles, surface: 'development' },
  { key: 'universidade-gerencial', path: '/universidade-mx', source: 'pages/GerenteTreinamentos.tsx', roles: allManagementRoles, surface: 'training' },
  { key: 'treinamentos-consultor', path: '/treinamentos', source: 'pages/ConsultorTreinamentos.tsx', roles: internalRoles, surface: 'training' },
  { key: 'feedback', path: '/feedback', source: 'pages/GerenteFeedback.tsx', roles: allManagementRoles, surface: 'feedback' },
  { key: 'notificacoes', path: '/notificacoes', source: 'pages/Notificacoes.tsx', roles: allManagementRoles, surface: 'notifications' },
  { key: 'perfil', path: '/perfil', source: 'pages/Perfil.tsx', roles: allManagementRoles, surface: 'profile' },
  { key: 'pdi', path: '/pdi', source: 'pages/GerentePDI.tsx', roles: allManagementRoles, surface: 'pdi' },
  { key: 'pdi-print', path: '/pdi/visual/print', source: 'pages/PDIPrint.tsx', roles: allManagementRoles, surface: 'pdi-print' },
  { key: 'rotina', path: '/rotina', source: 'pages/RotinaGerente.tsx', roles: internalRoles, surface: 'routine' },
  { key: 'fechamento-diario', path: '/fechamento-diario', source: 'features/manager/daily-closing/ManagerDailyClosing.container.tsx', roles: allManagementRoles, surface: 'daily-closing' },
  { key: 'rotina-equipe', path: '/rotina-equipe', source: 'features/manager/team-routine/ManagerTeamRoutine.container.tsx', roles: allManagementRoles, surface: 'team-routine' },
  { key: 'funil-vendas', path: '/funil-vendas', source: 'features/gerente/FunilVendasGerente.tsx', roles: ['dono', 'gerente'], surface: 'sales-funnel' },
  { key: 'falar-consultor', path: '/falar-consultor', source: 'features/dono/FalarConsultorDono.tsx', roles: ['dono', 'gerente'], surface: 'consultant-contact' },
  { key: 'organograma', path: '/organograma', source: 'features/organograma/OrganogramaPage.tsx', roles: allManagementRoles, surface: 'org-chart' },
  { key: 'banco-talentos', path: '/banco-talentos', source: 'features/comportamental/ComportamentalPage.tsx', roles: allManagementRoles, surface: 'talent-bank' },
  { key: 'ranking', path: '/ranking', source: 'pages/Ranking.tsx', roles: allManagementRoles, surface: 'ranking' },
  { key: 'liberacao-fechamento', path: '/liberacao-fechamento', source: 'pages/LiberacaoFechamento.tsx', roles: allManagementRoles, surface: 'closing-release' },
  { key: 'consultor-ia', path: '/lojas/sandbox-mx/consultor-ia', source: 'pages/StoreConsultorIa.tsx', roles: allManagementRoles, surface: 'ai-consultant' },
]

export const managementSourceEntries = [...new Set(managementRouteManifest.map((route) => route.source))]
