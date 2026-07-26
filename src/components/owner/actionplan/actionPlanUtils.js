// Utilitários do Plano de Ação: datas, atraso, filtros, cálculos.
export function parseBRDate(str) {
  if (!str) return null;
  const match = String(str).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

export function parseISODate(iso) {
  if (!iso) return null;
  const raw = String(iso);
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
}

export function getRefDate() {
  // Atraso é uma propriedade do dado persistido em relação ao dia atual.
  // A constante histórica continua disponível para fixtures, mas não pode
  // congelar o estado da produção em uma data de referência.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return 0;
  const normalizedA = new Date(dateA);
  const normalizedB = new Date(dateB);
  normalizedA.setHours(0, 0, 0, 0);
  normalizedB.setHours(0, 0, 0, 0);
  const ms = normalizedA.getTime() - normalizedB.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function isLate(action) {
  if (!action.dueDate) return false;
  if (action.status === "completed" || action.status === "cancelled") return false;
  const due = parseBRDate(action.dueDate);
  const ref = getRefDate();
  return due.getTime() < ref.getTime();
}

export function daysLate(action) {
  if (!isLate(action)) return 0;
  const due = parseBRDate(action.dueDate);
  const ref = getRefDate();
  return daysBetween(ref, due);
}

export function isStale(action) {
  if (!action.lastUpdate) return false;
  if (action.status === "completed" || action.status === "cancelled") return false;
  const last = parseBRDate(action.lastUpdate);
  const ref = getRefDate();
  return daysBetween(ref, last) > 7;
}

export function daysStale(action) {
  if (!isStale(action)) return 0;
  const last = parseBRDate(action.lastUpdate);
  const ref = getRefDate();
  return daysBetween(ref, last);
}

export function formatDueDate(action) {
  if (!action.dueDate) return "—";
  const due = parseBRDate(action.dueDate);
  const ref = getRefDate();
  const diff = daysBetween(due, ref);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return action.dueDate;
}

export function formatDueDateShort(action) {
  if (!action.dueDate) return "—";
  const due = parseBRDate(action.dueDate);
  const ref = getRefDate();
  const diff = daysBetween(due, ref);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return action.dueDate;
}

export function cycleProgress(actions) {
  const active = actions.filter((a) => a.status !== "cancelled");
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, a) => acc + (a.progress || 0), 0);
  return Math.round(sum / active.length);
}

export function countByStatus(actions, status) {
  return actions.filter((a) => a.status === status).length;
}

export function countLate(actions) {
  return actions.filter(isLate).length;
}

export function countBlocked(actions) {
  return actions.filter((a) => a.status === "blocked").length;
}

export function countRequiresOwner(actions) {
  return actions.filter((a) => a.requiresOwner && a.status === "awaiting_decision").length;
}

export function filterActions(actions, filters) {
  let result = [...actions];
  const ref = getRefDate();

  // Text search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((a) =>
      [a.code, a.title, a.strategicObjectiveLabel, a.indicator, a.responsible, a.departmentLabel]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }

  if (filters.objective) {
    result = result.filter((a) => a.strategicObjective === filters.objective);
  }

  if (filters.department) {
    result = result.filter((a) => a.department === filters.department);
  }

  if (filters.responsible) {
    result = result.filter((a) => a.responsible === filters.responsible);
  }

  if (filters.status) {
    result = result.filter((a) => a.status === filters.status);
  }

  if (filters.priority) {
    result = result.filter((a) => a.priority === filters.priority);
  }

  if (filters.origin) {
    result = result.filter((a) => a.origin === filters.origin);
  }

  if (filters.indicator) {
    const q = filters.indicator.toLowerCase();
    result = result.filter((a) => a.indicator && a.indicator.toLowerCase().includes(q));
  }

  if (filters.impactStatus) {
    result = result.filter((a) => a.impactStatus === filters.impactStatus);
  }

  if (filters.display && filters.display !== "all") {
    switch (filters.display) {
      case "requires_me":
        result = result.filter((a) => a.requiresOwner && a.status === "awaiting_decision");
        break;
      case "late":
        result = result.filter(isLate);
        break;
      case "blocked":
        result = result.filter((a) => a.status === "blocked");
        break;
      case "stale":
        result = result.filter(isStale);
        break;
      case "completed":
        result = result.filter((a) => a.status === "completed");
        break;
      case "unmeasured":
        result = result.filter((a) => a.status === "completed" && a.impactStatus === "unmeasured");
        break;
      case "active":
        result = result.filter((a) => a.status !== "cancelled" && a.status !== "completed");
        break;
      case "today":
        result = result.filter((a) => a.dueDate && daysBetween(parseBRDate(a.dueDate), ref) === 0);
        break;
      case "next7":
        result = result.filter((a) => {
          if (!a.dueDate) return false;
          const diff = daysBetween(parseBRDate(a.dueDate), ref);
          return diff >= 0 && diff <= 7;
        });
        break;
      case "awaiting_decision":
        result = result.filter((a) => a.status === "awaiting_decision");
        break;
      case "awaiting_validation":
        result = result.filter((a) => a.status === "awaiting_validation");
        break;
      case "cancelled":
        result = result.filter((a) => a.status === "cancelled");
        break;
    }
  }

  return result;
}

export function getRiskActions(actions) {
  return getAllRiskActions(actions).slice(0, 5);
}

