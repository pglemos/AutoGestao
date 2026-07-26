import { supabase } from "@/lib/supabase";

const ACTION_SELECT = [
  "id",
  "codigo",
  "scope_type",
  "scope_id",
  "objetivo",
  "departamento",
  "indicador",
  "problema",
  "acao",
  "como",
  "responsavel_id",
  "prazo",
  "status",
  "prioridade",
  "origem",
  "origem_ref_id",
  "origem_ref_table",
  "eficacia_score",
  "eficacia_nota",
  "requires_owner",
  "financial_impact",
  "budget",
  "evidence_required",
  "blocked_reason",
  "block_category",
  "block_responsible",
  "block_responsible_id",
  "expected_unblock_date",
  "block_note",
  "unblock_solution",
  "unblock_note",
  "return_reason",
  "return_guidance",
  "reopen_reason",
  "reopen_note",
  "cancel_reason",
  "cancel_note",
  "progress_note",
  "next_step",
  "projected_date",
  "impact_status",
  "impact_value_before",
  "impact_value_after",
  "realized_impact",
  "impact_measurement_date",
  "approval_note",
  "approved_by",
  "approved_at",
  "delegation_note",
  "delegated_by",
  "delegated_at",
  "reschedule_reason",
  "reschedule_note",
  "rescheduled_by",
  "rescheduled_at",
  "transition_metadata",
  "progresso",
  "iniciado_at",
  "checklist",
  "comentarios",
  "created_at",
  "created_by",
  "updated_at",
  "concluido_at",
].join(",");

const DB_TO_UI_STATUS = {
  pendente: "not_started",
  aguardando_decisao: "awaiting_decision",
  em_andamento: "in_progress",
  bloqueada: "blocked",
  atrasado: "late",
  concluido: "completed",
  validando_eficacia: "awaiting_validation",
  cancelada: "cancelled",
};

const UI_TO_DB_STATUS = {
  not_started: "pendente",
  in_progress: "em_andamento",
  blocked: "bloqueada",
  awaiting_decision: "aguardando_decisao",
  late: "atrasado",
  awaiting_validation: "validando_eficacia",
  completed: "concluido",
  cancelled: "cancelada",
};

const DB_TO_UI_PRIORITY = {
  critica: "critical",
  alta: "high",
  media: "medium",
  baixa: "low",
};

const UI_TO_DB_PRIORITY = {
  critical: "critica",
  high: "alta",
  medium: "media",
  low: "baixa",
};

const DB_TO_UI_ORIGIN = {
  alertas: "alert",
  score: "score",
  consultor: "consulting",
  manual: "manual",
};

const UI_TO_DB_ORIGIN = {
  alert: "alertas",
  alertas: "alertas",
  score: "score",
  consulting: "consultor",
  consultor: "consultor",
  strategic_plan: "manual",
  diagnostic: "consultor",
  department: "manual",
  manual: "manual",
};

const DEPARTMENT_LABELS = {
  commercial: "Comercial",
  marketing: "Marketing",
  product_stock: "Produto e Estoque",
  financial: "Financeiro",
  operations: "Operações",
  people_hr: "Pessoas — RH",
  general: "Geral e Estratégia",
};

const PRIORITY_LABELS = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const STATUS_LABELS = {
  awaiting_decision: "Aguardando decisão",
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  blocked: "Bloqueada",
  late: "Atrasada",
  awaiting_validation: "Aguardando validação",
  completed: "Concluída",
  cancelled: "Cancelada",
};

