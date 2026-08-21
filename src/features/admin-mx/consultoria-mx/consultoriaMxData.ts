// Camada de dados da rota Consultoria MX (admin).
// Traduz as entidades do Base44 para as tabelas MX existentes/nova:
//   ConsultingProduct            -> programas_visita_consultoria
//   EncounterTemplate (estrutura)-> etapas_modelo_visita_consultoria
//   ConsultingMethodologyVersion -> versoes_metodologia_produto
//   EncounterMethodologyContent  -> conteudo_encontro
//   ConsultantEncounterGuide     -> guia_consultor_encontro
//   EncounterContentReference    -> conteudo_referencia_encontro (+ biblioteca_materiais)
//   EncounterDeliverableTemplate -> entregas_encontro
//   EncounterEvidenceTemplate    -> evidencias_encontro
//   EncounterReportTemplate      -> vinculo_modelo_relatorio_encontro
//   ReportTemplate               -> modelos_relatorio
//   EncounterActionPlanReference -> vinculo_plano_acao_encontro
//   LearningContent              -> universidade_aulas
//   AuditLog                     -> logs_auditoria_consultoria_mx

import { supabase } from '@/lib/supabase'

export type MethodologyVersion = {
  id: string
  program_key: string
  product_name: string | null
  product_version_number: number | null
  methodology_version_number: string
  status: 'rascunho' | 'em_revisao' | 'publicado' | 'substituido' | 'arquivado'
  effective_from: string | null
  effective_until: string | null
  change_summary: string | null
  encounters_configured: number
  encounters_pending: number
  videos_count: number
  files_count: number
  report_templates_count: number
  published_at: string | null
  created_at: string
}

export type ProductWithMethodology = {
  program_key: string
  name: string | null
  status: string | null
  versao: number
  total_visits: number | null
  modalidade: string | null
  versions: MethodologyVersion[]
}

export type StructuralEncounter = {
  visit_number: number
  objective: string
  duration: string | null
  target: string | null
  active: boolean
}

export type EncounterContent = {
  id?: string
  methodology_version_id: string
  visit_number: number
  objective: string | null
  reason: string | null
  expected_result: string | null
  required_participant_roles: string | null
  recommended_participant_roles: string | null
  prerequisites: string | null
  client_observation: string | null
  owner_visibility: boolean
  can_be_anticipated: boolean
}

export type ConsultantGuide = {
  id?: string
  methodology_version_id: string
  visit_number: number
  internal_objective: string | null
  preparation_instructions: string | null
  data_to_review: string | null
  suggested_questions: string | null
  facilitation_script: string | null
  attention_points: string | null
  required_decisions: string | null
  completion_criteria: string | null
  post_meeting_guidance: string | null
  methodological_notes: string | null
  preparation_checklist: unknown
}

export type ContentReference = {
  id: string
  methodology_version_id: string
  visit_number: number
  biblioteca_material_id: string | null
  content_type: string
  title: string
  description: string | null
  display_order: number
  required: boolean
  duration_minutes: number | null
  source_url: string | null
  thumbnail_url: string | null
  visibility: string
  category: string | null
  learning_content_id: string | null
  learning_content_name: string | null
  status: 'rascunho' | 'em_revisao' | 'publicado' | 'arquivado'
}

export type EncounterDeliverable = {
  id?: string
  methodology_version_id: string
  visit_number: number
  title: string
  description: string | null
  execution_instruction: string | null
  required: boolean
  recommended_responsible_role: string | null
  deadline_offset_days: number
  delivery_moment: 'ANTES' | 'DURANTE' | 'DEPOIS'
  file_allowed: boolean
  file_required: boolean
  confirmation_required: boolean
  display_order: number
  status: 'rascunho' | 'publicado' | 'arquivado'
}

export type EncounterEvidence = {
  id?: string
  methodology_version_id: string
  visit_number: number
  name: string
  description: string | null
  required: boolean
  evidence_type: string
  recommended_responsible_role: string | null
  recommended_validator_role: string | null
  deadline_offset_days: number
  file_limit: number
  allowed_formats: string | null
  client_guidance: string | null
  display_order: number
  status: 'rascunho' | 'publicado' | 'arquivado'
}

