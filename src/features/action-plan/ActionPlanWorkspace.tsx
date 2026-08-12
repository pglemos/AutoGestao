import { useEffect, useMemo, useState, type ComponentType, type PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/use-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import ActionPlanHeader from '@/components/owner/actionplan/ActionPlanHeader'
import ActionPlanTabs from '@/components/owner/actionplan/ActionPlanTabs'
import ActionsToolbar from '@/components/owner/actionplan/ActionsToolbar'
import ExecutiveFilters from '@/components/owner/actionplan/ExecutiveFilters'
import FocusView from '@/components/owner/actionplan/focus/FocusView'
import BoardView from '@/components/owner/actionplan/board/BoardView'
import BoardModals from '@/components/owner/actionplan/board/BoardModals'
import CalendarView from '@/components/owner/actionplan/calendar/CalendarView'
import ActionDrawer from '@/components/owner/actionplan/ActionDrawer'
import ApproveModal from '@/components/owner/actionplan/ApproveModal'
import DelegateModal from '@/components/owner/actionplan/DelegateModal'
import EditActionModal from '@/components/owner/actionplan/EditActionModal'
import NewActionModal from '@/components/owner/actionplan/NewActionModal'
import { DEPARTMENTS, OBJECTIVES } from '@/components/owner/actionplan/actionPlanConstants'
import { exportActionsCSV } from '@/components/owner/actionplan/exportActions'
import { ActionExecutiveCards } from './components/ActionExecutiveCards'
import { DeleteActionDialog } from './components/DeleteActionDialog'
import { clearActionPlanLaunchContext, readActionPlanLaunchContext, type ActionPlanInitialValues } from './actionPlanLaunchContext'
import { useActionPlanController } from './useActionPlanController'
import type { ActionPlanItem, ActionPlanStatus, ActionTransitionOperation } from './actionPlan.types'

export type ConsultantContext = {
  title: string
  requestType: string
  priority: string
  contextType: string
  contextId?: string
  snapshot: string
}

type ActiveModal = { type: string | null; action: ActionPlanItem | null }

type DragResult = {
  source: { droppableId: string }
  destination?: { droppableId: string } | null
  draggableId: string
}

const TypedSheet = Sheet as ComponentType<PropsWithChildren<{
  open: boolean
  onOpenChange(open: boolean): void
}>>
const TypedSheetContent = SheetContent as ComponentType<PropsWithChildren<{
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}>>
const TypedSheetHeader = SheetHeader as ComponentType<PropsWithChildren<{ className?: string }>>
const TypedSheetTitle = SheetTitle as ComponentType<PropsWithChildren<{ className?: string }>>

const operationLabels: Partial<Record<ActionTransitionOperation, string>> = {
  start: 'Ação iniciada.',
  block: 'Ação bloqueada.',
  unblock: 'Bloqueio removido.',
  submitValidation: 'Ação enviada para validação.',
  validate: 'Conclusão aprovada.',
  return: 'Ação devolvida para execução.',
  reopen: 'Ação reaberta.',
  cancel: 'Ação encerrada.',
}

export function ActionPlanWorkspace({
  onOpenConsultant,
}: {
  onOpenConsultant?: (context: ConsultantContext) => void
}) {
  const controller = useActionPlanController()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const user = useMemo(() => ({
    id: controller.actorId,
    full_name: controller.actorName,
    email: '',
  }), [controller.actorId, controller.actorName])

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [drawerAction, setDrawerAction] = useState<ActionPlanItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerInitialTab, setDrawerInitialTab] = useState('resumo')
  const [approveAction, setApproveAction] = useState<ActionPlanItem | null>(null)
  const [delegateAction, setDelegateAction] = useState<ActionPlanItem | null>(null)
  const [editAction, setEditAction] = useState<ActionPlanItem | null>(null)
  const [newActionOpen, setNewActionOpen] = useState(false)
  const [newActionInitialDate, setNewActionInitialDate] = useState('')
  const [newActionInitialValues, setNewActionInitialValues] = useState<ActionPlanInitialValues | undefined>()
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: null, action: null })
  const [deleteCandidate, setDeleteCandidate] = useState<ActionPlanItem | null>(null)
  const legacyMode = controller.mode === 'focus' ? 'foco' : controller.mode === 'list' ? 'table' : 'kanban'
  const setModeFromLegacy = (mode: string) => controller.setMode(mode === 'foco' ? 'focus' : mode === 'table' ? 'list' : 'kanban')


  useEffect(() => {
    const launch = readActionPlanLaunchContext(location.search)
    if (!launch.autoOpen) return
    setNewActionInitialValues(launch.initialValues)
    setNewActionInitialDate(launch.initialValues.dueDate || '')
    setNewActionOpen(true)
    navigate({ pathname: location.pathname, search: clearActionPlanLaunchContext(location.search) }, { replace: true })
  }, [location.pathname, location.search, navigate])

  const notifyError = (title: string, cause: unknown) => toast({
    title,
    description: cause instanceof Error ? cause.message : 'Erro desconhecido',
    variant: 'destructive',
  })

  const openDrawer = (action: ActionPlanItem, initialTab = 'resumo') => {
    setDrawerAction(action)
    setDrawerInitialTab(initialTab)
    setDrawerOpen(true)
  }

  const handleExport = () => {
    exportActionsCSV(controller.filteredActions)
    toast({ title: 'Exportação concluída.' })
  }

  const handleNewAction = (date = '') => {
    setNewActionInitialValues(undefined)
    setNewActionInitialDate(date)
    setNewActionOpen(true)
  }

  const handleNewActionConfirm = async (payload: Record<string, unknown>) => {
    const department = DEPARTMENTS.find((item: { value: string }) => item.value === payload.department)
    const objective = OBJECTIVES.find((item: { value: string }) => item.value === payload.strategicObjective)
    try {
      const created = await controller.createAction({
        ...payload,
        departmentLabel: department?.label || payload.department,
        strategicObjectiveLabel: objective?.label || payload.strategicObjective,
        executor: payload.responsible,
        createdBy: controller.actorName,
      })
      setNewActionOpen(false)
      setNewActionInitialDate('')
      setNewActionInitialValues(undefined)
      toast({ title: 'Ação criada com sucesso.' })
      if (created && typeof created === 'object' && 'id' in created) openDrawer(created as ActionPlanItem)
    } catch (cause) {
      notifyError('Não foi possível criar a ação.', cause)
    }
  }

  const handleApproveConfirm = async (id: string, payload: Record<string, unknown>) => {
    try {
      await controller.approveAction(id, { ...payload, approvedBy: controller.actorName })
      setApproveAction(null)
      toast({ title: 'Ação aprovada com sucesso.' })
    } catch (cause) { notifyError('Não foi possível aprovar a ação.', cause) }
  }

  const handleDelegateConfirm = async (id: string, payload: Record<string, unknown>) => {
    try {
      await controller.delegateAction(id, { ...payload, delegatedBy: controller.actorName })
      setDelegateAction(null)
      toast({ title: 'Ação delegada com sucesso.' })
    } catch (cause) { notifyError('Não foi possível delegar a ação.', cause) }
  }

  const handleEditConfirm = async (id: string, payload: Record<string, unknown>) => {
    try {
      await controller.updateAction(id, payload)
      setEditAction(null)
      toast({ title: 'Ação atualizada com sucesso.' })
    } catch (cause) { notifyError('Não foi possível atualizar a ação.', cause) }
  }

  const handleUpdateDeadline = async (id: string, payload: Record<string, unknown>) => {
    try {
      await controller.updateDueDate(id, { ...payload, rescheduledBy: controller.actorName })
      toast({ title: 'Prazo atualizado com sucesso.' })
    } catch (cause) { notifyError('Não foi possível atualizar o prazo.', cause) }
  }

  const handleDeleteRequest = (action: ActionPlanItem) => {
    if (!controller.permissions.canDeletePermanently) {
      toast({ title: 'Exclusão não permitida para este perfil.', variant: 'destructive' })
      return
    }
    setDeleteCandidate(action)
  }

  const handleDeleteConfirm = async (action: ActionPlanItem) => {
    try {
      await controller.deleteAction(action.id)
      setDeleteCandidate(null)
      if (drawerAction?.id === action.id) setDrawerOpen(false)
      toast({ title: 'Ação excluída definitivamente.' })
    } catch (cause) { notifyError('Não foi possível excluir a ação.', cause) }
  }

  const openConsultant = (action: ActionPlanItem) => {
    setDrawerOpen(false)
    const snapshot = [
      `Ação ${action.code}: ${action.title}`,
      `Responsável: ${action.responsible || 'Não definido'}`,
      `Status: ${action.status}`,
      `Prioridade: ${action.priority}`,
      `Prazo: ${action.dueDate || 'Não informado'}`,
      `Progresso: ${action.progress}%`,
      action.blockedReason ? `Bloqueio: ${action.blockedReason}` : null,
    ].filter(Boolean).join('\n')
    if (onOpenConsultant) {
      onOpenConsultant({
        title: `${action.code} — ${action.title}`,
        requestType: 'decision_discussion',
        priority: action.priority === 'critical' ? 'high' : action.priority === 'high' ? 'medium' : 'low',
        contextType: 'action',
        contextId: action.id,
        snapshot,
      })
      return
    }
    const url = new URL('/consultoria', window.location.origin)
    if (controller.storeId) url.searchParams.set('storeId', controller.storeId)
    url.searchParams.set('actionId', action.id)
    window.location.assign(url)
  }

  const openConsultantDay = (date: Date, actions: ActionPlanItem[]) => {
    const snapshot = [
      `Ações previstas para ${date.toLocaleDateString('pt-BR')}.`,
      `Quantidade: ${actions.length}`,
      ...actions.map(action => `- ${action.code}: ${action.title}`),
    ].join('\n')
    onOpenConsultant?.({
      title: `Ações de ${date.toLocaleDateString('pt-BR')}`,
      requestType: 'decision_discussion',
      priority: 'medium',
      contextType: 'general',
      snapshot,
    })
  }

  const handleQuickAction = async (action: ActionPlanItem, actionType: string) => {
    switch (actionType) {
      case 'open': openDrawer(action); return
      case 'edit': setDrawerOpen(false); setEditAction(action); return
      case 'approve': setDrawerOpen(false); setApproveAction(action); return
      case 'delegate': setDrawerOpen(false); setDelegateAction(action); return
      case 'consultant': openConsultant(action); return
      case 'start':
        try {
          await controller.startAction(action.id, { startedBy: controller.actorName })
          toast({ title: operationLabels.start })
        } catch (cause) { notifyError('Não foi possível iniciar a ação.', cause) }
        return
      case 'viewImpact': openDrawer(action, 'historico'); return
      default:
        setDrawerOpen(false)
        setActiveModal({ type: actionType, action })
    }
  }

  const handleMoveTo = async (action: ActionPlanItem, destination: ActionPlanStatus) => {
    const resolution = controller.resolveTransition(action.status, destination)
    if (resolution.kind === 'forbidden') {
      toast({ title: 'Transição não permitida.', variant: 'destructive' })
      return
    }
    if (resolution.kind === 'direct') {
      await handleQuickAction(action, resolution.operation)
      return
    }
    await handleQuickAction(action, resolution.operation)
  }

  const handleDragEnd = async (result: DragResult) => {
    if (!result.destination || result.source.droppableId === result.destination.droppableId) return
    const action = controller.actions.find(item => item.id === result.draggableId)
    if (!action) return
    await handleMoveTo(action, result.destination.droppableId as ActionPlanStatus)
  }

  const handleModalConfirm = async (modalType: string, id: string, payload: Record<string, unknown>) => {
    try {
      switch (modalType) {
        case 'block': await controller.blockAction(id, { ...payload, blockedBy: controller.actorName }); break
        case 'unblock': await controller.unblockAction(id, { ...payload, unblockedBy: controller.actorName }); break
        case 'progress': await controller.updateProgress(id, { ...payload, updatedBy: controller.actorName }); break
        case 'submitValidation': await controller.submitForValidation(id, { ...payload, submittedBy: controller.actorName }); break
        case 'validate': await controller.validateAction(id, { ...payload, validatedBy: controller.actorName }); break
        case 'return': await controller.returnToExecution(id, { ...payload, returnedBy: controller.actorName }); break
        case 'reopen': await controller.reopenAction(id, { ...payload, reopenedBy: controller.actorName }); break
        case 'cancel': await controller.cancelAction(id, { ...payload, cancelledBy: controller.actorName }); break
        case 'duplicate': {
          const duplicated = await controller.duplicateAction(id, { ...payload, createdBy: controller.actorName })
          setActiveModal({ type: null, action: null })
          toast({ title: 'Ação duplicada com sucesso.' })
          if (duplicated && typeof duplicated === 'object' && 'id' in duplicated) openDrawer(duplicated as ActionPlanItem)
          return
        }
        default: return
      }
      setActiveModal({ type: null, action: null })
      toast({ title: operationLabels[modalType as ActionTransitionOperation] || 'Operação persistida.' })
    } catch (cause) { notifyError('Não foi possível atualizar a ação.', cause) }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <ActionPlanHeader onNewAction={() => handleNewAction()} onExport={handleExport} />
      <ActionPlanTabs tab={controller.tab} onTabChange={controller.setTab} />

      {controller.error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          Não foi possível carregar o Plano de Ação: {controller.error}
        </div>
      ) : null}

      {controller.tab === 'acoes' ? (
        <section id="tab-panel-acoes" role="tabpanel" aria-labelledby="tab-acoes" className="space-y-4">
          <ActionExecutiveCards
            metrics={controller.metrics}
            activeCard={controller.activeCard}
            onCardClick={controller.toggleExecutiveCard}
          />
          <ActionsToolbar
            filters={controller.filters}
            onFilterChange={controller.setFilters}
            onClearFilters={controller.clearFilters}
            mode={legacyMode}
            onModeChange={setModeFromLegacy}
            sortBy={controller.sortBy}
            onSortChange={controller.setSortBy}
            onNewAction={() => handleNewAction()}
            isMobile={isMobile}
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
            responsiblePeople={controller.responsiblePeople as never[]}
          />
          {controller.mode === 'focus' ? (
            <FocusView
              actions={controller.filteredActions}
              activeCard={controller.activeCard}
              onAnalyze={(action: ActionPlanItem) => openDrawer(action)}
              onApprove={(action: ActionPlanItem) => setApproveAction(action)}
              onDelegate={(action: ActionPlanItem) => setDelegateAction(action)}
              onTalkToConsultant={openConsultant}
              onQuickAction={handleQuickAction}
              onClearFilters={controller.clearFilters}
              onNewAction={() => handleNewAction()}
            />
          ) : (
            <BoardView
              actions={controller.filteredActions}
              loading={controller.loading}
              mode={legacyMode}
              sortBy={controller.sortBy}
              onSortChange={controller.setSortBy}
              onQuickAction={handleQuickAction}
              onDelete={handleDeleteRequest}
              onMoveTo={handleMoveTo}
              onDragEnd={handleDragEnd}
              onNewAction={() => handleNewAction()}
              onOpenGuide={() => setActiveModal({ type: 'transitionGuide', action: null })}
              onClearFilters={controller.clearFilters}
              user={user}
              onReload={controller.reload}
              responsiblePeople={controller.responsiblePeople as never[]}
            />
          )}
        </section>
      ) : null}

      {controller.tab === 'calendario' ? (
        <section id="tab-panel-calendario" role="tabpanel" aria-labelledby="tab-calendario">
          <CalendarView
            actions={controller.filteredActions}
            loading={controller.loading}
            filters={controller.filters}
            onClearFilters={controller.clearFilters}
            onFilterChange={controller.setFilters}
            onOpenAction={(action: ActionPlanItem) => openDrawer(action)}
            onNewAction={handleNewAction}
            onTalkToConsultant={openConsultant}
            onTalkToConsultantDay={openConsultantDay}
            onUpdateDeadline={handleUpdateDeadline}
            user={user}
            companyName="MX Gestão Preditiva"
            unitName=""
            responsiblePeople={controller.responsiblePeople as never[]}
          />
        </section>
      ) : null}

      <TypedSheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <TypedSheetContent side="left" className="w-[85vw] overflow-y-auto sm:max-w-md">
          <TypedSheetHeader><TypedSheetTitle>Filtros</TypedSheetTitle></TypedSheetHeader>
          <div className="mt-4">
            <ExecutiveFilters
              filters={controller.filters}
              onChange={controller.setFilters}
              onClear={controller.clearFilters}
              collapsed={false}
              onToggleCollapse={() => undefined}
              responsiblePeople={controller.responsiblePeople as never[]}
            />
          </div>
        </TypedSheetContent>
      </TypedSheet>

      <ActionDrawer
        action={drawerAction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onQuickAction={handleQuickAction}
        onReload={controller.reload}
        user={user}
        initialTab={drawerInitialTab}
      />
      <ApproveModal action={approveAction} open={Boolean(approveAction)} onOpenChange={(open: boolean) => !open && setApproveAction(null)} onConfirm={handleApproveConfirm} responsiblePeople={controller.responsiblePeople as never[]} />
      <DelegateModal action={delegateAction} open={Boolean(delegateAction)} onOpenChange={(open: boolean) => !open && setDelegateAction(null)} onConfirm={handleDelegateConfirm} responsiblePeople={controller.responsiblePeople as never[]} />
      <EditActionModal action={editAction} open={Boolean(editAction)} onOpenChange={(open: boolean) => !open && setEditAction(null)} onConfirm={handleEditConfirm} responsiblePeople={controller.responsiblePeople as never[]} />
      <NewActionModal open={newActionOpen} onOpenChange={(open: boolean) => { setNewActionOpen(open); if (!open) { setNewActionInitialDate(''); setNewActionInitialValues(undefined) } }} onConfirm={handleNewActionConfirm} initialDueDate={newActionInitialDate} initialValues={newActionInitialValues} responsiblePeople={controller.responsiblePeople as never[]} />
      <BoardModals activeModal={activeModal} onClose={() => setActiveModal({ type: null, action: null })} onConfirm={handleModalConfirm} responsiblePeople={controller.responsiblePeople as never[]} />
      <DeleteActionDialog action={deleteCandidate} open={Boolean(deleteCandidate)} busy={controller.mutating} onOpenChange={open => !open && setDeleteCandidate(null)} onConfirm={handleDeleteConfirm} />
    </div>
  )
}

export default ActionPlanWorkspace
