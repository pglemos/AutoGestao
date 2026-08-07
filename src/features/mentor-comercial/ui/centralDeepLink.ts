/**
 * Deep link "Abrir cliente" pela Central de Execução (TASK 32 / C09).
 *
 * Permite navegação direta da Central para a oportunidade na Carteira de Clientes.
 *
 * Rota Canônica: `/carteira-clientes`
 * Aliases suportados (sem quebrar):
 * - `/carteira`
 * - `/vendedor/carteira`
 * - `/mentor-comercial`
 * - `/vendedor/mentor-comercial`
 *
 * O link sobrevive a reload via query params (`clientId` e `opportunityId`).
 */

/**
 * Rota canônica padrão para a carteira de clientes.
 */
export const CANONICAL_CARTEIRA_ROUTE = '/carteira-clientes'

/**
 * Aliases de rotas legadas e alternativas da carteira que são mantidas para compatibilidade.
 */
export const CARTEIRA_ROUTE_ALIASES = [
  '/carteira-clientes',
  '/carteira',
  '/vendedor/carteira',
  '/mentor-comercial',
  '/vendedor/mentor-comercial',
] as const

export type CarteiraRouteAlias = (typeof CARTEIRA_ROUTE_ALIASES)[number]

/**
 * Parâmetros de entrada para geração do Deep Link da Central.
 */
export interface BuildCentralDeepLinkOptions {
  clientId: string
  opportunityId: string
  tab?: string
  baseRoute?: string
  extraParams?: Record<string, string>
}

/**
 * Resultado do parse de um Deep Link da Central para a Carteira.
 */
export interface CentralDeepLinkParseResult {
  success: boolean
  route: string
  clientId: string | null
  opportunityId: string | null
  tab: string | null
  error: string | null
  isCanonical: boolean
  isValidRoute: boolean
  rawParams: Record<string, string>
}

/**
 * Verifica se um determinado caminho/rota pertence às rotas aceitas da Carteira (canônica ou aliases).
 */
export function isSupportedCarteiraRoute(pathOrUrl: string): boolean {
  const pathname = extractPathname(pathOrUrl)
  const normalizedPath = normalizePathname(pathname)
  return (CARTEIRA_ROUTE_ALIASES as readonly string[]).includes(normalizedPath)
}

/**
 * Monta o URL/caminho de Deep Link para abrir o cliente/oportunidade na Carteira de Clientes.
 *
 * Suporta chamada como objeto ou como parâmetros posicionais:
 * `buildCentralDeepLink({ clientId, opportunityId, tab })`
 * `buildCentralDeepLink(clientId, opportunityId, { tab })`
 */
export function buildCentralDeepLink(
  clientIdOrOptions: string | BuildCentralDeepLinkOptions,
  opportunityIdParam?: string,
  optionsParam?: Partial<BuildCentralDeepLinkOptions>
): string {
  let clientId: string
  let opportunityId: string
  let tab: string | undefined
  let baseRoute: string = CANONICAL_CARTEIRA_ROUTE
  let extraParams: Record<string, string> | undefined

  if (typeof clientIdOrOptions === 'object' && clientIdOrOptions !== null) {
    clientId = clientIdOrOptions.clientId
    opportunityId = clientIdOrOptions.opportunityId
    tab = clientIdOrOptions.tab
    if (clientIdOrOptions.baseRoute) {
      baseRoute = clientIdOrOptions.baseRoute
    }
    extraParams = clientIdOrOptions.extraParams
  } else {
    clientId = clientIdOrOptions ?? ''
    opportunityId = opportunityIdParam ?? ''
    if (optionsParam) {
      tab = optionsParam.tab
      if (optionsParam.baseRoute) {
        baseRoute = optionsParam.baseRoute
      }
      extraParams = optionsParam.extraParams
    }
  }

  const cleanClientId = clientId.trim()
  const cleanOpportunityId = opportunityId.trim()

  if (!cleanClientId || !cleanOpportunityId) {
    throw new Error('buildCentralDeepLink exige clientId e opportunityId válidos.')
  }

  const targetRoute = normalizePathname(baseRoute) || CANONICAL_CARTEIRA_ROUTE

  const searchParams = new URLSearchParams()
  searchParams.set('clientId', cleanClientId)
  searchParams.set('opportunityId', cleanOpportunityId)

  if (tab && tab.trim()) {
    searchParams.set('tab', tab.trim())
  }

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== null && key !== 'clientId' && key !== 'opportunityId' && key !== 'tab') {
        searchParams.set(key, String(value))
      }
    }
  }

  return `${targetRoute}?${searchParams.toString()}`
}

/**
 * Realiza o parse de uma URL, caminho ou objeto Location para extrair os IDs do Deep Link.
 *
 * Tratamento explícito de IDs ausentes e compatibilidade com aliases de rotas.
 */
