// Repositório da Consultoria com persistência em localStorage.
// Fonte única de dados para programas, encontros, aulas, preparação, evidências e antecipações.

import { PROGRAMS, MEETINGS, LESSONS, PREPARATION_TEMPLATES, EVIDENCE_TEMPLATES, CLIENT_PROGRAM } from "./consultingFixtures";
import { actionPlanLiveRepository } from "@/components/owner/actionplan/actionPlanLiveRepository";

const KEYS = {
  lessons: "mx_consulting_lessons_v1",
  lessonProgress: "mx_consulting_lesson_progress_v1",
  preparation: "mx_consulting_preparation_v1",
  preparationItems: "mx_consulting_preparation_items_v1",
  anticipationRequests: "mx_consulting_anticipation_requests_v1",
  evidences: "mx_consulting_evidences_v1",
  lessonFiles: "mx_consulting_lesson_files_v1",
  participants: "mx_consulting_participants_v1",
  clientProgram: "mx_consulting_client_program_v1",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO() {
  return new Date().toISOString();
}

// Inicializa preparação de um encontro se não existir
function ensurePreparation(meetingId) {
  const all = read(KEYS.preparation, {});
  if (all[meetingId]) return all[meetingId];

  const template = PREPARATION_TEMPLATES[meetingId] || [];
  const items = template.map((t) => ({
    id: t.id,
    preparationId: meetingId,
    type: t.type,
    title: t.title,
    description: t.description || "",
    required: t.required || false,
    responsibleUserId: null,
    responsibleName: null,
    dueDate: null,
    status: "not_started",
    linkedLessonId: t.linkedLessonId || null,
    linkedEvidenceId: t.linkedEvidenceType || null,
    linkedActionId: null,
    notes: "",
    completedAt: null,
    updatedAt: nowISO(),
    participantRole: t.participantRole || null,
  }));

  const prep = {
    id: uid("prep"),
    companyProgramId: CLIENT_PROGRAM.id,
    meetingId,
    status: "available",
    progressPercent: 0,
    requiredItemsTotal: items.filter((i) => i.required).length,
    requiredItemsCompleted: 0,
    optionalItemsTotal: items.filter((i) => !i.required).length,
    optionalItemsCompleted: 0,
    participantsConfirmed: 0,
    readyForAnticipation: false,
    startedAt: null,
    completedAt: null,
    updatedAt: nowISO(),
  };

  all[meetingId] = prep;
  write(KEYS.preparation, all);

  const allItems = read(KEYS.preparationItems, {});
  allItems[meetingId] = items;
  write(KEYS.preparationItems, allItems);

  return prep;
}

export const consultingRepository = {
  // ---------- Programs ----------
  getPrograms() {
    return Object.values(PROGRAMS);
  },

  getProgram(programId) {
    return PROGRAMS[programId] || null;
  },

  getClientProgram() {
    const stored = read(KEYS.clientProgram, null);
    if (stored) return stored;
    write(KEYS.clientProgram, CLIENT_PROGRAM);
    return CLIENT_PROGRAM;
  },

  isPMRPlusEligible() {
    const cp = this.getClientProgram();
    // Elegível se já participa do PMR ou já concluiu
    return cp.programId === "pmr" || cp.status === "completed";
  },

  // ---------- Journey ----------
  getProgramJourney(programId) {
    return MEETINGS.filter((m) => m.programId === programId).sort((a, b) => a.number - b.number);
  },

  getMeeting(meetingId) {
    return MEETINGS.find((m) => m.id === meetingId) || null;
  },

  getMeetingsByProgram(programId) {
    return MEETINGS.filter((m) => m.programId === programId);
  },

  // ---------- Lessons ----------
  getLessons(meetingId) {
    if (meetingId) {
      return LESSONS.filter((l) => l.meetingId === meetingId);
    }
    return LESSONS;
  },

  getOnboardingLessons(programId) {
    return LESSONS.filter((l) => l.programId === programId && l.type === "onboarding");
  },

  getLesson(lessonId) {
    return LESSONS.find((l) => l.id === lessonId) || null;
  },

  getLessonByCode(code) {
    return LESSONS.find((l) => l.code === code) || null;
  },

  // ---------- Lesson Progress ----------
  getLessonProgress(lessonId, userId = "demo") {
    const all = read(KEYS.lessonProgress, {});
    const key = `${lessonId}_${userId}`;
    return all[key] || {
      lessonId,
      userId,
      companyId: "demo",
      currentPositionSeconds: 0,
      accumulatedPlayedSeconds: 0,
      durationSeconds: 0,
      watchedPercent: 0,
      status: "not_started",
      startedAt: null,
      lastWatchedAt: null,
      completedAt: null,
      updatedAt: null,
    };
  },

  saveLessonProgress(payload) {
    const all = read(KEYS.lessonProgress, {});
    const key = `${payload.lessonId}_${payload.userId || "demo"}`;
    const existing = all[key] || {};
    const updated = {
      ...existing,
      ...payload,
      updatedAt: nowISO(),
    };
    all[key] = updated;
    write(KEYS.lessonProgress, all);

    // Se concluída, atualizar itens de preparação vinculados
    if (updated.status === "completed") {
      this._syncLessonCompletionToPreparation(payload.lessonId);
    }

    return updated;
  },

  _syncLessonCompletionToPreparation(lessonId) {
    const lesson = this.getLesson(lessonId);
    if (!lesson) return;

    // Encontrar todos os encontros que têm itens vinculados a esta aula
    const allItems = read(KEYS.preparationItems, {});
    for (const meetingId of Object.keys(allItems)) {
      const items = allItems[meetingId];
      let changed = false;
      const updatedItems = items.map((item) => {
        if (item.linkedLessonId === lessonId && item.status !== "completed") {
          changed = true;
          return { ...item, status: "completed", completedAt: nowISO(), updatedAt: nowISO() };
        }
        return item;
      });
      if (changed) {
        allItems[meetingId] = updatedItems;
        write(KEYS.preparationItems, allItems);
        this._recalcPreparationProgress(meetingId);
      }
    }
  },

  // ---------- Preparation ----------
  getMeetingPreparation(meetingId) {
    return ensurePreparation(meetingId);
  },

  getPreparationItems(meetingId) {
    ensurePreparation(meetingId);
    const all = read(KEYS.preparationItems, {});
    return all[meetingId] || [];
  },

  updatePreparationItem(meetingId, itemId, payload) {
    const all = read(KEYS.preparationItems, {});
    const items = all[meetingId] || [];
    const updatedItems = items.map((i) =>
      i.id === itemId ? { ...i, ...payload, updatedAt: nowISO() } : i
    );
    all[meetingId] = updatedItems;
    write(KEYS.preparationItems, all);
    this._recalcPreparationProgress(meetingId);
    return updatedItems.find((i) => i.id === itemId);
  },

  _recalcPreparationProgress(meetingId) {
    const items = this.getPreparationItems(meetingId);
    const requiredItems = items.filter((i) => i.required);
    const optionalItems = items.filter((i) => !i.required);
    const requiredCompleted = requiredItems.filter((i) => i.status === "completed").length;
    const optionalCompleted = optionalItems.filter((i) => i.status === "completed").length;
    const totalItems = items.length;
    const totalCompleted = requiredCompleted + optionalCompleted;
    const progressPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    // Verificar prontidão para antecipação
    const allRequiredDone = requiredItems.length > 0 && requiredCompleted === requiredItems.length;
    const participants = this.getParticipants(meetingId);
    const requiredParticipants = participants.filter((p) => p.required);
    const allParticipantsConfirmed = requiredParticipants.length > 0 && requiredParticipants.every((p) => p.confirmed);
    const readyForAnticipation = allRequiredDone && allParticipantsConfirmed;

    // Determinar status da preparação
    let status = "available";
    if (totalCompleted > 0 && totalCompleted < totalItems) status = "in_preparation";
    if (readyForAnticipation) status = "ready_for_anticipation";
    if (totalCompleted === totalItems && totalItems > 0) status = "ready_for_anticipation";

    const all = read(KEYS.preparation, {});
    const prep = all[meetingId] || {};
    all[meetingId] = {
      ...prep,
      status,
      progressPercent,
      requiredItemsTotal: requiredItems.length,
      requiredItemsCompleted: requiredCompleted,
      optionalItemsTotal: optionalItems.length,
      optionalItemsCompleted: optionalCompleted,
      participantsConfirmed: participants.filter((p) => p.confirmed).length,
      readyForAnticipation,
      startedAt: prep.startedAt || (totalCompleted > 0 ? nowISO() : null),
      completedAt: totalCompleted === totalItems && totalItems > 0 ? nowISO() : null,
      updatedAt: nowISO(),
    };
    write(KEYS.preparation, all);
    return all[meetingId];
  },

  calculatePreparationProgress(meetingId) {
    return this._recalcPreparationProgress(meetingId);
  },

  getPendingRequiredItems(meetingId) {
    const items = this.getPreparationItems(meetingId);
    return items.filter((i) => i.required && i.status !== "completed");
  },

  isReadyForAnticipation(meetingId) {
    const prep = this.getMeetingPreparation(meetingId);
    return prep.readyForAnticipation;
  },

  // ---------- Participants ----------
  getParticipants(meetingId) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return [];
    const all = read(KEYS.participants, {});
    const stored = all[meetingId] || {};
    return meeting.participants.map((p) => ({
      ...p,
      confirmed: stored[p.role] || false,
      note: stored[`${p.role}_note`] || "",
    }));
  },

  confirmParticipants(meetingId, payload) {
    const all = read(KEYS.participants, {});
    const current = all[meetingId] || {};
    for (const p of payload.participants) {
      current[p.role] = p.confirmed;
      current[`${p.role}_note`] = p.note || "";
    }
    all[meetingId] = current;
    write(KEYS.participants, all);

    // Atualizar itens de preparação de participantes
    const items = this.getPreparationItems(meetingId);
    const participantItems = items.filter((i) => i.type === "participant");
    for (const item of participantItems) {
      const participant = payload.participants.find((p) => p.role === item.participantRole);
      if (participant) {
        const newStatus = participant.confirmed ? "completed" : "not_started";
        this.updatePreparationItem(meetingId, item.id, {
          status: newStatus,
          completedAt: participant.confirmed ? nowISO() : null,
        });
      }
    }

    this._recalcPreparationProgress(meetingId);
    return this.getParticipants(meetingId);
  },

  // ---------- Evidences ----------
  getEvidences(meetingId) {
    const all = read(KEYS.evidences, {});
    return (all[meetingId] || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getEvidenceTemplates(meetingId) {
    return EVIDENCE_TEMPLATES[meetingId] || [];
  },

  addEvidence(meetingId, payload) {
    const all = read(KEYS.evidences, {});
    const list = all[meetingId] || [];
    const evidence = {
      id: uid("ev"),
      meetingId,
      type: payload.type || "file",
      name: payload.name || "",
      responsible: payload.responsible || "",
      responsibleName: payload.responsibleName || "",
      date: nowISO(),
      checklistItemId: payload.checklistItemId || null,
      evidenceTemplateId: payload.evidenceTemplateId || null,
      status: "sent",
      note: payload.note || "",
      consultantNote: "",
      fileUrl: payload.fileUrl || null,
      fileName: payload.fileName || null,
      fileType: payload.fileType || null,
      content: payload.content || null,
      link: payload.link || null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    list.push(evidence);
    all[meetingId] = list;
    write(KEYS.evidences, all);

    // Atualizar item de preparação vinculado
    if (evidence.evidenceTemplateId) {
      const items = this.getPreparationItems(meetingId);
      const linkedItem = items.find((i) => i.linkedEvidenceId === evidence.evidenceTemplateId);
      if (linkedItem && linkedItem.status !== "completed") {
        this.updatePreparationItem(meetingId, linkedItem.id, {
          status: "completed",
          completedAt: nowISO(),
          linkedEvidenceId: evidence.id,
        });
      }
    }

    return evidence;
  },

  removeEvidence(meetingId, evidenceId) {
    const all = read(KEYS.evidences, {});
    const list = (all[meetingId] || []).filter((e) => e.id !== evidenceId);
    all[meetingId] = list;
    write(KEYS.evidences, all);
    return list;
  },

  updateEvidence(meetingId, evidenceId, payload) {
    const all = read(KEYS.evidences, {});
    const list = all[meetingId] || [];
    const updated = list.map((e) =>
      e.id === evidenceId ? { ...e, ...payload, updatedAt: nowISO() } : e
    );
    all[meetingId] = updated;
    write(KEYS.evidences, all);
    return updated.find((e) => e.id === evidenceId);
  },

  // ---------- Lesson Files ----------
  getLessonFiles(lessonId) {
    const all = read(KEYS.lessonFiles, {});
    return all[lessonId] || [];
  },

  addLessonFile(lessonId, payload) {
    const all = read(KEYS.lessonFiles, {});
    const list = all[lessonId] || [];
    const file = {
      id: uid("lf"),
      lessonId,
      name: payload.name || payload.fileName || "",
      fileName: payload.fileName || "",
      fileType: payload.fileType || "",
      note: payload.note || "",
      uploadedBy: payload.uploadedBy || "Consultor",
      createdAt: nowISO(),
    };
    list.push(file);
    all[lessonId] = list;
    write(KEYS.lessonFiles, all);
    return file;
  },

  removeLessonFile(lessonId, fileId) {
    const all = read(KEYS.lessonFiles, {});
    const list = (all[lessonId] || []).filter((f) => f.id !== fileId);
    all[lessonId] = list;
    write(KEYS.lessonFiles, all);
    return list;
  },

  // ---------- Preparation Item Files ----------
  addPreparationItemFile(meetingId, itemId, payload) {
    const items = this.getPreparationItems(meetingId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return null;
    const attachedFiles = item.attachedFiles || [];
    const newFile = {
      id: uid("pf"),
      name: payload.name || payload.fileName || "",
      fileName: payload.fileName || "",
      fileType: payload.fileType || "",
      uploadedAt: nowISO(),
    };
    this.updatePreparationItem(meetingId, itemId, { attachedFiles: [...attachedFiles, newFile] });
    return newFile;
  },

  removePreparationItemFile(meetingId, itemId, fileId) {
    const items = this.getPreparationItems(meetingId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const attachedFiles = (item.attachedFiles || []).filter((f) => f.id !== fileId);
    this.updatePreparationItem(meetingId, itemId, { attachedFiles });
  },

  // ---------- Actions ----------
  async getMeetingActions(meetingId) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return [];
    const allActions = await actionPlanLiveRepository.getActions();
    return allActions.filter((a) => a.origin === "consulting" && a.meetingId === meetingId);
  },

  async createActionFromMeeting(meetingId, payload) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return null;
    const program = this.getProgram(meeting.programId);

    const action = await actionPlanLiveRepository.createAction({
      title: payload.title,
      description: payload.description || payload.orientacao || "",
      department: payload.department || "general",
      departmentLabel: payload.departmentLabel || "",
      origin: "consulting",
      responsible: payload.responsible || "",
      priority: payload.priority || "medium",
      dueDate: payload.dueDate || "",
      expectedImpact: payload.expectedImpact || payload.impactoEsperado || "",
      evidenceRequired: payload.evidenceRequired || false,
      requiresOwner: false,
      createdBy: payload.createdBy || "Nome não informado",
    });

    // Adicionar campos específicos da consultoria via updateAction
    return actionPlanLiveRepository.updateActionById(action.id, {
      meetingId,
      programId: meeting.programId,
      meetingTitle: meeting.title,
      programName: program?.shortName || "",
      visitReason: meeting.objective,
    });
  },

  // ---------- Anticipation ----------
  getAnticipationRequest(meetingId) {
    const all = read(KEYS.anticipationRequests, {});
    const requests = all[meetingId] || [];
    // Retorna a solicitação ativa mais recente
    const active = requests.filter((r) => ["draft", "in_analysis", "approved", "date_adjustment"].includes(r.status));
    return active.length > 0 ? active[active.length - 1] : null;
  },

  getAllAnticipationRequests(meetingId) {
    const all = read(KEYS.anticipationRequests, {});
    return (all[meetingId] || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  requestMeetingAnticipation(meetingId, payload) {
    const all = read(KEYS.anticipationRequests, {});
    const list = all[meetingId] || [];
    const meeting = this.getMeeting(meetingId);

    const request = {
      id: uid("ant"),
      companyProgramId: CLIENT_PROGRAM.id,
      meetingId,
      requestedBy: payload.requestedBy || "Dono",
      requestedByName: payload.requestedByName || "Daniel Santos",
      currentMeetingDate: meeting?.scheduledDate || null,
      requestedModality: payload.requestedModality || "Online",
      preferredDates: payload.preferredDates || [],
      reason: payload.reason || "",
      notes: payload.notes || "",
      preparationSnapshot: payload.preparationSnapshot || {},
      participantsConfirmed: payload.participantsConfirmed || false,
      status: "in_analysis",
      consultantResponse: null,
      approvedDate: null,
      previousDate: meeting?.scheduledDate || null,
      newDate: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      cancelledAt: null,
    };

    list.push(request);
    all[meetingId] = list;
    write(KEYS.anticipationRequests, all);

    // Atualizar status da preparação
    const prepAll = read(KEYS.preparation, {});
    if (prepAll[meetingId]) {
      prepAll[meetingId].status = "anticipation_requested";
      prepAll[meetingId].updatedAt = nowISO();
      write(KEYS.preparation, prepAll);
    }

    return request;
  },

  cancelAnticipationRequest(requestId) {
    const all = read(KEYS.anticipationRequests, {});
    for (const meetingId of Object.keys(all)) {
      const list = all[meetingId];
      const updated = list.map((r) =>
        r.id === requestId ? { ...r, status: "cancelled", cancelledAt: nowISO(), updatedAt: nowISO() } : r
      );
      all[meetingId] = updated;
    }
    write(KEYS.anticipationRequests, all);

    // Reverter status da preparação
    for (const meetingId of Object.keys(all)) {
      const list = all[meetingId];
      if (list.some((r) => r.id === requestId)) {
        this._recalcPreparationProgress(meetingId);
        break;
      }
    }
    return true;
  },

  // ---------- Next Step ----------
  getNextClientStep() {
    const cp = this.getClientProgram();
    const program = this.getProgram(cp.programId);
    const journey = this.getProgramJourney(cp.programId);

    // 1. Aula de onboarding não concluída
    const onboardingLessons = this.getOnboardingLessons(cp.programId);
    for (const lesson of onboardingLessons) {
      const progress = this.getLessonProgress(lesson.id);
      if (lesson.required && progress.status !== "completed") {
        return {
          type: "lesson_pending",
          priority: 1,
          title: "Comece por aqui",
          content: lesson.title,
          info: lesson.description,
          progress: progress.watchedPercent || 0,
          progressLabel: `${Math.round(progress.watchedPercent || 0)}% assistido`,
          primaryButton: progress.status === "in_progress" ? "Continuar aula" : "Assistir aula",
          meetingId: lesson.meetingId,
          lessonId: lesson.id,
          icon: "play",
        };
      }
    }

    // Encontrar próximo encontro disponível
    const currentMeeting = journey.find((m) => m.id === cp.currentMeetingId) || journey[0];
    if (!currentMeeting) return null;

    // 2. Aula obrigatória do próximo encontro não concluída
    const meetingLessons = this.getLessons(currentMeeting.id);
    for (const lesson of meetingLessons) {
      if (lesson.required) {
        const progress = this.getLessonProgress(lesson.id);
        if (progress.status !== "completed") {
          return {
            type: "lesson_pending",
            priority: 2,
            title: "Próximo passo",
            content: `Encontro ${currentMeeting.number} — ${currentMeeting.title}`,
            lessonTitle: lesson.title,
            info: lesson.objective,
            progress: progress.watchedPercent || 0,
            progressLabel: progress.status === "in_progress" ? `Continuar de ${this._formatTime(progress.currentPositionSeconds)}` : "0% assistido",
            primaryButton: progress.status === "in_progress" ? "Continuar aula" : "Assistir aula",
            meetingId: currentMeeting.id,
            lessonId: lesson.id,
            icon: "play",
          };
        }
      }
    }

    // 3-5. Checklist, evidências, participantes pendentes
    const prep = this.getMeetingPreparation(currentMeeting.id);
    const pendingItems = this.getPendingRequiredItems(currentMeeting.id);
    if (pendingItems.length > 0) {
      const nextItem = pendingItems[0];
      const itemLabels = {
        checklist: "Concluir checklist",
        evidence: "Enviar evidência",
        participant: "Confirmar participantes",
        lesson: "Assistir aula",
        action: "Iniciar ação",
        material: "Consultar material",
      };
      return {
        type: "preparation_pending",
        priority: nextItem.type === "checklist" ? 3 : nextItem.type === "evidence" ? 4 : 5,
        title: "Próximo passo",
        content: `Encontro ${currentMeeting.number} — ${currentMeeting.title}`,
        info: nextItem.title,
        progress: prep.progressPercent,
        progressLabel: `${prep.requiredItemsCompleted} de ${prep.requiredItemsTotal} itens concluídos`,
        primaryButton: itemLabels[nextItem.type] || "Continuar preparação",
        meetingId: currentMeeting.id,
        itemId: nextItem.id,
        icon: nextItem.type === "evidence" ? "evidence" : nextItem.type === "participant" ? "participants" : "checklist",
      };
    }

    // 6. Preparação pronta para antecipação
    const anticipation = this.getAnticipationRequest(currentMeeting.id);
    if (prep.readyForAnticipation && !anticipation) {
      return {
        type: "ready_for_anticipation",
        priority: 6,
        title: "Preparação concluída",
        content: `Encontro ${currentMeeting.number} — ${currentMeeting.title}`,
        info: "Este encontro está pronto para ser antecipado.",
        progress: 100,
        progressLabel: "Preparação concluída",
        primaryButton: "Solicitar antecipação",
        meetingId: currentMeeting.id,
        icon: "check",
      };
    }

    // 7. Antecipação solicitada
    if (anticipation && anticipation.status === "in_analysis") {
      return {
        type: "anticipation_in_analysis",
        priority: 7,
        title: "Antecipação em análise",
        content: `Encontro ${currentMeeting.number} — ${currentMeeting.title}`,
        info: "Seu consultor recebeu a solicitação e analisará a disponibilidade e a preparação realizada.",
        progress: 100,
        progressLabel: "Solicitação enviada",
        primaryButton: "Ver solicitação",
        meetingId: currentMeeting.id,
        requestId: anticipation.id,
        icon: "clock",
      };
    }

    // 8. Próximo encontro agendado
    if (currentMeeting.status === "scheduled" && currentMeeting.scheduledDate) {
      return {
        type: "meeting_scheduled",
        priority: 8,
        title: "Próximo passo",
        content: `Encontro ${currentMeeting.number} — ${currentMeeting.title}`,
        info: `Encontro agendado para ${this._formatDate(currentMeeting.scheduledDate)}`,
        progress: prep.progressPercent,
        progressLabel: `${prep.requiredItemsCompleted} de ${prep.requiredItemsTotal} itens concluídos`,
        primaryButton: "Ver encontro",
        meetingId: currentMeeting.id,
        icon: "calendar",
      };
    }

    // 9. Pendência posterior
    return {
      type: "no_pending",
      priority: 9,
      title: "Tudo em dia",
      content: `Encontro ${currentMeeting.number} — ${currentMeeting.title}`,
      info: "Não há pendências no momento. Aguarde a liberação do próximo encontro.",
      progress: prep.progressPercent,
      progressLabel: `${prep.requiredItemsCompleted} de ${prep.requiredItemsTotal} itens concluídos`,
      primaryButton: "Ver encontro",
      meetingId: currentMeeting.id,
      icon: "check",
    };
  },

  // ---------- Meeting indicators ----------
  getMeetingIndicators(meetingId) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return [];

    const indicators = [];
    const lessons = this.getLessons(meetingId);
    const onboardingLessons = this.getOnboardingLessons(meeting.programId);

    // Aulas de onboarding (para o primeiro encontro)
    if (meeting.number === 1) {
      for (const lesson of onboardingLessons) {
        const progress = this.getLessonProgress(lesson.id);
        if (progress.status === "completed") {
          indicators.push({ type: "lesson_watched", label: "✓ Aula assistida", tone: "green" });
        } else if (progress.status === "in_progress") {
          indicators.push({ type: "lesson_available", label: "Aula disponível", tone: "blue" });
        } else {
          indicators.push({ type: "lesson_available", label: "Aula disponível", tone: "slate" });
        }
      }
    }

    // Aulas do encontro
    for (const lesson of lessons) {
      const progress = this.getLessonProgress(lesson.id);
      if (progress.status === "completed") {
        indicators.push({ type: "lesson_watched", label: "✓ Aula assistida", tone: "green" });
      } else if (progress.status === "in_progress") {
        indicators.push({ type: "lesson_available", label: "Aula disponível", tone: "blue" });
      }
    }

    // Preparação
    const prep = this.getMeetingPreparation(meetingId);
    if (prep.requiredItemsCompleted > 0 && prep.requiredItemsCompleted < prep.requiredItemsTotal) {
      indicators.push({ type: "preparation_partial", label: `${prep.requiredItemsCompleted}/${prep.requiredItemsTotal} preparo`, tone: "amber" });
    } else if (prep.readyForAnticipation) {
      indicators.push({ type: "ready_for_anticipation", label: "Pronto para antecipar", tone: "blue" });
    }

    // Antecipação
    const anticipation = this.getAnticipationRequest(meetingId);
    if (anticipation && anticipation.status === "in_analysis") {
      indicators.push({ type: "anticipation_analysis", label: "Antecipação em análise", tone: "amber" });
    }

    // Status do encontro
    if (meeting.status === "locked") {
      indicators.push({ type: "locked", label: "Bloqueado", tone: "slate" });
    } else if (meeting.status === "completed") {
      indicators.push({ type: "meeting_done", label: "✓ Encontro realizado", tone: "green" });
    } else if (meeting.status === "scheduled") {
      indicators.push({ type: "meeting_scheduled", label: "Agendado", tone: "blue" });
    }

    // Evidência pendente
    const evidences = this.getEvidences(meetingId);
    const pendingEvidence = evidences.filter((e) => e.status === "sent" || e.status === "returned");
    if (pendingEvidence.length > 0) {
      indicators.push({ type: "evidence_pending", label: "Evidência pendente", tone: "red" });
    }

    // Máximo 2 indicadores
    return indicators.slice(0, 2);
  },

  // ---------- Helpers ----------
  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  },

  _formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  },

  // ---------- Progress bars data ----------
  getProgressBars() {
    const cp = this.getClientProgram();
    const journey = this.getProgramJourney(cp.programId);
    const meetingsCompleted = journey.filter((m) => m.status === "completed").length;
    const totalMeetings = journey.length;

    return {
      journey: { completed: meetingsCompleted, total: totalMeetings, percent: totalMeetings > 0 ? Math.round((meetingsCompleted / totalMeetings) * 100) : 0 },
      implementations: { completed: cp.completedActions, total: cp.totalActions, percent: cp.totalActions > 0 ? Math.round((cp.completedActions / cp.totalActions) * 100) : 0 },
      evidences: { completed: cp.approvedEvidences, total: cp.totalEvidences, percent: cp.totalEvidences > 0 ? Math.round((cp.approvedEvidences / cp.totalEvidences) * 100) : 0 },
    };
  },
};