export function getAllRiskActions(actions) {
  const ref = getRefDate();
  const scored = actions
    .filter((a) => a.status !== "completed" && a.status !== "cancelled")
    .map((a) => {
      let score = 0;
      let reason = "";
      let days = 0;

      if (isLate(a) && a.progress < 100) {
        score = 100;
        days = daysLate(a);
        reason = `Atrasada há ${days} dia${days !== 1 ? "s" : ""}`;
      } else if (isLate(a) && a.progress >= 100) {
        score = 20;
        days = daysLate(a);
        reason = `Atrasada (aguardando validação)`;
      } else if (a.status === "blocked") {
        score = 90;
        reason = "Bloqueada";
      } else if (a.requiresOwner && a.status === "awaiting_decision") {
        const due = parseBRDate(a.dueDate);
        const diff = daysBetween(due, ref);
        if (diff <= 2) {
          score = 80;
          days = diff;
          reason = diff === 0 ? "Requer decisão hoje" : `Requer decisão em ${diff} dia${diff !== 1 ? "s" : ""}`;
        } else {
          score = 30;
          reason = "Requer decisão";
        }
      } else if (isStale(a)) {
        score = 70;
        days = daysStale(a);
        reason = `Sem atualização há ${days} dia${days !== 1 ? "s" : ""}`;
      } else {
        const due = parseBRDate(a.dueDate);
        const diff = daysBetween(due, ref);
        if (diff <= 2 && a.progress < 50) {
          score = 60;
          days = diff;
          reason = diff === 0 ? "Prazo hoje, progresso baixo" : `Prazo em ${diff} dia${diff !== 1 ? "s" : ""}`;
        } else if (a.priority === "critical" && a.status === "not_started") {
          score = 50;
          reason = "Prioridade crítica sem execução";
        } else {
          score = 10;
          reason = "";
        }
      }

      return { action: a, score, reason, days };
    })
    .filter((s) => s.score >= 30)
    .sort((a, b) => {
      // Sort: atrasadas, bloqueadas, prioridade, prazo
      const aLate = isLate(a.action) ? 0 : 1;
      const bLate = isLate(b.action) ? 0 : 1;
      if (aLate !== bLate) return aLate - bLate;
      const aBlocked = a.action.status === "blocked" ? 0 : 1;
      const bBlocked = b.action.status === "blocked" ? 0 : 1;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;
      const prioOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPrio = prioOrder[a.action.priority] ?? 9;
      const bPrio = prioOrder[b.action.priority] ?? 9;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return parseBRDate(a.action.dueDate) - parseBRDate(b.action.dueDate);
    });

  return scored;
}

export function getUpcomingDeadlines(actions) {
  const ref = getRefDate();
  return actions
    .filter((a) => a.status !== "completed" && a.status !== "cancelled" && a.dueDate)
    .filter((a) => parseBRDate(a.dueDate).getTime() >= ref.getTime())
    .sort((a, b) => parseBRDate(a.dueDate) - parseBRDate(b.dueDate))
    .slice(0, 5);
}

export function getRecentlyCompleted(actions) {
  return actions
    .filter((a) => a.status === "completed" && a.completedAt)
    .sort((a, b) => parseBRDate(b.completedAt) - parseBRDate(a.completedAt))
    .slice(0, 4);
}

export function getObjectiveStats(actions, objectiveValue) {
  const related = actions.filter((a) => a.strategicObjective === objectiveValue);
  const active = related.filter((a) => a.status !== "cancelled");
  const progress = active.length > 0 ? Math.round(active.reduce((s, a) => s + (a.progress || 0), 0) / active.length) : 0;
  const completed = related.filter((a) => a.status === "completed").length;
  const late = related.filter(isLate).length;
  const blocked = related.filter((a) => a.status === "blocked").length;
  return { total: related.length, progress, completed, late, blocked };
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortActions(actions, sortBy) {
  const sorted = [...actions];
  switch (sortBy) {
    case "due_soon":
      return sorted.sort((a, b) => parseBRDate(a.dueDate) - parseBRDate(b.dueDate));
    case "priority_high":
      return sorted.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
    case "priority_low":
      return sorted.sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 9) - (PRIORITY_ORDER[a.priority] ?? 9));
    case "progress_high":
      return sorted.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    case "progress_low":
      return sorted.sort((a, b) => (a.progress || 0) - (b.progress || 0));
    case "responsible":
      return sorted.sort((a, b) => (a.responsible || "").localeCompare(b.responsible || ""));
    case "updated_recent":
      return sorted.sort((a, b) => parseBRDate(b.lastUpdate) - parseBRDate(a.lastUpdate));
    case "updated_old":
      return sorted.sort((a, b) => parseBRDate(a.lastUpdate) - parseBRDate(b.lastUpdate));
    default:
      return sorted;
  }
}

export function getDepartmentStats(actions, deptValue) {
  const related = actions.filter((a) => a.department === deptValue);
  const active = related.filter((a) => a.status !== "completed" && a.status !== "cancelled");
  const progress = related.length > 0 ? Math.round(related.reduce((s, a) => s + (a.progress || 0), 0) / related.length) : 0;
  const late = related.filter(isLate).length;
  const blocked = related.filter((a) => a.status === "blocked").length;

  let attention = "";
  if (blocked > 0) attention = `${blocked} bloqueada${blocked !== 1 ? "s" : ""}`;
  else if (late > 0) attention = `${late} atrasada${late !== 1 ? "s" : ""}`;
  else if (active.length === 0) attention = "Sem ações ativas";
  else attention = "No prazo";

  return { total: related.length, active: active.length, progress, late, blocked, attention };
}
