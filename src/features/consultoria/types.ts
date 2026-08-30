export interface ConsultingClient {
  id: string
  name: string
  slug?: string
  legal_name: string | null
  cnpj: string | null
  product_name: string | null
  status: string
  notes: string | null
  modality?: 'Presencial' | 'Online'
  current_visit_step?: number
  journey_completed_visits?: number
  journey_total_visits?: number
  program_template_key?: string
  store_id: string | null
  primary_store_id: string | null
  legacy_migration_summary?: string | null
  legacy_migrated_at?: string | null
  legacy_migrated_by?: string | null
  created_by: string | null
  // Cadastro administrativo (módulo Administrador MX).
  structure_type?: string | null
  business_phase?: string | null
  implementation_owner_id?: string | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  onboarding_step?: number | null
  onboarding_completed?: boolean | null
  last_visit_at?: string | null
  created_at: string
  updated_at: string
}

export interface ConsultingClientUnit {
  id: string
  client_id: string
  name: string
  city: string | null
  state: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface ConsultingClientContact {
  id: string
  client_id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface ConsultingAssignment {
  id: string
  client_id: string
  user_id: string
  assignment_role: 'responsavel' | 'auxiliar' | 'viewer'
  active: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

export interface ConsultingAssignableUser {
  id: string
  name: string
  email: string
  role: string
}

export interface ConsultingVisitAttachment {
  id: string
  filename: string
  storage_path: string
  content_type: string
  size_bytes: number
  uploaded_at: string
}

export interface VisitHeaderBaseData {
  meta_mensal: string
  projecao: string
  leads_mes: string
  estoque_disponivel: string
  consultant_name: string
  visit_date: string
  tempo: string
  alvo: string
}

export interface VisitOneSalesPoint {
  month: string
  value: number
}

export interface VisitOneMarketingOrigin {
  name: string
  value: number
}

export interface VisitOneQuantData {
  sales: VisitOneSalesPoint[]
  marketing: {
    investment: number
    leads: number
    origin: VisitOneMarketingOrigin[]
  }
  stock: {
    qty: number
    avg_price: number
    fipe_delta: number
    mileage: number
    total_inv: number
  }
}

export interface ConsultingVisit {
  id: string
  client_id: string
  visit_number: number
  scheduled_at: string
  /** Data efetiva da visita (quando concluída/executada). Campo do banco. */
  effective_visit_date?: string | null
  duration_hours: number
  modality: string
  status: 'agendada' | 'concluida' | 'cancelada' | 'em_andamento'
  consultant_id: string | null
  auxiliary_consultant_id: string | null
  objective: string | null
  visit_reason?: string | null
  target_audience?: string | null
  product_name?: string | null
  fora_do_contrato?: boolean
  analysis_period_start?: string | null
  analysis_period_end?: string | null
  analysis_period_preset?: string | null
  checklist_data: Array<{ task: string; completed: boolean }>
  feedback_client: string | null
  executive_summary: string | null
  google_event_id: string | null
  google_event_id_central?: string | null
  google_meet_link?: string | null
  google_synced_at?: string | null
  meta_mensal: string | null
  projecao: string | null
  leads_mes: string | null
  estoque_disponivel: string | null
  acknowledged_at?: string | null
  acknowledged_by?: string | null
  next_cycle_goal?: string | null
  quant_data?: VisitOneQuantData | Record<string, unknown> | null
  attachments?: ConsultingVisitAttachment[]
  created_at: string
  updated_at: string
  consultant?: { name: string | null; email: string | null } | null
  auxiliary_consultant?: { name: string | null; email: string | null } | null
}

export interface ConsultingFinancial {
  id: string
  client_id: string
  reference_date: string
  revenue: number
  fixed_expenses: number
  marketing_expenses: number
  investments: number
  financing: number
  net_profit: number
  roi: number
  conversion_rate: number
  volume_vendas?: number
  volume_leads?: number
  volume_agendamentos?: number
  created_at: string
  updated_at: string
}

export interface ConsultingMethodologyStep {
  id: string
  visit_number: number
  objective: string
  target: string | null
  duration: string | null
  evidence_required: string | null
  checklist_template?: string[] | Array<{ task: string; completed?: boolean }>
}

export interface ConsultingVisitProgram {
  program_key: string
  name: string
  total_visits: number
  active: boolean
}

export interface ConsultingClientModule {
  id: string
  client_id: string
  module_key: 'diagnostics' | 'strategic_plan' | 'action_plan' | 'dre' | 'monthly_close' | 'daily_tracking'
  label: string
  enabled: boolean
  premium: boolean
  notes: string | null
  configured_by: string | null
  configured_at: string
  created_at: string
  updated_at: string
}

export interface PmrFormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'scale' | 'boolean' | 'select' | 'file'
}

export interface PmrFormTemplate {
  id: string
  form_key: 'owner' | 'manager' | 'seller' | 'process' | string
  title: string
  target_role: string
  visit_number: number
  fields: PmrFormField[]
  active: boolean
  created_at: string
  updated_at: string
}

export interface PmrFormResponse {
  id: string
  client_id: string
  visit_id: string | null
  template_id: string
  respondent_name: string | null
  respondent_role: string | null
  answers: Record<string, unknown>
  summary: string | null
  submitted_by: string | null
  submitted_at: string
  created_at: string
  updated_at: string
  template?: PmrFormTemplate | null
}

export interface ConsultingMetricCatalogItem {
  metric_key: string
  label: string
  direction: 'increase' | 'decrease'
  value_type: 'number' | 'percent' | 'currency'
  area: string
  source_scope: string
  formula_key: string | null
  active: boolean
  sort_order: number
}

export interface ConsultingParameterSet {
  id: string
  name: string
  version: string
  active: boolean
  source_reference: string | null
  created_by: string | null
  last_visit_at?: string | null
  created_at: string
  updated_at: string
}

export interface ConsultingParameterValue {
  id: string
  parameter_set_id: string
  metric_key: string
  market_average: number | null
  best_practice: number | null
  target_default: number | null
  red_threshold: number | null
  yellow_threshold: number | null
  green_threshold: number | null
  formula: Record<string, unknown>
  notes: string | null
  metric?: ConsultingMetricCatalogItem | null
}

export interface ConsultingMetricTarget {
  id: string
  client_id: string
  metric_key: string
  reference_month: string
  target_value: number
  source: string
}

export interface ConsultingMetricResult {
  id: string
  client_id: string
  metric_key: string
  reference_date: string
  result_value: number
  source: string
  source_payload: Record<string, unknown>
}

export interface ConsultingMarketingMonthly {
  id: string
  client_id: string
  reference_month: string
  media: string
  leads_volume: number
  sales_volume: number
  investment: number
}

export interface ConsultingInventorySnapshot {
  id: string
  client_id: string
  reference_month: string
  active_stock: number
  total_stock: number
  avg_price: number
  avg_km: number
  percent_over_90_days: number
  source_payload?: Record<string, unknown>
}

export interface ConsultingStrategicPlan {
  id: string
  client_id: string
  title: string
  period_start: string | null
  period_end: string | null
  status: string
  diagnosis_summary: string | null
  market_comparison: Record<string, unknown>
  generated_payload: Record<string, unknown>
  generated_at: string
  created_at: string
  updated_at: string
}

export interface ConsultingActionItem {
  id: string
  client_id: string
  strategic_plan_id: string | null
  metric_key: string | null
  action: string
  how: string | null
  owner_name: string | null
  due_date: string | null
  completed_at: string | null
  status: 'nao_iniciado' | 'em_andamento' | 'atrasado' | 'realizado' | 'cancelado'
  efficacy: string | null
  priority: 1 | 2 | 3
  visit_number: number | null
  metric?: ConsultingMetricCatalogItem | null
}

export interface ConsultingGeneratedArtifact {
  id: string
  client_id: string
  strategic_plan_id: string | null
  artifact_type: string
  title: string
  content_md: string | null
  payload: Record<string, unknown>
  storage_path: string | null
  generated_at: string
}

export interface ConsultingClientDetail extends ConsultingClient {
  units?: ConsultingClientUnit[]
  contacts?: ConsultingClientContact[]
  assignments?: ConsultingAssignment[]
  visits?: ConsultingVisit[]
  financials?: ConsultingFinancial[]
  modules?: ConsultingClientModule[]
  inventory_snapshots?: ConsultingInventorySnapshot[]
}

export interface DREFinancial {
  id: string
  client_id: string
  reference_date: string
  revenue_proprios: number
  revenue_consignados: number
  revenue_repasse: number
  ded_preparacao: number
  ded_comissoes: number
  ded_impostos: number
  other_revenue_financiamento: number
  other_revenue_outros1: number
  other_revenue_outros2: number
  other_revenue_outros3: number
  payroll_salarios: number
  payroll_inss: number
  payroll_fgts: number
  payroll_seguro_social: number
  payroll_tempo_servico: number
  payroll_13salario: number
  payroll_ferias: number
  payroll_indenizacao: number
  payroll_outros: number
  pro_labore: number
  exp_fornecedores: number
  exp_agua: number
  exp_limpeza: number
  exp_viagens: number
  exp_energia: number
  exp_telefone: number
  exp_contabilidade: number
  exp_aluguel: number
  exp_frete: number
  exp_contribuicoes: number
  exp_terceiros: number
  exp_marketing: number
  exp_iptu: number
  exp_combustivel: number
  exp_manutencao_imovel: number
  exp_seguranca: number
  exp_cartorio: number
  exp_pos_venda: number
  exp_ir_csll: number
  exp_sistemas: number
  exp_emprestimo_pf: number
  exp_emprestimo_pj: number
  exp_tarifas: number
  exp_informatica: number
  exp_treinamentos: number
  exp_outras: number
  volume_vendas: number
  volume_leads?: number
  volume_agendamentos?: number
  capital_proprio: number
  revenue: number
  fixed_expenses: number
  marketing_expenses: number
  investments: number
  financing: number
  net_profit: number
  roi: number
  conversion_rate: number
  created_at: string
  updated_at: string
}

export interface DREComputed {
  gross_margin: number
  total_deductions: number
  net_sales_margin: number
  other_revenue: number
  gross_profit: number
  total_payroll: number
  total_fixed: number
  pro_labore: number
  total_expenses: number
  net_profit: number
  avg_ticket: number
  margin_per_car: number
  net_margin_per_car: number
  prep_cost_per_car: number
  posvenda_per_car: number
  profit_per_car: number
  rentability: number
  cac: number
  lead_to_agd_rate?: number
  agd_to_sale_rate?: number
}
