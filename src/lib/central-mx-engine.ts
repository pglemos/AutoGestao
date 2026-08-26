import {
  classifyMxScore,
  getPlanningIndicatorStatus,
  type ActionPlanOrigin,
  type ActionPlanPriority,
  type ActionPlanStatus,
  type ExecutiveAlert,
  type ExecutiveAlertType,
  type MxDepartmentCode,
  type PlanningIndicatorStatus,
  type ScoreBand,
  type ScoreScopeType,
} from './mx-executive-foundation'

export type CentralMxIndicatorUnit = 'currency' | 'number' | 'percent' | 'days' | 'score'

export type CentralMxIndicatorDefinition = {
  code: string
  label: string
  department: MxDepartmentCode
  unit: CentralMxIndicatorUnit
  dimension: 'resultado' | 'processo' | 'disciplina'
  sortOrder: number
  targetDirection: 'higher' | 'lower'
}

export type CentralMxIndicatorValue = CentralMxIndicatorDefinition & PlanningIndicatorStatus & {
  score: number | null
}

export type CentralMxDepartmentModule = {
  code: MxDepartmentCode
  name: string
  score: number
  band: ScoreBand
  status: string
  /** false quando nenhum indicador do departamento tem dado real no período (score fica 0 só por convenção de cálculo) */
  hasData: boolean
  indicators: CentralMxIndicatorValue[]
  dashboardCards: Array<{ label: string; value: number | null; unit: CentralMxIndicatorUnit; status: string }>
  checklist: string[]
  playbook: string[]
  strategicAgenda: string[]
  alertCount: number
}

export type CentralMxScoreCalculation = {
  scopeType: ScoreScopeType
  scopeId: string
  period: string
  value: number
  band: ScoreBand
  dimResultado: number
  dimProcesso: number
  dimDisciplina: number
  calculationVersion: string
}

export type CentralMxActionPlanItem = {
  id: string
  scopeType: ScoreScopeType
  scopeId: string
  department: MxDepartmentCode
  indicator: string
  problem: string
  action: string
  how: string
  responsibleLabel: string
  responsibleId: string | null
  dueLabel: string
  dueDate: string | null
  status: ActionPlanStatus
  efficacyScore: number | null
  efficacyNote: string | null
  origin: ActionPlanOrigin
  priority: ActionPlanPriority
  evidenceRequired: boolean
  evidenceLabel: string
}

export type CentralMxEngineInput = {
  storeId: string
  storeName: string
  period: string
  metrics: {
    totalSales: number
    totalLeads: number
    totalAgd: number
    totalVis: number
    attainment: number
    goalValue: number
    checkedInCount: number
    sellerCount: number
  }
  funnel: {
    leadToSchedule: number
    scheduleToVisit: number
    visitToSale: number
  }
  benchmarks: {
    leadToSchedule: number
    scheduleToVisit: number
    visitToSale: number
  }
  financial?: {
    grossProfit?: number | null
    grossMarginPct?: number | null
    netProfit?: number | null
    costPerSale?: number | null
  } | null
  ranking?: Array<{
    userId: string
    name: string
    attainment?: number | null
    sales?: number | null
    goal?: number | null
    checkedIn?: boolean | null
  }>
  previousYear?: Record<string, number | null>
  /**
   * Parâmetros estratégicos da MX (`parametros_estrategicos_mx`), por código.
   *
   * Sem eles, as metas de negócio deste motor eram números cravados no código —
   * e divergiam da metodologia: o cockpit mostrava margem-alvo de 18% enquanto
   * o parâmetro oficial `STOCK_MARGIN_RATE` vale 20%. Quando o parâmetro não é
   * fornecido, o indicador fica **sem meta** em vez de exibir um alvo inventado.
   */
  strategicParameters?: Record<string, number | null> | null
}

export type CentralMxEngineResult = {
  storeName: string
  period: string
  planningIndicators: CentralMxIndicatorValue[]
  departments: CentralMxDepartmentModule[]
  scores: {
    store: CentralMxScoreCalculation
    departments: CentralMxScoreCalculation[]
    processes: CentralMxScoreCalculation[]
    individuals: CentralMxScoreCalculation[]
  }
  alerts: ExecutiveAlert[]
  actionPlanItems: CentralMxActionPlanItem[]
}