export type ReportTemplate = {
  id: string
  name: string
  description: string | null
  product_key: string | null
  compatible_encounters: string | null
  sections: string[]
  instructions: string | null
  version_number: string
  status: 'rascunho' | 'publicado' | 'arquivado'
  published_at: string | null
  created_at: string
}

export type EncounterReportRef = {
  id?: string
  methodology_version_id: string
  visit_number: number
  report_template_id: string | null
  report_template_name: string | null
  report_required: boolean
  default_title: string | null
  author_role: string | null
  validator_role: string | null
  publication_deadline_days: number
  visibility: string
  attachment_allowed: boolean
  attachment_required: boolean
  action_plan_creation_allowed: boolean
  status: 'rascunho' | 'publicado' | 'arquivado'
}

export type EncounterActionPlanRef = {
  id: string
  methodology_version_id: string
  visit_number: number
  action_plan_template_version_id: string | null
  action_plan_template_name: string | null
  recommendation_enabled: boolean
  display_order: number
  status: 'ativo' | 'inativo'
}

export type LibraryMaterial = {
  id: string
  title: string
  description: string | null
  content_type: string
  category: string | null
  source_url: string | null
  file_asset_name: string | null
  file_asset_path: string | null
  visibility: string
  program_key: string | null
  status: 'rascunho' | 'em_revisao' | 'publicado' | 'arquivado'
  created_at: string
}

export type AuditEntry = {
  id: string
  user_name: string | null
  user_role: string | null
  action: string
  value_after: string | null
  origin: string | null
  created_at: string
}

export type PublishedPlanTemplate = {
  id: string
  title: string
  department: string | null
}

const METHODOLOGY_VERSION_COLUMNS = 'id,program_key,product_name,product_version_number,methodology_version_number,status,effective_from,effective_until,change_summary,encounters_configured,encounters_pending,videos_count,files_count,report_templates_count,published_at,created_at' as const

/** Produtos com suas versões metodológicas — alimenta Visão Geral e Metodologia por Produto. */
export async function fetchProductsWithMethodology(): Promise<{ rows: ProductWithMethodology[]; error: string | null }> {
  const [{ data: products, error }, { data: versions }] = await Promise.all([
    supabase.from('programas_visita_consultoria').select('program_key, name, status, versao, total_visits, modalidade').order('name', { ascending: true }),
    supabase.from('versoes_metodologia_produto').select(METHODOLOGY_VERSION_COLUMNS).order('created_at', { ascending: false }),
  ])
  if (error) return { rows: [], error: error.message }

  const byProduct = new Map<string, MethodologyVersion[]>()
  for (const version of (versions ?? []) as unknown as MethodologyVersion[]) {
    byProduct.set(version.program_key, [...(byProduct.get(version.program_key) ?? []), version])
  }
  return {
    rows: (products ?? []).map(product => ({ ...product, versions: byProduct.get(product.program_key) ?? [] })) as ProductWithMethodology[],
    error: null,
  }
}

/** Estrutura da jornada de um produto com objetivos da versão (se informada). */
export async function fetchProductEncounters(programKey: string, versionId?: string | null): Promise<{ rows: StructuralEncounter[]; error: string | null }> {
  const [etapasResult, contentResult] = await Promise.all([
    supabase
      .from('etapas_modelo_visita_consultoria')
      .select('visit_number, objective, duration, target, active')
      .eq('program_key', programKey)
      .order('visit_number', { ascending: true }),
    versionId
      ? supabase
          .from('conteudo_encontro')
          .select('visit_number, objective')
          .eq('methodology_version_id', versionId)
      : Promise.resolve({ data: null, error: null }),
  ])

  if (etapasResult.error) return { rows: [], error: etapasResult.error.message }

  const contentByVisit = new Map<number, string>()
  if (contentResult.data) {
    for (const item of contentResult.data) {
      if (item.objective && item.objective.trim()) {
        contentByVisit.set(item.visit_number, item.objective.trim())
      }
    }
  }

  const merged = ((etapasResult.data ?? []) as StructuralEncounter[]).map(etapa => ({
    ...etapa,
    objective: contentByVisit.get(etapa.visit_number) || etapa.objective,
  }))

  return { rows: merged, error: null }
}

