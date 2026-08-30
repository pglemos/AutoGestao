import { z } from 'zod'

export const ConsultingVisitSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  visit_number: z.number(),
  scheduled_at: z.string(),
  duration_hours: z.number(),
  modality: z.string(),
  status: z.enum(['agendada', 'concluida', 'cancelada', 'em_andamento']),
  consultant_id: z.string().nullable(),
  auxiliary_consultant_id: z.string().nullable(),
  consultant: z.object({ name: z.string().nullable(), email: z.string().nullable() }).nullable().optional(),
  auxiliary_consultant: z.object({ name: z.string().nullable(), email: z.string().nullable() }).nullable().optional(),
  objective: z.string().nullable(),
  visit_reason: z.string().nullable().optional(),
  target_audience: z.string().nullable().optional(),
  product_name: z.string().nullable().optional(),
  analysis_period_start: z.string().nullable().optional(),
  analysis_period_end: z.string().nullable().optional(),
  analysis_period_preset: z.string().nullable().optional(),
  checklist_data: z.array(z.object({ task: z.string(), completed: z.boolean() })).optional().default([]),
  feedback_client: z.string().nullable(),
  executive_summary: z.string().nullable(),
  google_event_id: z.string().nullable(),
  meta_mensal: z.string().nullable(),
  projecao: z.string().nullable(),
  leads_mes: z.string().nullable(),
  estoque_disponivel: z.string().nullable(),
  consultant_name_manual: z.string().nullable().optional(),
  effective_visit_date: z.string().nullable().optional(),
  acknowledged_at: z.string().nullable().optional(),
  acknowledged_by: z.string().uuid().nullable().optional(),
  next_cycle_goal: z.string().nullable().optional(),
  quant_data: z.unknown().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingVisit = z.infer<typeof ConsultingVisitSchema>

export function parseConsultingVisitArray(data: unknown): ConsultingVisit[] {
  return z.array(ConsultingVisitSchema).parse(data)
}

export const ConsultingClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().optional(),
  legal_name: z.string().nullable(),
  cnpj: z.string().nullable(),
  product_name: z.string().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  modality: z.enum(['Presencial', 'Online']).optional(),
  current_visit_step: z.number().optional(),
  journey_completed_visits: z.number().optional(),
  journey_total_visits: z.number().optional(),
  program_template_key: z.string().optional(),
  store_id: z.string().uuid().nullable().optional(),
  primary_store_id: z.string().uuid().nullable().optional(),
  legacy_migration_summary: z.string().nullable().optional(),
  legacy_migrated_at: z.string().nullable().optional(),
  legacy_migrated_by: z.string().uuid().nullable().optional(),
  created_by: z.string().nullable(),
  // Cadastro administrativo (módulo Administrador MX).
  structure_type: z.string().nullable().optional(),
  business_phase: z.string().nullable().optional(),
  implementation_owner_id: z.string().uuid().nullable().optional(),
  contract_start_date: z.string().nullable().optional(),
  contract_end_date: z.string().nullable().optional(),
  onboarding_step: z.number().nullable().optional(),
  onboarding_completed: z.boolean().nullable().optional(),
  last_visit_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingClient = z.infer<typeof ConsultingClientSchema>

export function parseConsultingClient(data: unknown): ConsultingClient {
  return ConsultingClientSchema.parse(data)
}

export function parseConsultingClientArray(data: unknown): ConsultingClient[] {
  return z.array(ConsultingClientSchema).parse(data)
}

export const ConsultingClientUnitSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  is_primary: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingClientUnit = z.infer<typeof ConsultingClientUnitSchema>

export function parseConsultingClientUnitArray(data: unknown): ConsultingClientUnit[] {
  return z.array(ConsultingClientUnitSchema).parse(data)
}

export const ConsultingClientContactSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string().nullable(),
  is_primary: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingClientContact = z.infer<typeof ConsultingClientContactSchema>

export function parseConsultingClientContactArray(data: unknown): ConsultingClientContact[] {
  return z.array(ConsultingClientContactSchema).parse(data)
}

export const ConsultingAssignmentSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  user_id: z.string(),
  assignment_role: z.enum(['responsavel', 'auxiliar', 'viewer']),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
  }).nullable().optional(),
})

export type ConsultingAssignment = z.infer<typeof ConsultingAssignmentSchema>

export function parseConsultingAssignmentArray(data: unknown): ConsultingAssignment[] {
  return z.array(ConsultingAssignmentSchema).parse(data)
}

