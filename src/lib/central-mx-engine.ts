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
  /** Colaboradores ativos com vínculo na unidade (`vinculos_loja`). */
  headcount?: number | null
  /**
   * Vendas do mês por canal (`eventos_comerciais`), quando a origem distingue.
   * `carteira` fica de fora: o evento não separa carteira da empresa da do
   * vendedor, e ratear inventaria a diferença.
   */
  salesByChannel?: { internet: number | null; doorFlow: number | null; afterSales?: number | null; totalSales?: number | null } | null
  /**
   * Estoque da unidade, já apurado por `useOwnerInventoryMetrics` sobre
   * `veiculos_estoque`. Sem ele, os cinco indicadores de estoque do catálogo
   * ficam sem realizado.
   */
  inventory?: {
    total: number
    available: number
    agingOver90: number
    value: number
  } | null
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

/**
 * Catálogo do cockpit = os 45 indicadores da metodologia MX
 * (`catalogo_metricas_consultoria`), nos mesmos seis departamentos do Base44.
 *
 * Até 2026-08-26 este motor mantinha catálogo próprio: dos 43 códigos que
 * expunha ao Dono, apenas dois existiam na metodologia. O resto era vocabulário
 * paralelo — indicadores que ninguém definiu, alimentava ou reconhecia.
 */
