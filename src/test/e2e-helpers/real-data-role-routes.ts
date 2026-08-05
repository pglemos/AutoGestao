import type { UserRole } from '@/types/database'

export const MX_STORE_SLUG = 'mx-consultoria'

const SELLER_ROUTES = [
  '/home', '/meu-dia', '/minha-remuneracao', '/lancamento-diario', '/fechamento-diario',
  '/terminal-mx', '/carteira-clientes', '/carteira', '/vendedor/carteira', '/mentor-comercial',
  '/vendedor/mentor-comercial', '/meu-funil', '/minha-meta', '/vendedor/minha-meta',
  '/funil-comercial', '/central-execucao', '/central-de-execucao', '/rotina-do-dia',
  '/vendedor/rotina-do-dia', '/relatorios-vendedor', '/relatorios', '/feedbacks', '/consultor-ia',
  '/ajuda', '/ranking', '/classificacao', '/feedback', '/funil', '/vendedor/funil',
  '/vendedor/meu-funil', '/vendedor/feedback', '/vendedor/devolutivas',
  '/vendedor/desenvolvimento', '/vendedor/treinamentos', '/vendedor/universidade-mx',
  '/vendedor/terminal-mx', '/vendedor/configuracoes', '/treinamentos', '/universidade-mx',
  '/desenvolvimento', '/devolutivas', '/notificacoes', '/perfil', '/meu-perfil',
  '/meu-perfil-vendedor', '/vendedor/perfil', '/pdi', '/configuracoes',
  `/lojas/${MX_STORE_SLUG}/consultor-ia`,
] as const

// `/plano-acao` saiu daqui: é do dono e dos perfis internos, não do gerente.
const SHARED_LEADERSHIP_ROUTES = [
  '/settings', '/fechamento-diario', '/relatorio-matinal',
  '/relatorios/performance-vendas', '/relatorios/performance-vendedor', '/ranking', '/classificacao',
  '/feedback', '/vendedor/treinamentos', '/vendedor/universidade-mx', '/treinamentos',
  '/universidade-mx', '/devolutivas', '/notificacoes', '/perfil', '/meu-perfil', '/pdi',
  '/produtos', '/configuracoes', '/configuracoes/remuneracao', '/liberacao-fechamento',
] as const

const STORE_LEADERSHIP_ROUTES = [
  `/lojas/${MX_STORE_SLUG}`,
  `/lojas/${MX_STORE_SLUG}/equipe`,
  `/lojas/${MX_STORE_SLUG}/consultor-ia`,
] as const

const MANAGER_ROUTES = [
  ...SHARED_LEADERSHIP_ROUTES, ...STORE_LEADERSHIP_ROUTES, '/team', '/equipe', '/home', '/rotina',
  '/gerente/fechamento-diario', '/gerente/rotina-equipe', '/gerente/minha-equipe',
  '/gerente/meta-loja', '/gerente/mentor', '/gerente/feedbacks-pdis', '/gerente/ranking',
  '/gerente/universidade-mx', '/funil-vendas', '/metas', '/falar-consultor', '/auditoria',
] as const

const OWNER_ROUTES = [
  ...SHARED_LEADERSHIP_ROUTES, '/plano-acao', '/rotina', '/decisoes',
  '/plano-estrategico', '/consultoria', '/departamentos',
  '/departamentos/comercial', '/departamentos/marketing',
  '/departamentos/produto-e-estoque', '/departamentos/pessoas-rh',
  '/departamentos/financeiro', '/departamentos/operacoes', '/mercado',
  '/home', '/gerente/fechamento-diario',
  '/gerente/minha-equipe', '/gerente/meta-loja', '/gerente/mentor', '/gerente/feedbacks-pdis',
  '/gerente/ranking', '/gerente/universidade-mx', '/funil-vendas', '/metas', '/falar-consultor',
  '/organograma', '/banco-talentos',
] as const

const INTERNAL_SHARED_ROUTES = [
  ...SHARED_LEADERSHIP_ROUTES, ...STORE_LEADERSHIP_ROUTES, '/plano-acao', '/painel', '/simulacao', '/simulacao/vendedor',
  '/simulacao/gerente', '/simulacao/dono', '/lojas', '/agenda', '/consultoria',
  '/consultoria/clientes', '/configuracoes/operacional', '/configuracoes/consultoria-pmr',
  '/configuracoes/reprocessamento', '/rotina', '/gerente/fechamento-diario',
  '/gerente/rotina-equipe', '/gerente/minha-equipe', '/gerente/meta-loja', '/gerente/mentor',
  '/gerente/feedbacks-pdis', '/gerente/ranking', '/gerente/universidade-mx', '/auditoria',
  '/organograma', '/banco-talentos',
] as const

export const REAL_DATA_ROUTES_BY_ROLE = {
  vendedor: SELLER_ROUTES,
  gerente: MANAGER_ROUTES,
  dono: OWNER_ROUTES,
  administrador_geral: [...INTERNAL_SHARED_ROUTES, '/team', '/equipe'],
  administrador_mx: [...INTERNAL_SHARED_ROUTES, '/team', '/equipe'],
  consultor_mx: INTERNAL_SHARED_ROUTES,
} as const satisfies Record<UserRole, readonly string[]>

export function routesForRole(role: UserRole) {
  return REAL_DATA_ROUTES_BY_ROLE[role]
}
