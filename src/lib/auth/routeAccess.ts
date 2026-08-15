import type { UserRole } from '@/types/database'
import { USER_ROLES } from './roles'
import { CONFIGURATION_ROLES, PDI_PRINT_ROLES, PRODUCT_ROLES, RANKING_ROLES, type Capability, hasCapability } from './capabilities'

type RouteRule = {
  pattern: string
  roles?: readonly UserRole[]
  capability?: Capability
}

const INTERNAL_ROLES = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const satisfies readonly UserRole[]
const MANAGEMENT_ROLES = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente'] as const satisfies readonly UserRole[]
const INTERNAL_AND_OWNER = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono'] as const satisfies readonly UserRole[]
const INTERNAL_AND_LEADERS = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente'] as const satisfies readonly UserRole[]
const INTERNAL_AND_MANAGER = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'gerente'] as const satisfies readonly UserRole[]
const INTERNAL_MANAGER_AND_OWNER = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'gerente', 'dono'] as const satisfies readonly UserRole[]
const STORE_CONSULTOR_ROLES = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'gerente', 'vendedor', 'dono'] as const satisfies readonly UserRole[]
const LEGACY_OWNER_WORKSPACE_SEGMENTS = new Set([
  'rotina',
  'decisoes',
  'plano-estrategico',
  'plano-acao',
  'consultoria',
  'departamentos',
  'mercado',
  'universidade',
  'consultor',
])