export const ConsultingMethodologyStepSchema = z.object({
  id: z.string().uuid(),
  visit_number: z.number(),
  objective: z.string(),
  target: z.string().nullable(),
  duration: z.string().nullable(),
  evidence_required: z.string().nullable(),
  checklist_template: z.array(z.union([z.string(), z.object({ task: z.string(), completed: z.boolean().optional() })])).optional().default([]),
})

export type ConsultingMethodologyStep = z.infer<typeof ConsultingMethodologyStepSchema>

export function parseConsultingMethodologyStepArray(data: unknown): ConsultingMethodologyStep[] {
  return z.array(ConsultingMethodologyStepSchema).parse(data)
}

export const ConsultingFinancialSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  reference_date: z.string(),
  revenue: z.number(),
  fixed_expenses: z.number(),
  marketing_expenses: z.number(),
  investments: z.number(),
  financing: z.number(),
  net_profit: z.number(),
  roi: z.number(),
  conversion_rate: z.number(),
  volume_vendas: z.number().optional().default(0),
  volume_leads: z.number().optional().default(0),
  volume_agendamentos: z.number().optional().default(0),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingFinancial = z.infer<typeof ConsultingFinancialSchema>

export function parseConsultingFinancialArray(data: unknown): ConsultingFinancial[] {
  return z.array(ConsultingFinancialSchema).parse(data)
}

export const ConsultingVisitProgramSchema = z.object({
  program_key: z.string(),
  name: z.string(),
  total_visits: z.number(),
  active: z.boolean(),
})

export type ConsultingVisitProgram = z.infer<typeof ConsultingVisitProgramSchema>

export function parseConsultingVisitProgram(data: unknown): ConsultingVisitProgram {
  return ConsultingVisitProgramSchema.parse(data)
}

export function parseConsultingVisitProgramArray(data: unknown): ConsultingVisitProgram[] {
  return z.array(ConsultingVisitProgramSchema).parse(data)
}

export const ConsultingClientModuleSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  module_key: z.enum(['diagnostics', 'strategic_plan', 'action_plan', 'dre', 'monthly_close', 'daily_tracking']),
  label: z.string(),
  enabled: z.boolean(),
  premium: z.boolean(),
  notes: z.string().nullable(),
  configured_by: z.string().nullable(),
  configured_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingClientModule = z.infer<typeof ConsultingClientModuleSchema>

export function parseConsultingClientModuleArray(data: unknown): ConsultingClientModule[] {
  return z.array(ConsultingClientModuleSchema).parse(data)
}

export const PmrFormFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'number', 'scale', 'boolean', 'select', 'file']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
})

export type PmrFormField = z.infer<typeof PmrFormFieldSchema>

export const PmrFormTemplateSchema = z.object({
  id: z.string().uuid(),
  form_key: z.string(),
  title: z.string(),
  target_role: z.string(),
  visit_number: z.number(),
  fields: z.array(PmrFormFieldSchema),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type PmrFormTemplate = z.infer<typeof PmrFormTemplateSchema>

export function parsePmrFormTemplateArray(data: unknown): PmrFormTemplate[] {
  return z.array(PmrFormTemplateSchema).parse(data)
}

export const PmrFormResponseSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  visit_id: z.string().nullable(),
  template_id: z.string(),
  respondent_name: z.string().nullable(),
  respondent_role: z.string().nullable(),
  answers: z.record(z.string(), z.unknown()),
  summary: z.string().nullable(),
  submitted_by: z.string().nullable(),
  submitted_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  template: PmrFormTemplateSchema.nullable().optional(),
})

export type PmrFormResponse = z.infer<typeof PmrFormResponseSchema>

export function parsePmrFormResponseArray(data: unknown): PmrFormResponse[] {
  return z.array(PmrFormResponseSchema).parse(data)
}

export const ConsultingMetricCatalogItemSchema = z.object({
  metric_key: z.string(),
  label: z.string(),
  direction: z.enum(['increase', 'decrease']),
  value_type: z.enum(['number', 'percent', 'currency']),
  area: z.string(),
  source_scope: z.string(),
  formula_key: z.string().nullable(),
  active: z.boolean(),
  sort_order: z.number(),
})

export type ConsultingMetricCatalogItem = z.infer<typeof ConsultingMetricCatalogItemSchema>

export function parseConsultingMetricCatalogArray(data: unknown): ConsultingMetricCatalogItem[] {
  return z.array(ConsultingMetricCatalogItemSchema).parse(data)
}

export const ConsultingParameterSetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  active: z.boolean(),
  source_reference: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingParameterSet = z.infer<typeof ConsultingParameterSetSchema>

