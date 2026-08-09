/**
 * Motor de elegibilidade de campanhas da Carteira (PRODUCT DELTA 2026-08-07 §7).
 *
 * Fontes: catálogo de status `rules/mentor-comercial/v1/statuses.json`
 * (famílias e códigos) + colunas novas do delta (`trade_interest`,
 * `financing_interest`) + sinais legados do mapper (carro_avaliado /
 * financiamento) usados somente como fallback.
 *
 * Regras (§7.1-§7.3):
 *   - Exclusões têm precedência máxima: `do_not_contact` e venda fechada
 *     (família Venda e Entrega com `closed_at`, ou `sale_date` presente).
 *   - Sinais novos (`trade_interest`/`financing_interest`) têm prioridade
 *     sobre legado (migração) — nunca misturar no mesmo cliente.
 *   - Retorno determinístico: `{ eligible, reasons, sourceOpportunityId }`.
 *
 * Determinístico e puro: sem IA, sem banco, sem relógio próprio.
 */

export type TargetingKind = 'carteira' | 'trade_interest' | 'financing' | 'vehicle_match'

export type FinancingSegment =
  | 'all'
  | 'approved'
  | 'approved_with_conditions'
  | 'rejected'
  | 'pending'
  | 'new_simulation'

export interface CampaignTargeting {
  kind: TargetingKind
  /** Obrigatório quando kind === 'financing' (delta §7.2). */
  segment?: FinancingSegment
}

export interface CampaignEligibilityInput {
  targeting: CampaignTargeting
  /** Código mentor do status atual (coluna oportunidades.current_status_code). */
  statusCode: string | null
  /** Rótulo humano legado (situacao_atual) — fallback quando não há código. */
  situacaoAtual?: string | null
  /** Sinal novo: oportunidades.trade_interest. */
  tradeInterest?: boolean | null
  /** Sinal novo: oportunidades.financing_interest. */
  financingInterest?: boolean | null
  /** Sinal legado: cliente.interesse_troca (carro_avaliado) — só sem sinal novo. */
  legacyTradeInterest?: boolean | null
  /** Sinal legado: cliente.interesse_financiamento — só sem sinal novo. */
  legacyFinancingInterest?: boolean | null
  /** Cliente solicitou não ser contatado (precedência máxima). */
  doNotContact?: boolean
  /** Data de venda fechada (exclusão §7.3). */
  saleDate?: string | null
  /** Fechamento registrado (exclusão §7.3 quando família Venda e Entrega). */
  closedAt?: string | null
  /** cliente.veiculo_interesse não vazio (targeting vehicle_match §7.1). */
  hasVehicleInterest?: boolean
  /** Rótulos terminais adicionais (ex.: 'Venda cancelada') via lista legada. */
  extraTerminalSituations?: string[]
  /** Oportunidade de origem; repassada ao resultado (§7.4). */
  sourceOpportunityId?: string | null
}

export type EligibilitySource = 'status_code' | 'new_signal' | 'legacy_signal'

export interface CampaignEligibilityResult {
  eligible: boolean
  /** Motivos determinísticos em pt-BR (delta §7.4). */
  reasons: string[]
  sourceOpportunityId: string | null
  source: EligibilitySource
}

/** Famílias por prefixo de código — fonte: statuses.json. */
export const FAMILY_BY_CODE_PREFIX: Record<string, string> = {
  'INT-': 'Contato',
  'CAR-': 'Relacionamento',
  'REL-': 'Relacionamento',
  'TR-': 'Troca',
  'FIN-': 'Financiamento',
  'VEN-': 'Venda e Entrega',
  'PER-': 'Perda e Futuro',
  'POR-': 'Porta',
}

export function familyOfStatus(statusCode: string | null | undefined): string | null {
  if (!statusCode) return null
  const prefix = Object.keys(FAMILY_BY_CODE_PREFIX).find((p) => statusCode.startsWith(p))
  return prefix ? FAMILY_BY_CODE_PREFIX[prefix] : null
}

/** Códigos de segmento de financiamento (delta §7.2). */
export const FINANCING_SEGMENT_CODES: Record<FinancingSegment, string[]> = {
  all: ['FIN-01', 'FIN-02', 'FIN-03', 'FIN-04', 'FIN-05', 'FIN-06', 'FIN-07', 'FIN-08', 'FIN-09'],
  approved: ['FIN-06'],
  approved_with_conditions: ['FIN-07'],
  rejected: ['FIN-08'],
  pending: ['FIN-03', 'FIN-04', 'FIN-05'],
  new_simulation: ['FIN-09'],
}

/** Códigos de troca potencial do relacionamento (delta §7.1). */
export const TRADE_POTENTIAL_REL_CODES = new Set(['REL-04', 'REL-05', 'REL-06'])

/** Códigos de perda terminal (família Perda e Futuro) — exclusão implícita. */
const TERMINAL_LOSS_CODES = new Set(['PER-02', 'PER-03', 'PER-04'])
/** Venda realizada / veículo entregue — terminais pela própria definição. */
const CLOSED_SALE_CODES = new Set(['VEN-04', 'VEN-07'])

/** Rótulos terminais legados (espelham SITUACOES_TERMINAIS da carteira). */
const DEFAULT_TERMINAL_SITUATIONS = ['Venda realizada', 'Venda perdida', 'Venda cancelada', 'Cadência encerrada']

function isVendaFechada(input: CampaignEligibilityInput): boolean {
  if (input.saleDate) return true
  if (input.closedAt) {
    if (input.statusCode && CLOSED_SALE_CODES.has(input.statusCode)) return true
    const family = familyOfStatus(input.statusCode)
    if (family === 'Venda e Entrega') return true
    if (!input.statusCode && input.situacaoAtual === 'Venda realizada') return true
  }
  return false
}