export const ROUTE_ACCESS_RULES = [
  // Navegação executiva canônica. O roteador converte estes caminhos legados
  // para as rotas raiz, mas o shell precisa autorizá-los antes de renderizar
  // seus itens de menu.
  { pattern: '/dono/*', roles: ['dono'] },
  // Gerente fora: Plano de Ação é do dono e dos perfis internos MX.
  { pattern: '/plano-acao', roles: INTERNAL_AND_OWNER },
  { pattern: '/plano-estrategico', roles: [...INTERNAL_ROLES, 'dono'] },
  { pattern: '/decisoes', roles: ['dono'] },
  { pattern: '/departamentos', roles: ['dono'] },
  { pattern: '/departamentos/*', roles: ['dono'] },
  { pattern: '/mercado', roles: ['dono'] },
  { pattern: '/settings', roles: CONFIGURATION_ROLES, capability: 'view_configurations' },
  { pattern: '/team', capability: 'manage_team' },
  { pattern: '/equipe', capability: 'manage_team' },
  { pattern: '/painel', roles: INTERNAL_ROLES },
  { pattern: '/simulacao', roles: INTERNAL_ROLES, capability: 'simulate_role' },
  { pattern: '/simulacao/*', roles: INTERNAL_ROLES, capability: 'simulate_role' },
  { pattern: '/agenda', roles: INTERNAL_ROLES },
  // Módulo Administrador MX: carteira, jornada, catálogo e planos de ação.
  { pattern: '/clientes', roles: INTERNAL_ROLES },
  { pattern: '/clientes/novo', roles: INTERNAL_ROLES },
  { pattern: '/consultoria-mx', roles: INTERNAL_ROLES },
  { pattern: '/indicadores', roles: INTERNAL_ROLES },
  { pattern: '/planos-acao', roles: INTERNAL_ROLES },
  { pattern: '/consultoria', roles: [...INTERNAL_ROLES, 'dono'] },
  { pattern: '/consultoria/*', roles: INTERNAL_ROLES },
  { pattern: '/configuracoes/consultoria-pmr', roles: INTERNAL_ROLES },
  { pattern: '/configuracoes/reprocessamento', roles: INTERNAL_ROLES },
  { pattern: '/lojas/:storeSlug/consultor-ia', roles: STORE_CONSULTOR_ROLES },
  // Gestão de filiais da matriz: cadastro de rede é da área interna MX, igual a `/lojas`.
  { pattern: '/lojas/:storeSlug/filiais', roles: INTERNAL_ROLES },
  { pattern: '/lojas/:storeSlug', roles: INTERNAL_MANAGER_AND_OWNER },
  { pattern: '/lojas/:storeSlug/*', roles: INTERNAL_MANAGER_AND_OWNER },
  { pattern: '/lojas', roles: ['administrador_geral', 'administrador_mx', 'consultor_mx'] },
  { pattern: '/rotina', roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'gerente', 'dono'] },
  // Dono acumula a gestão comercial quando a loja não tem gerente ativo — e
  // mesmo com gerente mantém acesso de acompanhamento à rotina da equipe.
  // Telas do módulo gerencial: rotas raiz desde 2026-08-05. O prefixo
  // `/gerente/` foi removido do produto — não há regra curinga para ele.
  { pattern: '/rotina-equipe', roles: MANAGEMENT_ROLES },
  { pattern: '/minha-equipe', roles: MANAGEMENT_ROLES },
  { pattern: '/meta-loja', roles: MANAGEMENT_ROLES },
  { pattern: '/mentor', roles: MANAGEMENT_ROLES },
  { pattern: '/feedbacks-pdis', roles: MANAGEMENT_ROLES },
  { pattern: '/gerente/*', roles: MANAGEMENT_ROLES },
  { pattern: '/configuracoes/operacional', roles: INTERNAL_ROLES },
  { pattern: '/relatorio-matinal', roles: INTERNAL_AND_LEADERS },
  { pattern: '/relatorios/performance-vendas', roles: INTERNAL_AND_LEADERS },
  { pattern: '/relatorios/performance-vendedor', roles: MANAGEMENT_ROLES },
  { pattern: '/auditoria', roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'gerente'] },
  { pattern: '/home', roles: ['vendedor', 'gerente', 'dono'] },
  // Consolidado das lojas do próprio dono (matriz + filiais).
  { pattern: '/minhas-lojas', roles: ['dono'] },
  { pattern: '/meu-dia', roles: ['vendedor'] },
  { pattern: '/minha-remuneracao', roles: ['vendedor'] },
  { pattern: '/lancamento-diario', roles: ['vendedor'] },
  { pattern: '/fechamento-diario', roles: USER_ROLES },
  { pattern: '/terminal-mx', roles: ['vendedor'] },
  { pattern: '/carteira-clientes', roles: USER_ROLES },
  { pattern: '/carteira', roles: USER_ROLES },
  { pattern: '/vendedor/carteira', roles: USER_ROLES },
  { pattern: '/mentor-comercial', roles: USER_ROLES },
  { pattern: '/vendedor/mentor-comercial', roles: USER_ROLES },
  { pattern: '/meu-funil', roles: ['vendedor'] },
  { pattern: '/minha-meta', roles: ['vendedor'] },
  { pattern: '/vendedor/minha-meta', roles: ['vendedor'] },
  { pattern: '/funil-comercial', roles: ['vendedor'] },
  { pattern: '/central-execucao', roles: ['vendedor'] },
  { pattern: '/rotina-do-dia', roles: ['vendedor'] },
  { pattern: '/vendedor/rotina-do-dia', roles: ['vendedor'] },
  { pattern: '/central-de-execucao', roles: ['vendedor'] },
  { pattern: '/relatorios-vendedor', roles: ['vendedor'] },
  { pattern: '/relatorios', roles: ['vendedor'] },
  { pattern: '/feedbacks', roles: ['vendedor'] },
  { pattern: '/consultor-ia', roles: ['vendedor'] },
  { pattern: '/funil-vendas', roles: ['gerente', 'dono'] },
  // `/metas` só redireciona para `/meta-loja`; libera para todo perfil de
  // gestão para o interno MX não tomar Forbidden antes do redirecionamento.
  { pattern: '/metas', roles: MANAGEMENT_ROLES },
  { pattern: '/falar-consultor', roles: ['gerente', 'dono'] },
  { pattern: '/organograma', roles: INTERNAL_AND_OWNER },
  { pattern: '/banco-talentos', roles: INTERNAL_AND_OWNER },
  { pattern: '/ajuda', roles: ['vendedor'] },
  { pattern: '/ranking', roles: RANKING_ROLES, capability: 'view_ranking' },
  { pattern: '/classificacao', roles: RANKING_ROLES, capability: 'view_ranking' },
  { pattern: '/feedback', roles: USER_ROLES },
  { pattern: '/funil', roles: ['vendedor'] },
  { pattern: '/vendedor/funil', roles: ['vendedor'] },
  { pattern: '/vendedor/meu-funil', roles: ['vendedor'] },
  { pattern: '/vendedor/feedback', roles: ['vendedor'] },
  { pattern: '/vendedor/devolutivas', roles: ['vendedor'] },
  { pattern: '/vendedor/desenvolvimento', roles: ['vendedor'] },
  { pattern: '/vendedor/treinamentos', roles: USER_ROLES },
  { pattern: '/vendedor/universidade-mx', roles: USER_ROLES },
  { pattern: '/vendedor/terminal-mx', roles: ['vendedor'] },
  { pattern: '/vendedor/configuracoes', roles: ['vendedor'] },
  { pattern: '/treinamentos', roles: USER_ROLES },
  { pattern: '/universidade-mx', roles: USER_ROLES },
  { pattern: '/desenvolvimento', roles: ['vendedor'] },
  { pattern: '/devolutivas', roles: USER_ROLES },
  { pattern: '/notificacoes', roles: USER_ROLES },
  { pattern: '/perfil', roles: USER_ROLES },
  { pattern: '/meu-perfil', roles: USER_ROLES },
  { pattern: '/meu-perfil-vendedor', roles: ['vendedor'] },
  { pattern: '/vendedor/perfil', roles: ['vendedor'] },
  { pattern: '/pdi/:id/print', roles: PDI_PRINT_ROLES, capability: 'print_pdi' },
  { pattern: '/pdi', roles: USER_ROLES },
  { pattern: '/produtos', roles: PRODUCT_ROLES, capability: 'view_products' },
  { pattern: '/configuracoes/remuneracao', roles: INTERNAL_AND_LEADERS },
  { pattern: '/configuracoes', roles: USER_ROLES },
  { pattern: '/liberacao-fechamento', roles: INTERNAL_AND_LEADERS },
] as const satisfies readonly RouteRule[]