export const CENTRAL_MX_ENGINE_VERSION = 'central-mx-rules-2026.05.29'

export const CENTRAL_MX_PLANNING_INDICATORS: CentralMxIndicatorDefinition[] = [
  { code: 'sales_volume', label: 'Volume de Vendas', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 10, targetDirection: 'higher' },
  { code: 'sales_goal_attainment', label: 'Atingimento da Meta', department: 'comercial', unit: 'percent', dimension: 'resultado', sortOrder: 20, targetDirection: 'higher' },
  { code: 'daily_sales_rhythm', label: 'Ritmo Diário de Vendas', department: 'comercial', unit: 'number', dimension: 'processo', sortOrder: 30, targetDirection: 'higher' },
  { code: 'lead_to_schedule_rate', label: 'Conversão Lead > Agendamento', department: 'comercial', unit: 'percent', dimension: 'processo', sortOrder: 40, targetDirection: 'higher' },
  { code: 'schedule_to_visit_rate', label: 'Conversão Agendamento > Visita', department: 'comercial', unit: 'percent', dimension: 'processo', sortOrder: 50, targetDirection: 'higher' },
  { code: 'visit_to_sale_rate', label: 'Conversão Visita > Venda', department: 'comercial', unit: 'percent', dimension: 'resultado', sortOrder: 60, targetDirection: 'higher' },
  { code: 'commercial_pipeline_health', label: 'Saúde do Funil de Vendas', department: 'comercial', unit: 'score', dimension: 'processo', sortOrder: 70, targetDirection: 'higher' },
  { code: 'seller_ranking_spread', label: 'Dispersão do Ranking', department: 'comercial', unit: 'score', dimension: 'resultado', sortOrder: 80, targetDirection: 'lower' },

  { code: 'leads_total', label: 'Leads Recebidos', department: 'marketing', unit: 'number', dimension: 'resultado', sortOrder: 110, targetDirection: 'higher' },
  { code: 'digital_leads_share', label: 'Participação de Leads Digitais', department: 'marketing', unit: 'percent', dimension: 'resultado', sortOrder: 120, targetDirection: 'higher' },
  { code: 'lead_quality_score', label: 'Qualidade dos Leads', department: 'marketing', unit: 'score', dimension: 'processo', sortOrder: 130, targetDirection: 'higher' },
  { code: 'campaign_cadence_score', label: 'Cadência de Campanhas', department: 'marketing', unit: 'score', dimension: 'disciplina', sortOrder: 140, targetDirection: 'higher' },
  { code: 'channel_mix_score', label: 'Mix de Canais', department: 'marketing', unit: 'score', dimension: 'processo', sortOrder: 150, targetDirection: 'higher' },
  { code: 'marketing_positioning_score', label: 'Posicionamento de Marketing', department: 'marketing', unit: 'score', dimension: 'processo', sortOrder: 160, targetDirection: 'higher' },

  { code: 'inventory_total', label: 'Estoque Total', department: 'produto', unit: 'number', dimension: 'resultado', sortOrder: 210, targetDirection: 'lower' },
  { code: 'inventory_over_90_days', label: 'Estoque Acima de 90 Dias', department: 'produto', unit: 'number', dimension: 'resultado', sortOrder: 220, targetDirection: 'lower' },
  { code: 'stock_turnover_rate', label: 'Giro de Estoque', department: 'produto', unit: 'number', dimension: 'resultado', sortOrder: 230, targetDirection: 'higher' },
  { code: 'average_vehicle_margin', label: 'Margem Média por Veículo', department: 'produto', unit: 'percent', dimension: 'resultado', sortOrder: 240, targetDirection: 'higher' },
  { code: 'pricing_accuracy_score', label: 'Aderência de Precificação', department: 'produto', unit: 'score', dimension: 'processo', sortOrder: 250, targetDirection: 'higher' },
  { code: 'preparation_cycle_days', label: 'Ciclo de Preparação', department: 'produto', unit: 'days', dimension: 'processo', sortOrder: 260, targetDirection: 'lower' },
  { code: 'vehicle_mix_score', label: 'Mix de Veículos', department: 'produto', unit: 'score', dimension: 'processo', sortOrder: 270, targetDirection: 'higher' },

  { code: 'gross_profit', label: 'Lucro Bruto', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 310, targetDirection: 'higher' },
  { code: 'gross_margin_pct', label: '% Margem', department: 'financeiro', unit: 'percent', dimension: 'resultado', sortOrder: 320, targetDirection: 'higher' },
  { code: 'net_profit', label: 'Lucro Líquido', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 330, targetDirection: 'higher' },
  { code: 'cost_per_sale', label: 'Custo por Venda', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 340, targetDirection: 'lower' },
  { code: 'fixed_cost_ratio', label: 'Peso do Custo Fixo', department: 'financeiro', unit: 'percent', dimension: 'processo', sortOrder: 350, targetDirection: 'lower' },
  { code: 'cash_flow_balance', label: 'Saldo de Fluxo de Caixa', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 360, targetDirection: 'higher' },
  { code: 'dre_completion_rate', label: 'Completude do DRE', department: 'financeiro', unit: 'percent', dimension: 'disciplina', sortOrder: 370, targetDirection: 'higher' },
  { code: 'financial_risk_score', label: 'Risco Financeiro', department: 'financeiro', unit: 'score', dimension: 'processo', sortOrder: 380, targetDirection: 'higher' },

  { code: 'employees_total', label: 'Funcionários Ativos', department: 'rh', unit: 'number', dimension: 'resultado', sortOrder: 410, targetDirection: 'higher' },
  { code: 'feedback_cadence_rate', label: 'Cadência de Feedbacks', department: 'rh', unit: 'percent', dimension: 'disciplina', sortOrder: 430, targetDirection: 'higher' },
  { code: 'pdi_completion_rate', label: 'Evolução de PDI', department: 'rh', unit: 'percent', dimension: 'processo', sortOrder: 440, targetDirection: 'higher' },
  { code: 'turnover_rate', label: 'Turnover', department: 'rh', unit: 'percent', dimension: 'resultado', sortOrder: 450, targetDirection: 'lower' },
  { code: 'happiness_index', label: 'Índice de Felicidade', department: 'rh', unit: 'score', dimension: 'resultado', sortOrder: 460, targetDirection: 'higher' },
  { code: 'role_clarity_score', label: 'Clareza de Papéis', department: 'rh', unit: 'score', dimension: 'processo', sortOrder: 470, targetDirection: 'higher' },
  { code: 'behavioral_fit_score', label: 'Aderência Comportamental', department: 'rh', unit: 'score', dimension: 'processo', sortOrder: 480, targetDirection: 'higher' },

  { code: 'routine_discipline_rate', label: 'Disciplina de Rotina', department: 'operacional', unit: 'percent', dimension: 'disciplina', sortOrder: 510, targetDirection: 'higher' },
  { code: 'agenda_fulfillment_rate', label: 'Agenda Cumprida', department: 'operacional', unit: 'percent', dimension: 'disciplina', sortOrder: 520, targetDirection: 'higher' },
  { code: 'daily_checkin_coverage', label: 'Cobertura de Fechamento Diário', department: 'operacional', unit: 'percent', dimension: 'disciplina', sortOrder: 530, targetDirection: 'higher' },
  { code: 'action_plan_on_time_rate', label: 'Plano de Ação no Prazo', department: 'operacional', unit: 'percent', dimension: 'processo', sortOrder: 540, targetDirection: 'higher' },
  { code: 'evidence_completion_rate', label: 'Evidências Registradas', department: 'operacional', unit: 'percent', dimension: 'disciplina', sortOrder: 550, targetDirection: 'higher' },
  { code: 'executive_agenda_adherence', label: 'Aderência à Agenda Executiva', department: 'operacional', unit: 'percent', dimension: 'disciplina', sortOrder: 560, targetDirection: 'higher' },
  { code: 'process_quality_score', label: 'Qualidade dos Processos', department: 'operacional', unit: 'score', dimension: 'processo', sortOrder: 570, targetDirection: 'higher' },
]

