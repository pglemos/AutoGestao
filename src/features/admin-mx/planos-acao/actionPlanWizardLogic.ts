import { supabase } from '@/lib/supabase'
import { describeAdminRpcError } from '../equipe/adminRpcErrors'
import type { TemplateItemPriority } from './actionPlanTemplates'
import { departmentLabel } from './departmentTaxonomy'
import { matchCanonicalIndicator } from '../indicadores/canonicalBase44Catalog'

/**
 * Lógica pura do wizard de plano de ação por cliente (Base44
 * `ClientActionPlanWizard`). Sem imports de Supabase — testável sem banco.
 */

export type WizardDirection = 'AUMENTAR' | 'DIMINUIR' | 'MANTER' | 'FAIXA' | 'CORRIGIR_PROCESSO'

export type WizardStep = 1 | 2 | 3 | 4
export type ActionPlanScopeMode = 'all_units' | 'single_unit'

export type WizardAction = {
  titulo: string
  como: string
}

export type ClientActionPlanWizardForm = {
  clientId: string
  clientName: string
  scopeMode: ActionPlanScopeMode
  storeId: string
  department: string
  indicatorId: string
  indicatorName: string
  title: string
  direction: WizardDirection
  origin: 'manual' | 'consultor'
  problem: string
  actions: WizardAction[]
  responsibleId: string
  responsibleName: string
  participants: string
  startDate: string
  dueDate: string
  priority: TemplateItemPriority
  efficacyIndicatorName: string
  expectedImpact: string
  alsoCreateTemplate: boolean
}

export function emptyWizardForm(): ClientActionPlanWizardForm {
  return {
    clientId: '',
    clientName: '',
    scopeMode: 'all_units',
    storeId: '',
    department: '',
    indicatorId: '',
    indicatorName: '',
    title: '',
    direction: 'AUMENTAR',
    origin: 'consultor',
    problem: '',
    actions: [{ titulo: '', como: '' }],
    responsibleId: '',
    responsibleName: '',
    participants: '',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    priority: 'media',
    efficacyIndicatorName: '',
    expectedImpact: '',
    alsoCreateTemplate: false,
  }
}

export const WIZARD_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 1, label: 'Indicador' },
  { id: 2, label: 'Ações' },
  { id: 3, label: 'Prazo e Meta' },
  { id: 4, label: 'Revisão' },
]

export const DIRECTION_LABELS: Record<WizardDirection, string> = {
  AUMENTAR: 'Aumentar',
  DIMINUIR: 'Reduzir',
  MANTER: 'Manter',
  FAIXA: 'Atingir faixa ideal',
  CORRIGIR_PROCESSO: 'Corrigir processo',
}

export const DIRECTION_OPTIONS = (Object.keys(DIRECTION_LABELS) as WizardDirection[]).map(code => ({
  code,
  label: DIRECTION_LABELS[code],
}))

/** Prioridades aceitas pelo enum action_priority do banco. */
export const WIZARD_PRIORITIES: Array<{ value: TemplateItemPriority; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

/**
 * Pesos em basis points (total 10000) distribuídos uniformemente entre as
 * ações, com o resto distribuído nas primeiras. Espelha o Base44.
 */
export function calculateWeights(actionCount: number): Array<{ weight_basis_points: number; weight_percentage_display: string }> {
  if (actionCount <= 0) return []
  const base = Math.floor(10000 / actionCount)
  const remainder = 10000 - base * actionCount
  const weights: Array<{ weight_basis_points: number; weight_percentage_display: string }> = []
  for (let i = 0; i < actionCount; i += 1) {
    const bp = base + (i < remainder ? 1 : 0)
    weights.push({ weight_basis_points: bp, weight_percentage_display: `${(bp / 100).toFixed(2)}%` })
  }
  return weights
}

/** Sugere título do plano a partir da direção e do indicador. */
export function suggestTitle(direction: WizardDirection, indicatorName: string): string {
  if (!indicatorName) return ''
  const dirLabel = DIRECTION_LABELS[direction] ?? 'Melhorar'
  const cleanName = indicatorName.replace(/%/g, '').replace(/^[\s%]+/, '').trim()
  if (!cleanName) return ''
  const lowerName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1)
  return `${dirLabel} ${lowerName}`
}