function normalizePath(pathname: string) {
  const path = pathname.split('?')[0]?.split('#')[0] || '/'
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path
}

function matchesPattern(pathname: string, pattern: string) {
  const pathParts = normalizePath(pathname).split('/').filter(Boolean)
  const patternParts = normalizePath(pattern).split('/').filter(Boolean)

  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index]
    if (patternPart === '*') return true

    const pathPart = pathParts[index]
    if (!pathPart) return false
    if (patternPart.startsWith(':')) continue
    if (patternPart !== pathPart) return false
  }

  return pathParts.length === patternParts.length
}

export function getRouteAccessRule(pathname: string): RouteRule | null {
  return ROUTE_ACCESS_RULES.find(rule => matchesPattern(pathname, rule.pattern)) || null
}

export function canAccessPath(pathname: string, role: UserRole | null | undefined): boolean {
  if (!role) return false
  const normalizedPath = normalizePath(pathname)
  const storePathParts = normalizedPath.split('/').filter(Boolean)
  if (
    storePathParts[0] === 'lojas' &&
    storePathParts.length >= 3 &&
    LEGACY_OWNER_WORKSPACE_SEGMENTS.has(storePathParts[2])
  ) {
    return false
  }
  const rule = getRouteAccessRule(pathname)
  if (!rule) return false
  if (rule.capability) return hasCapability(role, rule.capability)
  return Boolean(rule.roles?.includes(role))
}
