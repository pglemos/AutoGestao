/**
 * Score oficial do Mentor Comercial — 5 pilares (TASK 17).
 *
 * Fonte: aba `07 Score_Prioridade` da matriz v1.
 *
 * O score mede QUALIDADE DE CONDUÇÃO do vendedor, não probabilidade de venda.
 * Consequência direta: a ausência de resposta do cliente nunca reduz o score
 * quando o vendedor executou o que devia.
 *
 * Determinístico e puro: sem IA, sem acesso a banco, sem relógio próprio.
 * Mesma entrada produz sempre o mesmo resultado.
 */

/** Pesos dos cinco pilares. Somam exatamente 100. */
export const SCORE_PILLAR_WEIGHTS = {
  status: 15,
  nextStep: 20,
  execution: 30,
  cadence: 20,
  history: 15,
} as const

export type ScorePillar = keyof typeof SCORE_PILLAR_WEIGHTS

/** `Status definido e coerente` — 15 / 8 / 0 */
export type StatusQuality =
  /** Status válido e campos obrigatórios completos. */
  | 'complete'
  /** Status válido com informação pendente. */
  | 'partial'
  /** Status genérico, incoerente ou ausente. */
  | 'undefined'

/** `Próximo passo, responsável e data` — 20 / 10 / 0 */
export type NextStepQuality =
  /** Próximo passo, responsável e data definidos. */
  | 'complete'
  /** Próximo passo sem data e/ou sem responsável. */
  | 'partial'
  /** Sem próximo passo. */
  | 'missing'

/** `Execução dentro do prazo` — 30 / 25 / 10 / 0 */
export type ExecutionQuality =
  /** Nada vencido. */
  | 'onTime'
  /** Ação vence hoje. */
  | 'dueToday'
  /** Atraso menor que 24h. */
  | 'lateUnder24h'
  /** Atraso maior que 24h. */
  | 'lateOver24h'
  /** Cliente respondeu e o vendedor ainda não retornou — principal risco operacional. */
  | 'awaitingSellerResponse'

/** `Cadência respeitada` — 20 / 10 / 0 */
export type CadenceQuality =
  /** Tentativas devidas executadas. */
  | 'respected'
  /**
   * Cadência chegou ao fim sem o cliente responder.
   * Vale pontuação cheia: o vendedor executou tudo que devia (§29, §31).
   */
  | 'completedWithoutResponse'
  /** Uma tentativa fora do prazo. */
  | 'partial'
  /** Tentativa ignorada ou cadência interrompida sem justificativa. */
  | 'broken'

/** `Histórico atualizado` — 15 / 8 / 0 */
export type HistoryQuality =
  /** Último contato e resultado registrados. */
  | 'complete'
  /** Contato registrado sem resultado suficiente. */
  | 'partial'
  /** Histórico não representa o atendimento atual. */
  | 'stale'

/**
 * Alertas da tabela de perdas/recuperações da planilha (linhas 7-21).
 *
 * A própria fonte marca esses impactos como "usar como alerta ALÉM da fórmula
 * dos pilares". Portanto NÃO entram no total — aplicá-los seria a dupla
 * penalização proibida pelo §31. Servem para explicação e priorização.
 */
export type ScoreAlert =
  | 'no_next_action'
  | 'next_action_overdue'
  | 'client_responded_untreated'
  | 'hot_client_idle_5_days'
  | 'proposal_without_followup'
  | 'stale_history'
  | 'cadence_broken_without_reason'

export type ScoreClassification = 'Excelente' | 'Boa' | 'Atenção' | 'Crítica'

export type ScoreInput = {
  status?: StatusQuality
  nextStep?: NextStepQuality
  execution?: ExecutionQuality
  cadence?: CadenceQuality
  history?: HistoryQuality
  /**
   * Verdadeiro quando o cliente nunca respondeu. Registrado para explicação;
   * por definição NUNCA reduz pontuação.
   */
  clientNeverResponded?: boolean
  alerts?: ScoreAlert[]
}

export type ScoreBreakdown = Record<ScorePillar, number>

export type ScoreResult = {
  total: number
  breakdown: ScoreBreakdown
  classification: ScoreClassification
  alerts: ScoreAlert[]
  clientNeverResponded: boolean
}

/**
 * Tabelas de pontuação por pilar, transcritas da planilha.
 * Ausência de informação (campo não fornecido) equivale ao estado indefinido = 0,
 * nunca a um valor presumido.
 */
const STATUS_POINTS: Record<StatusQuality, number> = {
  complete: 15,
  partial: 8,
  undefined: 0,
}

const NEXT_STEP_POINTS: Record<NextStepQuality, number> = {
  complete: 20,
  partial: 10,
  missing: 0,
}

const EXECUTION_POINTS: Record<ExecutionQuality, number> = {
  onTime: 30,
  dueToday: 25,
  lateUnder24h: 10,
  lateOver24h: 0,
  awaitingSellerResponse: 0,
}

const CADENCE_POINTS: Record<CadenceQuality, number> = {
  respected: 20,
  completedWithoutResponse: 20,
  partial: 10,
  broken: 0,
}

const HISTORY_POINTS: Record<HistoryQuality, number> = {
  complete: 15,
  partial: 8,
  stale: 0,
}

/** Faixas de classificação (§31). Fronteiras inclusivas no limite inferior. */
export function classifyScore(total: number): ScoreClassification {
  if (total >= 90) return 'Excelente'
  if (total >= 75) return 'Boa'
  if (total >= 50) return 'Atenção'
  return 'Crítica'
}

export function computeScore(input: ScoreInput): ScoreResult {
  const breakdown: ScoreBreakdown = {
    status: STATUS_POINTS[input.status ?? 'undefined'],
    nextStep: NEXT_STEP_POINTS[input.nextStep ?? 'missing'],
    execution: EXECUTION_POINTS[input.execution ?? 'lateOver24h'],
    cadence: CADENCE_POINTS[input.cadence ?? 'broken'],
    history: HISTORY_POINTS[input.history ?? 'stale'],
  }

  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0)

  return {
    total,
    breakdown,
    classification: classifyScore(total),
    alerts: input.alerts ?? [],
    clientNeverResponded: input.clientNeverResponded ?? false,
  }
}