/** Cria a próxima versão metodológica de um produto (rascunho), clonando conteúdos da versão base se houver. */
export async function createMethodologyVersion(
  programKey: string,
  productName: string,
  productVersion: number,
  methodologyVersionNumber: string,
  totalEncounters: number,
  userId: string,
  sourceVersionId?: string | null
): Promise<{ version: MethodologyVersion | null; error: string | null }> {
  // Se não foi informada a versão base explicitamente, busca a versão publicada atual
  let baseId = sourceVersionId
  if (!baseId) {
    const { data: latestPublished } = await supabase
      .from('versoes_metodologia_produto')
      .select('id')
      .eq('program_key', programKey)
      .eq('status', 'publicado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    baseId = latestPublished?.id ?? null
  }

  const { data: newVersion, error } = await supabase
    .from('versoes_metodologia_produto')
    .insert({
      program_key: programKey,
      product_name: productName,
      product_version_number: productVersion,
      methodology_version_number: methodologyVersionNumber,
      status: 'rascunho',
      encounters_configured: 0,
      encounters_pending: totalEncounters,
      created_by: userId,
    })
    .select(METHODOLOGY_VERSION_COLUMNS)
    .single()

  if (error || !newVersion) return { version: null, error: error?.message ?? 'Falha ao criar a versão.' }

  const newVersionId = newVersion.id

  // Se existe versão base, clona todos os módulos e conteúdos
  if (baseId) {
    try {
      const [
        { data: contents },
        { data: guides },
        { data: refs },
        { data: deliverables },
        { data: evidence },
        { data: reportRefs },
        { data: actionPlans },
      ] = await Promise.all([
        supabase.from('conteudo_encontro').select('*').eq('methodology_version_id', baseId),
        supabase.from('guia_consultor_encontro').select('*').eq('methodology_version_id', baseId),
        supabase.from('conteudo_referencia_encontro').select('*').eq('methodology_version_id', baseId).neq('status', 'arquivado'),
        supabase.from('entregas_encontro').select('*').eq('methodology_version_id', baseId).neq('status', 'arquivado'),
        supabase.from('evidencias_encontro').select('*').eq('methodology_version_id', baseId).neq('status', 'arquivado'),
        supabase.from('vinculo_modelo_relatorio_encontro').select('*').eq('methodology_version_id', baseId).neq('status', 'arquivado'),
        supabase.from('vinculo_plano_acao_encontro').select('*').eq('methodology_version_id', baseId).eq('status', 'ativo'),
      ])

      const now = new Date().toISOString()

      if (contents && contents.length > 0) {
        await supabase.from('conteudo_encontro').insert(
          contents.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => ({
            ...rest,
            methodology_version_id: newVersionId,
            status: 'rascunho',
            created_at: now,
            updated_at: now,
          }))
        )
      }

      if (guides && guides.length > 0) {
        await supabase.from('guia_consultor_encontro').insert(
          guides.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => ({
            ...rest,
            methodology_version_id: newVersionId,
            status: 'rascunho',
            created_at: now,
            updated_at: now,
          }))
        )
      }

      if (refs && refs.length > 0) {
        await supabase.from('conteudo_referencia_encontro').insert(
          refs.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => ({
            ...rest,
            methodology_version_id: newVersionId,
            status: 'rascunho',
            created_at: now,
            updated_at: now,
          }))
        )
      }

      if (deliverables && deliverables.length > 0) {
        await supabase.from('entregas_encontro').insert(
          deliverables.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => ({
            ...rest,
            methodology_version_id: newVersionId,
            status: 'rascunho',
            created_at: now,
            updated_at: now,
          }))
        )
      }

      if (evidence && evidence.length > 0) {
        await supabase.from('evidencias_encontro').insert(
          evidence.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => ({
            ...rest,
            methodology_version_id: newVersionId,
            status: 'rascunho',
            created_at: now,
            updated_at: now,
          }))
        )
      }

      if (reportRefs && reportRefs.length > 0) {
        await supabase.from('vinculo_modelo_relatorio_encontro').insert(
          reportRefs.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => ({
            ...rest,
            methodology_version_id: newVersionId,
            status: 'rascunho',
            created_at: now,
            updated_at: now,
          }))
        )
      }

      if (actionPlans && actionPlans.length > 0) {
        await supabase.from('vinculo_plano_acao_encontro').insert(
          actionPlans.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => ({
            ...rest,
            methodology_version_id: newVersionId,
            status: 'ativo',
            created_at: now,
            updated_at: now,
          }))
        )
      }

      // Recalcula contadores
      await refreshMethodologyCounters(newVersionId, totalEncounters)
    } catch {
      // Falhas no clone não impedem a criação do rascunho
    }
  }

  return { version: newVersion as unknown as MethodologyVersion, error: null }
}