export const DEPARTMENT_NAMES: Record<MxDepartmentCode, string> = {
  comercial: 'Comercial',
  marketing: 'Marketing',
  produto: 'Produto e Estoque',
  financeiro: 'Financeiro',
  rh: 'Pessoas — RH',
  operacional: 'Operações',
}

const DEPARTMENT_CHECKLIST: Record<MxDepartmentCode, string[]> = {
  comercial: ['Revisar meta x realizado', 'Cobrar vendedores sem lançamento', 'Auditar gargalo do funil', 'Definir ataque de vendas do dia'],
  marketing: ['Validar canais ativos', 'Conferir qualidade dos leads', 'Revisar agenda estratégica mensal', 'Ajustar posicionamento das campanhas'],
  produto: ['Classificar estoque por aging', 'Revisar preço e margem', 'Separar veículos críticos', 'Definir ação de giro'],
  financeiro: ['Atualizar DRE', 'Revisar margem e custos', 'Mapear custo por venda', 'Validar fluxo de caixa'],
  rh: ['Revisar PDI e feedbacks', 'Checar treinamentos pendentes', 'Atualizar clareza de cargo', 'Mapear clima e retenção'],
  operacional: ['Validar lançamentos', 'Acompanhar agenda', 'Checar evidências', 'Fechar pendências de plano de ação'],
}