export const CENTRAL_MX_PLANNING_INDICATORS: CentralMxIndicatorDefinition[] = [
  { code: 'sales_total', label: 'Vendas Total', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 10, targetDirection: 'higher' },
  { code: 'sales_door_flow', label: 'Vendas - Fluxo de Porta', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 20, targetDirection: 'higher' },
  { code: 'sales_referral', label: 'Vendas - Indicação', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 30, targetDirection: 'higher' },
  { code: 'sales_company_wallet', label: 'Vendas - Carteira Empresa', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 40, targetDirection: 'higher' },
  { code: 'sales_seller_wallet', label: 'Vendas - Carteira Vendedor', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 50, targetDirection: 'higher' },
  { code: 'sales_internet', label: 'Vendas - Internet', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 60, targetDirection: 'higher' },
  { code: 'sales_other', label: 'Vendas - Outros', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 70, targetDirection: 'higher' },
  { code: 'seller_count', label: 'Volume de Vendedores', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 80, targetDirection: 'higher' },
  { code: 'avg_sales_per_seller', label: 'Média de Vendas por Vendedor', department: 'comercial', unit: 'number', dimension: 'processo', sortOrder: 90, targetDirection: 'higher' },
  { code: 'leads_received', label: 'Volume de Leads Recebidos', department: 'marketing', unit: 'number', dimension: 'resultado', sortOrder: 100, targetDirection: 'higher' },
  { code: 'avg_leads_per_seller', label: 'Média de Leads por Vendedor', department: 'comercial', unit: 'number', dimension: 'processo', sortOrder: 110, targetDirection: 'higher' },
  { code: 'vehicles_appraised', label: 'Volume de Carros Avaliados', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 120, targetDirection: 'higher' },
  { code: 'trade_in_volume', label: 'Volume de Vendas com Troca', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 130, targetDirection: 'higher' },
  { code: 'trade_in_to_sales_rate', label: '% Venda com Troca', department: 'comercial', unit: 'percent', dimension: 'processo', sortOrder: 140, targetDirection: 'higher' },
  { code: 'approved_credit_applications', label: 'Volume de Fichas Aprovadas', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 150, targetDirection: 'higher' },
  { code: 'paid_credit_applications', label: 'Volume de Fichas Pagas', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 160, targetDirection: 'higher' },
  { code: 'financed_sales_percentage', label: '% Vendas Financiadas', department: 'comercial', unit: 'percent', dimension: 'processo', sortOrder: 170, targetDirection: 'higher' },
  { code: 'appointments', label: 'Volume de Agendamentos', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 180, targetDirection: 'higher' },
  { code: 'visits', label: 'Volume de Visitas', department: 'comercial', unit: 'number', dimension: 'resultado', sortOrder: 190, targetDirection: 'higher' },
  { code: 'appointments_per_sale', label: 'Volume de Agendamentos por Venda', department: 'comercial', unit: 'number', dimension: 'processo', sortOrder: 200, targetDirection: 'lower' },
  { code: 'lead_to_appointment_rate', label: 'Conversão de Leads em Agendamentos', department: 'comercial', unit: 'percent', dimension: 'processo', sortOrder: 210, targetDirection: 'higher' },
  { code: 'appointment_to_visit_rate', label: 'Conversão de Agendamentos em Visitas', department: 'comercial', unit: 'percent', dimension: 'processo', sortOrder: 220, targetDirection: 'higher' },
  { code: 'visit_to_sale_rate', label: 'Conversão de Visitas em Vendas', department: 'comercial', unit: 'percent', dimension: 'processo', sortOrder: 230, targetDirection: 'higher' },
  { code: 'internet_investment', label: 'Investimento Internet', department: 'marketing', unit: 'currency', dimension: 'resultado', sortOrder: 240, targetDirection: 'lower' },
  { code: 'internet_cost_per_sale', label: 'Custo por Venda na Internet', department: 'marketing', unit: 'currency', dimension: 'processo', sortOrder: 250, targetDirection: 'lower' },
  { code: 'instagram_followers', label: 'Volume de Seguidores Instagram', department: 'marketing', unit: 'number', dimension: 'resultado', sortOrder: 260, targetDirection: 'higher' },
  { code: 'google_rating', label: 'Avaliação Google Meu Negócio', department: 'marketing', unit: 'number', dimension: 'resultado', sortOrder: 270, targetDirection: 'higher' },
  { code: 'content_quality', label: 'Qualidade do Conteúdo', department: 'marketing', unit: 'number', dimension: 'resultado', sortOrder: 280, targetDirection: 'higher' },
  { code: 'stock_turnover', label: 'Giro de Estoque', department: 'produto', unit: 'number', dimension: 'resultado', sortOrder: 290, targetDirection: 'higher' },
  { code: 'active_stock', label: 'Estoque Ativo', department: 'produto', unit: 'number', dimension: 'resultado', sortOrder: 300, targetDirection: 'higher' },
  { code: 'stock_total', label: 'Estoque Total', department: 'produto', unit: 'number', dimension: 'resultado', sortOrder: 310, targetDirection: 'higher' },
  { code: 'inventory_over_90_volume', label: 'Tempo de Estoque > 90', department: 'produto', unit: 'number', dimension: 'resultado', sortOrder: 320, targetDirection: 'lower' },
  { code: 'stock_over_90_rate', label: '% Estoque > 90 Dias', department: 'produto', unit: 'percent', dimension: 'processo', sortOrder: 330, targetDirection: 'lower' },
  { code: 'avg_stock_price', label: 'Ticket Médio do Estoque', department: 'produto', unit: 'currency', dimension: 'resultado', sortOrder: 340, targetDirection: 'higher' },
  { code: 'inventory_average_margin', label: 'Margem Média do Estoque', department: 'produto', unit: 'currency', dimension: 'resultado', sortOrder: 350, targetDirection: 'higher' },
  { code: 'contribution_margin', label: 'Margem de Contribuição', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 360, targetDirection: 'higher' },
  { code: 'additional_revenue', label: 'Receita Adicional', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 370, targetDirection: 'higher' },
  { code: 'total_expense', label: 'Despesa Total', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 380, targetDirection: 'lower' },
  { code: 'net_profit', label: 'Lucro Líquido', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 390, targetDirection: 'higher' },
  { code: 'avg_margin', label: 'Margem Média de Venda', department: 'financeiro', unit: 'currency', dimension: 'resultado', sortOrder: 400, targetDirection: 'higher' },
  { code: 'preparation_cost', label: 'Custo Médio Preparação', department: 'operacional', unit: 'currency', dimension: 'resultado', sortOrder: 410, targetDirection: 'lower' },
  { code: 'post_sale_cost', label: 'Custo Médio Pós-Venda', department: 'operacional', unit: 'currency', dimension: 'resultado', sortOrder: 420, targetDirection: 'lower' },
  { code: 'after_sales_volume', label: 'Volume de Pós-Venda', department: 'operacional', unit: 'number', dimension: 'resultado', sortOrder: 430, targetDirection: 'lower' },
  { code: 'after_sales_percentage', label: '% de Pós-Venda', department: 'operacional', unit: 'percent', dimension: 'processo', sortOrder: 440, targetDirection: 'lower' },
  { code: 'employee_count', label: 'Quadro de Colaboradores', department: 'rh', unit: 'number', dimension: 'resultado', sortOrder: 450, targetDirection: 'lower' },
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
  const anterior = (code: string) => input.previousYear?.[code] ?? null
  const porVendedor = (total: number | null) =>
    total == null || sellerCount <= 0 ? null : total / sellerCount

  // Quantos agendamentos foram precisos para cada venda do mês. Sem venda no
  // período a razão não existe — devolver 0 ou o total de agendamentos daria a
  // impressão de eficiência que ninguém mediu.
  const agendamentosPorVenda = input.metrics.totalSales > 0
    ? input.metrics.totalAgd / input.metrics.totalSales
    : null

  const estoque = input.inventory ?? null
  // Preço médio e % acima de 90 dias só existem com estoque cadastrado: sem
  // veículo na base, dividir por zero produziria 0 — um número que parece dado.
  const precoMedioEstoque = estoque && estoque.total > 0 ? estoque.value / estoque.total : null
  const taxaAcima90 = estoque && estoque.total > 0 ? (estoque.agingOver90 / estoque.total) * 100 : null

  // Só entram valores que a operação de fato mede. Indicador do catálogo sem
  // fonte fica sem `realizado` — o cockpit mostra "--", que é a verdade, em vez
  // de um número construído para preencher a linha.
    // `% de Pós-Venda` = eventos de pós-venda sobre as vendas do mesmo mês. Sem
  // vendas no período o denominador é zero: taxa fica nula, não 0%.
  const posVenda = input.salesByChannel?.afterSales ?? null
  const vendasDoMes = input.salesByChannel?.totalSales ?? null
  const taxaPosVenda = posVenda === null || !vendasDoMes
    ? null
    : Math.round((posVenda / vendasDoMes) * 1000) / 10

return {
    // Vendas e funil: vêm do fechamento diário da loja.
    sales_total: { meta: input.metrics.goalValue || null, realizado: input.metrics.totalSales, anoAnterior: anterior('sales_total') },
    leads_received: { meta: null, realizado: input.metrics.totalLeads, anoAnterior: anterior('leads_received') },
    appointments: { meta: null, realizado: input.metrics.totalAgd, anoAnterior: anterior('appointments') },
    visits: { meta: null, realizado: input.metrics.totalVis, anoAnterior: anterior('visits') },
    seller_count: { meta: null, realizado: sellerCount || null, anoAnterior: anterior('seller_count') },
    sales_internet: { meta: null, realizado: input.salesByChannel?.internet ?? null, anoAnterior: anterior('sales_internet') },
    sales_door_flow: { meta: null, realizado: input.salesByChannel?.doorFlow ?? null, anoAnterior: anterior('sales_door_flow') },
    employee_count: { meta: null, realizado: input.headcount ?? null, anoAnterior: anterior('employee_count') },
    appointments_per_sale: { meta: null, realizado: agendamentosPorVenda, anoAnterior: anterior('appointments_per_sale') },
    avg_sales_per_seller: { meta: null, realizado: porVendedor(input.metrics.totalSales), anoAnterior: anterior('avg_sales_per_seller') },
    avg_leads_per_seller: { meta: null, realizado: porVendedor(input.metrics.totalLeads), anoAnterior: anterior('avg_leads_per_seller') },

    // Conversões: benchmark da rede é a referência, não uma meta inventada.
    lead_to_appointment_rate: { meta: input.benchmarks.leadToSchedule, realizado: input.funnel.leadToSchedule, anoAnterior: anterior('lead_to_appointment_rate') },
    appointment_to_visit_rate: { meta: input.benchmarks.scheduleToVisit, realizado: input.funnel.scheduleToVisit, anoAnterior: anterior('appointment_to_visit_rate') },
    visit_to_sale_rate: { meta: input.benchmarks.visitToSale, realizado: input.funnel.visitToSale, anoAnterior: anterior('visit_to_sale_rate') },

    // Financeiro: o que o DRE do mês entrega.
    net_profit: { meta: null, realizado: input.financial?.netProfit ?? null, anoAnterior: anterior('net_profit') },
    avg_margin: { meta: metaFromParameter(input, 'STOCK_MARGIN_RATE', 100), realizado: input.financial?.grossMarginPct ?? null, anoAnterior: anterior('avg_margin') },

    // Estoque: `veiculos_estoque` da unidade.
    stock_total: { meta: null, realizado: estoque?.total ?? null, anoAnterior: anterior('stock_total') },
    active_stock: { meta: null, realizado: estoque?.available ?? null, anoAnterior: anterior('active_stock') },
    inventory_over_90_volume: { meta: null, realizado: estoque?.agingOver90 ?? null, anoAnterior: anterior('inventory_over_90_volume') },
    avg_stock_price: { meta: null, realizado: precoMedioEstoque, anoAnterior: anterior('avg_stock_price') },
    stock_over_90_rate: { meta: metaFromParameter(input, 'OVER_90_STOCK_RATE', 100), realizado: taxaAcima90, anoAnterior: anterior('stock_over_90_rate') },
    trade_in_to_sales_rate: { meta: metaFromParameter(input, 'TRADE_SALES_RATE', 100), realizado: null, anoAnterior: anterior('trade_in_to_sales_rate') },
    financed_sales_percentage: { meta: metaFromParameter(input, 'FINANCED_SALES_RATE', 100), realizado: null, anoAnterior: anterior('financed_sales_percentage') },
    after_sales_volume: { meta: null, realizado: input.salesByChannel?.afterSales ?? null, anoAnterior: anterior('after_sales_volume') },
    after_sales_percentage: { meta: metaFromParameter(input, 'POST_SALE_RATE', 100), realizado: taxaPosVenda, anoAnterior: anterior('after_sales_percentage') },
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
  const sellerCount = input.metrics.sellerCount
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

  const leadRate = indicators.find(item => item.code === 'lead_to_appointment_rate')
  if (leadRate?.realizado != null && leadRate.meta != null && leadRate.realizado < leadRate.meta) {
    push('critical', 'lead_to_appointment_rate', 'marketing', 'Conversão de lead abaixo do benchmark.', 'Perda de oportunidades antes do showroom.', 'Auditar origem, tempo de resposta e abordagem inicial.', 'Criar ação para primeiro contato')
  }

  const visitRate = indicators.find(item => item.code === 'visit_to_sale_rate')
  if (visitRate?.realizado != null && visitRate.meta != null && visitRate.realizado < visitRate.meta) {
    push('critical', 'visit_to_sale_rate', 'comercial', 'Visita não está virando venda.', 'Volume de loja pode não compensar a meta do mês.', 'Revisar proposta, troca, financiamento e fechamento com casos reais.', 'Criar devolutiva de fechamento')
  }

  // A cobertura de fechamento diário vem direto das métricas da loja: não há
  // indicador de disciplina no catálogo da metodologia.
  if (sellerCount > 0 && input.metrics.checkedInCount < sellerCount) {
    push('warning', 'seller_count', 'operacional', 'Rotina diária incompleta.', 'A leitura executiva fica frágil sem lançamento da equipe.', 'Cobrar fechamento diário pelo gerente antes da análise de resultado.', 'Cobrar lançamentos pendentes')
  }

  // Antes isto procurava `dre_completion_rate`, que saiu do catálogo: o `find`
  // devolvia undefined, `undefined == null` é true e o alerta disparava sempre,
  // inclusive com o DRE em dia.
  if (!input.financial) {
    push('consultive', 'net_profit', 'financeiro', 'DRE ainda não conectado ao ciclo executivo.', 'Margem, custo e lucro ficam sem prova operacional.', 'Atualizar DRE para completar a leitura financeira da Central MX.', 'Atualizar DRE')
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
    // Os processos passam a ser recortes do catálogo oficial. `rotina` saiu:
    // os indicadores de disciplina eram do vocabulário paralelo e não têm
    // equivalente na metodologia.
    buildScore('process', `${input.storeId}:funil`, input.period, planningIndicators.filter(item => ['lead_to_appointment_rate', 'appointment_to_visit_rate', 'visit_to_sale_rate', 'appointments_per_sale'].includes(item.code))),
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
