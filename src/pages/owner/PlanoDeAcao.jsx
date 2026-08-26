// Página Plano de Ação — dados canônicos do Supabase, tabela, quadro e calendário.
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from '@/lib/toast'
import { useAuth } from "@/features/owner/lib/ownerAuth";
import { useOwner } from "@/components/owner/OwnerContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { actionPlanLiveRepository } from "@/components/owner/actionplan/actionPlanLiveRepository";
import { filterActions } from "@/components/owner/actionplan/actionPlanUtils";
import { exportActionsCSV } from "@/components/owner/actionplan/exportActions";
import { normalizeActionPlanMode } from "@/components/owner/actionplan/actionPlanFormUtils";
import { DEPARTMENTS, OBJECTIVES, TRANSITION_RULES } from "@/components/owner/actionplan/actionPlanConstants";
import ActionPlanHeader from "@/components/owner/actionplan/ActionPlanHeader";
import ActionPlanTabs from "@/components/owner/actionplan/ActionPlanTabs";
import ExecutiveCardsStrip from "@/components/owner/actionplan/ExecutiveCardsStrip";
import ActionsToolbar from "@/components/owner/actionplan/ActionsToolbar";
import FocusView from "@/components/owner/actionplan/focus/FocusView";
import ActionDrawer from "@/components/owner/actionplan/ActionDrawer";
import ApproveModal from "@/components/owner/actionplan/ApproveModal";
import DelegateModal from "@/components/owner/actionplan/DelegateModal";
import EditActionModal from "@/components/owner/actionplan/EditActionModal";
import BoardView from "@/components/owner/actionplan/board/BoardView";
import BoardModals from "@/components/owner/actionplan/board/BoardModals";
import CalendarView from "@/components/owner/actionplan/calendar/CalendarView";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ExecutiveFilters from "@/components/owner/actionplan/ExecutiveFilters";
import { PageCanvas } from "@/design-system/page";

const TAB_MAP = { acoes: "acoes", calendario: "calendario" };
const DEFAULT_FILTERS = {
  search: "",
  objective: undefined,
  department: undefined,
  responsible: undefined,
  status: undefined,
  priority: undefined,
  origin: undefined,
  display: undefined,
  indicator: undefined,
  impactStatus: undefined,
};
const MODE_KEY = "mx_action_plan_mode";
const SORT_KEY = "mx_action_plan_board_sort";

