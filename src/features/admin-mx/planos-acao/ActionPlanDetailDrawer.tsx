import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { TabNav } from '@/components/molecules/TabNav'
import {
  MxEmptyState,
  MxField,
  MxLoadingState,
  MxProgress,
  MxStatusBanner,
  MxTextarea,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import {
  STATUS_LABEL,
  allowedPlanTransitions,
  changePlanStatus,
  countPendingChecklistItems,
  correctPlanCompletionDate,
  fetchPlanEvidence,
  fetchPlanHistory,
  formatActionPlanCodigo,
  reschedulePlan,
  resolveBoardColumn,
  validateCompletion,
  validateChecklistCompletion,
  validateCompletionDateCorrection,
  validateStatusTransition,
  toggleChecklistItem,
  type BoardChecklistItem,
  type BoardPlan,
  type PlanEvidence,
  type PlanHistoryEntry,
  type PlanStatus,
} from './actionPlanBoard'

type DetailTab = 'resumo' | 'execucao' | 'evidencias' | 'historico'

const TABS = [
  { key: 'resumo' as const, label: 'Resumo' },
  { key: 'execucao' as const, label: 'Execução' },
  { key: 'evidencias' as const, label: 'Evidências' },
  { key: 'historico' as const, label: 'Histórico' },
]

function formatDateTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

export function ActionPlanDetailDrawer(props: { plan: BoardPlan | null; onClose: () => void; onChanged: () => void }) {
  const { plan } = props
  const { supabaseUser, baseRole } = useAuth()
  const [tab, setTab] = useState<DetailTab>('resumo')
  const [history, setHistory] = useState<PlanHistoryEntry[]>([])
  const [evidence, setEvidence] = useState<PlanEvidence[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10))
  const [newDueDate, setNewDueDate] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [completionCorrectionReason, setCompletionCorrectionReason] = useState('')
  const [executionChecklist, setExecutionChecklist] = useState<BoardChecklistItem[]>([])
  const [executionProgress, setExecutionProgress] = useState(0)
  const [completionOverride, setCompletionOverride] = useState(false)
  const [completionOverrideReason, setCompletionOverrideReason] = useState('')
  const [activeStatus, setActiveStatus] = useState<PlanStatus>('pendente')

  useEffect(() => {
    if (!plan) return
    let active = true
    setTab('resumo')
    setRescheduleReason('')
    setStatusReason('')
    setCompletionCorrectionReason('')
    setCompletionOverride(false)
    setCompletionOverrideReason('')
    setLoading(true)
    void Promise.all([fetchPlanHistory(plan.id), fetchPlanEvidence(plan.id)])
      .then(([nextHistory, nextEvidence]) => {
        if (!active) return
        setHistory(nextHistory)
        setEvidence(nextEvidence)
      })
      .catch(() => {
        if (active) toast.error('Não foi possível carregar o histórico completo do plano.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [plan?.id])

  useEffect(() => {
    if (!plan) return
    setCompletionDate(plan.concluido_at?.slice(0, 10) || new Date().toISOString().slice(0, 10))
    setNewDueDate(plan.prazo ?? '')
    setExecutionChecklist(Array.isArray(plan.checklist) ? plan.checklist : [])
    setExecutionProgress(plan.progresso ?? 0)
    setActiveStatus(plan.status ?? 'pendente')
  }, [plan?.id, plan?.checklist, plan?.progresso, plan?.status, plan?.prazo, plan?.concluido_at])

  if (!plan) return null

  const column = resolveBoardColumn({ ...plan, status: activeStatus })
  const pendingChecklistCount = countPendingChecklistItems(executionChecklist)
  const canOverrideCompletion = baseRole === 'administrador_geral' || baseRole === 'administrador_mx'

  const transition = async (next: PlanStatus) => {
    if (busy) return
    if (next === 'concluido') {
      const invalid = validateCompletion(completionDate)
      if (invalid) {
        toast.error(invalid)
        return
      }
      const checklistError = validateChecklistCompletion({
        checklist: executionChecklist,
        overrideRequested: completionOverride,
        overrideReason: completionOverrideReason,
        canOverride: canOverrideCompletion,
      })
      if (checklistError) {
        setTab('execucao')
        toast.error(checklistError)
        return
      }
    }
    const transitionError = validateStatusTransition(activeStatus, next, statusReason)
    if (transitionError) {
      setTab('execucao')
      toast.error(transitionError)
      return
    }
    setBusy(true)
    try {
      const result = await changePlanStatus(plan.id, next, next === 'concluido'
        ? {
            from: activeStatus,
            concluido_at: `${completionDate}T12:00:00.000Z`,
            completionOverride,
            completionOverrideReason,
            note: statusReason,
          }
        : { from: activeStatus, note: statusReason, checklist: executionChecklist })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Plano movido para ${STATUS_LABEL[next].toLowerCase()}.`)
      props.onChanged()
      props.onClose()
    } finally {
      setBusy(false)
    }
  }

  const submitCompletionDateCorrection = async () => {
    if (busy) return
    const invalid = validateCompletionDateCorrection(completionDate, completionCorrectionReason)
    if (invalid) {
      toast.error(invalid)
      return
    }
    setBusy(true)
    try {
      const result = await correctPlanCompletionDate(plan.id, completionDate, completionCorrectionReason)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Data efetiva corrigida e registrada no histórico.')
      props.onChanged()
      props.onClose()
    } finally {
      setBusy(false)
    }
  }

  const submitReschedule = async () => {
    if (busy || !supabaseUser) return
    setBusy(true)
    try {
      const result = await reschedulePlan(plan.id, newDueDate, rescheduleReason, supabaseUser.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Prazo alterado.')
      props.onChanged()
      props.onClose()
    } finally {
      setBusy(false)
    }
  }

  const toggleChecklist = async (index: number, completed: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      const result = await toggleChecklistItem({
        planId: plan.id,
        checklist: executionChecklist,
        itemIndex: index,
        completed,
        currentStatus: activeStatus,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setExecutionChecklist(result.checklist)
      setExecutionProgress(result.progresso)
      if (result.status) setActiveStatus(result.status)
      toast.success(completed ? 'Item concluído.' : 'Item reaberto.')
      props.onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`${formatActionPlanCodigo(plan.codigo, plan.id)} — ${STATUS_LABEL[column]}`}
      size="xl"
      closeOnEscape={!busy}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={busy}>Fechar</Button>
          {allowedPlanTransitions(activeStatus).map(next => (
            <Button key={next} variant={next === 'concluido' ? 'primary' : 'outline'} onClick={() => void transition(next)} disabled={busy}>
              {next === 'em_andamento' ? (activeStatus === 'concluido' ? 'Reabrir' : 'Iniciar') : next === 'concluido' ? 'Concluir' : next === 'bloqueada' ? 'Bloquear' : 'Cancelar'}
            </Button>
          ))}
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
        {loading ? <MxLoadingState label="Carregando plano" /> : null}

        {!loading && tab === 'resumo' ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['Problema', plan.problema || '—'],
                ['Ação', plan.acao || '—'],
                ['Departamento', plan.departamento || '—'],
                ['Indicador', plan.indicador || '—'],
                ['Prioridade', plan.prioridade || '—'],
                ['Prazo', plan.prazo ? new Date(plan.prazo).toLocaleDateString('pt-BR') : '—'],
                ['Conclusão efetiva', formatDateTime(plan.concluido_at)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="max-w-sm"><MxProgress value={plan.progresso ?? 0} label={`${plan.progresso ?? 0}% executado`} /></div>
          </div>
        ) : null}

        {!loading && tab === 'execucao' ? (
          <div className="space-y-5">
            <section className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Checklist de execução</h3>
                <p className="text-xs text-muted-foreground">{executionProgress}% concluído</p>
              </div>
              {executionChecklist.length ? (
                <ul className="space-y-2">
                  {executionChecklist.map((item, index) => {
                    const completed = ['concluido', 'concluida', 'realizado'].includes(item.status.toLowerCase())
                    const id = `action-plan-checklist-${plan.id}-${index}`
                    return (
                      <li key={`${item.titulo}-${index}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <Checkbox id={id} checked={completed} disabled={busy || activeStatus === 'concluido'} onCheckedChange={checked => void toggleChecklist(index, checked === true)} />
                        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block text-sm font-medium text-foreground">{item.titulo}</span>
                          {item.como ? <span className="block text-xs text-muted-foreground">{item.como}</span> : null}
                        </label>
                        <span className="text-xs text-muted-foreground">{item.peso_pct}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Este plano não possui etapas ponderadas cadastradas.
                </p>
              )}
            </section>
            {activeStatus === 'concluido' || activeStatus === 'bloqueada' || allowedPlanTransitions(activeStatus).some(status => status === 'bloqueada' || status === 'cancelada') ? (
              <section className="space-y-3 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Justificativa da mudança de status</h3>
                <MxField label="Justificativa (obrigatória para bloquear, cancelar, desbloquear ou reabrir)">
                  <MxTextarea rows={3} value={statusReason} onChange={event => setStatusReason(event.target.value)} placeholder="Explique o motivo para bloquear, cancelar, desbloquear ou reabrir o plano..." />
                </MxField>
                <p className="text-xs text-muted-foreground">
                  {activeStatus === 'concluido' ? 'A conclusão anterior permanece registrada no histórico.' : 'O motivo será registrado no histórico do plano.'}
                </p>
              </section>
            ) : null}
            <section className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">{activeStatus === 'concluido' ? 'Corrigir conclusão' : 'Concluir plano'}</h3>
              <MxField label={activeStatus === 'concluido' ? 'Nova data efetiva de conclusão' : 'Data efetiva de conclusão'}>
                <Input type="date" value={completionDate} onChange={event => setCompletionDate(event.target.value)} />
              </MxField>
              {activeStatus === 'concluido' ? (
                <>
                  <MxField label="Justificativa da correção">
                    <MxTextarea rows={2} value={completionCorrectionReason} onChange={event => setCompletionCorrectionReason(event.target.value)} placeholder="Explique por que a data efetiva precisa ser corrigida..." />
                  </MxField>
                  <Button variant="outline" onClick={() => void submitCompletionDateCorrection()} disabled={busy}>Salvar correção</Button>
                </>
              ) : pendingChecklistCount > 0 ? (
                <div className="space-y-3">
                  <MxStatusBanner tone="warning">
                    Este plano possui {pendingChecklistCount} item(ns) pendente(s). Conclua ou cancele os itens antes de finalizar.
                  </MxStatusBanner>
                  {canOverrideCompletion ? (
                    <>
                      <label htmlFor={`completion-override-${plan.id}`} className="flex items-start gap-2 text-sm text-foreground">
                        <Checkbox
                          id={`completion-override-${plan.id}`}
                          checked={completionOverride}
                          onCheckedChange={checked => setCompletionOverride(checked === true)}
                          disabled={busy}
                        />
                        Concluir administrativamente mesmo com itens pendentes
                      </label>
                      {completionOverride ? (
                        <MxField label="Justificativa do override administrativo">
                          <MxTextarea
                            rows={3}
                            value={completionOverrideReason}
                            onChange={event => setCompletionOverrideReason(event.target.value)}
                            placeholder="Registre a decisão administrativa e o motivo para manter itens pendentes..."
                          />
                        </MxField>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {activeStatus === 'concluido'
                  ? 'A data anterior e o motivo permanecem auditáveis no histórico.'
                  : pendingChecklistCount > 0
                    ? 'Overrides ficam registrados com autor, data, justificativa e quantidade de pendências.'
                    : 'A data entra no histórico e trava o progresso em 100%.'}
              </p>
            </section>
            <section className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Alterar prazo previsto</h3>
              <MxField label="Nova data"><Input type="date" value={newDueDate} onChange={event => setNewDueDate(event.target.value)} /></MxField>
              <MxField label="Motivo">
                <MxTextarea rows={2} value={rescheduleReason} onChange={event => setRescheduleReason(event.target.value)} placeholder="Justifique a alteração do prazo..." />
              </MxField>
              <Button variant="outline" onClick={() => void submitReschedule()} disabled={busy}>Salvar novo prazo</Button>
            </section>
          </div>
        ) : null}

        {!loading && tab === 'evidencias' ? (
          evidence.length ? (
            <ul className="space-y-2">
              {evidence.map(item => (
                <li key={item.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-semibold text-foreground">{item.nome_arquivo || item.tipo || 'Evidência'}</div>
                  {item.nota ? <p className="text-xs text-muted-foreground">{item.nota}</p> : null}
                  <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</div>
                </li>
              ))}
            </ul>
          ) : <MxEmptyState title="Sem evidência registrada" description="As evidências enviadas pela loja aparecem aqui." />
        ) : null}

        {!loading && tab === 'historico' ? (
          history.length ? (
            <ul className="space-y-2">
              {history.map(entry => (
                <li key={entry.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-semibold text-foreground">{entry.event_type || 'alteração'}</div>
                  {entry.event_note ? <p className="text-xs text-muted-foreground">{entry.event_note}</p> : null}
                  <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.changed_at)}</div>
                </li>
              ))}
            </ul>
          ) : <MxStatusBanner tone="neutral">Nenhum histórico registrado para este plano.</MxStatusBanner>
        ) : null}
      </div>
    </Modal>
  )
}