const DEPARTMENT_PLAYBOOK: Record<MxDepartmentCode, string[]> = {
  comercial: ['Ritual matinal com ranking e funil', 'Devolutiva por gargalo', 'Ataque de carteira e internet por prioridade'],
  marketing: ['Calendário mensal de campanhas', 'Rotina de origem e qualidade do lead', 'Painel por canal e posicionamento'],
  produto: ['Plano de giro para estoque parado', 'Precificação por margem e liquidez', 'Checklist de preparação e exposição'],
  financeiro: ['DRE atualizado como rotina', 'Leitura de margem antes de volume', 'Custo por venda como alerta de decisão'],
  rh: ['PDI por função', 'Feedback recorrente', 'Trilhas e cargo claro por organograma'],
  operacional: ['Rotina com dono, gerente e vendedor', 'Evidências para ações concluídas', 'Agenda executiva como guia do mês'],
}

const DEPARTMENT_AGENDA: Record<MxDepartmentCode, string[]> = {
  comercial: ['Hoje: recuperar vendedores abaixo do ritmo', 'Semana: revisar conversões por etapa', 'Mês: consolidar meta e ranking'],
  marketing: ['Hoje: checar leads sem contato', 'Semana: rever campanhas por canal', 'Mês: ajustar posicionamento e verba'],
  produto: ['Hoje: separar estoque crítico', 'Semana: plano de preço e giro', 'Mês: análise de mix e margem'],
  financeiro: ['Hoje: conferir DRE pendente', 'Semana: revisar custo e margem', 'Mês: fechar resultado e caixa'],
  rh: ['Hoje: listar PDIs críticos', 'Semana: executar feedbacks', 'Mês: revisar treinamento e clima'],
  operacional: ['Hoje: fechar lançamentos', 'Semana: validar evidências', 'Mês: revisar rotina executiva'],
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function average(values: Array<number | null | undefined>, fallback = 0) {
  const valid = values.filter((value): value is number => value != null && !Number.isNaN(value))
  if (!valid.length) return fallback
  return clampScore(valid.reduce((sum, value) => sum + value, 0) / valid.length)
}

function scoreFromActual(definition: CentralMxIndicatorDefinition, value: number | null, meta: number | null): number | null {
  if (value == null) return null
  if (definition.unit === 'score') return clampScore(value)
  if (definition.unit === 'percent' && (meta == null || meta === 100 || meta === 0)) return clampScore(value)
  if (meta == null || meta === 0) return null
  const ratio = definition.targetDirection === 'higher' ? value / meta : meta / Math.max(value, 1)
  return clampScore(ratio * 100)
}

export function statusLabel(score: number) {
  const band = classifyMxScore(score)
  if (band === 'elite') return 'Elite'
  if (band === 'excellent') return 'Excelente'
  if (band === 'good') return 'Bom'
  if (band === 'attention') return 'Atenção'
  return 'Crítico'
}

/**
 * Busca a definição pelo código. O acesso posicional anterior
 * (`CENTRAL_MX_PLANNING_INDICATORS[3]`) quebrava silenciosamente a cada
 * inserção ou remoção no catálogo — o score passava a usar o benchmark do
 * indicador vizinho, sem erro nenhum.
 */
function definitionByCode(code: string): CentralMxIndicatorDefinition {
  const found = CENTRAL_MX_PLANNING_INDICATORS.find(item => item.code === code)
  if (!found) throw new Error(`Indicador do planejamento não encontrado: ${code}`)
  return found
}

/**
 * Meta vinda do parâmetro estratégico da MX, convertida para a escala do
 * indicador. Sem parâmetro, devolve `null`: indicador sem meta é honesto,
 * indicador com meta inventada não é.
 *
 * `scale` existe porque os parâmetros percentuais são guardados como fração
 * (0.20) e o cockpit exibe pontos percentuais (20).
 */
function metaFromParameter(
  input: CentralMxEngineInput,
  code: string,
  scale = 1,
): number | null {
  const raw = input.strategicParameters?.[code]
  return raw == null || Number.isNaN(raw) ? null : raw * scale
}

function getBaseValues(input: CentralMxEngineInput): Record<string, { meta: number | null; realizado: number | null; anoAnterior: number | null }> {
  const sellerCount = input.metrics.sellerCount
  const routinePct = sellerCount > 0 ? (input.metrics.checkedInCount / sellerCount) * 100 : null
  const commercialHealth = average([
    scoreFromActual(definitionByCode('lead_to_schedule_rate'), input.funnel.leadToSchedule, input.benchmarks.leadToSchedule),
    scoreFromActual(definitionByCode('schedule_to_visit_rate'), input.funnel.scheduleToVisit, input.benchmarks.scheduleToVisit),
    scoreFromActual(definitionByCode('visit_to_sale_rate'), input.funnel.visitToSale, input.benchmarks.visitToSale),
  ], 0)
  const dreCompletion = input.financial ? 100 : null

  return {
    sales_volume: { meta: input.metrics.goalValue || null, realizado: input.metrics.totalSales, anoAnterior: input.previousYear?.sales_volume ?? null },
    sales_goal_attainment: { meta: 100, realizado: input.metrics.attainment, anoAnterior: input.previousYear?.sales_goal_attainment ?? null },
    daily_sales_rhythm: { meta: input.metrics.goalValue ? input.metrics.goalValue / 22 : null, realizado: input.metrics.totalSales / 22, anoAnterior: input.previousYear?.daily_sales_rhythm ?? null },
    lead_to_schedule_rate: { meta: input.benchmarks.leadToSchedule, realizado: input.funnel.leadToSchedule, anoAnterior: input.previousYear?.lead_to_schedule_rate ?? null },
    schedule_to_visit_rate: { meta: input.benchmarks.scheduleToVisit, realizado: input.funnel.scheduleToVisit, anoAnterior: input.previousYear?.schedule_to_visit_rate ?? null },
    visit_to_sale_rate: { meta: input.benchmarks.visitToSale, realizado: input.funnel.visitToSale, anoAnterior: input.previousYear?.visit_to_sale_rate ?? null },
    commercial_pipeline_health: { meta: 100, realizado: commercialHealth, anoAnterior: null },
    seller_ranking_spread: { meta: null, realizado: null, anoAnterior: null },

    leads_total: { meta: null, realizado: input.metrics.totalLeads, anoAnterior: input.previousYear?.leads_total ?? null },
    digital_leads_share: { meta: null, realizado: null, anoAnterior: null },
    lead_quality_score: { meta: 100, realizado: scoreFromActual(definitionByCode('lead_to_schedule_rate'), input.funnel.leadToSchedule, input.benchmarks.leadToSchedule), anoAnterior: null },
    campaign_cadence_score: { meta: 100, realizado: null, anoAnterior: null },
    channel_mix_score: { meta: 100, realizado: null, anoAnterior: null },
    marketing_positioning_score: { meta: 100, realizado: null, anoAnterior: null },

    inventory_total: { meta: null, realizado: null, anoAnterior: null },
    inventory_over_90_days: { meta: metaFromParameter(input, 'OVER_90_STOCK_RATE', 100), realizado: null, anoAnterior: null },
    stock_turnover_rate: { meta: null, realizado: null, anoAnterior: null },
    average_vehicle_margin: { meta: metaFromParameter(input, 'STOCK_MARGIN_RATE', 100), realizado: input.financial?.grossMarginPct ?? null, anoAnterior: null },
    pricing_accuracy_score: { meta: 100, realizado: null, anoAnterior: null },
    preparation_cycle_days: { meta: null, realizado: null, anoAnterior: null },
    vehicle_mix_score: { meta: 100, realizado: null, anoAnterior: null },

    gross_profit: { meta: null, realizado: input.financial?.grossProfit ?? null, anoAnterior: input.previousYear?.gross_profit ?? null },
    gross_margin_pct: { meta: metaFromParameter(input, 'STOCK_MARGIN_RATE', 100), realizado: input.financial?.grossMarginPct ?? null, anoAnterior: input.previousYear?.gross_margin_pct ?? null },
    net_profit: { meta: null, realizado: input.financial?.netProfit ?? null, anoAnterior: input.previousYear?.net_profit ?? null },
    cost_per_sale: { meta: null, realizado: input.financial?.costPerSale ?? null, anoAnterior: null },
    fixed_cost_ratio: { meta: null, realizado: null, anoAnterior: null },
    cash_flow_balance: { meta: null, realizado: null, anoAnterior: null },
    dre_completion_rate: { meta: 100, realizado: dreCompletion, anoAnterior: null },
    financial_risk_score: { meta: 100, realizado: input.financial?.netProfit == null ? null : input.financial.netProfit >= 0 ? 85 : 45, anoAnterior: null },

    employees_total: { meta: null, realizado: sellerCount, anoAnterior: input.previousYear?.employees_total ?? null },
    feedback_cadence_rate: { meta: 100, realizado: null, anoAnterior: null },
    pdi_completion_rate: { meta: 100, realizado: null, anoAnterior: null },
    turnover_rate: { meta: null, realizado: null, anoAnterior: null },
    happiness_index: { meta: 100, realizado: null, anoAnterior: null },
    role_clarity_score: { meta: 100, realizado: null, anoAnterior: null },
    behavioral_fit_score: { meta: 100, realizado: null, anoAnterior: null },

    routine_discipline_rate: { meta: 100, realizado: routinePct, anoAnterior: input.previousYear?.routine_discipline_rate ?? null },
    agenda_fulfillment_rate: { meta: 100, realizado: input.metrics.totalAgd > 0 ? 100 : null, anoAnterior: null },
    daily_checkin_coverage: { meta: 100, realizado: routinePct, anoAnterior: null },
    action_plan_on_time_rate: { meta: 100, realizado: null, anoAnterior: null },
    evidence_completion_rate: { meta: 100, realizado: null, anoAnterior: null },
    executive_agenda_adherence: { meta: 100, realizado: null, anoAnterior: null },
    process_quality_score: { meta: 100, realizado: average([routinePct, commercialHealth], 0), anoAnterior: null },
  }
}

function buildScore(scopeType: ScoreScopeType, scopeId: string, period: string, indicators: CentralMxIndicatorValue[]): CentralMxScoreCalculation {
  const resultado = average(indicators.filter(item => item.dimension === 'resultado').map(item => item.score), 0)
  const processo = average(indicators.filter(item => item.dimension === 'processo').map(item => item.score), 0)
  const disciplina = average(indicators.filter(item => item.dimension === 'disciplina').map(item => item.score), 0)
  const value = average([resultado, processo, disciplina], 0)
  return {
    scopeType,
    scopeId,
    period,
    value,
    band: classifyMxScore(value),
    dimResultado: resultado,
    dimProcesso: processo,
    dimDisciplina: disciplina,
    calculationVersion: CENTRAL_MX_ENGINE_VERSION,
  }
}

function buildAlerts(input: CentralMxEngineInput, indicators: CentralMxIndicatorValue[], storeScore: CentralMxScoreCalculation): ExecutiveAlert[] {
  const alerts: ExecutiveAlert[] = []
  const push = (
    type: ExecutiveAlertType,
    sourceIndicator: string,
    department: MxDepartmentCode,
    problem: string,
    impact: string,
    recommendation: string,
    quickActionLabel: string,
  ) => {
    alerts.push({
      scopeType: 'department',
      scopeId: `${input.storeId}:${department}`,
      type,
      problem,
      impact,
      recommendation,
      quickActionLabel,
      status: 'open',
      channels: ['system', type === 'critical' ? 'push' : 'system'].filter((value, index, arr) => arr.indexOf(value) === index) as ExecutiveAlert['channels'],
      ruleVersion: CENTRAL_MX_ENGINE_VERSION,
      metadata: { sourceIndicator, department, generatedBy: 'central_mx_engine' },
    })
  }

  const leadRate = indicators.find(item => item.code === 'lead_to_schedule_rate')
  if (leadRate?.realizado != null && leadRate.meta != null && leadRate.realizado < leadRate.meta) {
    push('critical', 'lead_to_schedule_rate', 'marketing', 'Conversão de lead abaixo do benchmark.', 'Perda de oportunidades antes do showroom.', 'Auditar origem, tempo de resposta e abordagem inicial.', 'Criar ação para primeiro contato')
  }

  const visitRate = indicators.find(item => item.code === 'visit_to_sale_rate')
  if (visitRate?.realizado != null && visitRate.meta != null && visitRate.realizado < visitRate.meta) {
    push('critical', 'visit_to_sale_rate', 'comercial', 'Visita não está virando venda.', 'Volume de loja pode não compensar a meta do mês.', 'Revisar proposta, troca, financiamento e fechamento com casos reais.', 'Criar devolutiva de fechamento')
  }

  const routine = indicators.find(item => item.code === 'routine_discipline_rate')
  if (routine?.realizado != null && routine.realizado < 100) {
    push('warning', 'routine_discipline_rate', 'operacional', 'Rotina diária incompleta.', 'A leitura executiva fica frágil sem lançamento da equipe.', 'Cobrar fechamento diário pelo gerente antes da análise de resultado.', 'Cobrar lançamentos pendentes')
  }

  const dre = indicators.find(item => item.code === 'dre_completion_rate')
  if (dre?.realizado == null) {
    push('consultive', 'dre_completion_rate', 'financeiro', 'DRE ainda não conectado ao ciclo executivo.', 'Margem, custo e lucro ficam sem prova operacional.', 'Atualizar DRE para completar a leitura financeira da Central MX.', 'Atualizar DRE')
  }

  if (storeScore.value < 70) {
    push('warning', 'mx_score', 'comercial', 'MX Score em faixa de atenção.', 'A loja precisa priorizar execução antes de expandir iniciativas.', 'Identificar dimensão causadora e abrir plano de ação vinculado.', 'Abrir análise do score')
  }

  if (alerts.length === 0) {
    alerts.push({
      scopeType: 'store',
      scopeId: input.storeId,
      type: 'positive',
      problem: 'Operação sem alerta crítico no período.',
      impact: 'Ritual principal está preservado.',
      recommendation: 'Manter cadência e buscar ganho incremental por benchmark.',
      quickActionLabel: 'Acompanhar evolução',
      status: 'open',
      channels: ['system'],
      ruleVersion: CENTRAL_MX_ENGINE_VERSION,
      metadata: { generatedBy: 'central_mx_engine' },
    })
  }

  return alerts
}

function buildActionPlanItems(input: CentralMxEngineInput, alerts: ExecutiveAlert[]): CentralMxActionPlanItem[] {
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const in7DaysIso = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)

  return alerts.map((alert, index) => {
    const department = (alert.metadata?.department as MxDepartmentCode | undefined) || 'comercial'
    const priority: ActionPlanPriority = alert.type === 'critical' ? 'critica' : alert.type === 'warning' ? 'alta' : 'media'
    const isCritical = alert.type === 'critical'
    return {
      id: `${input.storeId}:${alert.metadata?.sourceIndicator || 'alert'}:${index}`,
      scopeType: alert.scopeType,
      scopeId: alert.scopeId,
      department,
      indicator: String(alert.metadata?.sourceIndicator || 'mx_score'),
      problem: alert.problem,
      action: alert.quickActionLabel,
      how: alert.recommendation,
      responsibleLabel: department === 'comercial' || department === 'operacional' ? 'Gerente comercial' : 'Diretor / responsável do departamento',
      responsibleId: null,
      dueLabel: isCritical ? 'Hoje' : '7 dias',
      dueDate: isCritical ? todayIso : in7DaysIso,
      status: alert.type === 'positive' ? 'validando_eficacia' : 'pendente',
      efficacyScore: alert.type === 'positive' ? 80 : null,
      efficacyNote: alert.type === 'positive' ? 'Manter acompanhamento.' : null,
      origin: alert.type === 'positive' ? 'score' : 'alertas',
      priority,
      evidenceRequired: alert.type !== 'positive',
      evidenceLabel: alert.type !== 'positive' ? 'Evidência obrigatória para concluir' : 'Evidência opcional',
    }
  })
}