export const ConsultingParameterValueSchema = z.object({
  id: z.string().uuid(),
  parameter_set_id: z.string(),
  metric_key: z.string(),
  market_average: z.number().nullable(),
  best_practice: z.number().nullable(),
  target_default: z.number().nullable(),
  red_threshold: z.number().nullable(),
  yellow_threshold: z.number().nullable(),
  green_threshold: z.number().nullable(),
  formula: z.record(z.string(), z.unknown()),
  notes: z.string().nullable(),
  metric: ConsultingMetricCatalogItemSchema.nullable().optional(),
})

export type ConsultingParameterValue = z.infer<typeof ConsultingParameterValueSchema>

export function parseConsultingParameterValueArray(data: unknown): ConsultingParameterValue[] {
  return z.array(ConsultingParameterValueSchema).parse(data)
}

export const ConsultingMetricTargetSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  metric_key: z.string(),
  reference_month: z.string(),
  target_value: z.number(),
  source: z.string(),
})

export type ConsultingMetricTarget = z.infer<typeof ConsultingMetricTargetSchema>

export function parseConsultingMetricTargetArray(data: unknown): ConsultingMetricTarget[] {
  return z.array(ConsultingMetricTargetSchema).parse(data)
}

export const ConsultingMetricResultSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  metric_key: z.string(),
  reference_date: z.string(),
  result_value: z.number(),
  source: z.string(),
  source_payload: z.record(z.string(), z.unknown()),
})

export type ConsultingMetricResult = z.infer<typeof ConsultingMetricResultSchema>

export function parseConsultingMetricResultArray(data: unknown): ConsultingMetricResult[] {
  return z.array(ConsultingMetricResultSchema).parse(data)
}

export const ConsultingMarketingMonthlySchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  reference_month: z.string(),
  media: z.string(),
  leads_volume: z.number(),
  sales_volume: z.number(),
  investment: z.number(),
})

export type ConsultingMarketingMonthly = z.infer<typeof ConsultingMarketingMonthlySchema>

export function parseConsultingMarketingMonthlyArray(data: unknown): ConsultingMarketingMonthly[] {
  return z.array(ConsultingMarketingMonthlySchema).parse(data)
}

export const ConsultingInventorySnapshotSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  reference_month: z.string(),
  active_stock: z.number(),
  total_stock: z.number(),
  avg_price: z.number(),
  avg_km: z.number(),
  percent_over_90_days: z.number(),
  source_payload: z.record(z.string(), z.unknown()).optional().default({}),
})

export type ConsultingInventorySnapshot = z.infer<typeof ConsultingInventorySnapshotSchema>

export function parseConsultingInventorySnapshotArray(data: unknown): ConsultingInventorySnapshot[] {
  return z.array(ConsultingInventorySnapshotSchema).parse(data)
}

export const ConsultingStrategicPlanSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  title: z.string(),
  period_start: z.string().nullable(),
  period_end: z.string().nullable(),
  status: z.string(),
  diagnosis_summary: z.string().nullable(),
  market_comparison: z.record(z.string(), z.unknown()),
  generated_payload: z.record(z.string(), z.unknown()),
  generated_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ConsultingStrategicPlan = z.infer<typeof ConsultingStrategicPlanSchema>

export function parseConsultingStrategicPlanArray(data: unknown): ConsultingStrategicPlan[] {
  return z.array(ConsultingStrategicPlanSchema).parse(data)
}

export const ConsultingActionItemSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  strategic_plan_id: z.string().nullable(),
  metric_key: z.string().nullable(),
  action: z.string(),
  how: z.string().nullable(),
  owner_name: z.string().nullable(),
  due_date: z.string().nullable(),
  completed_at: z.string().nullable(),
  status: z.enum(['nao_iniciado', 'em_andamento', 'atrasado', 'realizado', 'cancelado']),
  efficacy: z.string().nullable(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  visit_number: z.number().nullable(),
  metric: ConsultingMetricCatalogItemSchema.nullable().optional(),
})

export type ConsultingActionItem = z.infer<typeof ConsultingActionItemSchema>

export function parseConsultingActionItemArray(data: unknown): ConsultingActionItem[] {
  return z.array(ConsultingActionItemSchema).parse(data)
}

export const ConsultingGeneratedArtifactSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string(),
  strategic_plan_id: z.string().nullable(),
  artifact_type: z.string(),
  title: z.string(),
  content_md: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  storage_path: z.string().nullable(),
  generated_at: z.string(),
})

export type ConsultingGeneratedArtifact = z.infer<typeof ConsultingGeneratedArtifactSchema>

export function parseConsultingGeneratedArtifactArray(data: unknown): ConsultingGeneratedArtifact[] {
  return z.array(ConsultingGeneratedArtifactSchema).parse(data)
}
