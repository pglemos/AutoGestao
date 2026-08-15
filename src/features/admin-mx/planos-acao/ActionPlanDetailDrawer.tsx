import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/Button'
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
  fetchPlanEvidence,
  fetchPlanHistory,
  reschedulePlan,
  resolveBoardColumn,
  validateCompletion,
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
  const { supabaseUser } = useAuth()
  const [tab, setTab] = useState<DetailTab>('resumo')
  const [history, setHistory] = useState<PlanHistoryEntry[]>([])
  const [evidence, setEvidence] = useState<PlanEvidence[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10))
  const [newDueDate, setNewDueDate] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')

  useEffect(() => {
    if (!plan) return
    setTab('resumo')
    setCompletionDate(new Date().toISOString().slice(0, 10))
    setNewDueDate(plan.prazo ?? '')
    setRescheduleReason('')
    setLoading(true)
    void Promise.all([fetchPlanHistory(plan.id), fetchPlanEvidence(plan.id)]).then(([nextHistory, nextEvidence]) => {
      setHistory(nextHistory)
      setEvidence(nextEvidence)
      setLoading(false)
    })
  }, [plan])

  if (!plan) return null

  const column = resolveBoardColumn(plan)

  const transition = async (next: PlanStatus) => {
    if (busy) return
    if (next === 'concluido') {
      const invalid = validateCompletion(completionDate)
      if (invalid) {
        toast.error(invalid)
        return
      }
    }
    setBusy(true)
    try {
      const result = await changePlanStatus(plan.id, next, next === 'concluido' ? { concluido_at: `${completionDate}T12:00:00.000Z` } : {})
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

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`${plan.codigo || 'Plano de ação'} — ${STATUS_LABEL[column]}`}
      size="xl"
      closeOnEscape={!busy}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={busy}>Fechar</Button>
          {allowedPlanTransitions(plan.status).map(next => (
            <Button key={next} variant={next === 'concluido' ? 'primary' : 'outline'} onClick={() => void transition(next)} disabled={busy}>
              {next === 'em_andamento' ? 'Iniciar' : next === 'concluido' ? 'Concluir' : next === 'bloqueada' ? 'Bloquear' : 'Cancelar'}
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
              <h3 className="text-sm font-semibold text-foreground">Concluir plano</h3>
              <MxField label="Data efetiva de conclusão">
                <Input type="date" value={completionDate} onChange={event => setCompletionDate(event.target.value)} />
              </MxField>
              <p className="text-xs text-muted-foreground">A data entra no histórico e trava o progresso em 100%.</p>
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
