/**
 * Transition Engine (TASK 14). Fonte: aba `06 Transições` da matriz v1.
 *
 * A fonte referencia status por RÓTULO e também por CONTEXTO mais amplo
 * (`Negociação ativa`, `Valor apresentado`, `Qualquer visita`). Tratar a coluna
 * como chave estrangeira literal quebraria 20 das 52 regras.
 *
 * Precedência obrigatória (§28):
 *   1. status exato
 *   2. contexto / família
 *   3. curinga (`Qualquer`, `Qualquer visita`, `Qualquer ativa`)
 *
 * Sem match o motor NÃO inventa status: devolve resultado estruturado exigindo
 * `Atualizar situação` e emite sinal de observabilidade `transition_not_found`.
 */

export type TransitionRule = {
  family: string | null
  fromStatusOrContext: string | null
  result: string | null
  toStatus: string | null
  decisionNotes: string | null
}

export type TransitionPrecedence = 'exact_status' | 'context' | 'wildcard'

export type TransitionQuery = {
  /** Rótulo exato do status atual. */
  statusLabel: string
  /** Família do status atual. */
  family: string
  /** Resultado informado pelo vendedor. */
  result: string
  /**
   * Contextos aos quais o status pertence, do mais específico ao mais amplo.
   * Ex.: um status de negociação pode pertencer ao contexto `Negociação ativa`.
   */
  contexts?: string[]
}

export type TransitionOutcome = {
  matched: boolean
  toStatus: string | null
  decisionNotes: string | null
  precedence: TransitionPrecedence | null
  requiresManualUpdate: boolean
  observability: 'transition_not_found' | null
}

export type TransitionIndex = {
  byResult: Map<string, TransitionRule[]>
}

/** Curingas oficiais da fonte: `Qualquer`, `Qualquer visita`, `Qualquer ativa`. */
function isWildcard(value: string | null): boolean {
  return value !== null && /^qualquer\b/i.test(value.trim())
}

/** Normaliza para comparação tolerante a espaçamento e caixa, preservando acentos. */
function norm(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR')
}

export function buildTransitionIndex(rules: TransitionRule[]): TransitionIndex {
  const byResult = new Map<string, TransitionRule[]>()
  for (const rule of rules) {
    if (rule.result === null) continue
    const key = norm(rule.result)
    const list = byResult.get(key)
    if (list) list.push(rule)
    else byResult.set(key, [rule])
  }
  return { byResult }
}

const NO_MATCH: TransitionOutcome = {
  matched: false,
  toStatus: null,
  decisionNotes: null,
  precedence: null,
  requiresManualUpdate: true,
  observability: 'transition_not_found',
}

export function resolveTransition(
  index: TransitionIndex,
  query: TransitionQuery,
): TransitionOutcome {
  const candidates = index.byResult.get(norm(query.result))
  if (!candidates || candidates.length === 0) return { ...NO_MATCH }

  // Curinga e contexto só valem dentro da mesma família — um "Qualquer" de
  // Contato nunca pode capturar um resultado de Negociação.
  const sameFamily = candidates.filter(
    (rule) => rule.family !== null && norm(rule.family) === norm(query.family),
  )

  const hit = (rule: TransitionRule, precedence: TransitionPrecedence): TransitionOutcome => ({
    matched: true,
    toStatus: rule.toStatus,
    decisionNotes: rule.decisionNotes,
    precedence,
    requiresManualUpdate: false,
    observability: null,
  })

  // 1. Status exato — vale mesmo que a família da regra seja um agrupamento mais amplo.
  const exact = candidates.find(
    (rule) =>
      rule.fromStatusOrContext !== null &&
      !isWildcard(rule.fromStatusOrContext) &&
      norm(rule.fromStatusOrContext) === norm(query.statusLabel),
  )
  if (exact) return hit(exact, 'exact_status')

  // 2. Contexto declarado pelo status, do mais específico ao mais amplo.
  for (const context of query.contexts ?? []) {
    const byContext = sameFamily.find(
      (rule) =>
        rule.fromStatusOrContext !== null &&
        !isWildcard(rule.fromStatusOrContext) &&
        norm(rule.fromStatusOrContext) === norm(context),
    )
    if (byContext) return hit(byContext, 'context')
  }

  // 3. Curinga da família.
  const wildcard = sameFamily.find((rule) => isWildcard(rule.fromStatusOrContext))
  if (wildcard) return hit(wildcard, 'wildcard')

  return { ...NO_MATCH }
}