export function buildCentralMxEngine(input: CentralMxEngineInput): CentralMxEngineResult {
  const baseValues = getBaseValues(input)
  const planningIndicators = CENTRAL_MX_PLANNING_INDICATORS.map((definition): CentralMxIndicatorValue => {
    const values = baseValues[definition.code] || { meta: null, realizado: null, anoAnterior: null }
    const status = getPlanningIndicatorStatus({
      meta: values.meta,
      realizado: values.realizado,
      anoAnterior: values.anoAnterior,
    })
    return {
      ...definition,
      ...status,
      score: scoreFromActual(definition, values.realizado, values.meta),
    }
  })

  const departments = (Object.keys(DEPARTMENT_NAMES) as MxDepartmentCode[]).map((code): CentralMxDepartmentModule => {
    const indicators = planningIndicators.filter(item => item.department === code)
    const score = buildScore('department', `${input.storeId}:${code}`, input.period, indicators)
    const criticalCount = indicators.filter(item => item.score != null && item.score < 60).length
    const hasData = indicators.some(item => item.score != null)
    return {
      code,
      name: DEPARTMENT_NAMES[code],
      score: score.value,
      band: score.band,
      status: hasData ? statusLabel(score.value) : 'Sem dado',
      hasData,
      indicators,
      dashboardCards: indicators.slice(0, 4).map(item => ({
        label: item.label,
        value: item.realizado ?? null,
        unit: item.unit,
        status: item.status,
      })),
      checklist: DEPARTMENT_CHECKLIST[code],
      playbook: DEPARTMENT_PLAYBOOK[code],
      strategicAgenda: DEPARTMENT_AGENDA[code],
      alertCount: criticalCount,
    }
  })

  const storeScore = buildScore('store', input.storeId, input.period, planningIndicators)
  const departmentScores = departments.map(department => buildScore('department', `${input.storeId}:${department.code}`, input.period, department.indicators))
  const processScores = [
    buildScore('process', `${input.storeId}:funil`, input.period, planningIndicators.filter(item => ['lead_to_schedule_rate', 'schedule_to_visit_rate', 'visit_to_sale_rate', 'commercial_pipeline_health'].includes(item.code))),
    buildScore('process', `${input.storeId}:rotina`, input.period, planningIndicators.filter(item => ['routine_discipline_rate', 'daily_checkin_coverage', 'agenda_fulfillment_rate'].includes(item.code))),
    buildScore('process', `${input.storeId}:financeiro`, input.period, planningIndicators.filter(item => item.department === 'financeiro')),
  ]
  const individualScores = (input.ranking || []).map(row => {
    const value = average([
      row.attainment == null ? null : clampScore(row.attainment),
      row.checkedIn ? 100 : 0,
      row.goal && row.sales != null ? clampScore((row.sales / Math.max(row.goal, 1)) * 100) : null,
    ], 0)
    return {
      scopeType: 'individual' as const,
      scopeId: row.userId,
      period: input.period,
      value,
      band: classifyMxScore(value),
      dimResultado: row.attainment == null ? value : clampScore(row.attainment),
      dimProcesso: value,
      dimDisciplina: row.checkedIn ? 100 : 0,
      calculationVersion: CENTRAL_MX_ENGINE_VERSION,
    }
  })

  const alerts = buildAlerts(input, planningIndicators, storeScore)
  const actionPlanItems = buildActionPlanItems(input, alerts)

  return {
    storeName: input.storeName,
    period: input.period,
    planningIndicators,
    departments,
    scores: {
      store: storeScore,
      departments: departmentScores,
      processes: processScores,
      individuals: individualScores,
    },
    alerts,
    actionPlanItems,
  }
}