function toDateOnly(value) {
  if (!value) return "";
  const raw = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function toDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fallbackCode(id) {
  return `PA-${String(id || "").replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function safeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapHistory(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    type: row.event_type || "status_changed",
    date: toDateTime(row.changed_at),
    author: row.changed_by || "Sistema",
    description: row.event_note || (Array.isArray(row.changed_fields) && row.changed_fields.length
      ? `Campos atualizados: ${row.changed_fields.join(", ")}`
      : "Ação atualizada"),
    metadata: {
      ...(row.metadata || {}),
      oldValues: row.old_values,
      newValues: row.new_values,
    },
  }));
}

function mapEvidence(rows) {
  const dbTypeToUi = { foto: "image", print: "image", documento: "file", link: "link", observacao: "text" };
  return (rows || []).map((row) => ({
    id: row.id,
    type: dbTypeToUi[row.tipo] || "file",
    name: row.nome_arquivo || row.storage_path || "Evidência",
    date: toDateTime(row.created_at),
    responsible: row.uploaded_by || "Usuário autenticado",
    note: row.nota || "",
    valueBefore: row.valor_antes ?? null,
    valueAfter: row.valor_depois ?? null,
    url: row.evidence_url || null,
  }));
}

export function mapLiveAction(row, context = {}) {
  const status = DB_TO_UI_STATUS[row.status] || "not_started";
  const progress = Number.isFinite(Number(row.progresso))
    ? Number(row.progresso)
    : status === "completed" ? 100 : 0;
  const responsible = context.users?.get(row.responsavel_id);
  const department = safeText(row.departamento, "general");
  const priority = DB_TO_UI_PRIORITY[row.prioridade] || "medium";

  return {
    id: row.id,
    code: row.codigo || fallbackCode(row.id),
    title: safeText(row.acao, "Ação sem título"),
    description: safeText(row.problema),
    problemOrOpportunity: safeText(row.problema),
    department,
    departmentLabel: DEPARTMENT_LABELS[department] || department,
    strategicObjective: safeText(row.objetivo),
    strategicObjectiveLabel: safeText(row.objetivo, "Sem objetivo informado"),
    indicator: safeText(row.indicador),
    origin: DB_TO_UI_ORIGIN[row.origem] || "manual",
    responsible: responsible?.name || row.responsavel_id || "Não definido",
    responsibleId: row.responsavel_id || null,
    executor: responsible?.name || row.responsavel_id || "Não definido",
    priority,
    progress,
    startDate: toDateOnly(row.iniciado_at || row.created_at),
    dueDate: toDateOnly(row.prazo),
    lastUpdate: toDateOnly(row.updated_at),
    status,
    statusLabel: STATUS_LABELS[status] || status,
    priorityLabel: PRIORITY_LABELS[priority] || priority,
    requiresOwner: Boolean(row.requires_owner),
    expectedImpact: safeText(row.eficacia_nota),
    financialImpact: row.financial_impact ?? null,
    budget: row.budget ?? null,
    evidenceRequired: Boolean(row.evidence_required),
    blockedReason: safeText(row.blocked_reason, status === "late" ? "Prazo vencido" : "") || null,
    blockCategory: row.block_category || null,
    blockResponsible: row.block_responsible || null,
    blockResponsibleId: row.block_responsible_id || null,
    expectedUnblockDate: toDateOnly(row.expected_unblock_date) || null,
    blockNote: row.block_note || null,
    unblockSolution: row.unblock_solution || null,
    unblockNote: row.unblock_note || null,
    returnReason: row.return_reason || null,
    returnGuidance: row.return_guidance || null,
    reopenReason: row.reopen_reason || null,
    reopenNote: row.reopen_note || null,
    cancelReason: row.cancel_reason || null,
    cancelNote: row.cancel_note || null,
    progressNote: row.progress_note || null,
    nextStep: row.next_step || null,
    projectedDate: toDateOnly(row.projected_date) || null,
    completedAt: toDateTime(row.concluido_at),
    impactStatus: row.impact_status || (row.eficacia_score == null ? "unmeasured" : "positive"),
    impactValueBefore: row.impact_value_before ?? null,
    impactValueAfter: row.impact_value_after ?? row.eficacia_score ?? null,
    realizedImpact: row.realized_impact || null,
    impactMeasurementDate: toDateOnly(row.impact_measurement_date) || null,
    approvalNote: row.approval_note || null,
    approvedBy: row.approved_by || null,
    approvedAt: toDateTime(row.approved_at),
    delegationNote: row.delegation_note || null,
    delegatedBy: row.delegated_by || null,
    delegatedAt: toDateTime(row.delegated_at),
    rescheduleReason: row.reschedule_reason || null,
    rescheduleNote: row.reschedule_note || null,
    rescheduledBy: row.rescheduled_by || null,
    rescheduledAt: toDateTime(row.rescheduled_at),
    history: mapHistory(context.historyByAction?.get(row.id) || []),
    evidences: mapEvidence(context.evidenceByAction?.get(row.id) || []),
    comments: Array.isArray(row.comentarios) ? row.comentarios : [],
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    dbStatus: row.status,
    dbPriority: row.prioridade,
    dbOrigin: row.origem,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function queryRelatedRows(table, actionIds) {
  if (!actionIds.length) return [];
  const { data, error } = await supabase.from(table).select("*").in("plano_id", actionIds);
  if (error) throw error;
  return data || [];
}

async function loadLiveRows({ storeId } = {}) {
  let query = supabase
    .from("planos_acao")
    .select(ACTION_SELECT)
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (storeId) {
    query = query.eq("scope_type", "store").eq("scope_id", storeId);
  }
  const { data: rows, error } = await query;
  if (error) throw error;

  const actionRows = rows || [];
  const actionIds = actionRows.map((row) => row.id);
  const responsibleIds = [...new Set(actionRows.map((row) => row.responsavel_id).filter(Boolean))];
  const [historyRows, evidenceRows, usersResult] = await Promise.all([
    queryRelatedRows("historico_planos_acao", actionIds),
    queryRelatedRows("evidencias_planos_acao", actionIds),
    responsibleIds.length
      ? supabase.from("usuarios").select("id,name,email").in("id", responsibleIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (usersResult.error) throw usersResult.error;

  const users = new Map((usersResult.data || []).map((user) => [user.id, user]));
  const historyByAction = new Map();
  const evidenceByAction = new Map();
  for (const row of historyRows) {
    const list = historyByAction.get(row.plano_id) || [];
    list.push(row);
    historyByAction.set(row.plano_id, list);
  }
  for (const row of evidenceRows) {
    const list = evidenceByAction.get(row.plano_id) || [];
    list.push(row);
    evidenceByAction.set(row.plano_id, list);
  }

  return actionRows.map((row) => mapLiveAction(row, { users, historyByAction, evidenceByAction }));
}

export function buildActionUpdatePatch(updates = {}) {
  const patch = {};
  const set = (key, value) => {
    if (value !== undefined) patch[key] = value;
  };

  set("acao", updates.title);
  set("objetivo", updates.strategicObjectiveLabel ?? updates.strategicObjective);
  set("indicador", updates.indicator);
  set("departamento", updates.department);
  set("responsavel_id", updates.responsibleId);
  set("prazo", updates.dueDate === undefined ? undefined : parseDateInput(updates.dueDate));
  set("prioridade", updates.priority === undefined ? undefined : UI_TO_DB_PRIORITY[updates.priority] || updates.priority);
  set("status", updates.status === undefined ? undefined : UI_TO_DB_STATUS[updates.status] || updates.status);
  set("progresso", updates.progress === undefined ? undefined : Number(updates.progress));
  set("como", updates.como);
  set("eficacia_nota", updates.expectedImpact);
  set("eficacia_score", nullableNumber(updates.impactValueAfter));
  set("checklist", updates.checklist);
  set("comentarios", updates.comments);
  set("requires_owner", updates.requiresOwner);
  set("financial_impact", nullableNumber(updates.financialImpact));
  set("budget", nullableNumber(updates.budget));
  set("evidence_required", updates.evidenceRequired);
  set("blocked_reason", updates.blockedReason);
  set("block_category", updates.blockCategory);
  set("block_responsible", updates.blockResponsible);
  set("block_responsible_id", updates.blockResponsibleId);
  set("expected_unblock_date", updates.expectedUnblockDate === undefined ? undefined : parseDateInput(updates.expectedUnblockDate));
  set("block_note", updates.blockNote);
  set("unblock_solution", updates.unblockSolution);
  set("unblock_note", updates.unblockNote);
  set("return_reason", updates.returnReason);
  set("return_guidance", updates.returnGuidance);
  set("reopen_reason", updates.reopenReason);
  set("reopen_note", updates.reopenNote);
  set("cancel_reason", updates.cancelReason);
  set("cancel_note", updates.cancelNote);
  set("progress_note", updates.progressNote);
  set("next_step", updates.nextStep);
  set("projected_date", updates.projectedDate === undefined ? undefined : parseDateInput(updates.projectedDate));
  set("impact_status", updates.impactStatus);
  set("impact_value_before", nullableNumber(updates.impactValueBefore));
  set("impact_value_after", nullableNumber(updates.impactValueAfter));
  set("realized_impact", updates.realizedImpact);
  set("impact_measurement_date", updates.measurementDate === undefined ? undefined : parseDateInput(updates.measurementDate));
  set("approval_note", updates.approvalNote);
  set("approved_by", updates.approvedBy);
  set("approved_at", updates.approvedAt);
  set("delegation_note", updates.delegationNote);
  set("delegated_by", updates.delegatedBy);
  set("delegated_at", updates.delegatedAt);
  set("reschedule_reason", updates.rescheduleReason);
  set("reschedule_note", updates.rescheduleNote);
  set("rescheduled_by", updates.rescheduledBy);
  set("rescheduled_at", updates.rescheduledAt);
  set("transition_metadata", updates.transitionMetadata);
  set("concluido_at", updates.completedAt);
  set("iniciado_at", updates.startedAt);
  return patch;
}

function updatePayload(action, updates = {}) {
  return { p_plano_id: action.id, p_patch: buildActionUpdatePatch(updates) };
}

function parseDateInput(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

async function resolveResponsibleId(name, storeId) {
  if (!name || !storeId) return null;
  const { data: links, error: linksError } = await supabase
    .from("vinculos_loja")
    .select("user_id")
    .eq("store_id", storeId)
    .eq("is_active", true);
  if (linksError) throw linksError;
  const ids = (links || []).map((link) => link.user_id).filter(Boolean);
  if (!ids.length) return null;
  const { data: user, error: userError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("name", name)
    .in("id", ids)
    .limit(1)
    .maybeSingle();
  if (userError) throw userError;
  return user?.id || null;
}

async function updateLiveAction(action, updates) {
  let resolvedUpdates = updates;
  if (updates.responsible && !updates.responsibleId) {
    const responsibleId = await resolveResponsibleId(updates.responsible, action.scopeId);
    if (!responsibleId) throw new Error("Responsável não encontrado na unidade da ação.");
    resolvedUpdates = { ...updates, responsibleId };
  }
  const { data, error } = await supabase.rpc("atualizar_plano_acao_patch", updatePayload(action, resolvedUpdates));
  if (error) throw error;
  return data;
}

export const actionPlanLiveRepository = {
  async getActionById(id, options) {
    const actions = await loadLiveRows(options);
    return actions.find((action) => action.id === id) || null;
  },

  getChecklistProgress(action) {
    const checklist = Array.isArray(action?.checklist) ? action.checklist : [];
    if (!checklist.length) return null;
    return Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);
  },

  async getResponsiblePeople({ storeId } = {}) {
    if (!storeId) return [];
    let query = supabase
      .from("usuarios")
      .select("id,name,email")
      .order("name")
      .limit(500);
    if (storeId) {
      const { data: links, error: linksError } = await supabase
        .from("vinculos_loja")
        .select("user_id")
        .eq("store_id", storeId)
        .eq("is_active", true);
      if (linksError) throw linksError;
      const ids = (links || []).map((link) => link.user_id).filter(Boolean);
      if (!ids.length) return [];
      query = query.in("id", ids);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((user) => user.name).filter(Boolean);
  },

  async getActions(options) {
    return loadLiveRows(options);
  },

  async createAction(payload, { storeId } = {}) {
    if (!storeId) throw new Error("Nenhuma loja selecionada para criar a ação.");
    let responsibleId = payload.responsibleId || null;
    if (!responsibleId && payload.responsible) {
      responsibleId = await resolveResponsibleId(payload.responsible, storeId);
      if (!responsibleId) throw new Error("Responsável não encontrado na unidade selecionada.");
    }
    const { data, error } = await supabase.rpc("criar_plano_acao_v2", {
      p_scope_type: "store",
      p_scope_id: storeId,
      p_objetivo: payload.strategicObjectiveLabel || payload.strategicObjective || null,
      p_departamento: payload.department || "general",
      p_indicador: payload.indicator || "Plano de ação",
      p_problema: payload.problemOrOpportunity || payload.description || payload.title,
      p_acao: payload.title,
      p_como: payload.description || null,
      p_responsavel_id: responsibleId,
      p_prazo: parseDateInput(payload.dueDate) || null,
      p_prioridade: UI_TO_DB_PRIORITY[payload.priority] || "media",
      p_origem: UI_TO_DB_ORIGIN[payload.origin] || "manual",
    });
    if (error) throw error;
    if (!data) return null;
    const extraUpdates = {
      ...(payload.requiresOwner ? { requiresOwner: true, status: "awaiting_decision" } : {}),
      ...(payload.financialImpact != null ? { financialImpact: payload.financialImpact } : {}),
      ...(payload.budget != null ? { budget: payload.budget } : {}),
      ...(payload.evidenceRequired ? { evidenceRequired: true } : {}),
      ...(payload.expectedImpact ? { expectedImpact: payload.expectedImpact } : {}),
    };
    const extraPatch = Object.keys(extraUpdates).length
      ? buildActionUpdatePatch({
        ...extraUpdates,
        transitionMetadata: { eventType: "created", createdBy: payload.createdBy || null },
      })
      : {};
    if (Object.keys(extraPatch).length) {
      const { error: extraPatchError } = await supabase.rpc("atualizar_plano_acao_patch", {
        p_plano_id: data.id,
        p_patch: extraPatch,
      });
      if (extraPatchError) throw extraPatchError;
    }
    return this.getActionById(data.id, { storeId });
  },

  async updateActionById(id, updates) {
    const actions = await loadLiveRows();
    const action = actions.find((item) => item.id === id);
    if (!action) throw new Error("Ação não encontrada.");
    await updateLiveAction(action, updates);
    return this.getActionById(id, action.scopeType === "store" ? { storeId: action.scopeId } : undefined);
  },

  async approveAction(id, payload = {}) {
    return this.updateActionById(id, {
      status: "in_progress",
      responsibleId: payload.responsibleId,
      responsible: payload.responsible,
      dueDate: payload.dueDate,
      budget: payload.budget,
      requiresOwner: false,
      approvalNote: payload.note || null,
      approvedBy: payload.approvedBy || null,
      approvedAt: new Date().toISOString(),
      transitionMetadata: { eventType: "approved", note: payload.note || null },
    });
  },

  async delegateAction(id, payload = {}) {
    return this.updateActionById(id, {
      responsibleId: payload.responsibleId,
      responsible: payload.responsible,
      dueDate: payload.dueDate,
      priority: payload.priority,
      delegationNote: payload.note || null,
      delegatedBy: payload.delegatedBy || null,
      delegatedAt: new Date().toISOString(),
      transitionMetadata: { eventType: "delegated", note: payload.note || null },
    });
  },

  async startAction(id) {
    return this.updateActionById(id, {
      status: "in_progress",
      progress: 1,
      transitionMetadata: { eventType: "started" },
      startedAt: new Date().toISOString(),
    });
  },

  async updateProgress(id, payload = {}) {
    return this.updateActionById(id, {
      progress: payload.progress,
      progressNote: payload.comment || null,
      nextStep: payload.nextStep || null,
      projectedDate: payload.projectedDate || null,
      transitionMetadata: { eventType: "progress_changed", note: payload.comment || null },
    });
  },

  async addChecklistItem(id, payload = {}) {
    const action = await this.getActionById(id);
    if (!action) throw new Error("Ação não encontrada.");
    const item = { id: crypto.randomUUID(), text: payload.text, required: Boolean(payload.required), done: false };
    await updateLiveAction(action, { checklist: [...action.checklist, item] });
    return item;
  },

  async updateChecklistItem(id, itemId, updates = {}) {
    const action = await this.getActionById(id);
    if (!action) throw new Error("Ação não encontrada.");
    const checklist = action.checklist.map((item) => item.id === itemId ? { ...item, ...updates } : item);
    return updateLiveAction(action, { checklist });
  },

  async removeChecklistItem(id, itemId) {
    const action = await this.getActionById(id);
    if (!action) throw new Error("Ação não encontrada.");
    return updateLiveAction(action, { checklist: action.checklist.filter((item) => item.id !== itemId) });
  },

  async blockAction(id, payload = {}) {
    return this.updateActionById(id, {
      status: "blocked",
      blockedReason: payload.reason || null,
      blockCategory: payload.category || null,
      blockResponsible: payload.responsible || null,
      expectedUnblockDate: payload.expectedUnblockDate || null,
      blockNote: payload.note || null,
      transitionMetadata: { eventType: "blocked", category: payload.category || null },
    });
  },

  async unblockAction(id, payload = {}) {
    return this.updateActionById(id, {
      status: "in_progress",
      blockedReason: null,
      blockCategory: null,
      blockResponsible: null,
      blockResponsibleId: null,
      expectedUnblockDate: null,
      blockNote: null,
      unblockSolution: payload.solution || null,
      unblockNote: payload.note || null,
      transitionMetadata: { eventType: "unblocked", note: payload.solution || null },
    });
  },

  async submitForValidation(id, payload = {}) {
    const action = await this.getActionById(id);
    if (!action) throw new Error("Ação não encontrada.");
    const errors = [];
    if ((action.progress || 0) < 100) errors.push("Progresso deve ser 100%");
    if (action.status === "blocked") errors.push("Ação não pode estar bloqueada");
    const incompleteRequired = (action.checklist || []).filter((item) => item.required && !item.done);
    if (incompleteRequired.length) errors.push(`${incompleteRequired.length} item(ns) obrigatório(s) do checklist pendente(s)`);
    if (action.evidenceRequired && !(action.evidences || []).length) errors.push("Evidência obrigatória não anexada");
    if (errors.length) return { error: true, errors };
    await this.updateActionById(id, {
      status: "awaiting_validation",
      progress: 100,
      progressNote: payload.note || null,
      transitionMetadata: { eventType: "submitted_for_validation", note: payload.note || null },
    });
    return { error: false };
  },

  async validateAction(id, payload = {}) {
    return this.updateActionById(id, {
      status: "completed",
      progress: 100,
      impactStatus: payload.impactStatus || "unmeasured",
      impactValueBefore: payload.valueBefore,
      impactValueAfter: payload.valueAfter,
      realizedImpact: payload.realizedImpact || null,
      measurementDate: payload.measurementDate || new Date().toISOString().slice(0, 10),
      expectedImpact: payload.note,
      transitionMetadata: { eventType: "validated", note: payload.note || null },
    });
  },

  async returnToExecution(id, payload = {}) {
    return this.updateActionById(id, {
      status: "in_progress",
      dueDate: payload.newDueDate,
      returnReason: payload.reason || null,
      returnGuidance: payload.guidance || null,
      responsible: payload.responsible,
      transitionMetadata: { eventType: "returned", note: payload.reason || null },
    });
  },

  async reopenAction(id, payload = {}) {
    return this.updateActionById(id, {
      status: "in_progress",
      progress: payload.initialProgress ?? 0,
      dueDate: payload.newDueDate,
      responsible: payload.newResponsible,
      completedAt: null,
      impactStatus: null,
      reopenReason: payload.reason || null,
      reopenNote: payload.note || null,
      transitionMetadata: { eventType: "reopened", note: payload.reason || null },
    });
  },

  async cancelAction(id, payload = {}) {
    return this.updateActionById(id, {
      status: "cancelled",
      cancelReason: payload.reason || null,
      cancelNote: payload.note || null,
      transitionMetadata: { eventType: "cancelled", note: payload.reason || null },
    });
  },

  async updateDueDate(id, payload = {}) {
    return this.updateActionById(id, {
      dueDate: payload.newDueDate,
      rescheduleReason: payload.reason || null,
      rescheduleNote: payload.note || null,
      rescheduledBy: payload.rescheduledBy || null,
      rescheduledAt: new Date().toISOString(),
      transitionMetadata: { eventType: "due_date_changed", note: payload.reason || payload.note || null },
    });
  },

  async batchUpdate(ids, updates) {
    const actions = await loadLiveRows();
    const selected = actions.filter((action) => ids.includes(action.id));
    await Promise.all(selected.map((action) => updateLiveAction(action, updates)));
    return selected;
  },

  async addComment(id, payload = {}) {
    const action = await this.getActionById(id);
    if (!action) throw new Error("Ação não encontrada.");
    const comment = {
      id: crypto.randomUUID(),
      author: payload.author || "Usuário autenticado",
      content: payload.content,
      date: new Date().toISOString(),
    };
    await updateLiveAction(action, { comments: [...action.comments, comment] });
    return comment;
  },

  async addEvidence(id, payload = {}) {
    const dbType = { image: "foto", file: "documento", link: "link", text: "observacao" }[payload.type] || "observacao";
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("evidencias_planos_acao").insert({
      plano_id: id,
      tipo: dbType,
      nome_arquivo: payload.name,
      evidence_url: payload.url || null,
      nota: payload.note || null,
      valor_antes: payload.valueBefore == null || payload.valueBefore === "" ? null : Number(payload.valueBefore),
      valor_depois: payload.valueAfter == null || payload.valueAfter === "" ? null : Number(payload.valueAfter),
      uploaded_by: authData.user?.id || null,
    }).select("*").single();
    if (error) throw error;
    return mapEvidence([data])[0];
  },

  async removeEvidence(id, evidenceId) {
    const { error } = await supabase.from("evidencias_planos_acao").delete().eq("id", evidenceId).eq("plano_id", id);
    if (error) throw error;
  },

  async measureImpact(id, payload = {}) {
    const valueAfter = payload.valueAfter === "" || payload.valueAfter == null ? null : Number(payload.valueAfter);
    return this.updateActionById(id, {
      impactValueAfter: Number.isFinite(valueAfter) ? valueAfter : null,
      impactValueBefore: payload.valueBefore === "" || payload.valueBefore == null ? null : Number(payload.valueBefore),
      impactStatus: payload.impactStatus || "unmeasured",
      realizedImpact: payload.realizedImpact || null,
      measurementDate: payload.measurementDate || new Date().toISOString().slice(0, 10),
      expectedImpact: payload.note || null,
      transitionMetadata: { eventType: "impact_measured", note: payload.note || null },
    });
  },

  async duplicateAction(id, payload = {}) {
    const actions = await loadLiveRows();
    const source = actions.find((item) => item.id === id);
    if (!source) throw new Error("Ação não encontrada.");
    return this.createAction({
      title: payload.title || source.title,
      description: payload.description || source.description,
      problemOrOpportunity: source.problemOrOpportunity,
      department: source.department,
      indicator: source.indicator,
      strategicObjectiveLabel: source.strategicObjectiveLabel,
      responsibleId: payload.responsibleId || source.responsibleId,
      priority: payload.priority || source.priority,
      dueDate: payload.dueDate || source.dueDate,
      origin: source.origin,
    }, { storeId: source.scopeType === "store" ? source.scopeId : null });
  },
};