export function parseCentralDeepLink(
  input: string | URL | Location | URLSearchParams
): CentralDeepLinkParseResult {
  let pathname = ''
  let searchParams: URLSearchParams

  if (typeof input === 'string') {
    pathname = extractPathname(input)
    const queryString = extractQueryString(input)
    searchParams = new URLSearchParams(queryString)
  } else if (input instanceof URLSearchParams) {
    pathname = CANONICAL_CARTEIRA_ROUTE
    searchParams = input
  } else if (typeof input === 'object' && input !== null && 'search' in input) {
    pathname = (input as Location | URL).pathname || CANONICAL_CARTEIRA_ROUTE
    searchParams = new URLSearchParams((input as Location | URL).search || '')
  } else {
    return {
      success: false,
      route: '',
      clientId: null,
      opportunityId: null,
      tab: null,
      error: 'Entrada inválida para parse de deep link.',
      isCanonical: false,
      isValidRoute: false,
      rawParams: {},
    }
  }

  const normalizedPath = normalizePathname(pathname) || CANONICAL_CARTEIRA_ROUTE
  const isValidRoute = (CARTEIRA_ROUTE_ALIASES as readonly string[]).includes(normalizedPath)
  const isCanonical = normalizedPath === CANONICAL_CARTEIRA_ROUTE

  const rawParams: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    rawParams[key] = value
  })

  const clientId =
    searchParams.get('clientId')?.trim() ||
    searchParams.get('clienteId')?.trim() ||
    searchParams.get('cliente_id')?.trim() ||
    null

  const opportunityId =
    searchParams.get('opportunityId')?.trim() ||
    searchParams.get('oportunidadeId')?.trim() ||
    searchParams.get('oportunidade_id')?.trim() ||
    null

  const tab = searchParams.get('tab')?.trim() || null

  if (!isValidRoute) {
    return {
      success: false,
      route: normalizedPath,
      clientId,
      opportunityId,
      tab,
      error: `Rota "${normalizedPath}" não é uma rota válida da carteira de clientes.`,
      isCanonical,
      isValidRoute: false,
      rawParams,
    }
  }

  if (!clientId && !opportunityId) {
    return {
      success: false,
      route: normalizedPath,
      clientId: null,
      opportunityId: null,
      tab,
      error: 'Parâmetros ausentes: clientId e opportunityId não foram informados.',
      isCanonical,
      isValidRoute,
      rawParams,
    }
  }

  if (!clientId) {
    return {
      success: false,
      route: normalizedPath,
      clientId: null,
      opportunityId,
      tab,
      error: 'Parâmetro ausente: clientId não foi informado.',
      isCanonical,
      isValidRoute,
      rawParams,
    }
  }

  if (!opportunityId) {
    return {
      success: false,
      route: normalizedPath,
      clientId,
      opportunityId: null,
      tab,
      error: 'Parâmetro ausente: opportunityId não foi informado.',
      isCanonical,
      isValidRoute,
      rawParams,
    }
  }

  return {
    success: true,
    route: normalizedPath,
    clientId,
    opportunityId,
    tab,
    error: null,
    isCanonical,
    isValidRoute,
    rawParams,
  }
}

/**
 * Converte qualquer deep link de alias (ex: `/vendedor/carteira?clientId=c1&opportunityId=o1`)
 * para o formato canônico (`/carteira-clientes?clientId=c1&opportunityId=o1`).
 */
export function normalizeCentralDeepLink(urlOrPath: string): string {
  const parsed = parseCentralDeepLink(urlOrPath)
  if (!parsed.clientId || !parsed.opportunityId) {
    return urlOrPath
  }

  const searchParams = new URLSearchParams()
  searchParams.set('clientId', parsed.clientId)
  searchParams.set('opportunityId', parsed.opportunityId)
  if (parsed.tab) {
    searchParams.set('tab', parsed.tab)
  }

  for (const [key, value] of Object.entries(parsed.rawParams)) {
    if (!['clientId', 'clienteId', 'cliente_id', 'opportunityId', 'oportunidadeId', 'oportunidade_id', 'tab'].includes(key)) {
      searchParams.set(key, value)
    }
  }

  return `${CANONICAL_CARTEIRA_ROUTE}?${searchParams.toString()}`
}

/**
 * Extrai apenas a pathname de uma URL ou caminho relativo.
 */
function extractPathname(input: string): string {
  if (!input) return ''
  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const url = new URL(input)
      return url.pathname
    }
  } catch {
    // ignorar erro de parse e continuar como caminho relativo
  }

  const queryIndex = input.indexOf('?')
  const hashIndex = input.indexOf('#')

  let end = input.length
  if (queryIndex !== -1 && queryIndex < end) end = queryIndex
  if (hashIndex !== -1 && hashIndex < end) end = hashIndex

  return input.substring(0, end)
}

/**
 * Extrai a query string (incluindo ou não o '?') de uma URL ou caminho.
 */
function extractQueryString(input: string): string {
  if (!input) return ''
  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const url = new URL(input)
      return url.search
    }
  } catch {
    // ignorar erro de parse
  }

  const queryIndex = input.indexOf('?')
  if (queryIndex === -1) return ''

  const hashIndex = input.indexOf('#', queryIndex)
  if (hashIndex !== -1) {
    return input.substring(queryIndex, hashIndex)
  }

  return input.substring(queryIndex)
}

/**
 * Normaliza barras no pathname para comparação padrão.
 */
function normalizePathname(pathname: string): string {
  if (!pathname) return ''
  if (pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}
