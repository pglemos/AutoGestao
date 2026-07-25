export type InternalMxTemplateKind = 'dashboard' | 'list' | 'detail' | 'workspace' | 'settings'

export type InternalMxPageMeta = {
  key: string
  title: string
  description: string
  group: string
  managerLayout: boolean
  template: InternalMxTemplateKind
  match: (pathname: string) => boolean
}

const normalizePath = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

const exact = (path: string) => (pathname: string) => normalizePath(pathname) === path
const oneOf = (...paths: string[]) => (pathname: string) => paths.includes(normalizePath(pathname))
const prefix = (path: string) => (pathname: string) => {
  const normalizedPath = normalizePath(pathname)
  return normalizedPath === path || normalizedPath.startsWith(`${path}/`)
}
const child = (path: string) => (pathname: string) => normalizePath(pathname).startsWith(`${path}/`)

export const INTERNAL_MX_PAGE_REGISTRY: readonly InternalMxPageMeta[] = [
  { key: 'painel', title: 'Painel Geral', description: 'Visão consolidada da rede, metas, disciplina operacional e prioridades.', group: 'Rede e Gestão', managerLayout: true, template: 'dashboard', match: exact('/painel') },
  { key: 'lojas', title: 'Lojas', description: 'Governança das unidades, acessos, metas e acompanhamento operacional.', group: 'Rede e Gestão', managerLayout: true, template: 'list', match: exact('/lojas') },
  { key: 'loja-detalhe', title: 'Detalhes da loja', description: 'Performance, metas, equipe e acompanhamento operacional da unidade.', group: 'Rede e Gestão', managerLayout: true, template: 'detail', match: child('/lojas') },
  { key: 'consultoria-clientes', title: 'Clientes da Consultoria', description: 'Carteira consultiva, evolução, cadência e entregas por cliente.', group: 'Rede e Gestão', managerLayout: true, template: 'list', match: exact('/consultoria/clientes') },
  { key: 'consultoria-cliente-detalhe', title: 'Detalhes da Consultoria', description: 'Visitas, estratégia, plano de ação, indicadores e arquivos do cliente.', group: 'Rede e Gestão', managerLayout: true, template: 'detail', match: child('/consultoria/clientes') },
  { key: 'consultoria', title: 'Consultoria', description: 'Operação consultiva da MX, programas, indicadores e entregas.', group: 'Rede e Gestão', managerLayout: true, template: 'list', match: prefix('/consultoria') },
  { key: 'agenda', title: 'Agenda Central MX', description: 'Compromissos, visitas, reuniões e sincronizações da consultoria.', group: 'Rede e Gestão', managerLayout: true, template: 'workspace', match: exact('/agenda') },
  { key: 'simulacao', title: 'Simulação de Perfis', description: 'Validação segura da experiência de Vendedor, Gerente e Dono.', group: 'Simulação', managerLayout: true, template: 'dashboard', match: prefix('/simulacao') },
  { key: 'ranking', title: 'Ranking', description: 'Classificação, evolução e leitura comparativa de performance.', group: 'Rotina e Conteúdo', managerLayout: true, template: 'dashboard', match: oneOf('/ranking', '/classificacao', '/gerente/ranking') },
  { key: 'devolutivas', title: 'Devolutivas e PDI', description: 'Feedbacks, planos de desenvolvimento e acompanhamento de ações.', group: 'Rotina e Conteúdo', managerLayout: true, template: 'list', match: oneOf('/devolutivas', '/pdi') },
  { key: 'treinamentos', title: 'Desenvolvimento', description: 'Conteúdos, trilhas, aulas e evolução da Universidade MX.', group: 'Rotina e Conteúdo', managerLayout: true, template: 'list', match: exact('/treinamentos') },
  { key: 'produtos', title: 'Produtos Digitais', description: 'Catálogo e governança dos produtos digitais da MX.', group: 'Rotina e Conteúdo', managerLayout: true, template: 'list', match: exact('/produtos') },
  { key: 'notificacoes', title: 'Notificações', description: 'Comunicações operacionais, alertas e registros de leitura.', group: 'Rotina e Conteúdo', managerLayout: true, template: 'list', match: exact('/notificacoes') },
  { key: 'relatorio-matinal', title: 'Relatório Matinal', description: 'Consolidação diária dos indicadores e pendências da rede.', group: 'Relatórios e Diagnóstico', managerLayout: true, template: 'dashboard', match: exact('/relatorio-matinal') },
  { key: 'performance-vendas', title: 'Performance de Vendas', description: 'Indicadores comerciais, conversões, projeções e comparativos.', group: 'Relatórios e Diagnóstico', managerLayout: true, template: 'dashboard', match: exact('/relatorios/performance-vendas') },
  { key: 'performance-vendedor', title: 'Performance por Vendedor', description: 'Leitura individual e comparativa de execução comercial.', group: 'Relatórios e Diagnóstico', managerLayout: true, template: 'detail', match: exact('/relatorios/performance-vendedor') },
  { key: 'auditoria', title: 'Diagnóstico Operacional', description: 'Saúde operacional, inconsistências, evidências e ações corretivas.', group: 'Relatórios e Diagnóstico', managerLayout: true, template: 'workspace', match: exact('/auditoria') },
  { key: 'config-remuneracao', title: 'Remuneração', description: 'Planos, regras e parâmetros de remuneração por perfil e unidade.', group: 'Configurações', managerLayout: true, template: 'settings', match: exact('/configuracoes/remuneracao') },
  { key: 'config-operacional', title: 'Configuração Operacional', description: 'Parâmetros de operação, metas, regras e comportamentos do sistema.', group: 'Configurações', managerLayout: true, template: 'settings', match: exact('/configuracoes/operacional') },
  { key: 'config-pmr', title: 'Parâmetros PMR', description: 'Modelos, perguntas, pesos e parâmetros da metodologia consultiva.', group: 'Configurações', managerLayout: true, template: 'settings', match: exact('/configuracoes/consultoria-pmr') },
  { key: 'reprocessamento', title: 'Reprocessamento', description: 'Execuções controladas, histórico, auditoria e recuperação operacional.', group: 'Configurações', managerLayout: true, template: 'workspace', match: exact('/configuracoes/reprocessamento') },
  { key: 'configuracoes', title: 'Configurações', description: 'Preferências, usuários, permissões e parâmetros gerais.', group: 'Configurações', managerLayout: true, template: 'settings', match: prefix('/configuracoes') },
  { key: 'perfil', title: 'Meu Perfil', description: 'Dados pessoais, preferências e segurança da conta.', group: 'Conta', managerLayout: true, template: 'settings', match: exact('/perfil') },
] as const

export function getInternalMxPageMeta(pathname: string): InternalMxPageMeta {
  return INTERNAL_MX_PAGE_REGISTRY.find((page) => page.match(pathname)) ?? {
    key: 'internal-mx',
    title: 'MX Performance',
    description: 'Módulo interno de gestão e consultoria MX.',
    group: 'Módulo Interno',
    managerLayout: false,
    template: 'dashboard',
    match: () => true,
  }
}
