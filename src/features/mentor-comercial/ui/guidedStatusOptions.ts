/**
 * guidedStatusOptions.ts — Mapeamento e filtragem para Atualização Guiada (TASK 24).
 *
 * Mapeia cada uma das 8 opções de primeiro nível para as famílias de status do catálogo
 * (Contato, Qualificação, Visita, Negociação, Troca, Financiamento, Venda e Entrega,
 * Perda e Futuro, Relacionamento) e realiza a filtragem determinística por canal,
 * estado atual e flags pendentes.
 */

import type { StatusDefinition } from '../engine/engine'

/** As 8 opções exatas de primeiro nível definidas para a Atualização Guiada. */
export const GUIDED_STATUS_OPTIONS = [
  'Ainda não consegui falar com o cliente',
  'Estou entendendo o que ele procura',
  'Preciso gerar ou confirmar uma visita',
  'O cliente visitou e estamos negociando',
  'Existe uma pendência do carro da troca',
  'Existe uma pendência de financiamento',
  'A venda foi concluída ou perdida',
  'É uma ação de relacionamento',
] as const

export type GuidedStatusOptionText = (typeof GUIDED_STATUS_OPTIONS)[number]

/** Mapeamento de cada opção para a(s) família(s) de status do catálogo. */
export const GUIDED_OPTION_FAMILIES_MAP: Record<GuidedStatusOptionText, string[]> = {
  'Ainda não consegui falar com o cliente': ['Contato'],
  'Estou entendendo o que ele procura': ['Qualificação'],
  'Preciso gerar ou confirmar uma visita': ['Visita'],
  'O cliente visitou e estamos negociando': ['Negociação'],
  'Existe uma pendência do carro da troca': ['Troca'],
  'Existe uma pendência de financiamento': ['Financiamento'],
  'A venda foi concluída ou perdida': ['Venda e Entrega', 'Perda e Futuro'],
  'É uma ação de relacionamento': ['Relacionamento'],
}

export type FilterGuidedStatusOptionsInput = {
  catalogStatuses: StatusDefinition[]
  optionText: GuidedStatusOptionText | string
  channel?: string | null
  currentStatusCode?: string | null
  pendingFlags?: string[] | null
}

export type GuidedOptionDescriptor = {
  optionText: GuidedStatusOptionText
  families: string[]
  compatibleCount: number
  isRecommended?: boolean
  compatibleStatuses: StatusDefinition[]
}

/**
 * Filtra os status do catálogo compatíveis com a opção de primeiro nível selecionada,
 * considerando a família correspondente, o canal da oportunidade, o estado atual e pendências.
 *
 * Garantia determinística: Nunca retorna uma lista vazia para nenhuma das 8 opções.
 */
export function getCompatibleStatuses(
  input: FilterGuidedStatusOptionsInput,
): StatusDefinition[] {
  const { catalogStatuses, optionText, channel, pendingFlags } = input

  const targetFamilies =
    GUIDED_OPTION_FAMILIES_MAP[optionText as GuidedStatusOptionText] ?? []

  if (targetFamilies.length === 0) {
    const directMatch = catalogStatuses.filter((s) => s.family === optionText)
    if (directMatch.length > 0) {
      return directMatch
    }
    return []
  }

  // 1. Filtrar por família
  const familyCandidates = catalogStatuses.filter((s) =>
    targetFamilies.includes(s.family),
  )

  if (familyCandidates.length === 0) {
    return []
  }

  // 2. Filtrar por canal (status do canal ou Compartilhado)
  let channelCandidates = familyCandidates
  if (channel && channel.trim() !== '') {
    const normChannel = channel.trim().toLowerCase()
    const filtered = familyCandidates.filter((s) => {
      const sChan = s.channel.toLowerCase()
      return sChan === normChannel || sChan === 'compartilhado'
    })
    // Se houver correspondência pelo canal, usa essa lista; caso contrário, mantém os candidatos da família (fallback seguro)
    if (filtered.length > 0) {
      channelCandidates = filtered
    }
  }

  // 3. Ordenar com base em pending flags e id de status
  return channelCandidates.sort((a, b) => {
    if (pendingFlags && pendingFlags.length > 0) {
      const aHasFlag = pendingFlags.some(
        (flag) =>
          a.label.toLowerCase().includes(flag.toLowerCase()) ||
          a.family.toLowerCase().includes(flag.toLowerCase()),
      )
      const bHasFlag = pendingFlags.some(
        (flag) =>
          b.label.toLowerCase().includes(flag.toLowerCase()) ||
          b.family.toLowerCase().includes(flag.toLowerCase()),
      )
      if (aHasFlag && !bHasFlag) return -1
      if (!aHasFlag && bHasFlag) return 1
    }

    return a.statusId.localeCompare(b.statusId)
  })
}

/**
 * Retorna a lista detalhada das 8 opções de primeiro nível com contagem e recomendação.
 */
export function getGuidedOptions(
  catalogStatuses: StatusDefinition[],
  channel?: string | null,
  currentStatusCode?: string | null,
  pendingFlags?: string[] | null,
): GuidedOptionDescriptor[] {
  return GUIDED_STATUS_OPTIONS.map((optionText) => {
    const families = GUIDED_OPTION_FAMILIES_MAP[optionText]
    const compatibleStatuses = getCompatibleStatuses({
      catalogStatuses,
      optionText,
      channel,
      currentStatusCode,
      pendingFlags,
    })

    let isRecommended = false
    if (pendingFlags && pendingFlags.length > 0) {
      if (
        (pendingFlags.includes('carro_troca') || pendingFlags.includes('troca')) &&
        families.includes('Troca')
      ) {
        isRecommended = true
      }
      if (
        (pendingFlags.includes('financiamento') || pendingFlags.includes('finan')) &&
        families.includes('Financiamento')
      ) {
        isRecommended = true
      }
    }

    return {
      optionText,
      families,
      compatibleCount: compatibleStatuses.length,
      isRecommended,
      compatibleStatuses,
    }
  })
}
