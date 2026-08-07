/**
 * Channels — Modelo metodológico de canais do Mentor Comercial (TASK 23).
 *
 * Canais oficiais: `Porta`, `Internet`, `Carteira`.
 * `Compartilhado` é um marcador de status multicanal, não um quarto canal.
 *
 * Separação metodológica de responsabilidades:
 * - `channelEntry` (como o cliente chegou à empresa)
 * - `channelSale` (como a venda aconteceu / iniciativa que converteu)
 * - `detailedOrigin` (preservado de forma contínua e intacta)
 *
 * Regras de conversão e legado:
 * - Enum no banco `crm_canal` = carteira | internet | showroom | porta.
 * - Mapear `showroom` -> `Porta` SOMENTE no modelo metodológico.
 * - Casos "sem canal" são tratados explicitamente (sem presumir canal padrão).
 */

/** Canais oficiais no modelo metodológico do Mentor Comercial. */
export const OFFICIAL_CHANNELS = ['Porta', 'Internet', 'Carteira'] as const
export type OfficialChannel = (typeof OFFICIAL_CHANNELS)[number]

/** Marcador de status multicanal no catálogo (não é um canal individual). */
export const MULTICHANNEL_MARKER = 'Compartilhado' as const

/** Valores do enum legado no banco de dados (`crm_canal`). */
export type LegacyCrmChannel = 'carteira' | 'internet' | 'showroom' | 'porta'

/** Entrada para apuração dos canais de entrada e venda. */
export type ChannelResolutionInput = {
  /** Canal legado no banco de dados (`crm_canal`) */
  crmCanal?: LegacyCrmChannel | string | null
  /** Origem detalhada (ex: Instagram, OLX, Indicação, etc.) */
  detailedOrigin?: string | null
  /** Idade do lead / oportunidade em dias */
  daysSinceCreated?: number | null
  /** Indicador explícito se é um lead antigo (>90d) reativado pelo vendedor */
  isReactivatedLead?: boolean | null
  /** Indicador explícito se a venda foi fechada por acompanhamento (follow-up) posterior */
  closedByFollowup?: boolean | null
  /** Indicador de prospecção ou iniciativa ativa do vendedor */
  sellerInitiative?: boolean | null
  /** Indicador de agendamento prévio produzido pela empresa antes da visita */
  hasAppointmentBeforeVisit?: boolean | null
  /** Canal de entrada previamente gravado */
  channelEntry?: string | null
  /** Canal de venda previamente gravado */
  channelSale?: string | null
}

/** Resultado da resolução dos canais metodológicos. */
export type ChannelResolution = {
  /** Canal de entrada metodológico (como o cliente chegou) */
  channelEntry: OfficialChannel | null
  /** Canal de venda metodológico (como a venda foi realizada) */
  channelSale: OfficialChannel | null
  /** Origem detalhada preservada */
  detailedOrigin: string | null
  /** `true` se a entrada/origem indica o marcador multicanal "Compartilhado" */
  isMultiChannelStatusMarker: boolean
}

/**
 * Verifica se um determinado canal é um canal oficial do Mentor Comercial.
 */
export function isOfficialChannel(
  channel: string | null | undefined,
): channel is OfficialChannel {
  if (!channel) return false
  const trimmed = channel.trim()
  return OFFICIAL_CHANNELS.includes(trimmed as OfficialChannel)
}

/**
 * Verifica se a string informada é o marcador de status multicanal ("Compartilhado").
 */
export function isMultiChannelMarker(channel: string | null | undefined): boolean {
  if (!channel) return false
  return channel.trim().toLowerCase() === MULTICHANNEL_MARKER.toLowerCase()
}

/**
 * Mapeia um valor de canal (legado `crm_canal` ou texto) para o canal oficial metodológico.
 *
 * Mapeamento:
 * - `internet` -> `Internet`
 * - `carteira` -> `Carteira`
 * - `showroom` -> `Porta` (SOMENTE no modelo metodológico)
 * - `porta` -> `Porta`
 * - `compartilhado` -> `null` (é marcador multicanal, não canal oficial)
 * - Nulo/indefinido/desconhecido -> `null` (sem canal)
 */
export function mapLegacyChannelToOfficial(
  legacy: string | null | undefined,
): OfficialChannel | null {
  if (!legacy) return null
  const normalized = legacy.trim().toLowerCase()

  switch (normalized) {
    case 'internet':
      return 'Internet'
    case 'carteira':
      return 'Carteira'
    case 'showroom':
    case 'porta':
      return 'Porta'
    default:
      return null
  }
}

/**
 * Infere o canal oficial a partir da origem detalhada quando o canal legado estiver ausente.
 */
