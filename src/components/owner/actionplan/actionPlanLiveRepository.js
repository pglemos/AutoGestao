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
  em_andamento: "in_progress",
  atrasado: "late",
  concluido: "completed",
  validando_eficacia: "awaiting_validation",
  cancelada: "cancelled",
};

const UI_TO_DB_STATUS = {
  awaiting_decision: "pendente",
  not_started: "pendente",
  in_progress: "em_andamento",
  blocked: "atrasado",
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

function mapHistory(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    type: "status_changed",
    date: toDateTime(row.changed_at),
    author: row.changed_by || "Sistema",
    description: Array.isArray(row.changed_fields) && row.changed_fields.length
      ? `Campos atualizados: ${row.changed_fields.join(", ")}`
      : "Ação atualizada",
    metadata: { oldValues: row.old_values, newValues: row.new_values },
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
    requiresOwner: false,
    expectedImpact: safeText(row.eficacia_nota),
    evidenceRequired: false,
    blockedReason: status === "late" ? "Prazo vencido" : null,
    completedAt: toDateTime(row.concluido_at),
    impactStatus: row.eficacia_score == null ? "unmeasured" : "positive",
    impactValueAfter: row.eficacia_score,
    history: context.historyByAction?.get(row.id) || [],
    evidences: context.evidenceByAction?.get(row.id) || [],
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

function updatePayload(action, updates = {}) {
  const status = updates.status !== undefined
    ? UI_TO_DB_STATUS[updates.status] || action.dbStatus
    : undefined;
  const priority = updates.priority !== undefined
    ? UI_TO_DB_PRIORITY[updates.priority] || action.dbPriority
    : undefined;
  const dueDate = updates.dueDate !== undefined ? updates.dueDate : undefined;

  return {
    p_plano_id: action.id,
    p_acao: updates.title !== undefined ? updates.title : undefined,
    p_objetivo: updates.strategicObjectiveLabel !== undefined ? updates.strategicObjectiveLabel : undefined,
    p_indicador: updates.indicator !== undefined ? updates.indicator : undefined,
    p_departamento: updates.department !== undefined ? updates.department : undefined,
    p_responsavel_id: updates.responsibleId !== undefined ? updates.responsibleId : undefined,
    p_prazo: dueDate !== undefined ? parseDateInput(dueDate) : undefined,
    p_prioridade: priority,
    p_status: status,
    p_progresso: updates.progress !== undefined ? Number(updates.progress) : undefined,
    p_como: updates.como !== undefined ? updates.como : undefined,
    p_eficacia_score: updates.impactValueAfter !== undefined ? updates.impactValueAfter : undefined,
    p_eficacia_nota: updates.expectedImpact !== undefined ? updates.expectedImpact : undefined,
    p_checklist: updates.checklist !== undefined ? updates.checklist : undefined,
    p_comentarios: updates.comments !== undefined ? updates.comments : undefined,
  };
}

function parseDateInput(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

async function updateLiveAction(action, updates) {
  let resolvedUpdates = updates;
  if (updates.responsible && !updates.responsibleId) {
    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("name", updates.responsible)
      .limit(1)
      .maybeSingle();
    if (userError) throw userError;
    if (!user?.id) throw new Error("Responsável não encontrado.");
    resolvedUpdates = { ...updates, responsibleId: user.id };
  }
  const { data, error } = await supabase.rpc("atualizar_plano_acao", updatePayload(action, resolvedUpdates));
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

  async getResponsiblePeople() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("name")
      .order("name")
      .limit(500);
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
      const { data: user, error: userError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("name", payload.responsible)
        .limit(1)
        .maybeSingle();
      if (userError) throw userError;
      responsibleId = user?.id || null;
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
    return data ? mapLiveAction(data) : null;
  },

  async updateActionById(id, updates) {
    const actions = await loadLiveRows();
    const action = actions.find((item) => item.id === id);
    if (!action) throw new Error("Ação não encontrada.");
    await updateLiveAction(action, updates);
    return action;
  },

  async approveAction(id, payload = {}) {
    return this.updateActionById(id, { status: "in_progress", responsibleId: payload.responsibleId });
  },

  async delegateAction(id, payload = {}) {
    return this.updateActionById(id, {
      responsibleId: payload.responsibleId || null,
      dueDate: payload.dueDate,
      priority: payload.priority,
    });
  },

  async startAction(id) {
    return this.updateActionById(id, { status: "in_progress", progress: 1 });
  },

  async updateProgress(id, payload = {}) {
    return this.updateActionById(id, { progress: payload.progress, como: payload.comment });
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
    return this.updateActionById(id, { status: "blocked", como: payload.reason || payload.note });
  },

  async unblockAction(id) {
    return this.updateActionById(id, { status: "in_progress" });
  },

  async submitForValidation(id, payload = {}) {
    await this.updateActionById(id, { status: "awaiting_validation", progress: 100, como: payload.note });
    return { error: false };
  },

  async validateAction(id, payload = {}) {
    return this.updateActionById(id, {
      status: "completed",
      progress: 100,
      impactValueAfter: payload.valueAfter,
      expectedImpact: payload.note,
    });
  },

  async returnToExecution(id, payload = {}) {
    return this.updateActionById(id, { status: "in_progress", dueDate: payload.newDueDate, como: payload.guidance });
  },

  async reopenAction(id, payload = {}) {
    return this.updateActionById(id, { status: "in_progress", progress: payload.initialProgress || 0, dueDate: payload.newDueDate });
  },

  async cancelAction(id, payload = {}) {
    return this.updateActionById(id, { status: "cancelled", como: `Cancelada: ${payload.reason || "sem motivo"}` });
  },

  async updateDueDate(id, payload = {}) {
    return this.updateActionById(id, { dueDate: payload.newDueDate, como: payload.note });
  },

  async batchUpdate(ids, updates) {
    const actions = await loadLiveRows();
    const selected = actions.filter((action) => ids.includes(action.id));
    let resolvedUpdates = updates;
    if (updates.responsible && !updates.responsibleId) {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id,name")
        .eq("name", updates.responsible)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error("Responsável não encontrado.");
      resolvedUpdates = { ...updates, responsibleId: data.id };
    }
    await Promise.all(selected.map((action) => updateLiveAction(action, resolvedUpdates)));
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
      expectedImpact: [payload.impactStatus, payload.realizedImpact, payload.note].filter(Boolean).join(" — "),
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