export default function PlanoDeAcao() {
  const { user } = useAuth();
  const { openConsultantModal, currentUnits, unitId } = useOwner();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responsiblePeople, setResponsiblePeople] = useState(() => user?.full_name ? [user.full_name] : []);
  const [tab, setTab] = useState(TAB_MAP[searchParams.get("tab")] || "acoes");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(MODE_KEY);
    return normalizeActionPlanMode(saved);
  });
  const [sortBy, setSortBy] = useState(() => localStorage.getItem(SORT_KEY) || "due_soon");
  const [activeCard, setActiveCard] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [drawerAction, setDrawerAction] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState("resumo");
  const [approveAction, setApproveAction] = useState(null);
  const [delegateAction, setDelegateAction] = useState(null);
  const [editAction, setEditAction] = useState(null);
  const [activeModal, setActiveModal] = useState({ type: null, action: null });

  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storeId = unitId || currentUnits?.[0]?.id || null;
      const data = await actionPlanLiveRepository.getActions({ storeId });
      setActions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar o Plano de Ação.";
      setError(message);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [currentUnits, unitId]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  useEffect(() => {
    const handlePlanningReload = () => { void loadActions(); };
    window.addEventListener("mx:planning-reload", handlePlanningReload);
    return () => window.removeEventListener("mx:planning-reload", handlePlanningReload);
  }, [loadActions]);

  useEffect(() => {
    let mounted = true;
    const storeId = unitId || currentUnits?.[0]?.id || null;
    actionPlanLiveRepository.getResponsiblePeople({ storeId })
      .then((people) => { if (mounted) setResponsiblePeople(people); })
      .catch(() => { if (mounted) setResponsiblePeople([]); });
    return () => { mounted = false; };
  }, [currentUnits, unitId]);

  useEffect(() => { localStorage.setItem(MODE_KEY, mode); }, [mode]);
  useEffect(() => { localStorage.setItem(SORT_KEY, sortBy); }, [sortBy]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const handleFilterChange = (newFilters) => setFilters(newFilters);
  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveCard(null);
  };

  const handleCardClick = (cardKey) => {
    if (activeCard === cardKey) {
      setActiveCard(null);
      setFilters((prev) => ({ ...prev, status: undefined, display: undefined }));
    } else {
      setActiveCard(cardKey);
      setFilters((prev) => {
        const next = { ...prev };
        if (cardKey === "total") {
          next.status = undefined;
          next.display = undefined;
        } else if (cardKey === "late") {
          next.status = undefined;
          next.display = "late";
        } else {
          next.status = cardKey;
          next.display = undefined;
        }
        return next;
      });
    }
  };

  const openDrawer = (action, initialTab) => {
    setDrawerAction(action);
    setDrawerInitialTab(initialTab || "resumo");
    setDrawerOpen(true);
  };

  const handleApprove = (action) => {
    setDrawerOpen(false);
    setApproveAction(action);
  };

  const handleApproveConfirm = async (id, payload) => {
    try {
      await actionPlanLiveRepository.approveAction(id, { ...payload, approvedBy: user?.full_name || user?.email || "Nome não informado" });
      setApproveAction(null);
      await loadActions();
      toast.info("Ação aprovada com sucesso.");
    } catch (err) {
      toast.error("Não foi possível aprovar a ação.", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  };

  const handleDelegate = (action) => {
    setDrawerOpen(false);
    setDelegateAction(action);
  };

  const handleDelegateConfirm = async (id, payload) => {
    try {
      await actionPlanLiveRepository.delegateAction(id, { ...payload, delegatedBy: user?.full_name || "Nome não informado" });
      setDelegateAction(null);
      await loadActions();
      toast.info("Ação delegada com sucesso.");
    } catch (err) {
      toast.error("Não foi possível delegar a ação.", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  };

  const handleEdit = (action) => {
    setDrawerOpen(false);
    setEditAction(action);
  };

  const handleEditConfirm = async (id, payload) => {
    try {
      await actionPlanLiveRepository.updateActionById(id, payload);
      setEditAction(null);
      await loadActions();
      toast.info("Ação atualizada com sucesso.");
    } catch (err) {
      toast.error("Não foi possível atualizar a ação.", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  };

  // O Dono não cria plano de ação: quem cria é a área interna MX (admin geral,
  // administrador MX, consultor MX). Esta tela é de EXECUÇÃO — acompanhar,
  // atualizar status, registrar evidência. O bloqueio real está no banco, em
  // `can_create_mx_action_scope`; aqui não se oferece o caminho.
  const handleUpdateDeadline = async (id, payload) => {
    try {
      await actionPlanLiveRepository.updateDueDate(id, payload);
      await loadActions();
      toast.info("Prazo atualizado com sucesso.");
    } catch (err) {
      toast.error("Não foi possível atualizar o prazo.", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  };

  const handleDelete = async (action) => {
    if (!window.confirm(`Excluir definitivamente a ação ${action.code}? Esta operação não pode ser desfeita.`)) return;
    try {
      await actionPlanLiveRepository.deleteAction(action.id);
      await loadActions();
      toast.info("Ação excluída definitivamente.");
    } catch (err) {
      toast.error("Não foi possível excluir a ação.", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  };

  const handleTalkToConsultantDay = (date, dayActions) => {
    const snapshot = [
      `Quero analisar as ações previstas para ${date.toLocaleDateString("pt-BR")}.`,
      `Quantidade de ações: ${dayActions.length}`,
      ...dayActions.map((a) =>
        `- ${a.code} — ${a.title} | Resp: ${a.responsible} | Status: ${a.status} | Prazo: ${a.dueDate}`
      ),
    ].join("\n");
    openConsultantModal({
      title: `Ações de ${date.toLocaleDateString("pt-BR")}`,
      requestType: "decision_discussion",
      priority: "medium",
      contextType: "general",
      snapshot,
    });
  };

  const handleTalkToConsultant = (action) => {
    setDrawerOpen(false);
    const snapshot = [
      `Quero analisar a ação ${action.code} — ${action.title}.`,
      `Objetivo: ${action.strategicObjectiveLabel}`,
      action.indicator ? `Indicador: ${action.indicator}` : null,
      `Departamento: ${action.departmentLabel}`,
      `Responsável: ${action.responsible}`,
      `Status: ${action.status}`,
      `Prioridade: ${action.priority}`,
      `Prazo: ${action.dueDate}`,
      `Progresso: ${action.progress}%`,
      action.blockedReason ? `Bloqueio: ${action.blockedReason}` : null,
      action.expectedImpact ? `Impacto esperado: ${action.expectedImpact}` : null,
      action.recommendation ? `Recomendação: ${action.recommendation}` : null,
    ].filter(Boolean).join("\n");

    openConsultantModal({
      title: `${action.code} — ${action.title}`,
      requestType: "decision_discussion",
      priority: action.priority === "critical" ? "high" : action.priority === "high" ? "medium" : "low",
      contextType: "action",
      contextId: action.id,
      snapshot,
    });
  };

  const handleExport = () => {
    const filtered = filterActions(actions, filters);
    exportActionsCSV(filtered);
    toast.info("Exportação concluída.");
  };

  const handleQuickAction = async (action, actionType) => {
    switch (actionType) {
      case "open":
        openDrawer(action, "resumo");
        break;
      case "edit":
        handleEdit(action);
        break;
      case "approve":
        handleApprove(action);
        break;
      case "delegate":
        handleDelegate(action);
        break;
      case "consultant":
        handleTalkToConsultant(action);
        break;
      case "start":
        try {
          await actionPlanLiveRepository.startAction(action.id, { startedBy: user?.full_name || "Nome não informado" });
          await loadActions();
          toast.info("Ação iniciada.");
        } catch (err) {
          toast.error("Não foi possível iniciar a ação.", { description: err instanceof Error ? err.message : "Erro desconhecido" });
        }
        break;
      case "viewImpact":
        openDrawer(action, "historico");
        break;
      default:
        setDrawerOpen(false);
        setActiveModal({ type: actionType, action });
        break;
    }
  };

  const handleMoveTo = async (action, destStatus) => {
    const rule = TRANSITION_RULES[action.status]?.[destStatus];
    if (!rule) {
      toast.error("Transição não permitida.");
      return;
    }
    if (rule.direct) {
      if (action.status === "not_started" && destStatus === "in_progress") {
        await handleQuickAction(action, "start");
      }
    } else if (rule.modal) {
      handleQuickAction(action, rule.modal);
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const action = actions.find((a) => a.id === draggableId);
    if (!action) return;
    handleMoveTo(action, destination.droppableId);
  };

  const handleModalConfirm = async (modalType, id, payload) => {
    const userName = user?.full_name || "Nome não informado";
    let successMessage = "";
    try {
      switch (modalType) {
        case "block":
          await actionPlanLiveRepository.blockAction(id, { ...payload, blockedBy: userName });
          successMessage = "Ação marcada como atrasada/bloqueada.";
          break;
        case "unblock":
          await actionPlanLiveRepository.unblockAction(id, { ...payload, unblockedBy: userName });
          successMessage = "Bloqueio removido.";
          break;
        case "progress":
          await actionPlanLiveRepository.updateProgress(id, { ...payload, updatedBy: userName });
          successMessage = "Progresso atualizado.";
          break;
        case "submitValidation": {
          const result = await actionPlanLiveRepository.submitForValidation(id, { ...payload, submittedBy: userName });
          if (result?.error) {
            const details = Array.isArray(result.errors)
              ? result.errors.join("; ")
              : result.message || "Revise os requisitos da ação e tente novamente.";
            toast.error("Não foi possível enviar.", { description: details });
            return;
          }
          successMessage = "Ação enviada para validação.";
          break;
        }
        case "validate":
          await actionPlanLiveRepository.validateAction(id, { ...payload, validatedBy: userName });
          successMessage = "Conclusão aprovada.";
          break;
        case "return":
          await actionPlanLiveRepository.returnToExecution(id, { ...payload, returnedBy: userName });
          successMessage = "Ação devolvida para execução.";
          break;
        case "reopen":
          await actionPlanLiveRepository.reopenAction(id, { ...payload, reopenedBy: userName });
          successMessage = "Ação reaberta.";
          break;
        case "cancel":
          await actionPlanLiveRepository.cancelAction(id, { ...payload, cancelledBy: userName });
          successMessage = "Ação encerrada.";
          break;
        case "duplicate": {
          const newAction = await actionPlanLiveRepository.duplicateAction(id, { ...payload, createdBy: userName });
          setActiveModal({ type: null, action: null });
          await loadActions();
          toast.info("Ação duplicada com sucesso.");
          if (newAction) openDrawer(newAction, "resumo");
          return;
        }
        default:
          break;
      }
      setActiveModal({ type: null, action: null });
      await loadActions();
      if (successMessage) toast.info(successMessage);
    } catch (err) {
      toast.error("Não foi possível atualizar a ação.", { description: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  };

  const filteredActions = filterActions(actions, filters);

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" id="page-plano-acao" aria-label="Plano de Ação" className="flex min-h-0 flex-1 flex-col space-y-6">
      <ActionPlanHeader
        onNewAction={undefined}
        onExport={handleExport}
      />

      <ActionPlanTabs tab={tab} onTabChange={handleTabChange} />

      {error && (
        <div className="rounded-xl border border-status-error/30 bg-status-error-surface px-4 py-3 text-sm text-status-error-text" role="alert">
          Não foi possível carregar os dados reais do Plano de Ação: {error}
        </div>
      )}

      {tab === "acoes" && (
        <section id="tab-panel-acoes" role="tabpanel" aria-label="Ações" className="space-y-6">
          <ExecutiveCardsStrip
            actions={actions}
            activeCard={activeCard}
            onCardClick={handleCardClick}
          />

          <ActionsToolbar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            mode={mode}
            onModeChange={setMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onNewAction={undefined}
            isMobile={isMobile}
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
            responsiblePeople={responsiblePeople}
          />

          {mode === "foco" ? (
            <FocusView
              actions={filteredActions}
              activeCard={activeCard}
              onAnalyze={(a) => openDrawer(a, "resumo")}
              onApprove={handleApprove}
              onDelegate={handleDelegate}
              onTalkToConsultant={handleTalkToConsultant}
              onQuickAction={handleQuickAction}
              onDelete={handleDelete}
              onClearFilters={handleClearFilters}
              onNewAction={undefined}
            />
          ) : (
            <BoardView
              actions={filteredActions}
              loading={loading}
              mode={mode}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onQuickAction={handleQuickAction}
              onDelete={handleDelete}
              onMoveTo={handleMoveTo}
              onDragEnd={handleDragEnd}
              onNewAction={undefined}
              onOpenGuide={() => setActiveModal({ type: "transitionGuide", action: {} })}
              onClearFilters={handleClearFilters}
              user={user}
              onReload={loadActions}
              responsiblePeople={responsiblePeople}
            />
          )}
        </section>
      )}

      {tab === "calendario" && (
        <section id="tab-panel-calendario" role="tabpanel" aria-label="Calendário">
          <CalendarView
          actions={filteredActions}
          loading={loading}
          filters={filters}
          onClearFilters={handleClearFilters}
          onFilterChange={handleFilterChange}
          onOpenAction={(a) => openDrawer(a, "resumo")}
          onNewAction={undefined}
          onTalkToConsultant={handleTalkToConsultant}
          onTalkToConsultantDay={handleTalkToConsultantDay}
          onUpdateDeadline={handleUpdateDeadline}
          user={user}
          responsiblePeople={responsiblePeople}
        />
        </section>
      )}

      {/* Mobile filters drawer */}
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" className="w-[85vw] sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <SheetBody>
          <div className="mt-4">
            <ExecutiveFilters
              filters={filters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              collapsed={false}
              onToggleCollapse={() => {}}
              responsiblePeople={responsiblePeople}
            />
          </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ActionDrawer
        action={drawerAction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onQuickAction={handleQuickAction}
        onReload={loadActions}
        user={user}
        initialTab={drawerInitialTab}
      />

      <ApproveModal
        action={approveAction}
        open={!!approveAction}
        onOpenChange={(o) => !o && setApproveAction(null)}
        onConfirm={handleApproveConfirm}
        responsiblePeople={responsiblePeople}
      />

      <DelegateModal
        action={delegateAction}
        open={!!delegateAction}
        onOpenChange={(o) => !o && setDelegateAction(null)}
        onConfirm={handleDelegateConfirm}
        responsiblePeople={responsiblePeople}
      />

      <EditActionModal
        action={editAction}
        open={!!editAction}
        onOpenChange={(o) => !o && setEditAction(null)}
        onConfirm={handleEditConfirm}
        responsiblePeople={responsiblePeople}
      />



      <BoardModals
        activeModal={activeModal}
        onClose={() => setActiveModal({ type: null, action: null })}
        onConfirm={handleModalConfirm}
        responsiblePeople={responsiblePeople}
      />
    </PageCanvas>
  );
}