/** Valida o passo do wizard. Retorna lista de erros; vazia = OK. */
export function validateWizardStep(step: WizardStep, form: ClientActionPlanWizardForm): string[] {
  const errors: string[] = []
  if (step === 1) {
    if (!form.clientId) errors.push('Selecione um cliente.')
    if (form.clientId && form.scopeMode === 'single_unit' && !form.storeId) errors.push('Selecione a unidade operacional do cliente.')
    if (!form.department.trim()) errors.push('Selecione um departamento.')
    if (!form.indicatorId) errors.push('Selecione um indicador.')
    if (!form.title.trim()) errors.push('Informe o título do plano.')
  }
  if (step === 2) {
    if (!form.actions.length) errors.push('Adicione pelo menos uma ação.')
    else if (form.actions.some(action => !action.titulo.trim())) errors.push('Informe o nome de todas as ações.')
  }
  if (step === 3) {
    if (!form.responsibleId) errors.push('Selecione um responsável.')
    if (!form.dueDate) errors.push('Informe o prazo final.')
  }
  return errors
}

/**
 * O Base44 aplica o plano ao cliente. Como o schema MX materializa o contrato
 * em `planos_acao(scope_type=store)`, o modo padrão replica a mesma ação em
 * todas as unidades ativas; o modo unitário preserva a exceção operacional.
 */
export function resolveActionPlanTargetStoreIds(
  form: Pick<ClientActionPlanWizardForm, 'scopeMode' | 'storeId'>,
  availableStoreIds: string[],
): string[] {
  if (form.scopeMode === 'single_unit') return form.storeId ? [form.storeId] : []
  return [...new Set(availableStoreIds.filter(Boolean))]
}