function isTerminalCarteira(input: CampaignEligibilityInput): boolean {
  const terminal = new Set([...DEFAULT_TERMINAL_SITUATIONS, ...(input.extraTerminalSituations || [])])
  if (input.situacaoAtual && terminal.has(input.situacaoAtual)) return true
  if (input.statusCode) {
    if (TERMINAL_LOSS_CODES.has(input.statusCode)) return true
    if (CLOSED_SALE_CODES.has(input.statusCode)) return true
  }
  return false
}

/**
 * Avalia a elegibilidade de um cliente para uma campanha (§7.1-§7.4).
 * Exclusões primeiro; depois o público conforme targeting.
 */
export function evaluateCampaignEligibility(input: CampaignEligibilityInput): CampaignEligibilityResult {
  const base = { sourceOpportunityId: input.sourceOpportunityId ?? null }

  if (input.doNotContact) {
    return { ...base, eligible: false, reasons: ['Cliente optou por não ser contatado'], source: 'status_code' }
  }
  if (isVendaFechada(input)) {
    return { ...base, eligible: false, reasons: ['Venda fechada'], source: 'status_code' }
  }

  const { targeting } = input

  if (targeting.kind === 'carteira') {
    if (isTerminalCarteira(input)) {
      return { ...base, eligible: false, reasons: ['Situação terminal da carteira'], source: 'status_code' }
    }
    return { ...base, eligible: true, reasons: ['Carteira ativa'], source: 'status_code' }
  }

  if (targeting.kind === 'trade_interest') {
    const family = familyOfStatus(input.statusCode)
    if (family === 'Troca' || (input.statusCode && TRADE_POTENTIAL_REL_CODES.has(input.statusCode))) {
      return {
        ...base,
        eligible: true,
        reasons: [family === 'Troca' ? `Família Troca (${input.statusCode})` : `Troca potencial (${input.statusCode})`],
        source: 'status_code',
      }
    }
    if (input.tradeInterest !== null && input.tradeInterest !== undefined) {
      return {
        ...base,
        eligible: input.tradeInterest === true,
        reasons: input.tradeInterest ? ['Interesse em troca confirmado'] : ['Sem interesse em troca'],
        source: 'new_signal',
      }
    }
    if (input.legacyTradeInterest) {
      return { ...base, eligible: true, reasons: ['Interesse em troca (carro avaliado)'], source: 'legacy_signal' }
    }
    return { ...base, eligible: false, reasons: ['Sem evidência de interesse em troca'], source: 'status_code' }
  }

  if (targeting.kind === 'financing') {
    const family = familyOfStatus(input.statusCode)
    const segmentCodes = FINANCING_SEGMENT_CODES[targeting.segment ?? 'all']

    if (input.statusCode) {
      if (segmentCodes.includes(input.statusCode)) {
        const label = targeting.segment === 'all' ? `Família Financiamento (${input.statusCode})` : `Segmento ${targeting.segment} (${input.statusCode})`
        return { ...base, eligible: true, reasons: [label], source: 'status_code' }
      }
      return {
        ...base,
        eligible: false,
        reasons: [`Status ${input.statusCode} fora do segmento ${targeting.segment ?? 'all'}`],
        source: 'status_code',
      }
    }

    if (targeting.segment && targeting.segment !== 'all') {
      // Segmento específico exige o código — sinais booleanos não o determinam.
      return { ...base, eligible: false, reasons: ['Segmento específico exige status de financiamento'], source: 'status_code' }
    }

    if (family === 'Financiamento') {
      return { ...base, eligible: true, reasons: ['Família Financiamento'], source: 'status_code' }
    }
    if (input.financingInterest !== null && input.financingInterest !== undefined) {
      return {
        ...base,
        eligible: input.financingInterest === true,
        reasons: input.financingInterest ? ['Interesse em financiamento confirmado'] : ['Sem interesse em financiamento'],
        source: 'new_signal',
      }
    }
    if (input.legacyFinancingInterest) {
      return { ...base, eligible: true, reasons: ['Interesse em financiamento (legado)'], source: 'legacy_signal' }
    }
    return { ...base, eligible: false, reasons: ['Sem evidência de interesse em financiamento'], source: 'status_code' }
  }

  if (targeting.kind === 'vehicle_match') {
    if (input.hasVehicleInterest) {
      return { ...base, eligible: true, reasons: ['Veículo de interesse declarado'], source: 'status_code' }
    }
    return { ...base, eligible: false, reasons: ['Sem veículo de interesse declarado'], source: 'status_code' }
  }

  return { ...base, eligible: false, reasons: [`Targeting desconhecido: ${targeting.kind}`], source: 'status_code' }
}

/**
 * Contagem agregada de elegíveis (delta §22.2) — determinística e pura.
 */
export function countEligible(
  clients: Array<Omit<CampaignEligibilityInput, 'targeting'> & { id: string }>,
  targeting: CampaignTargeting,
): { total: number; eligible: number; reasonsBySource: Record<string, number> } {
  const reasonsBySource: Record<string, number> = {}
  let eligible = 0
  for (const client of clients) {
    const result = evaluateCampaignEligibility({ ...client, targeting })
    if (result.eligible) {
      eligible += 1
      reasonsBySource[result.source] = (reasonsBySource[result.source] || 0) + 1
    }
  }
  return { total: clients.length, eligible, reasonsBySource }
}
