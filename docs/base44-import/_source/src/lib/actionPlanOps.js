// Operações de Planos de Ação — MX Performance
import { base44 } from '@/api/base44Client';
import { STANDARD_INDICATORS } from '@/lib/indicatorCatalog';
import { DIRECTION_LABELS } from '@/lib/actionPlanConstants';

// Gerar código automático do Plano Padrão
export async function generateTemplateCode(departmentId, indicatorCode) {
  const prefix = `PA_${departmentId}`;
  const indPart = indicatorCode ? indicatorCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 30) : 'GENERIC';
  const existing = await base44.entities.ActionPlanTemplate.list();
  const samePrefix = existing.filter(t => t.code && t.code.startsWith(`${prefix}_${indPart}_`));
  let maxSeq = 0;
  for (const t of samePrefix) {
    const match = t.code.match(/_(\d+)$/);
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1]));
  }
  const seq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}_${indPart}_${seq}`;
}

// Calcular pesos em basis points (total = 10000)
export function calculateWeights(actionCount) {
  if (actionCount <= 0) return [];
  const base = Math.floor(10000 / actionCount);
  const remainder = 10000 - base * actionCount;
  const weights = [];
  for (let i = 0; i < actionCount; i++) {
    const bp = base + (i < remainder ? 1 : 0);
    weights.push({
      weight_basis_points: bp,
      weight_percentage_display: (bp / 100).toFixed(2) + '%',
    });
  }
  return weights;
}

// Sugerir título do Plano com base na direção e indicador
export function suggestTitle(direction, indicatorName) {
  if (!indicatorName) return '';
  const dirLabel = DIRECTION_LABELS[direction] || 'Melhorar';
  const cleanName = indicatorName.replace(/%/g, '').replace(/^[\s%]+/, '').trim();
  if (!cleanName) return '';
  const lowerName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);
  return `${dirLabel} ${lowerName}`;
}

// Calcular progresso do Plano aplicado com base nos pesos das ações concluídas
export function calculatePlanProgress(actionItems) {
  if (!actionItems || actionItems.length === 0) return { percentage: 0, completedCount: 0, totalCount: 0 };
  const completed = actionItems.filter(a => a.status === 'CONCLUIDA');
  const completedWeight = completed.reduce((sum, a) => sum + (a.weight_basis_points || 0), 0);
  const percentage = (completedWeight / 100).toFixed(2);
  return {
    percentage: parseFloat(percentage),
    completedCount: completed.length,
    totalCount: actionItems.length,
  };
}

// Migração de departamentos antigos para novos
export async function migrateDepartments() {
  let allIndicators;
  try {
    allIndicators = await base44.asServiceRole.entities.IndicatorDefinition.list();
  } catch (e) {
    // asServiceRole não disponível no frontend — migração pulada
    return { updated: 0, total: 0, skipped: true };
  }
  let updated = 0;
  for (const ind of allIndicators) {
    let newDept = ind.department;
    if (ind.department === 'PRODUTO') newDept = 'PRODUTO_ESTOQUE';
    if (ind.code === 'EMPLOYEE_COUNT' && ind.department === 'OPERACOES') newDept = 'PESSOAS_RH';
    if (newDept !== ind.department) {
      await base44.asServiceRole.entities.IndicatorDefinition.update(ind.id, { department: newDept });
      updated++;
    }
  }
  return { updated, total: allIndicators.length };
}

// Garantir que o catálogo de indicadores está atualizado
export async function ensureIndicatorCatalog() {
  let existing;
  try {
    existing = await base44.asServiceRole.entities.IndicatorDefinition.list();
  } catch (e) {
    // asServiceRole não disponível no frontend — usar client API
    existing = await base44.entities.IndicatorDefinition.list();
  }
  const existingCodes = new Set(existing.map(i => i.code));
  let created = 0;
  for (const ind of STANDARD_INDICATORS) {
    if (!existingCodes.has(ind.code)) {
      await base44.entities.IndicatorDefinition.create({
        code: ind.code,
        name: ind.name,
        normalized_name: ind.name.toUpperCase().trim(),
        department: ind.department,
        unit: ind.unit,
        default_direction: ind.direction,
        target_calculation_mode: ind.target_calculation_mode,
        formula_expression: ind.formula_expression,
        annual_aggregation: ind.annual_aggregation,
        annual_formula: ind.annual_formula,
        actual_source: ind.actual_source,
        valid_range: ind.valid_range,
        aliases: ind.aliases,
        is_standard: true,
        is_active: true,
        default_owner_visibility: true,
        display_order: ind.display_order || 99,
        status: 'PUBLICADO',
        effective_from_year: 2025,
      });
      created++;
    } else {
      // Atualizar departamento se mudou
      const existingInd = existing.find(i => i.code === ind.code);
      if (existingInd && existingInd.department !== ind.department) {
        try {
          await base44.asServiceRole.entities.IndicatorDefinition.update(existingInd.id, { department: ind.department });
        } catch (e) {
          // asServiceRole não disponível no frontend — usar client API
          await base44.entities.IndicatorDefinition.update(existingInd.id, { department: ind.department });
        }
      }
    }
  }
  return { created, total: existing.length + created };
}

// Atualizar rascunho existente (upsert — não cria novo template)
async function updateTemplateDraft(templateId, data) {
  const template = await base44.entities.ActionPlanTemplate.get(templateId);
  const versions = await base44.entities.ActionPlanTemplateVersion.filter({ action_plan_template_id: templateId });
  const draftVersion = versions.find(v => v.status === 'RASCUNHO' || v.status === 'EM_REVISAO');

  if (!draftVersion) throw new Error('Nenhuma versão em rascunho encontrada para atualização');

  const actions = data.actions || [];
  const weights = calculateWeights(actions.length);

  // Atualizar template
  await base44.entities.ActionPlanTemplate.update(templateId, {
    title: data.title,
    department_id: data.department_id,
    primary_indicator_id: data.primary_indicator_id || '',
    primary_indicator_code: data.primary_indicator_code || '',
    primary_indicator_name: data.primary_indicator_name || '',
    default_priority: data.default_priority || 'ATENCAO',
    recommended_deadline_days: data.recommended_deadline_days || 30,
    manual_application_enabled: data.manual_application_enabled !== false,
    suggestion_enabled: data.owner_suggestion_enabled || data.suggestion_enabled || false,
    actions_count: actions.length,
  });

  // Atualizar versão rascunho
  await base44.entities.ActionPlanTemplateVersion.update(draftVersion.id, {
    title: data.title,
    department_id: data.department_id,
    primary_indicator_id: data.primary_indicator_id || '',
    primary_indicator_code: data.primary_indicator_code || '',
    primary_indicator_name: data.primary_indicator_name || '',
    improvement_direction: data.improvement_direction || 'AUMENTAR',
    default_priority: data.default_priority || 'ATENCAO',
    recommended_deadline_days: data.recommended_deadline_days || 30,
    effectiveness_indicator_id: data.effectiveness_indicator_id || data.primary_indicator_id || '',
    effectiveness_indicator_name: data.effectiveness_indicator_name || data.primary_indicator_name || '',
    manual_application_enabled: data.manual_application_enabled !== false,
    owner_suggestion_enabled: data.owner_suggestion_enabled || data.suggestion_enabled || false,
    action_count: actions.length,
    total_weight_basis_points: 10000,
  });

  // Remover itens antigos e recriar (upsert de itens)
  const oldItems = await base44.entities.ActionPlanTemplateItem.filter({ action_plan_template_version_id: draftVersion.id });
  for (const item of oldItems) {
    await base44.entities.ActionPlanTemplateItem.delete(item.id);
  }

  if (actions.length > 0) {
    await base44.entities.ActionPlanTemplateItem.bulkCreate(
      actions.map((a, i) => ({
        action_plan_template_version_id: draftVersion.id,
        item_order: i + 1,
        title: a.title,
        action_description: a.action_description || '',
        execution_instructions: a.execution_instructions || a.how_to_execute || '',
        how_to_execute: a.how_to_execute || '',
        checklist: a.checklist || '',
        recommended_responsible_role: a.recommended_responsible_role || data.default_responsible_role || '',
        recommended_participant_roles: a.recommended_participant_roles || '',
        deadline_offset_days: a.deadline_offset_days || 0,
        is_required: a.is_required !== false,
        evidence_required: a.evidence_required || false,
        evidence_type: a.evidence_type || '',
        completion_criteria: a.completion_criteria || '',
        weight_basis_points: weights[i].weight_basis_points,
        weight_percentage_display: weights[i].weight_percentage_display,
        support_material_type: a.support_material_type || 'NONE',
        file_asset_id: a.file_asset_id || '',
        file_asset_name: a.file_asset_name || '',
        learning_content_id: a.learning_content_id || '',
        learning_content_version_id: a.learning_content_version_id || '',
        learning_content_name: a.learning_content_name || '',
        status: 'ATIVO',
      }))
    );
  }

  await logAudit('TEMPLATE_DRAFT_UPDATE', templateId, draftVersion.id, { after: data.title });
  return template;
}

// Criar Plano Padrão com versão inicial e ações
// Se existingTemplateId for fornecido, atualiza o rascunho existente (upsert) em vez de criar novo.
export async function createTemplate(data, existingTemplateId = null) {
  if (existingTemplateId) {
    return await updateTemplateDraft(existingTemplateId, data);
  }

  // Gerar código automaticamente se não fornecido
  let code = data.code;
  if (!code) {
    code = await generateTemplateCode(data.department_id, data.primary_indicator_code);
  }

  const actions = data.actions || [];
  const weights = calculateWeights(actions.length);

  const template = await base44.entities.ActionPlanTemplate.create({
    code,
    title: data.title,
    short_description: data.short_description || '',
    department_id: data.department_id,
    primary_indicator_id: data.primary_indicator_id || '',
    primary_indicator_code: data.primary_indicator_code || '',
    primary_indicator_name: data.primary_indicator_name || '',
    problem: data.problem || '',
    objective: data.objective || '',
    when_to_apply: data.when_to_apply || '',
    default_priority: data.default_priority || 'ATENCAO',
    default_responsible_role: data.default_responsible_role || '',
    recommended_deadline_days: data.recommended_deadline_days || 30,
    suggestion_enabled: data.owner_suggestion_enabled || data.suggestion_enabled || false,
    manual_application_enabled: data.manual_application_enabled !== false,
    status: 'RASCUNHO',
    current_version: '1',
    effective_from_year: data.effective_from_year || new Date().getFullYear(),
    actions_count: actions.length,
    created_by: 'Administrador MX',
  });

  const version = await base44.entities.ActionPlanTemplateVersion.create({
    action_plan_template_id: template.id,
    version_number: '1',
    title: data.title,
    description: data.short_description || '',
    department_id: data.department_id,
    primary_indicator_id: data.primary_indicator_id || '',
    primary_indicator_code: data.primary_indicator_code || '',
    primary_indicator_name: data.primary_indicator_name || '',
    improvement_direction: data.improvement_direction || 'AUMENTAR',
    problem: data.problem || '',
    objective: data.objective || '',
    when_to_apply: data.when_to_apply || '',
    default_priority: data.default_priority || 'ATENCAO',
    default_responsible_role: data.default_responsible_role || '',
    recommended_deadline_days: data.recommended_deadline_days || 30,
    effectiveness_indicator_id: data.effectiveness_indicator_id || data.primary_indicator_id || '',
    effectiveness_indicator_name: data.effectiveness_indicator_name || data.primary_indicator_name || '',
    effectiveness_window_days: data.effectiveness_window_days || 30,
    effectiveness_criteria: data.effectiveness_criteria || '',
    evidence_required: data.evidence_required || false,
    evidence_types: data.evidence_types || '',
    manual_application_enabled: data.manual_application_enabled !== false,
    owner_suggestion_enabled: data.owner_suggestion_enabled || data.suggestion_enabled || false,
    owner_suggestion_title: data.owner_suggestion_title || '',
    owner_suggestion_problem: data.owner_suggestion_problem || '',
    owner_suggestion_impact: data.owner_suggestion_impact || '',
    owner_suggestion_recommendation: data.owner_suggestion_recommendation || '',
    owner_suggestion_button_text: data.owner_suggestion_button_text || 'Criar Plano de Ação',
    suggestion_trigger_type: data.suggestion_trigger_type || 'MANUAL',
    action_count: actions.length,
    total_weight_basis_points: 10000,
    status: 'RASCUNHO',
    created_by: 'Administrador MX',
  });

  if (actions.length > 0) {
    await base44.entities.ActionPlanTemplateItem.bulkCreate(
      actions.map((a, i) => ({
        action_plan_template_version_id: version.id,
        item_order: i + 1,
        title: a.title,
        action_description: a.action_description || '',
        execution_instructions: a.execution_instructions || a.how_to_execute || '',
        how_to_execute: a.how_to_execute || '',
        checklist: a.checklist || '',
        recommended_responsible_role: a.recommended_responsible_role || data.default_responsible_role || '',
        recommended_participant_roles: a.recommended_participant_roles || '',
        deadline_offset_days: a.deadline_offset_days || 0,
        is_required: a.is_required !== false,
        evidence_required: a.evidence_required || false,
        evidence_type: a.evidence_type || '',
        completion_criteria: a.completion_criteria || '',
        weight_basis_points: weights[i].weight_basis_points,
        weight_percentage_display: weights[i].weight_percentage_display,
        support_material_type: a.support_material_type || 'NONE',
        file_asset_id: a.file_asset_id || '',
        file_asset_name: a.file_asset_name || '',
        learning_content_id: a.learning_content_id || '',
        learning_content_version_id: a.learning_content_version_id || '',
        learning_content_name: a.learning_content_name || '',
        status: 'ATIVO',
      }))
    );
  }

  await logAudit('TEMPLATE_CREATE', template.id, version.id, { after: data.title });
  return template;
}

// Publicar Plano Padrão
export async function publishTemplate(templateId) {
  const template = await base44.entities.ActionPlanTemplate.get(templateId);
  const versions = await base44.entities.ActionPlanTemplateVersion.filter({ action_plan_template_id: templateId });
  const draftVersion = versions.find(v => v.status === 'RASCUNHO' || v.status === 'EM_REVISAO');
  if (!draftVersion) throw new Error('Nenhuma versão em rascunho encontrada');

  await base44.entities.ActionPlanTemplateVersion.update(draftVersion.id, {
    status: 'PUBLICADO',
    published_by: 'Administrador MX',
    published_at: new Date().toISOString(),
  });

  await base44.entities.ActionPlanTemplate.update(templateId, { status: 'PUBLICADO' });
  await logAudit('TEMPLATE_PUBLISH', templateId, draftVersion.id, { after: 'PUBLICADO' });
  return template;
}

// Criar nova versão (rascunho) de um template publicado
export async function createNewVersion(templateId) {
  const template = await base44.entities.ActionPlanTemplate.get(templateId);
  const versions = await base44.entities.ActionPlanTemplateVersion.filter({ action_plan_template_id: templateId });
  const published = versions.find(v => v.status === 'PUBLICADO');
  if (!published) throw new Error('Nenhuma versão publicada encontrada');

  const newVersionNumber = String(versions.length + 1);
  const newVersion = await base44.entities.ActionPlanTemplateVersion.create({
    ...published,
    id: undefined,
    version_number: newVersionNumber,
    status: 'RASCUNHO',
    published_by: '',
    published_at: '',
    change_summary: '',
    created_by: 'Administrador MX',
  });

  // Copiar itens
  const items = await base44.entities.ActionPlanTemplateItem.filter({ action_plan_template_version_id: published.id });
  if (items.length > 0) {
    await base44.entities.ActionPlanTemplateItem.bulkCreate(
      items.map(it => ({ ...it, id: undefined, action_plan_template_version_id: newVersion.id }))
    );
  }

  await base44.entities.ActionPlanTemplate.update(templateId, { current_version: newVersionNumber });
  await logAudit('TEMPLATE_NEW_VERSION', templateId, newVersion.id, { after: `v${newVersionNumber}` });
  return newVersion;
}

// Desabilitar Plano Padrão
export async function disableTemplate(templateId, reason) {
  await base44.entities.ActionPlanTemplate.update(templateId, {
    status: 'DESABILITADO',
    disabled_reason: reason,
    disabled_at: new Date().toISOString(),
  });
  await logAudit('TEMPLATE_DISABLE', templateId, null, { after: reason });
}

// Reativar Plano Padrão
export async function reenableTemplate(templateId) {
  await base44.entities.ActionPlanTemplate.update(templateId, {
    status: 'PUBLICADO',
    disabled_reason: '',
    disabled_at: '',
  });
  await logAudit('TEMPLATE_REENABLE', templateId, null, { after: 'PUBLICADO' });
}

// Arquivar Plano Padrão
export async function archiveTemplate(templateId) {
  await base44.entities.ActionPlanTemplate.update(templateId, { status: 'ARQUIVADO' });
  await logAudit('TEMPLATE_ARCHIVE', templateId, null, { after: 'ARQUIVADO' });
}

// ─── Saneamento de texto para promoção a template ──────────────────────────────
// Remove nomes de cliente, CNPJs, nomes de pessoas, datas específicas
function sanitizeTextForTemplate(text, clientName) {
  if (!text) return '';
  let sanitized = text;
  // Remover nome do cliente
  if (clientName) {
    const parts = clientName.split(/\s+/).filter(p => p.length > 2);
    for (const part of parts) {
      sanitized = sanitized.replace(new RegExp(part, 'gi'), '[cliente]');
    }
  }
  // Remover CNPJs
  sanitized = sanitized.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '[CNPJ]');
  // Remover datas no formato DD/MM/AAAA
  sanitized = sanitized.replace(/\d{2}\/\d{2}\/\d{4}/g, '[data]');
  // Remover prazos específicos "até DD/MM"
  sanitized = sanitized.replace(/até\s+\d{2}\/\d{2}/gi, 'dentro do prazo definido');
  return sanitized.trim();
}

// ─── Promover Plano de Ação do cliente para Plano Padrão (rascunho) ──────────
// Cria uma cópia independente em formato de template, saneando dados do cliente.
// Não move nem exclui o Plano do cliente. Não publica automaticamente.
export async function promoteClientActionPlanToTemplate({ clientActionPlanId, requestedBy }) {
  const plan = await base44.entities.ActionPlan.get(clientActionPlanId);
  const items = await base44.entities.ActionItem.filter({ action_plan_id: clientActionPlanId }).catch(() => []);

  // Saneamento: remover dados específicos do cliente
  const clientName = plan.client_account_name || '';
  const sanitizedTitle = sanitizeTextForTemplate(plan.title, clientName) || 'Plano de Ação';
  const sanitizedProblem = sanitizeTextForTemplate(plan.problem, clientName);

  // Calcular prazo recomendado a partir das datas reais
  let recommendedDays = 30;
  if (plan.due_date) {
    const start = new Date();
    const due = new Date(plan.due_date);
    const diff = Math.ceil((due - start) / 86400000);
    if (diff > 0) recommendedDays = diff;
  }

  const templateData = {
    title: sanitizedTitle,
    department_id: plan.department,
    primary_indicator_id: plan.indicator_definition_id || '',
    primary_indicator_code: '',
    primary_indicator_name: plan.indicator_name || '',
    improvement_direction: 'AUMENTAR',
    problem: sanitizedProblem,
    actions: items.length > 0 ? items.map(it => ({
      title: sanitizeTextForTemplate(it.title, clientName) || it.title,
      execution_instructions: sanitizeTextForTemplate(it.execution_instructions || it.how_to_execute, clientName) || '',
      support_material_type: it.support_material_type || 'NONE',
      file_asset_id: it.file_asset_id || '',
      file_asset_name: it.file_asset_name || '',
      learning_content_id: it.learning_content_id || '',
      learning_content_name: it.learning_content_name || '',
    })) : [{ title: 'Executar ação', execution_instructions: '' }],
    recommended_deadline_days: recommendedDays,
    default_priority: plan.priority || 'ATENCAO',
    effectiveness_indicator_id: plan.efficacy_indicator_id || plan.indicator_definition_id || '',
    effectiveness_indicator_name: plan.indicator_name || '',
  };

  const template = await createTemplate(templateData);

  // Registrar origem da promoção
  await base44.entities.AuditLog.create({
    user_name: requestedBy || 'Administrador MX',
    user_role: 'ADMINISTRADOR_IMPLANTACAO',
    client_account_id: plan.client_account_id,
    resource: 'ActionPlanTemplate',
    action: 'CLIENT_PLAN_PROMOTION',
    resource_id: template.id,
    value_before: JSON.stringify({
      source_client_action_plan_id: clientActionPlanId,
      source_client_account_id: plan.client_account_id,
      source_store_id: plan.store_id,
    }),
    value_after: JSON.stringify({
      template_id: template.id,
      sanitization_status: 'AUTO',
      review_status: 'PENDING',
    }),
    origin: 'Transformar em Plano Padrão',
    environment: 'PROTOTIPO',
  });

  return template;
}

// ─── Reconciliação de rascunhos duplicados ────────────────────────────────────
// Identifica rascunhos órfãos gerados pelo bug de duplicação e os marca como
// ORPHANED_BY_DUPLICATION_BUG. Não exclui fisicamente — preserva para auditoria.
export async function reconcileDuplicatedActionPlanDrafts() {
  const allTemplates = await base44.entities.ActionPlanTemplate.list('-created_date', 500);
  const published = allTemplates.filter(t => t.status === 'PUBLICADO');
  const drafts = allTemplates.filter(t => t.status === 'RASCUNHO' || t.status === 'EM_REVISAO');

  const orphaned = [];
  const legitimate = [];

  for (const draft of drafts) {
    // Um rascunho é órfão se existe um template publicado com mesmo título + departamento + indicador
    const matchPublished = published.find(p =>
      p.title === draft.title &&
      p.department_id === draft.department_id &&
      p.primary_indicator_id === draft.primary_indicator_id
    );
    if (matchPublished) {
      orphaned.push(draft);
    } else {
      legitimate.push(draft);
    }
  }

  // Marcar órfãos (preservar, não excluir)
  let marked = 0;
  for (const draft of orphaned) {
    try {
      await base44.entities.ActionPlanTemplate.update(draft.id, {
        status: 'ARQUIVADO',
        disabled_reason: 'ORPHANED_BY_DUPLICATION_BUG',
      });
      marked++;
    } catch (e) { /* não bloqueia */ }
  }

  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX', user_role: 'ADMINISTRADOR_PRINCIPAL',
    resource: 'ActionPlanTemplate', action: 'RECONCILE_DUPLICATED_DRAFTS',
    value_after: JSON.stringify({ orphaned: orphaned.length, marked, legitimate: legitimate.length, published: published.length }),
    origin: 'Reconciliação de rascunhos', environment: 'PROTOTIPO',
  }).catch(() => {});

  return {
    publishedCount: published.length,
    activeDraftsCount: legitimate.length,
    orphanedCount: orphaned.length,
    markedAsArchived: marked,
    orphanedIds: orphaned.map(o => o.id),
  };
}

// ─── Detecção de aplicações parciais (FAILED_PARTIAL_CREATION) ────────────────
// Identifica ActionPlans sem itens, sem responsável, ou sem template_version_id
// quando origin = TEMPLATE_MX.
export async function detectPartialApplications() {
  const allPlans = await base44.entities.ActionPlan.list('-created_date', 500);
  const partial = [];

  for (const plan of allPlans) {
    const issues = [];
    if (plan.origin === 'TEMPLATE_MX' && !plan.action_plan_template_version_id) issues.push('MISSING_TEMPLATE_VERSION');
    if (!plan.responsible && !plan.responsible_id) issues.push('MISSING_RESPONSIBLE');
    if (plan.origin === 'TEMPLATE_MX') {
      const items = await base44.entities.ActionItem.filter({ action_plan_id: plan.id }).catch(() => []);
      if (items.length === 0) issues.push('NO_ITEMS');
    }
    if (issues.length > 0) {
      partial.push({ plan_id: plan.id, title: plan.title, client_account_id: plan.client_account_id, issues });
    }
  }

  return { partialCount: partial.length, partial };
}

// Aplicar template a um cliente — operação idempotente
// application_request_id garante que cliques concorrentes não criem múltiplos planos.
export async function applyTemplateToClient(templateId, versionId, options) {
  const template = await base44.entities.ActionPlanTemplate.get(templateId);
  const version = await base44.entities.ActionPlanTemplateVersion.get(versionId);
  const items = await base44.entities.ActionPlanTemplateItem.filter({ action_plan_template_version_id: versionId });

  // ── IDEMPOTÊNCIA: se application_request_id já existe, retornar plano já criado ──
  const requestId = options.application_request_id;
  if (requestId) {
    const byRequestId = await base44.entities.ActionPlan.filter({
      application_request_id: requestId,
    }).catch(() => []);
    if (byRequestId.length > 0) {
      // Operação já processada — retornar plano existente
      return { duplicate: false, actionPlan: byRequestId[0], idempotent: true };
    }
  }

  // ── CHECAGEM DE DUPLICIDADE: mesmo template + cliente + escopo + status ativo ──
  const existing = await base44.entities.ActionPlan.filter({
    action_plan_template_version_id: versionId,
    client_account_id: options.client_account_id,
  }).catch(() => []);

  const activeDuplicate = existing.find(p =>
    p.status !== 'CANCELADA' &&
    p.reconcile_status !== 'DUPLICATE_RECONCILED' &&
    (p.store_id || '') === (options.store_id || '')
  );

  if (activeDuplicate) {
    return {
      duplicate: true,
      existingPlanId: activeDuplicate.id,
      existingPlanTitle: activeDuplicate.title,
    };
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (options.deadline_days || version.recommended_deadline_days || 30));

  const snapshot = JSON.stringify({
    template_code: template.code,
    template_title: template.title,
    version_number: version.version_number,
    problem: version.problem,
    objective: version.objective,
    actions: items.map(it => ({ title: it.title, how_to_execute: it.how_to_execute })),
  });

  // Criar EXATAMENTE UM ActionPlan (nunca dentro de loop de itens)
  const actionPlan = await base44.entities.ActionPlan.create({
    client_account_id: options.client_account_id,
    client_account_name: options.client_account_name,
    title: `${template.title} — ${options.client_account_name || 'Cliente'}`,
    description: version.description || template.short_description,
    problem: version.problem || template.problem,
    action: items[0]?.title || template.title,
    how: items[0]?.how_to_execute || '',
    responsible: options.responsible_name || '',
    responsible_id: options.responsible_id || '',
    participants: options.participants || '',
    due_date: dueDate.toISOString().split('T')[0],
    status: 'NAO_INICIADA',
    kanban_column: 'NAO_INICIADA',
    kanban_position: existing.filter(p => p.status === 'NAO_INICIADA').length,
    priority: version.default_priority || template.default_priority,
    origin: 'TEMPLATE_MX',
    department: template.department_id,
    strategic_plan_cycle_id: options.strategic_plan_cycle_id || '',
    indicator_definition_id: options.indicator_definition_id || template.primary_indicator_id,
    indicator_name: options.indicator_name || template.primary_indicator_name,
    store_id: options.store_id || '',
    store_name: options.store_name || '',
    expected_impact: version.objective || '',
    evidence_required: version.evidence_required || false,
    efficacy: 'NAO_AVALIADA',
    efficacy_indicator_id: version.effectiveness_indicator_id || template.primary_indicator_id,
    action_plan_template_id: templateId,
    action_plan_template_version_id: versionId,
    template_snapshot: snapshot,
    reference_year: options.reference_year,
    application_request_id: requestId || '',
    reconcile_status: 'ATIVO',
  });

  // Criar N ActionItems em lote (fora do loop de planos)
  if (items.length > 0) {
    await base44.entities.ActionItem.bulkCreate(
      items.map((it, i) => {
        const itemDue = new Date();
        itemDue.setDate(itemDue.getDate() + (it.deadline_offset_days || 0) + (options.deadline_days || version.recommended_deadline_days || 30));
        return {
          action_plan_id: actionPlan.id,
          item_order: i + 1,
          title: it.title,
          action_description: it.action_description,
          execution_instructions: it.execution_instructions || it.how_to_execute || '',
          how_to_execute: it.how_to_execute,
          checklist: it.checklist,
          completion_criteria: it.completion_criteria,
          is_required: it.is_required,
          responsible: options.responsible_name || '',
          responsible_id: options.responsible_id || '',
          participants: options.participants || '',
          deadline_offset_days: it.deadline_offset_days,
          due_date: itemDue.toISOString().split('T')[0],
          status: 'NAO_INICIADA',
          weight_basis_points: it.weight_basis_points || 0,
          weight_percentage_display: it.weight_percentage_display || '',
          support_material_type: it.support_material_type || 'NONE',
          file_asset_id: it.file_asset_id || '',
          file_asset_name: it.file_asset_name || '',
          learning_content_id: it.learning_content_id || '',
          learning_content_version_id: it.learning_content_version_id || '',
          learning_content_name: it.learning_content_name || '',
          evidence_required: it.evidence_required,
          evidence_type: it.evidence_type,
          source_template_item_id: it.id,
        };
      })
    );
  }

  // Atualizar contador de aplicações (client API)
  try {
    await base44.entities.ActionPlanTemplate.update(templateId, {
      applications_count: (template.applications_count || 0) + 1,
    });
  } catch (e) { /* contador não bloqueia a aplicação */ }

  await logAudit('TEMPLATE_APPLY', templateId, versionId, {
    client_account_id: options.client_account_id,
    client_account_name: options.client_account_name,
    after: actionPlan.id,
  });

  return { duplicate: false, actionPlan };
}

// ─── Reconciliação de Planos duplicados no cliente ─────────────────────────────
// Identifica grupos de ActionPlans com mesmo template + cliente + escopo e
// preserva apenas o canônico, marcando os demais como DUPLICATE_RECONCILED.
export async function reconcileDuplicatedClientActionPlans({ clientAccountId, templateVersionId, requestedBy }) {
  const allPlans = await base44.entities.ActionPlan.filter({
    client_account_id: clientAccountId,
  }).catch(() => []);

  // Filtrar pelo templateVersionId se fornecido, senão agrupar por template_version_id
  let candidates = allPlans.filter(p =>
    p.reconcile_status !== 'DUPLICATE_RECONCILED' &&
    p.status !== 'CANCELADA'
  );

  if (templateVersionId) {
    candidates = candidates.filter(p => p.action_plan_template_version_id === templateVersionId);
  }

  // Agrupar por (template_version_id + store_id)
  const groups = {};
  for (const p of candidates) {
    const key = `${p.action_plan_template_version_id || 'NONE'}|${p.store_id || ''}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  let reconciledCount = 0;
  let canonicalIds = [];
  let duplicateIds = [];

  for (const [key, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;

    // Ordenar para escolher o canônico: mais itens > interação mais recente > created_date
    const withItemCounts = await Promise.all(group.map(async p => {
      const items = await base44.entities.ActionItem.filter({ action_plan_id: p.id }).catch(() => []);
      return { plan: p, itemCount: items.length, items };
    }));

    withItemCounts.sort((a, b) => {
      // Mais itens primeiro
      if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount;
      // Mais recente updated_date
      const aDate = new Date(a.plan.updated_date || a.plan.created_date || 0).getTime();
      const bDate = new Date(b.plan.updated_date || b.plan.created_date || 0).getTime();
      return bDate - aDate;
    });

    const canonical = withItemCounts[0];
    canonicalIds.push(canonical.plan.id);

    // Marcar os demais como duplicados
    for (let i = 1; i < withItemCounts.length; i++) {
      const dup = withItemCounts[i].plan;
      try {
        await base44.entities.ActionPlan.update(dup.id, {
          reconcile_status: 'DUPLICATE_RECONCILED',
          duplicate_of_id: canonical.plan.id,
        });
        duplicateIds.push(dup.id);
        reconciledCount++;
      } catch (e) { /* não bloqueia */ }
    }
  }

  await base44.entities.AuditLog.create({
    user_name: requestedBy || 'Administrador MX',
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: clientAccountId,
    resource: 'ActionPlan',
    action: 'RECONCILE_DUPLICATED_PLANS',
    value_after: JSON.stringify({
      groupsAnalyzed: Object.keys(groups).length,
      canonicalIds,
      duplicateIds,
      reconciledCount,
    }),
    origin: 'Reconciliação de Planos duplicados',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { reconciledCount, canonicalIds, duplicateIds, totalGroups: Object.keys(groups).length };
}

// ─── Carregar Plano com itens e progresso ──────────────────────────────────────
export async function getActionPlanWithItems(planId) {
  const plan = await base44.entities.ActionPlan.get(planId);
  const items = await base44.entities.ActionItem.filter({ action_plan_id: planId }).catch(() => []);
  const sorted = items.sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
  const progress = calculatePlanProgress(sorted);
  return { plan, items: sorted, progress };
}

// ─── Transição de status do Plano (Kanban) ─────────────────────────────────────
export async function transitionClientActionPlanStatus({ clientActionPlanId, toStatus, completionDate, reason, requestedBy, allowOverride = false }) {
  const plan = await base44.entities.ActionPlan.get(clientActionPlanId);
  const fromStatus = plan.status;
  const items = await base44.entities.ActionItem.filter({ action_plan_id: clientActionPlanId }).catch(() => []);

  // Regra: IN_PROGRESS → COMPLETED exige todas as ações concluídas (ou override admin)
  if (toStatus === 'CONCLUIDA' && fromStatus !== 'CONCLUIDA') {
    const pending = items.filter(it => it.status !== 'CONCLUIDA' && it.status !== 'CANCELADA');
    if (pending.length > 0 && !allowOverride) {
      return {
        blocked: true,
        pendingCount: pending.length,
        totalCount: items.length,
        message: `Este Plano possui ${pending.length} de ${items.length} ações pendentes.`,
      };
    }
  }

  // Regra: COMPLETED → IN_PROGRESS (Reabrir)
  if (toStatus === 'EM_ANDAMENTO' && fromStatus === 'CONCLUIDA') {
    if (!reason) {
      return { blocked: true, message: 'Justificativa obrigatória para reabrir o Plano.' };
    }
  }

  const updates = {
    status: toStatus,
    kanban_column: deriveKanbanColumn(toStatus, plan.due_date),
  };

  if (toStatus === 'EM_ANDAMENTO' && !plan.started_at) {
    updates.started_at = new Date().toISOString();
  }

  if (toStatus === 'CONCLUIDA') {
    updates.completed_at = completionDate || new Date().toISOString();
    updates.completed_by = requestedBy || '';
  }

  // Se reaberto, preservar histórico da conclusão anterior na auditoria
  const auditInfo = { before: fromStatus, after: toStatus };
  if (fromStatus === 'CONCLUIDA' && toStatus === 'EM_ANDAMENTO') {
    auditInfo.previousCompletedAt = plan.completed_at;
    auditInfo.reason = reason;
  }

  const updated = await base44.entities.ActionPlan.update(clientActionPlanId, updates);

  await base44.entities.AuditLog.create({
    user_name: requestedBy || 'Administrador MX',
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: plan.client_account_id,
    resource: 'ActionPlan',
    action: 'PLAN_STATUS_TRANSITION',
    resource_id: clientActionPlanId,
    value_before: fromStatus,
    value_after: toStatus,
    origin: 'Kanban — Plano de Ação',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { blocked: false, actionPlan: updated };
}

// ─── Derivar coluna Kanban do status + prazo ──────────────────────────────────
export function deriveKanbanColumn(status, dueDate) {
  if (status === 'CONCLUIDA') return 'CONCLUIDA';
  if (status === 'PAUSADA' || status === 'CANCELADA') return null; // não exibir no kanban principal
  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    due.setHours(23, 59, 59, 999);
    if (due < now) return 'ATRASADA';
  }
  if (status === 'EM_ANDAMENTO') return 'EM_ANDAMENTO';
  return 'NAO_INICIADA';
}

// ─── Reordenar card dentro da coluna ───────────────────────────────────────────
export async function reorderClientActionPlanCard({ clientActionPlanId, targetColumn, targetPosition, requestedBy }) {
  const plan = await base44.entities.ActionPlan.get(clientActionPlanId);
  const oldPosition = plan.kanban_position || 0;

  // Carregar todos os planos da coluna de destino
  const columnPlans = await base44.entities.ActionPlan.filter({
    client_account_id: plan.client_account_id,
    kanban_column: targetColumn,
  }).catch(() => []);

  const sorted = columnPlans
    .filter(p => p.id !== clientActionPlanId && p.reconcile_status !== 'DUPLICATE_RECONCILED')
    .sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));

  // Inserir na posição alvo
  sorted.splice(targetPosition, 0, { id: clientActionPlanId, _placeholder: true });

  // Reenumerar e persistir
  const updates = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p._placeholder) {
      updates.push(base44.entities.ActionPlan.update(clientActionPlanId, {
        kanban_column: targetColumn,
        kanban_position: i,
      }));
    } else if ((p.kanban_position || 0) !== i) {
      updates.push(base44.entities.ActionPlan.update(p.id, { kanban_position: i }));
    }
  }

  await Promise.all(updates);

  await base44.entities.AuditLog.create({
    user_name: requestedBy || 'Administrador MX',
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: plan.client_account_id,
    resource: 'ActionPlan',
    action: 'PLAN_REORDER',
    resource_id: clientActionPlanId,
    value_before: `${plan.kanban_column || 'NAO_INICIADA'}:${oldPosition}`,
    value_after: `${targetColumn}:${targetPosition}`,
    origin: 'Kanban — Reordenação',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { ok: true };
}

// ─── Alterar data prevista de conclusão ───────────────────────────────────────
export async function updateClientActionPlanDueDate({ clientActionPlanId, newDueDate, reason, requestedBy }) {
  const plan = await base44.entities.ActionPlan.get(clientActionPlanId);
  const oldDate = plan.due_date;

  const newKanbanColumn = deriveKanbanColumn(plan.status, newDueDate);

  const updated = await base44.entities.ActionPlan.update(clientActionPlanId, {
    due_date: newDueDate,
    kanban_column: newKanbanColumn,
  });

  await base44.entities.AuditLog.create({
    user_name: requestedBy || 'Administrador MX',
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: plan.client_account_id,
    resource: 'ActionPlan',
    action: 'PLAN_DUE_DATE_CHANGE',
    resource_id: clientActionPlanId,
    value_before: oldDate || '',
    value_after: newDueDate,
    origin: 'Alteração de prazo',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { actionPlan: updated };
}

// ─── Marcar/desmarcar item como concluído ─────────────────────────────────────
export async function toggleActionItemComplete({ actionItemId, completed, requestedBy, reason }) {
  const item = await base44.entities.ActionItem.get(actionItemId);
  const plan = await base44.entities.ActionPlan.get(item.action_plan_id).catch(() => null);

  if (!completed && item.status === 'CONCLUIDA') {
    // Desmarcar — exigir justificativa
    if (!reason) return { blocked: true, message: 'Justificativa obrigatória para reabrir ação.' };
  }

  const updates = {
    status: completed ? 'CONCLUIDA' : 'NAO_INICIADA',
  };
  if (completed) {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = '';
  }

  const updated = await base44.entities.ActionItem.update(actionItemId, updates);

  // Recalcular progresso do plano
  const allItems = await base44.entities.ActionItem.filter({ action_plan_id: item.action_plan_id }).catch(() => []);
  const progress = calculatePlanProgress(allItems);

  // Auto-transição: se primeira ação concluída e plano NAO_INICIADA → EM_ANDAMENTO
  if (completed && plan && plan.status === 'NAO_INICIADA' && progress.completedCount > 0) {
    await base44.entities.ActionPlan.update(plan.id, {
      status: 'EM_ANDAMENTO',
      kanban_column: deriveKanbanColumn('EM_ANDAMENTO', plan.due_date),
      started_at: plan.started_at || new Date().toISOString(),
    });
  }

  await base44.entities.AuditLog.create({
    user_name: requestedBy || 'Administrador MX',
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: plan?.client_account_id || '',
    resource: 'ActionItem',
    action: completed ? 'ITEM_COMPLETED' : 'ITEM_REOPENED',
    resource_id: actionItemId,
    value_before: item.status,
    value_after: updates.status,
    origin: 'Checklist — Plano de Ação',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { actionItem: updated, progress };
}

// ─── Corrigir data efetiva de conclusão ───────────────────────────────────────
export async function correctClientActionPlanCompletionDate({ clientActionPlanId, newCompletedAt, reason, requestedBy }) {
  const plan = await base44.entities.ActionPlan.get(clientActionPlanId);
  const oldDate = plan.completed_at;

  if (!reason) return { blocked: true, message: 'Justificativa obrigatória para corrigir data de conclusão.' };

  const updated = await base44.entities.ActionPlan.update(clientActionPlanId, {
    completed_at: newCompletedAt,
  });

  await base44.entities.AuditLog.create({
    user_name: requestedBy || 'Administrador MX',
    user_role: 'ADMINISTRADOR_PRINCIPAL',
    client_account_id: plan.client_account_id,
    resource: 'ActionPlan',
    action: 'PLAN_COMPLETION_DATE_CORRECTION',
    resource_id: clientActionPlanId,
    value_before: oldDate || '',
    value_after: newCompletedAt,
    origin: 'Correção de data efetiva',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return { actionPlan: updated };
}

// Criar sugestão
export async function createSuggestion(data) {
  const suggestion = await base44.entities.ActionPlanSuggestion.create({
    client_account_id: data.client_account_id,
    client_account_name: data.client_account_name,
    store_id: data.store_id || '',
    store_name: data.store_name || '',
    strategic_plan_cycle_id: data.strategic_plan_cycle_id || '',
    indicator_definition_id: data.indicator_definition_id || '',
    indicator_code: data.indicator_code || '',
    indicator_name: data.indicator_name || '',
    department_id: data.department_id || '',
    action_plan_template_id: data.action_plan_template_id,
    action_plan_template_version_id: data.action_plan_template_version_id,
    action_plan_template_name: data.action_plan_template_name || '',
    source_type: data.source_type || 'MANUAL',
    reason: data.reason || '',
    expected_impact: data.expected_impact || '',
    owner_suggestion_title: data.owner_suggestion_title || '',
    owner_suggestion_problem: data.owner_suggestion_problem || '',
    owner_suggestion_impact: data.owner_suggestion_impact || '',
    owner_suggestion_recommendation: data.owner_suggestion_recommendation || '',
    owner_suggestion_button_text: data.owner_suggestion_button_text || 'Criar Plano de Ação',
    status: 'PENDENTE_VALIDACAO',
    created_by: data.created_by || 'Consultor MX',
  });

  await logAudit('SUGGESTION_CREATE', data.action_plan_template_id, null, {
    client_account_id: data.client_account_id,
    client_account_name: data.client_account_name,
    after: suggestion.id,
  });

  return suggestion;
}

// Validar sugestão
export async function validateSuggestion(suggestionId, consultantId, consultantName) {
  await base44.entities.ActionPlanSuggestion.update(suggestionId, {
    status: 'VALIDADA',
    validated_by_consultant_id: consultantId,
    validated_by_consultant_name: consultantName,
    validated_at: new Date().toISOString(),
  });
  await logAudit('SUGGESTION_VALIDATE', null, null, { after: suggestionId });
}

// Publicar sugestão ao Dono
export async function publishSuggestionToOwner(suggestionId) {
  await base44.entities.ActionPlanSuggestion.update(suggestionId, {
    status: 'EXIBIDA_DONO',
    shown_to_owner_at: new Date().toISOString(),
  });
  await logAudit('SUGGESTION_PUBLISH_OWNER', null, null, { after: suggestionId });
}

// Descartar sugestão
export async function dismissSuggestion(suggestionId, reason) {
  await base44.entities.ActionPlanSuggestion.update(suggestionId, {
    status: 'DESCARTADA',
    dismissed_reason: reason,
  });
  await logAudit('SUGGESTION_DISMISS', null, null, { after: suggestionId });
}

// Converter sugestão em ActionPlan
export async function convertSuggestionToActionPlan(suggestionId, options) {
  const suggestion = await base44.entities.ActionPlanSuggestion.get(suggestionId);
  const applyResult = await applyTemplateToClient(
    suggestion.action_plan_template_id,
    suggestion.action_plan_template_version_id,
    {
      ...options,
      client_account_id: suggestion.client_account_id,
      client_account_name: suggestion.client_account_name,
      store_id: suggestion.store_id,
      store_name: suggestion.store_name,
      strategic_plan_cycle_id: suggestion.strategic_plan_cycle_id,
      indicator_definition_id: suggestion.indicator_definition_id,
      indicator_name: suggestion.indicator_name,
    }
  );
  const actionPlan = applyResult.actionPlan || applyResult;
  await base44.entities.ActionPlanSuggestion.update(suggestionId, {
    status: 'CONVERTIDA',
    converted_action_plan_id: actionPlan.id,
  });
  await logAudit('SUGGESTION_CONVERT', suggestion.action_plan_template_id, null, {
    client_account_id: suggestion.client_account_id,
    after: actionPlan.id,
  });
  return actionPlan;
}

// Auditoria
async function logAudit(action, templateId, versionId, info) {
  try {
    await base44.entities.AuditLog.create({
      user_name: 'Administrador MX',
      user_role: 'ADMINISTRADOR_PRINCIPAL',
      resource: 'ActionPlanTemplate',
      resource_id: templateId || '',
      action,
      value_before: info.before || '',
      value_after: info.after || '',
      client_account_id: info.client_account_id || '',
      client_account_name: info.client_account_name || '',
      origin: 'Planos de Ação',
      environment: 'PROTOTIPO',
    });
  } catch (e) { /* auditoria não bloqueia */ }
}

// ── DADOS DEMONSTRATIVOS ─────────────────────────────────────────────────────

const DEMO_TEMPLATES = [
  {
    code: 'RECUPERACAO_META_VENDAS',
    title: 'Recuperação de Meta de Vendas',
    short_description: 'Plano para recuperar vendas quando o resultado está abaixo da meta mensal.',
    department_id: 'COMERCIAL',
    primary_indicator_code: 'SALES_TOTAL',
    problem: 'O volume total de vendas está abaixo da meta mensal estabelecida no Plano Estratégico.',
    objective: 'Recuperar o ritmo de vendas e atingir no mínimo 100% da meta mensal.',
    when_to_apply: 'Quando o indicador Vendas Total estiver abaixo de 90% da meta mensal.',
    default_priority: 'CRITICA',
    default_responsible_role: 'GERENTE_COMERCIAL',
    recommended_deadline_days: 30,
    suggestion_enabled: true,
    suggestion_trigger_type: 'INDICATOR_BELOW_TARGET',
    owner_suggestion_title: 'Recuperação de Vendas',
    owner_suggestion_problem: 'Suas vendas estão abaixo da meta deste mês.',
    owner_suggestion_impact: 'Risco de não atingir o resultado mensal projetado.',
    owner_suggestion_recommendation: 'Aplicar o plano de recuperação de vendas com foco em conversão e equipe.',
    evidence_required: true,
    evidence_types: 'RELATORIO,INDICADOR_OFICIAL',
    effectiveness_criteria: 'Atingir 100% da meta mensal no mês seguinte.',
    actions: [
      { title: 'Analisar funil de vendas por vendedor', how_to_execute: 'Levantar leads, agendamentos e visitas por vendedor. Identificar gargalos.', completion_criteria: 'Relatório de funil entregue', recommended_responsible_role: 'GERENTE_COMERCIAL', deadline_offset_days: 3 },
      { title: 'Reunião de alinhamento com equipe comercial', how_to_execute: 'Apresentar o gap, definir metas individuais e plano de ação por vendedor.', completion_criteria: 'Ata de reunião com metas individuais', recommended_responsible_role: 'GERENTE_COMERCIAL', deadline_offset_days: 5 },
      { title: 'Campanha de incentivo de curto prazo', how_to_execute: 'Definir premiação por venda acima da média. Comunicar à equipe.', completion_criteria: 'Regulamento da campanha publicado', recommended_responsible_role: 'DIRETOR', deadline_offset_days: 7 },
      { title: 'Acompanhamento diário de vendas', how_to_execute: 'Reunião rápida de 15 min todos os dias para revisar vendas do dia anterior.', completion_criteria: 'Registros de acompanhamento por 30 dias', recommended_responsible_role: 'GERENTE_COMERCIAL', deadline_offset_days: 30 },
    ],
  },
  {
    code: 'AUMENTO_VOLUME_LEADS',
    title: 'Aumento do Volume de Leads',
    short_description: 'Plano para aumentar o volume de leads recebidos via marketing digital.',
    department_id: 'MARKETING',
    primary_indicator_code: 'LEADS_RECEIVED',
    problem: 'O volume de leads recebidos está abaixo do necessário para sustentar a meta de vendas.',
    objective: 'Aumentar o volume de leads em pelo menos 30% no próximo mês.',
    when_to_apply: 'Quando o indicador Volume de Leads Recebidos estiver abaixo de 70% da meta.',
    default_priority: 'ATENCAO',
    default_responsible_role: 'MARKETING',
    recommended_deadline_days: 45,
    suggestion_enabled: true,
    suggestion_trigger_type: 'INDICATOR_BELOW_TARGET',
    owner_suggestion_title: 'Mais Leads para sua Operação',
    owner_suggestion_problem: 'O volume de leads está insuficiente para bater a meta de vendas.',
    owner_suggestion_impact: 'Menos oportunidades no funil e queda nas vendas.',
    owner_suggestion_recommendation: 'Revisar investimento e campanhas para gerar mais leads qualificados.',
    evidence_required: true,
    evidence_types: 'RELATORIO,INDICADOR_OFICIAL',
    effectiveness_criteria: 'Atingir 100% da meta de leads no mês seguinte.',
    actions: [
      { title: 'Auditoria de campanhas ativas', how_to_execute: 'Revisar todas as campanhas de tráfego pago. Pausar anúncios com baixo desempenho.', completion_criteria: 'Relatório de auditoria', recommended_responsible_role: 'MARKETING', deadline_offset_days: 5 },
      { title: 'Ajuste de verba e lances', how_to_execute: 'Redistribuir investimento para campanhas com melhor ROI. Aumentar lances em horários de pico.', completion_criteria: 'Nova distribuição de verba', recommended_responsible_role: 'MARKETING', deadline_offset_days: 7 },
      { title: 'Criação de nova campanha de geração de leads', how_to_execute: 'Criar campanha focada em captação de leads com formulário. Definir público e criativos.', completion_criteria: 'Campanha ativa', recommended_responsible_role: 'MARKETING', deadline_offset_days: 10 },
    ],
  },
  {
    code: 'REDUCAO_ESTOQUE_90',
    title: 'Redução do Estoque acima de 90 dias',
    short_description: 'Plano para reduzir veículos parados há mais de 90 dias.',
    department_id: 'PRODUTO_ESTOQUE',
    primary_indicator_code: 'INVENTORY_OVER_90_PERCENTAGE',
    problem: 'O percentual de veículos com mais de 90 dias de estoque está acima do limite saudável.',
    objective: 'Reduzir o percentual de estoque >90 dias para abaixo de 15%.',
    when_to_apply: 'Quando o indicador % Estoque > 90 Dias estiver acima de 20%.',
    default_priority: 'CRITICA',
    default_responsible_role: 'PRODUTO_ESTOQUE',
    recommended_deadline_days: 60,
    suggestion_enabled: true,
    suggestion_trigger_type: 'INDICATOR_ABOVE_LIMIT',
    owner_suggestion_title: 'Estoque Parado — Ação Necessária',
    owner_suggestion_problem: 'Você tem veículos parados há mais de 90 dias.',
    owner_suggestion_impact: 'Capital parado e custo de oportunidade alto.',
    owner_suggestion_recommendation: 'Aplicar o plano de redução de estoque acima de 90 dias.',
    evidence_required: true,
    evidence_types: 'RELATORIO,INDICADOR_OFICIAL',
    effectiveness_criteria: 'Reduzir % Estoque > 90 Dias para abaixo de 15%.',
    actions: [
      { title: 'Identificar os veículos acima de 90 dias', how_to_execute: 'Levantar todos os veículos com mais de 90 dias de estoque. Listar modelo, data de entrada e custo.', completion_criteria: 'Lista de veículos >90 dias', recommended_responsible_role: 'PRODUTO_ESTOQUE', deadline_offset_days: 3 },
      { title: 'Revisar preço e margem autorizada', how_to_execute: 'Avaliar preço de mercado e definir nova margem para acelerar a venda.', completion_criteria: 'Nova tabela de preços aprovada', recommended_responsible_role: 'DIRETOR', deadline_offset_days: 7 },
      { title: 'Criar campanha de veículos prioritários', how_to_execute: 'Destacar os veículos >90 dias em campanhas específicas e vitrine.', completion_criteria: 'Campanha ativa', recommended_responsible_role: 'MARKETING', deadline_offset_days: 10 },
      { title: 'Acompanhar leads e conversão semanalmente', how_to_execute: 'Reunião semanal para acompanhar leads e vendas dos veículos prioritários.', completion_criteria: 'Registros de acompanhamento', recommended_responsible_role: 'GERENTE_COMERCIAL', deadline_offset_days: 60 },
    ],
  },
  {
    code: 'ADEQUACAO_QUADRO_COLAB',
    title: 'Adequação do Quadro de Colaboradores',
    short_description: 'Plano para ajustar o quadro de colaboradores ao volume de operação.',
    department_id: 'PESSOAS_RH',
    primary_indicator_code: 'EMPLOYEE_COUNT',
    problem: 'O quadro de colaboradores está desalinhado com o volume atual de operação.',
    objective: 'Adequar o quadro de colaboradores ao volume de vendas e operação.',
    when_to_apply: 'Quando houver desalinhamento entre quadro e volume de operação.',
    default_priority: 'EVOLUCAO',
    default_responsible_role: 'PESSOAS_RH',
    recommended_deadline_days: 90,
    suggestion_enabled: false,
    evidence_required: true,
    evidence_types: 'RELATORIO,CONFIRMACAO_RESPONSAVEL',
    effectiveness_criteria: 'Quadro alinhado com o volume de operação.',
    actions: [
      { title: 'Diagnóstico do quadro atual', how_to_execute: 'Levantar quadro atual, funções, custos e produtividade por área.', completion_criteria: 'Relatório de diagnóstico', recommended_responsible_role: 'PESSOAS_RH', deadline_offset_days: 15 },
      { title: 'Definição do quadro ideal', how_to_execute: 'Comparar quadro atual com volume de operação. Identificar gaps e excessos.', completion_criteria: 'Proposta de quadro ideal', recommended_responsible_role: 'PESSOAS_RH', deadline_offset_days: 30 },
      { title: 'Plano de transição', how_to_execute: 'Definir contratações, transferências e desligamentos necessários.', completion_criteria: 'Plano de transição aprovado', recommended_responsible_role: 'DIRETOR', deadline_offset_days: 45 },
    ],
  },
  {
    code: 'REDUCAO_DESPESAS',
    title: 'Redução de Despesas',
    short_description: 'Plano para reduzir despesas totais da operação.',
    department_id: 'FINANCEIRO',
    primary_indicator_code: 'TOTAL_EXPENSE',
    problem: 'A despesa total está acima do projetado, comprometendo a margem.',
    objective: 'Reduzir despesas totais em pelo menos 10% sem impactar operação.',
    when_to_apply: 'Quando a despesa total estiver acima de 110% do orçado.',
    default_priority: 'ATENCAO',
    default_responsible_role: 'FINANCEIRO',
    recommended_deadline_days: 45,
    suggestion_enabled: true,
    suggestion_trigger_type: 'INDICATOR_ABOVE_LIMIT',
    owner_suggestion_title: 'Redução de Despesas',
    owner_suggestion_problem: 'Suas despesas estão acima do orçado.',
    owner_suggestion_impact: 'Margem comprometida e risco de resultado negativo.',
    owner_suggestion_recommendation: 'Aplicar o plano de redução de despesas.',
    evidence_required: true,
    evidence_types: 'RELATORIO,INDICADOR_OFICIAL',
    effectiveness_criteria: 'Despesa total reduzida em pelo menos 10%.',
    actions: [
      { title: 'Análise de despesas por categoria', how_to_execute: 'Levantar todas as despesas por categoria. Identificar gastos não essenciais.', completion_criteria: 'Relatório de despesas', recommended_responsible_role: 'FINANCEIRO', deadline_offset_days: 7 },
      { title: 'Renegociação de contratos', how_to_execute: 'Renegociar contratos de fornecedores, aluguel e serviços.', completion_criteria: 'Contratos renegociados', recommended_responsible_role: 'DIRETOR', deadline_offset_days: 20 },
      { title: 'Corte de gastos não essenciais', how_to_execute: 'Identificar e suspender gastos não essenciais imediatamente.', completion_criteria: 'Lista de cortes aprovada', recommended_responsible_role: 'DONO', deadline_offset_days: 15 },
    ],
  },
  {
    code: 'REDUCAO_CUSTO_PREPARACAO',
    title: 'Redução do Custo Médio de Preparação',
    short_description: 'Plano para reduzir o custo médio de preparação de veículos.',
    department_id: 'OPERACOES',
    primary_indicator_code: 'AVERAGE_PREPARATION_COST',
    problem: 'O custo médio de preparação de veículos está acima do benchmark.',
    objective: 'Reduzir o custo médio de preparação em pelo menos 15%.',
    when_to_apply: 'Quando o custo médio de preparação estiver acima do benchmark.',
    default_priority: 'EVOLUCAO',
    default_responsible_role: 'OPERACOES',
    recommended_deadline_days: 60,
    suggestion_enabled: false,
    evidence_required: true,
    evidence_types: 'RELATORIO,INDICADOR_OFICIAL',
    effectiveness_criteria: 'Custo médio reduzido em pelo menos 15%.',
    actions: [
      { title: 'Mapear processo de preparação', how_to_execute: 'Levantar todas as etapas e custos do processo de preparação.', completion_criteria: 'Mapa de processo', recommended_responsible_role: 'OPERACOES', deadline_offset_days: 10 },
      { title: 'Identificar gargalos e desperdícios', how_to_execute: 'Analisar cada etapa e identificar onde há desperdício de tempo ou recurso.', completion_criteria: 'Relatório de gargalos', recommended_responsible_role: 'OPERACOES', deadline_offset_days: 20 },
      { title: 'Renegociar insumos e serviços', how_to_execute: 'Buscar fornecedores alternativos e renegociar preços de insumos.', completion_criteria: 'Novos contratos', recommended_responsible_role: 'OPERACOES', deadline_offset_days: 30 },
    ],
  },
];

// Seed de dados demonstrativos
export async function seedDemoTemplates() {
  // Garantir catálogo de indicadores
  await ensureIndicatorCatalog();

  const existing = await base44.entities.ActionPlanTemplate.list();
  const existingCodes = new Set(existing.map(t => t.code));
  let created = 0;

  for (const demo of DEMO_TEMPLATES) {
    if (existingCodes.has(demo.code)) continue;

    // Buscar o indicador no catálogo
    const indicators = await base44.entities.IndicatorDefinition.filter({ code: demo.primary_indicator_code });
    const indicator = indicators[0];

    const templateData = {
      ...demo,
      primary_indicator_id: indicator?.id || '',
      primary_indicator_name: indicator?.name || demo.primary_indicator_code,
      effectiveness_indicator_id: indicator?.id || '',
      effectiveness_indicator_name: indicator?.name || '',
    };

    const template = await createTemplate(templateData);
    await publishTemplate(template.id);
    created++;
  }

  return { created, total: existing.length + created };
}