/** Publica um rascunho e marca a versão publicada anterior como substituída. */
export async function publishMethodologyVersion(version: MethodologyVersion, userId: string): Promise<{ error: string | null }> {
  const { error: replaceError } = await supabase
    .from('versoes_metodologia_produto')
    .update({ status: 'substituido', effective_until: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
    .eq('program_key', version.program_key)
    .eq('status', 'publicado')
  if (replaceError) return { error: replaceError.message }

  const { error } = await supabase
    .from('versoes_metodologia_produto')
    .update({
      status: 'publicado',
      published_at: new Date().toISOString(),
      published_by: userId,
      effective_from: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq('id', version.id)
  return { error: error?.message ?? null }
}

/** Atualiza os contadores de uma versão (configurados/pendentes). */
export async function updateMethodologyCounters(versionId: string, configured: number, total: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('versoes_metodologia_produto')
    .update({ encounters_configured: configured, encounters_pending: Math.max(0, total - configured), updated_at: new Date().toISOString() })
    .eq('id', versionId)
  return { error: error?.message ?? null }
}

/** Recálcula e grava os contadores da versão com base no objetivo configurado por encontro. */
export async function refreshMethodologyCounters(versionId: string, totalEncounters: number): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('conteudo_encontro')
    .select('objective')
    .eq('methodology_version_id', versionId)
  if (error) return { error: error.message }
  const configured = (data ?? []).filter(row => row.objective && row.objective.trim()).length
  return updateMethodologyCounters(versionId, configured, totalEncounters)
}

/** Tudo que o editor de encontro precisa carregar de uma vez. */
export async function fetchEncounterEditorData(versionId: string, visitNumber: number): Promise<{
  content: EncounterContent | null
  guide: ConsultantGuide | null
  contentRefs: ContentReference[]
  deliverables: EncounterDeliverable[]
  evidence: EncounterEvidence[]
  reportRef: EncounterReportRef | null
  actionPlans: EncounterActionPlanRef[]
  error: string | null
}> {
  const { data: content, error } = await supabase
    .from('conteudo_encontro')
    .select('*')
    .eq('methodology_version_id', versionId)
    .eq('visit_number', visitNumber)
    .maybeSingle()
  if (error) return { content: null, guide: null, contentRefs: [], deliverables: [], evidence: [], reportRef: null, actionPlans: [], error: error.message }

  const [{ data: guide }, { data: refs }, { data: deliverables }, { data: evidence }, { data: reportRef }, { data: actionPlans }] = await Promise.all([
    supabase.from('guia_consultor_encontro').select('*').eq('methodology_version_id', versionId).eq('visit_number', visitNumber).maybeSingle(),
    supabase.from('conteudo_referencia_encontro').select('*').eq('methodology_version_id', versionId).eq('visit_number', visitNumber).order('display_order', { ascending: true }),
    supabase.from('entregas_encontro').select('*').eq('methodology_version_id', versionId).eq('visit_number', visitNumber).order('display_order', { ascending: true }),
    supabase.from('evidencias_encontro').select('*').eq('methodology_version_id', versionId).eq('visit_number', visitNumber).order('display_order', { ascending: true }),
    supabase.from('vinculo_modelo_relatorio_encontro').select('*').eq('methodology_version_id', versionId).eq('visit_number', visitNumber).maybeSingle(),
    supabase.from('vinculo_plano_acao_encontro').select('*').eq('methodology_version_id', versionId).eq('visit_number', visitNumber).order('display_order', { ascending: true }),
  ])

  return {
    content: content as EncounterContent | null,
    guide: guide as ConsultantGuide | null,
    contentRefs: (refs ?? []) as ContentReference[],
    deliverables: (deliverables ?? []) as EncounterDeliverable[],
    evidence: (evidence ?? []) as EncounterEvidence[],
    reportRef: reportRef as EncounterReportRef | null,
    actionPlans: (actionPlans ?? []) as EncounterActionPlanRef[],
    error: null,
  }
}

/** Upsert do conteúdo (objetivo) do encontro. */
export async function saveEncounterContent(payload: Omit<EncounterContent, 'id' | 'status'>): Promise<{ error: string | null }> {
  const row = { ...payload, status: 'em_configuracao', updated_at: new Date().toISOString() }
  const { error } = await supabase
    .from('conteudo_encontro')
    .upsert(row, { onConflict: 'methodology_version_id,visit_number' })
  return { error: error?.message ?? null }
}

/** Upsert do guia do consultor. */
export async function saveConsultantGuide(payload: Omit<ConsultantGuide, 'id' | 'status'>): Promise<{ error: string | null }> {
  const row = { ...payload, status: 'em_configuracao', updated_at: new Date().toISOString() }
  const { error } = await supabase
    .from('guia_consultor_encontro')
    .upsert(row, { onConflict: 'methodology_version_id,visit_number' })
  return { error: error?.message ?? null }
}

/** Cria ou atualiza uma referência de conteúdo do encontro. */
export async function saveContentReference(payload: {
  id?: string
  methodology_version_id: string
  visit_number: number
  content_type: string
  title: string
  description?: string | null
  display_order?: number
  required?: boolean
  duration_minutes?: number | null
  source_url?: string | null
  thumbnail_url?: string | null
  visibility?: string
  category?: string | null
  biblioteca_material_id?: string | null
  learning_content_id?: string | null
  learning_content_name?: string | null
  status?: 'rascunho' | 'em_revisao' | 'publicado' | 'arquivado'
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('conteudo_referencia_encontro')
    .upsert({
      ...payload,
      description: payload.description ?? null,
      display_order: payload.display_order ?? 1,
      required: payload.required ?? true,
      duration_minutes: payload.duration_minutes ?? null,
      source_url: payload.source_url ?? null,
      thumbnail_url: payload.thumbnail_url ?? null,
      visibility: payload.visibility ?? 'OWNER_AND_TEAM',
      category: payload.category ?? null,
      biblioteca_material_id: payload.biblioteca_material_id ?? null,
      learning_content_id: payload.learning_content_id ?? null,
      learning_content_name: payload.learning_content_name ?? null,
      status: payload.status ?? 'rascunho',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id')
    .single()
  if (error || !data) return { id: null, error: error?.message ?? 'Falha ao salvar o conteúdo.' }
  return { id: data.id, error: null }
}

/** Arquivamento lógico de uma referência de conteúdo (nunca apaga). */
export async function archiveContentReference(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('conteudo_referencia_encontro')
    .update({ status: 'arquivado', updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Cria ou atualiza uma entrega do encontro. */
export async function saveEncounterDeliverable(payload: EncounterDeliverable): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('entregas_encontro')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  return { error: error?.message ?? null }
}

/** Arquivamento lógico de uma entrega. */
export async function archiveEncounterDeliverable(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('entregas_encontro')
    .update({ status: 'arquivado', updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Cria ou atualiza um requisito de evidência do encontro. */
export async function saveEncounterEvidence(payload: EncounterEvidence): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('evidencias_encontro')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  return { error: error?.message ?? null }
}

/** Arquivamento lógico de uma evidência. */
export async function archiveEncounterEvidence(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('evidencias_encontro')
    .update({ status: 'arquivado', updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Vincular (upsert) o modelo de relatório do encontro. */
export async function saveEncounterReportRef(payload: EncounterReportRef): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vinculo_modelo_relatorio_encontro')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'methodology_version_id,visit_number' })
  return { error: error?.message ?? null }
}

/** Arquivar o vínculo de relatório do encontro. */
export async function archiveEncounterReportRef(versionId: string, visitNumber: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vinculo_modelo_relatorio_encontro')
    .update({ status: 'arquivado', updated_at: new Date().toISOString() })
    .eq('methodology_version_id', versionId)
    .eq('visit_number', visitNumber)
  return { error: error?.message ?? null }
}

/** Vincular um plano padrão (template publicado) ao encontro. */
export async function linkActionPlanTemplate(payload: {
  methodology_version_id: string
  visit_number: number
  action_plan_template_version_id: string
  action_plan_template_name: string
  display_order: number
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('vinculo_plano_acao_encontro').insert({
    ...payload,
    recommendation_enabled: false,
    status: 'ativo',
  })
  return { error: error?.message ?? null }
}

/** Desativar o vínculo de um plano padrão do encontro. */
export async function unlinkActionPlanTemplate(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vinculo_plano_acao_encontro')
    .update({ status: 'inativo', updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Alterna recomendação vs padrão do vínculo de plano. */
export async function toggleActionPlanRecommendation(id: string, recommendation_enabled: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vinculo_plano_acao_encontro')
    .update({ recommendation_enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Templates de plano de ação publicados (para o seletor do encontro). */
export async function fetchPublishedPlanTemplates(): Promise<{ rows: PublishedPlanTemplate[]; error: string | null }> {
  const { data, error } = await supabase
    .from('planos_acao_template_versoes')
    .select('id, template_id, planos_acao_templates!inner(nome, departamento)')
    .eq('status', 'publicada')
    .order('template_id', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return {
    rows: (data ?? []).map((row) => {
      const template = row.planos_acao_templates as unknown as { nome: string; departamento: string }
      return {
        id: row.id,
        title: template?.nome ?? 'Template',
        department: template?.departamento ?? null,
      }
    }),
    error: null,
  }
}

// ------- Biblioteca -------

export const LIBRARY_BUCKET = 'biblioteca-consultoria-mx'

export async function fetchLibraryMaterials(): Promise<{ rows: LibraryMaterial[]; error: string | null }> {
  const { data, error } = await supabase
    .from('biblioteca_materiais')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as LibraryMaterial[], error: null }
}

export async function saveLibraryMaterial(payload: {
  id?: string
  title: string
  description?: string | null
  content_type: string
  category?: string | null
  source_url?: string | null
  file_asset_name?: string | null
  file_asset_path?: string | null
  visibility?: string
  program_key?: string | null
  status?: 'rascunho' | 'em_revisao' | 'publicado' | 'arquivado'
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('biblioteca_materiais')
    .upsert({
      ...payload,
      description: payload.description ?? null,
      category: payload.category ?? null,
      source_url: payload.source_url ?? null,
      file_asset_name: payload.file_asset_name ?? null,
      file_asset_path: payload.file_asset_path ?? null,
      visibility: payload.visibility ?? 'OWNER_AND_TEAM',
      program_key: payload.program_key ?? null,
      status: payload.status ?? 'rascunho',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id')
    .single()
  if (error || !data) return { id: null, error: error?.message ?? 'Falha ao salvar o material.' }
  return { id: data.id, error: null }
}

export async function archiveLibraryMaterial(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('biblioteca_materiais')
    .update({ status: 'arquivado', updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Envia um arquivo para o bucket da biblioteca e devolve URL pública + caminho. */
export async function uploadLibraryFile(file: File, folder = 'materiais'): Promise<{ sourceUrl: string | null; path: string | null; error: string | null }> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const { error: uploadError } = await supabase.storage.from(LIBRARY_BUCKET).upload(path, file, { upsert: false })
  if (uploadError) return { sourceUrl: null, path: null, error: uploadError.message }
  const { data: { publicUrl } } = supabase.storage.from(LIBRARY_BUCKET).getPublicUrl(path)
  return { sourceUrl: publicUrl, path, error: null }
}

/** Número de encontros que utilizam um material da biblioteca. */
export async function countMaterialUtilizations(materialId: string): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase
    .from('conteudo_referencia_encontro')
    .select('id')
    .eq('biblioteca_material_id', materialId)
    .neq('status', 'arquivado')
  if (error) return { count: 0, error: error.message }
  return { count: (data ?? []).length, error: null }
}

/** Encontros que utilizam um material da biblioteca (para "ver utilizações"). */
export async function fetchMaterialUtilizations(materialId: string): Promise<{ rows: Array<{ title: string; product_name: string | null; visit_number: number }>; error: string | null }> {
  const { data, error } = await supabase
    .from('conteudo_referencia_encontro')
    .select('title, methodology_version_id, visit_number')
    .eq('biblioteca_material_id', materialId)
    .neq('status', 'arquivado')
  if (error) return { rows: [], error: error.message }

  const versionIds = [...new Set((data ?? []).map(row => row.methodology_version_id))]
  const { data: versions } = versionIds.length
    ? await supabase.from('versoes_metodologia_produto').select('id, product_name').in('id', versionIds)
    : { data: [] as Array<{ id: string; product_name: string | null }> }
  const byVersion = new Map((versions ?? []).map(version => [version.id, version.product_name]))

  return {
    rows: (data ?? []).map(row => ({
      title: row.title,
      product_name: byVersion.get(row.methodology_version_id) ?? null,
      visit_number: row.visit_number,
    })),
    error: null,
  }
}

// ------- Modelos de relatório -------

export async function fetchReportTemplates(): Promise<{ rows: ReportTemplate[]; error: string | null }> {
  const { data, error } = await supabase
    .from('modelos_relatorio')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return { rows: [], error: error.message }
  return {
    rows: (data ?? []).map((row: { sections: unknown }) => {
      let sections: string[] = []
      if (Array.isArray(row.sections)) sections = row.sections.map(item => String(item))
      return { ...row, sections }
    }) as ReportTemplate[],
    error: null,
  }
}

export async function saveReportTemplate(payload: {
  id?: string
  name: string
  description?: string | null
  product_key?: string | null
  compatible_encounters?: string | null
  sections: string[]
  instructions?: string | null
  version_number?: string
  status?: 'rascunho' | 'publicado' | 'arquivado'
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('modelos_relatorio')
    .upsert({
      ...payload,
      description: payload.description ?? null,
      product_key: payload.product_key ?? null,
      compatible_encounters: payload.compatible_encounters ?? null,
      sections: payload.sections,
      instructions: payload.instructions ?? null,
      version_number: payload.version_number ?? '1.0',
      status: payload.status ?? 'rascunho',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id')
    .single()
  if (error || !data) return { id: null, error: error?.message ?? 'Falha ao salvar o modelo.' }
  return { id: data.id, error: null }
}

export async function publishReportTemplate(id: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('modelos_relatorio')
    .update({ status: 'publicado', published_at: new Date().toISOString(), published_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function archiveReportTemplate(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('modelos_relatorio')
    .update({ status: 'arquivado', updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Duplica um modelo como rascunho com "(cópia)" no nome. */
export async function duplicateReportTemplate(template: ReportTemplate): Promise<{ error: string | null }> {
  const { error } = await supabase.from('modelos_relatorio').insert({
    name: `${template.name} (cópia)`,
    description: template.description,
    product_key: template.product_key,
    compatible_encounters: template.compatible_encounters,
    sections: template.sections,
    instructions: template.instructions,
    version_number: '1.0',
    status: 'rascunho',
  })
  return { error: error?.message ?? null }
}

// ------- Aulas (Universidade MX) -------

// `universidade_aulas` está vazia em produção (0 linhas) — a jornada real da
// Universidade MX vive em `treinamentos` (mesma tabela que a tela do vendedor
// usa; ver listarTreinamentosVendedor). Antes desta correção, "Vincular Aula
// da Universidade MX" sempre mostrava "Nenhuma aula publicada encontrada.",
// mesmo com aulas ativas publicadas no sistema.
export async function fetchUniversityLessons(): Promise<{ rows: Array<{ id: string; titulo: string; tipo: string; trilha_id: string | null }>; error: string | null }> {
  const { data, error } = await supabase
    .from('treinamentos')
    .select('id, title, type')
    .eq('active', true)
    .order('title', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return {
    rows: (data ?? []).map(row => ({ id: row.id, titulo: row.title, tipo: row.type, trilha_id: null })),
    error: null,
  }
}

// ------- Auditoria -------

export async function fetchAuditLogs(): Promise<{ rows: AuditEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from('logs_auditoria_consultoria_mx')
    .select('id, user_name, user_role, action, value_after, origin, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as AuditEntry[], error: null }
}

export async function writeAuditLog(entry: {
  userId: string
  userName?: string | null
  userRole: string
  resource: string
  action: string
  valueBefore?: string
  valueAfter?: string
  origin?: string
}): Promise<void> {
  try {
    await supabase.from('logs_auditoria_consultoria_mx').insert({
      user_id: entry.userId,
      user_name: entry.userName ?? null,
      user_role: entry.userRole,
      resource: entry.resource,
      action: entry.action,
      value_before: entry.valueBefore ?? null,
      value_after: entry.valueAfter ?? null,
      origin: entry.origin ?? 'Consultoria MX',
    })
  } catch {
    // Auditoria nunca bloqueia a operação principal.
  }
}