export function inferChannelFromDetailedOrigin(
  detailedOrigin: string | null | undefined,
): OfficialChannel | null {
  if (!detailedOrigin) return null
  const norm = detailedOrigin.trim().toLowerCase()

  if (
    norm.includes('instagram') ||
    norm.includes('facebook') ||
    norm.includes('google') ||
    norm.includes('ads') ||
    norm.includes('site') ||
    norm.includes('landing page') ||
    norm.includes('web') ||
    norm.includes('portal')
  ) {
    return 'Internet'
  }

  if (
    norm.includes('passagem') ||
    norm.includes('espontân') ||
    norm.includes('espontan') ||
    norm.includes('fachada') ||
    norm.includes('vitrine') ||
    norm.includes('showroom')
  ) {
    return 'Porta'
  }

  if (
    norm.includes('indica') ||
    norm.includes('prospec') ||
    norm.includes('olx') ||
    norm.includes('cliente antigo') ||
    norm.includes('pós-venda') ||
    norm.includes('pos-venda') ||
    norm.includes('garantia') ||
    norm.includes('feirão') ||
    norm.includes('feirao')
  ) {
    return 'Carteira'
  }

  return null
}

/**
 * Determina o canal de entrada metodológico (`channelEntry`).
 */
export function resolveChannelEntry(input: ChannelResolutionInput): OfficialChannel | null {
  // 1. Se canal de entrada já é um canal oficial válido
  if (input.channelEntry) {
    const mappedEntry = mapLegacyChannelToOfficial(input.channelEntry)
    if (mappedEntry) return mappedEntry
  }

  // 2. Mapeia a partir do canal legado do banco (crm_canal)
  if (input.crmCanal) {
    const mappedCrm = mapLegacyChannelToOfficial(input.crmCanal)
    if (mappedCrm) return mappedCrm
  }

  // 3. Infere a partir da origem detalhada se presente
  return inferChannelFromDetailedOrigin(input.detailedOrigin)
}

/**
 * Determina o canal de venda metodológico (`channelSale`).
 *
 * Regras:
 * 1. Lead Internet envelhecido >90 dias reativado pelo vendedor -> `Carteira`
 * 2. Cliente Porta fechado por follow-up/acompanhamento posterior -> `Carteira`
 * 3. Cliente espontâneo sem agendamento -> `Porta`
 * 4. Lead Internet trabalhado -> `Internet`
 * 5. Prospecção/iniciativa própria -> `Carteira`
 */
export function resolveChannelSale(
  input: ChannelResolutionInput,
  resolvedEntry?: OfficialChannel | null,
): OfficialChannel | null {
  // 1. Se canal de venda explícito já for informado
  if (input.channelSale) {
    const mappedSale = mapLegacyChannelToOfficial(input.channelSale)
    if (mappedSale) return mappedSale
  }

  const entry = resolvedEntry !== undefined ? resolvedEntry : resolveChannelEntry(input)

  // Caso "sem canal"
  if (!entry) {
    if (input.sellerInitiative || input.isReactivatedLead) {
      return 'Carteira'
    }
    return null
  }

  // Regra 1: Lead Internet envelheceu >90 dias e vendedor reativou
  const isOldLead = (input.daysSinceCreated ?? 0) > 90 || input.isReactivatedLead === true
  const sellerReactivated = input.isReactivatedLead === true || input.sellerInitiative === true
  if (entry === 'Internet' && isOldLead && sellerReactivated) {
    return 'Carteira'
  }

  // Regra 2: Cliente Porta que não comprou na hora e fecha por follow-up posterior
  if (entry === 'Porta' && (input.closedByFollowup === true || input.sellerInitiative === true)) {
    return 'Carteira'
  }

  // Regra 3: Cliente Porta espontâneo sem agendamento prévio da empresa
  if (entry === 'Porta') {
    return 'Porta'
  }

  // Regra 4: Outras situações mantêm o canal de entrada como canal de venda por padrão
  return entry
}

/**
 * Resolução completa dos canais metodológicos do Mentor Comercial.
 *
 * Preserva `detailedOrigin`, calcula `channelEntry` e `channelSale` de forma
 * desacoplada e identifica marcadores multicanal (`Compartilhado`).
 */
export function resolveChannels(input: ChannelResolutionInput): ChannelResolution {
  const detailedOrigin = input.detailedOrigin ?? null
  const isMultiChannelStatusMarker =
    isMultiChannelMarker(input.crmCanal) ||
    isMultiChannelMarker(input.channelEntry) ||
    isMultiChannelMarker(input.channelSale)

  const channelEntry = resolveChannelEntry(input)
  const channelSale = resolveChannelSale(input, channelEntry)

  return {
    channelEntry,
    channelSale,
    detailedOrigin,
    isMultiChannelStatusMarker,
  }
}
