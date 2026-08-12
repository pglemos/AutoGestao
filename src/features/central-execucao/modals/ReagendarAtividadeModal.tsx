import { useEffect, useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import type { CentralExecutionAction } from '@/features/central-execucao/types/central-execucao.types'

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

export function ReagendarAtividadeModal({
  action,
  open,
  onClose,
  onSubmit,
}: {
  action: CentralExecutionAction | null
  open: boolean
  onClose: () => void
  onSubmit: (input: { dueAt: string; note: string | null; idempotencyKey: string }) => Promise<{ error: string | null }>
}) {
  const [dueAt, setDueAt] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDueAt(action ? toLocalInput(action.dueAt) : '')
    setNote('')
    setSaving(false)
    setError(null)
  }, [open, action?.id])

  if (!action) return null
  const currentAction = action

  async function handleSubmit() {
    if (!dueAt) return
    setSaving(true)
    setError(null)
    const response = await onSubmit({
      dueAt: `${dueAt}:00-03:00`,
      note: note.trim() || null,
      idempotencyKey: `central:reschedule:${currentAction.id}:${crypto.randomUUID()}`,
    })
    setSaving(false)
    if (response.error) {
      setError(response.error)
      return
    }
    onClose()
  }

  const clientName = currentAction.client?.nome || currentAction.snapshots.name || '—'

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose() }}
      title="Reagendar atividade"
      description={`${clientName} · ${currentAction.title}`}
      size="sm"
      referenceStyle
      closeOnEscape={!saving}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-5 py-2.5 text-body-sm font-semibold text-muted-foreground hover:bg-surface-alt disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={!dueAt || saving} className="rounded-xl bg-status-info px-6 py-2.5 text-body-sm font-bold text-white hover:bg-status-info disabled:opacity-50">{saving ? 'Salvando...' : 'Reagendar'}</button>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="central-reschedule-date" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Nova data e horário</label>
          <input id="central-reschedule-date" type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border px-3 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" />
        </div>
        <div>
          <label htmlFor="central-reschedule-note" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Observação (opcional)</label>
          <textarea id="central-reschedule-note" rows={3} value={note} onChange={event => setNote(event.target.value)} className="mt-1.5 w-full resize-none rounded-md border border-border px-3 py-2 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" />
        </div>
        {error && <p role="alert" className="rounded-xl border border-status-error/30 bg-status-error-surface px-3 py-2 text-[12px] font-semibold text-status-error-text">{error}</p>}
      </div>
    </Modal>
  )
}
