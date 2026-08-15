import type { AdminConvergenceModule } from './types'

export const ADMIN_CONVERGENCE_MODULES = [
  {
    key: 'clientes',
    label: 'Clientes MX',
    route: '/clientes',
    currentStatus: 'partial',
    canonicalTables: [
      'clientes_consultoria',
      'lojas',
      'unidades_cliente_consultoria',
      'usuarios',
      'vinculos_loja',
      'atribuicoes_consultoria',
      'visitas_consultoria',
      'modulos_cliente_consultoria',
      'internal_mx_admin_audit',
    ],
    preservedOperationalRoutes: ['/consultoria/clientes', '/consultoria/clientes/:clientId'],
    base44ReferenceFiles: ['src/pages/ClientesMX.jsx', 'src/pages/ClienteDetalhe.jsx', 'src/pages/NovoCliente.jsx'],
    migrationPolicy:
      'Reutilizar o CRM de consultoria e a estrutura canônica de lojas/usuários, convergindo onboarding, Visão 360, readiness e ativação sem recriar ClientAccount, Store ou UserProfile.',
  },
  {
    key: 'equipe',
    label: 'Equipe MX',
    route: '/equipe',
    currentStatus: 'partial',
    canonicalTables: ['usuarios', 'atribuicoes_consultoria', 'eventos_agenda_consultoria', 'internal_mx_admin_audit'],
    preservedOperationalRoutes: ['/lojas', '/agenda'],
    base44ReferenceFiles: ['src/pages/EquipeMX.jsx', 'src/components/onboarding/ConsultantProfileModal.jsx'],
    migrationPolicy:
      'Manter usuarios como identidade única e acrescentar somente extensão consultiva 1:1, qualificações por produto/encontro e capacidade separada, sem duplicar pessoas.',
  },
  {
    key: 'produtos',
    label: 'Produtos de Consultoria',
    route: '/produtos',
    currentStatus: 'partial',
    canonicalTables: ['programas_visita_consultoria', 'etapas_modelo_visita_consultoria', 'catalogo_indicadores_planejamento'],
    preservedOperationalRoutes: ['/produtos-digitais'],
    base44ReferenceFiles: ['src/pages/ProdutosConsultoria.jsx', 'src/components/onboarding/ProductTimesTab.jsx'],
    migrationPolicy:
      'Usar programas_visita_consultoria como catálogo canônico e complementar versionamento, direitos, módulos, jornada-modelo e pacote de indicadores, preservando Produtos Digitais em rota própria.',
  },
  {
    key: 'indicadores',
    label: 'Indicadores e Parâmetros',
    route: '/indicadores',
    currentStatus: 'partial',
    canonicalTables: [
      'catalogo_indicadores_planejamento',
      'valores_indicadores_planejamento',
      'historico_valores_indicadores_planejamento',
      'catalogo_metricas_consultoria',
      'conjuntos_parametros_consultoria',
      'valores_parametros_consultoria',
    ],
    preservedOperationalRoutes: ['/plano-estrategico'],
    base44ReferenceFiles: ['src/pages/Indicadores.jsx', 'src/components/strategic/CatalogTab.jsx'],
    migrationPolicy:
      'Preservar catalogo_indicadores_planejamento como catálogo mestre e adicionar pacote versionado por produto, dependências e snapshots sem replicar IndicatorDefinition.',
  },
  {
    key: 'planos-acao',
    label: 'Planos de Ação',
    route: '/planos-acao',
    currentStatus: 'partial',
    canonicalTables: ['planos_acao', 'itens_plano_acao', 'historico_planos_acao', 'evidencias_planos_acao'],
    preservedOperationalRoutes: ['/plano-acao'],
    base44ReferenceFiles: [
      'src/pages/PlanosAcao.jsx',
      'src/pages/PlanoAcao.jsx',
      'src/components/actionplans/ClientActionPlanKanban.jsx',
    ],
    migrationPolicy:
      'Manter planos_acao como instância do cliente e adicionar biblioteca/versionamento de Planos Padrão, aplicação idempotente, snapshot de itens e Kanban compartilhado com o Dono.',
  },
  {
    key: 'consultoria-mx',
    label: 'Consultoria MX',
    route: '/consultoria-mx',
    currentStatus: 'missing',
    canonicalTables: ['programas_visita_consultoria', 'etapas_modelo_visita_consultoria', 'internal_mx_admin_audit'],
    preservedOperationalRoutes: ['/consultoria', '/consultoria/clientes'],
    base44ReferenceFiles: ['src/pages/ConsultoriaMX.jsx', 'src/components/consultingMx/EncounterEditor.jsx'],
    migrationPolicy:
      'Criar apenas a camada versionada de metodologia/conteúdo padrão ligada ao produto e encontro canônicos; a execução real continua exclusivamente em visitas_consultoria e demais tabelas operacionais.',
  },
] as const satisfies readonly AdminConvergenceModule[]

export function getAdminConvergenceModule(route: string) {
  return ADMIN_CONVERGENCE_MODULES.find((module) => module.route === route)
}
