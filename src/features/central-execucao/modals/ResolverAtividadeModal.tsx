import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { getResultOptions } from '@/features/central-execucao/lib/activity-results'
import type {
  CentralExecutionAction,
  CentralResultCode,
} from '@/features/central-execucao/types/central-execucao.types'

const LOSS_REASONS = [
  'Cliente parou de responder',
  'Avaliação do usado não agradou',
  'Parcela acima da expectativa',
  'Comprou na concorrência',
  'Irá comprar em outro momento',
  'Não gostou do carro',
  'Outros',
]

function toLocalInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = new Map(parts.map(part => [part.type, part.value]))
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}T${values.get('hour')}:${values.get('minute')}`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export interface ResolveModalSubmission {
  resultCode: CentralResultCode
  note: string | null
  payload: Record<string, unknown>
  idempotencyKey: string
}

export function ResolverAtividadeModal({
  action,
  open,
  returnFromWhatsapp = false,
  onClose,
  onSubmit,
}: {
  action: CentralExecutionAction | null
  open: boolean
  returnFromWhatsapp?: boolean
  onClose: () => void
  onSubmit: (submission: ResolveModalSubmission) => Promise<{ error: string | null }>
}) {
  const [resultCode, setResultCode] = useState<CentralResultCode | ''>('')
  const [note, setNote] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [lossReason, setLossReason] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setResultCode('')
    setNote('')
    setDueAt(action ? toLocalInput(action.dueAt) : '')
    setLossReason('')
    setValue(action?.opportunity?.valor_negociado ? String(action.opportunity.valor_negociado) : '')
    setSaving(false)
    setError(null)
  }, [open, action?.id])

  const options = useMemo(() => {
    if (!action) return []
    return getResultOptions(action.activityType).filter(option => !option.requiresOpportunity || Boolean(action.opportunityId))
  }, [action])
  const selected = options.find(option => option.code === resultCode) ?? null
  const clientName = action?.client?.nome || action?.snapshots.name || '—'
  const vehicle = action?.opportunity?.veiculo_interesse || action?.snapshots.vehicle

  if (!action) return null
  const currentAction = action

  const canConfirm = Boolean(resultCode)
    && (!selected?.requiresSchedule || Boolean(dueAt))
    && (!selected?.requiresNote || Boolean(note.trim()))
    && (!selected?.requiresOpportunity || Boolean(currentAction.opportunityId))
    && (resultCode !== 'sale_lost' || Boolean(lossReason))
    && (resultCode !== 'sale_completed' || Number(value) > 0)

  async function handleConfirm() {
    if (!resultCode || !canConfirm) return
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {}
    if (selected?.requiresSchedule) payload.due_at = dueAt
    if (resultCode === 'sale_lost') payload.loss_reason = lossReason
    if (resultCode === 'sale_completed') payload.value = Number(value)

    const response = await onSubmit({
      resultCode,
      note: note.trim() || null,
      payload,
      idempotencyKey: `central:resolve:${currentAction.id}:${crypto.randomUUID()}`,
    })

    setSaving(false)
    if (response.error) {
      setError(response.error)
      return
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose() }}
      title={returnFromWhatsapp ? 'Como foi o contato?' : 'Registrar resultado'}
      size="sm"
      referenceStyle
      closeOnEscape={!saving}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-2.5 text-body-sm font-semibold text-muted-foreground transition-colors hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={() => void handleConfirm()} disabled={!canConfirm || saving} className="rounded-xl bg-status-info px-6 py-2.5 text-body-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-body-sm font-semibold text-foreground">{clientName}</p>
          <p className="text-[12px] text-muted-foreground">{currentAction.title}{currentAction.description ? ` · ${currentAction.description}` : ''}</p>
          {vehicle && <p className="text-[12px] text-muted-foreground">{vehicle}</p>}
          <p className="text-caption text-muted-foreground">{formatDateTime(currentAction.dueAt)}</p>
        </div>

        <div>
          <label htmlFor="central-result" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Como foi resolvido?</label>
          <select
            id="central-result"
            value={resultCode}
            onChange={event => setResultCode(event.target.value as CentralResultCode)}
            className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-body-sm text-foreground outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15"
          >
            <option value="">Selecionar resultado</option>
            {options.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
          </select>
        </div>

        {resultCode === 'sale_completed' && (
          <div>
            <label htmlFor="central-sale-value" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Valor negociado</label>
            <input id="central-sale-value" type="number" min="0" step="0.01" value={value} onChange={event => setValue(event.target.value)} placeholder="R$ 0,00" className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" />
          </div>
        )}

        {resultCode === 'sale_lost' && (
          <div>
            <label htmlFor="central-loss-reason" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Motivo da perda</label>
            <select id="central-loss-reason" value={lossReason} onChange={event => setLossReason(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15">
              <option value="">Selecionar motivo</option>
              {LOSS_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </div>
        )}

        {selected?.requiresSchedule && (
          <div>
            <label htmlFor="central-reschedule" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Nova data e horário</label>
            <input id="central-reschedule" type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" />
          </div>
        )}

        <div>
          <label htmlFor="central-result-note" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            Observação {selected?.requiresNote ? '' : '(opcional)'}
          </label>
          <textarea id="central-result-note" rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Ex: cliente vai pensar até amanhã..." className="mt-1.5 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" />
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}