/** Data de vencimento padrão: 30 dias após o início, se não informada. */
export function resolveWizardDueDate(startDate: string, dueDate: string): string {
  if (dueDate) return dueDate
  const start = new Date(`${startDate}T12:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return dueDate
  const due = new Date(start)
  due.setDate(due.getDate() + 30)
  return due.toISOString().slice(0, 10)
}

/** Converte o form em payload de INSERT em planos_acao. */
export function buildPlanPayload(input: {
  form: ClientActionPlanWizardForm
  storeId: string | null
  userId: string
}): Record<string, unknown> {
  const { form, storeId, userId } = input
  const dueDate = resolveWizardDueDate(form.startDate, form.dueDate)
  const firstAction = form.actions[0]
  return {
    scope_type: 'store',
    scope_id: storeId,
    departamento: departmentLabel(form.department) === '—' ? (form.department.trim() || 'Geral') : departmentLabel(form.department),
    indicador: matchCanonicalIndicator(form.indicatorId)?.code ?? form.indicatorId.trim() ?? form.indicatorName.trim() ?? 'Não definido',
    problema: form.problem.trim() || 'Problema identificado pela equipe de consultoria.',
    acao: form.title.trim(),
    como: firstAction?.como.trim() || null,
    responsavel_id: form.responsibleId || null,
    prazo: dueDate,
    prioridade: form.priority,
    origem: form.origin,
    objetivo: form.expectedImpact.trim() || null,
    participants: form.participants.trim() || null,
    efficacy_indicator: form.efficacyIndicatorName.trim() || null,
    reference_year: new Date().getFullYear(),
    checklist: buildChecklistItems(form.actions),
    created_by: userId,
  }
}

/** Campos que a RPC de criação não recebe e precisam ir no patch autenticado. */
export function buildCreatedPlanPatch(
  form: ClientActionPlanWizardForm,
  application?: { requestId: string; unitCount: number },
): Record<string, unknown> {
  return {
    checklist: buildChecklistItems(form.actions),
    participants: form.participants.trim() || null,
    efficacy_indicator: form.efficacyIndicatorName.trim() || null,
    reference_year: new Date().getFullYear(),
    iniciado_at: form.startDate || null,
    ...(application?.requestId
      ? {
          transition_metadata: {
            client_application_request_id: application.requestId,
            client_id: form.clientId,
            scope_mode: form.scopeMode,
            unit_count: application.unitCount,
          },
        }
      : {}),
  }
}

/** Indica se a RPC atômica ainda não está publicada no banco remoto. */
export function needsLegacyActionPlanCreate(error: { message?: string; code?: string } | null | undefined): boolean {
  const blob = `${error?.code ?? ''} ${error?.message ?? ''}`
  return /PGRST202|PGRST203|Could not find the function|schema cache|does not exist|argument/i.test(blob)
}

async function createPlanViaLegacyRpc(input: {
  payload: Record<string, unknown>
  patch: Record<string, unknown>
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('criar_plano_acao_v2', {
    p_scope_type: 'store',
    p_scope_id: String(input.payload.scope_id),
    p_objetivo: String(input.payload.objetivo ?? ''),
    p_departamento: String(input.payload.departamento),
    p_indicador: String(input.payload.indicador),
    p_problema: String(input.payload.problema),
    p_acao: String(input.payload.acao),
    p_como: input.payload.como as string | null,
    p_responsavel_id: input.payload.responsavel_id as string | null,
    p_prazo: input.payload.prazo as string,
    p_prioridade: input.payload.prioridade as ClientActionPlanWizardForm['priority'],
    p_origem: input.payload.origem as ClientActionPlanWizardForm['origin'],
  })
  if (error || !data) {
    return { data: null, error: describeAdminRpcError(error, 'Falha ao criar o plano de ação.') }
  }
  const plan = data as { id: string }
  const { error: patchError } = await supabase.rpc('atualizar_plano_acao_patch', {
    p_plano_id: plan.id,
    p_patch: input.patch,
  })
  if (patchError) {
    return { data: plan, error: describeAdminRpcError(patchError, 'Plano criado, mas falhou ao gravar checklist e metadados.') }
  }
  return { data: plan, error: null }
}

/**
 * Cria um plano por unidade via RPC autorizada, depois grava checklist e
 * campos extras. Insert direto em `planos_acao` cai no RLS/hardening.
 */
export async function createClientActionPlans(input: {
  form: ClientActionPlanWizardForm
  storeIds: string[]
  userId: string
}): Promise<{ error: string | null; created: number; ids: string[] }> {
  const ids: string[] = []
  const requestId = globalThis.crypto?.randomUUID?.() ?? `client-app-${Date.now()}`
  const createdPatch = buildCreatedPlanPatch(input.form, {
    requestId,
    unitCount: input.storeIds.length,
  })
  for (const storeId of input.storeIds) {
    const payload = buildPlanPayload({ form: input.form, storeId, userId: input.userId })
    const atomicArgs = {
      p_scope_type: 'store' as const,
      p_scope_id: storeId,
      p_objetivo: String(payload.objetivo ?? ''),
      p_departamento: String(payload.departamento),
      p_indicador: String(payload.indicador),
      p_problema: String(payload.problema),
      p_acao: String(payload.acao),
      p_como: payload.como as string | null,
      p_responsavel_id: payload.responsavel_id as string | null,
      p_prazo: payload.prazo as string,
      p_prioridade: payload.prioridade as ClientActionPlanWizardForm['priority'],
      p_origem: payload.origem as ClientActionPlanWizardForm['origin'],
      p_checklist: createdPatch.checklist ?? buildChecklistItems(input.form.actions),
      p_participants: createdPatch.participants as string | null,
      p_efficacy_indicator: createdPatch.efficacy_indicator as string | null,
      p_reference_year: createdPatch.reference_year as number,
      p_iniciado_at: createdPatch.iniciado_at as string | null,
      p_transition_metadata: createdPatch.transition_metadata ?? null,
    }
    const { data, error } = await supabase.rpc('criar_plano_acao_v2', atomicArgs)
    let planId: string | null = data ? (data as { id: string }).id : null
    let createError: { message?: string; code?: string } | null = error

    if ((error || !data) && needsLegacyActionPlanCreate(error)) {
      const legacy = await createPlanViaLegacyRpc({ payload, patch: createdPatch })
      planId = legacy.data?.id ?? null
      createError = legacy.error ? { message: legacy.error } : null
    }

    if (createError || !planId) {
      return {
        error: describeAdminRpcError(createError, 'Falha ao criar o plano de ação.'),
        created: ids.length,
        ids,
      }
    }
    ids.push(planId)
  }
  return { error: null, created: ids.length, ids }
}

/**
 * Ações ponderadas em formato JSONB para a coluna `checklist` de planos_acao.
 * Cada item carrega título, instruções e peso (basis points + exibição).
 */
export function buildChecklistItems(actions: WizardAction[]): Array<Record<string, unknown>> {
  const weights = calculateWeights(actions.length)
  return actions.map((action, index) => ({
    titulo: action.titulo.trim(),
    como: action.como.trim() || null,
    peso_bp: weights[index]?.weight_basis_points ?? 0,
    peso_pct: weights[index]?.weight_percentage_display ?? '0.00%',
    status: 'pendente',
  }))
}

/**
 * Saneamento de texto para promoção a template: remove nome do cliente,
 * CNPJs e datas. Espelha o Base44 `sanitizeTextForTemplate`.
 */
export function sanitizeTextForTemplate(text: string, clientName: string): string {
  if (!text) return ''
  let sanitized = text
  if (clientName) {
    const parts = clientName.split(/\s+/).filter(part => part.length > 2)
    for (const part of parts) {
      sanitized = sanitized.replace(new RegExp(part, 'gi'), '[cliente]')
    }
  }
  sanitized = sanitized.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '[CNPJ]')
  sanitized = sanitized.replace(/\d{2}\/\d{2}\/\d{4}/g, '[data]')
  sanitized = sanitized.replace(/até\s+\d{2}\/\d{2}/gi, 'dentro do prazo definido')
  return sanitized.trim()
}

/**
 * Itens de template a partir do checklist ponderado de um plano (promoção).
 * Mantém título, como e prazo em dias sugerido (30), sem dados do cliente.
 */
export function buildTemplateItemsFromChecklist(
  checklist: Array<Record<string, unknown>>,
  clientName: string,
): Array<{ problema: string; acao: string; como: string; departamento: string; indicador: string; prioridade: TemplateItemPriority; prazo_dias: number | null; evidencia_requerida: boolean }> {
  if (!checklist?.length) return []
  return checklist.map(item => ({
    problema: '',
    acao: sanitizeTextForTemplate(String(item.titulo ?? ''), clientName) || 'Executar ação',
    como: sanitizeTextForTemplate(String(item.como ?? ''), clientName),
    departamento: '',
    indicador: '',
    prioridade: 'media' as TemplateItemPriority,
    prazo_dias: 30,
    evidencia_requerida: false,
  }))
}

/**
 * Promove um plano de ação existente a template em rascunho. Sanea dados do
 * cliente (nome, CNPJ, datas) e cria um rascunho na biblioteca sem publicar.
 */
export async function promotePlanToTemplate(input: {
  planId: string
  userId: string
}): Promise<{ error: string | null; templateId: string | null }> {
  const { data: plan, error } = await supabase
    .from('planos_acao')
    .select('id, codigo, departamento, indicador, problema, acao, como, prioridade, checklist, scope_id')
    .eq('id', input.planId)
    .maybeSingle()
  if (error || !plan) return { error: error?.message ?? 'Plano não encontrado.', templateId: null }

  const { data: client } = await supabase
    .from('clientes_consultoria')
    .select('name')
    .eq('primary_store_id', plan.scope_id as string)
    .maybeSingle()
  const clientName = client?.name ?? ''

  const items = buildTemplateItemsFromChecklist((plan.checklist as Array<Record<string, unknown>> | null) ?? [], clientName)
  const fallbackItems = [
    {
      problema: sanitizeTextForTemplate(plan.problema ?? '', clientName),
      acao: sanitizeTextForTemplate(plan.acao ?? 'Executar ação', clientName),
      como: sanitizeTextForTemplate(plan.como ?? '', clientName),
      departamento: '',
      indicador: '',
      prioridade: 'media' as TemplateItemPriority,
      prazo_dias: 30,
      evidencia_requerida: false,
    },
  ]

  const title = sanitizeTextForTemplate(plan.acao ?? 'Plano de ação', clientName) || 'Plano de ação'
  const templateKey = `pa_${plan.departamento.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${Date.now().toString(36)}`

  const { data: template, error: templateError } = await supabase
    .from('planos_acao_templates')
    .insert({
      template_key: templateKey,
      nome: title,
      departamento: plan.departamento,
      indicador: plan.indicador || null,
      descricao: null,
      program_key: null,
      active: true,
      created_by: input.userId,
    })
    .select('id')
    .single()
  if (templateError || !template) return { error: templateError?.message ?? 'Falha ao criar o template.', templateId: null }

  const { data: version, error: versionError } = await supabase
    .from('planos_acao_template_versoes')
    .insert({ template_id: template.id, versao: 1, status: 'rascunho', created_by: input.userId })
    .select('id')
    .single()
  if (versionError || !version) return { error: versionError?.message ?? 'Falha ao criar a versão.', templateId: template.id }

  const effectiveItems = items.length ? items : fallbackItems
  const { error: itemsError } = await supabase.from('planos_acao_template_itens').insert(
    effectiveItems.map((item, index) => ({
      version_id: version.id,
      ordem: index + 1,
      problema: item.problema || 'Problema identificado na loja.',
      acao: item.acao,
      como: item.como || null,
      departamento: item.departamento || plan.departamento,
      indicador: item.indicador || plan.indicador || null,
      prioridade: item.prioridade,
      prazo_dias: item.prazo_dias,
      evidencia_requerida: item.evidencia_requerida,
    })),
  )
  if (itemsError) return { error: itemsError.message, templateId: template.id }

  return { error: null, templateId: template.id }
}
