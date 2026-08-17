export const INTERNAL_MX_CANONICAL_ALIASES = {
  '/team': '/equipe',
  '/lojas': '/clientes?mode=lojas',
  '/consultoria-mx': '/consultoria?mode=metodologia',
  '/consultoria/clientes': '/consultoria?mode=clientes',
  '/indicadores': '/plano-estrategico?mode=catalogo',
  '/planos-acao': '/plano-acao?mode=biblioteca',
} as const

export type InternalMxLegacyPath = keyof typeof INTERNAL_MX_CANONICAL_ALIASES

function mergeSearch(target: string, currentSearch: string) {
  const [targetPath, targetQuery = ''] = target.split('?')
  const params = new URLSearchParams(currentSearch)
  const canonicalParams = new URLSearchParams(targetQuery)

  canonicalParams.forEach((value, key) => params.set(key, value))
  const search = params.toString()
  return `${targetPath}${search ? `?${search}` : ''}`
}

/**
 * Resolve apenas aliases de entrada dos perfis internos MX.
 *
 * Rotas profundas continuam intactas: `/lojas/:slug` ainda é o workspace da
 * unidade, e `/consultoria/clientes/:slug/...` continua válido para links
 * históricos enquanto as telas de detalhe são migradas para o domínio único.
 */
export function resolveInternalMxCanonicalRoute(pathname: string, search = ''): string | null {
  const normalized = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname
  const target = INTERNAL_MX_CANONICAL_ALIASES[normalized as InternalMxLegacyPath]
  return target ? mergeSearch(target, search) : null
}
