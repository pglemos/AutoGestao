import { useEffect, useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import type { CentralExecutionAction } from '@/features/central-execucao/types/central-execucao.types'

export function EscalarAtividadeModal({
  action,
  open,
  onClose,
  onSubmit,
}: {
  action: CentralExecutionAction | null
  open: boolean
  onClose: () => void
  onSubmit: (input: { reason: string; idempotencyKey: string }) => Promise<{ error: string | null }>
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setReason('')
    setSaving(false)
    setError(null)
  }, [open, action?.id])

  if (!action) return null
  const currentAction = action

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Descreva o motivo do apoio solicitado.')
      return
    }
    setSaving(true)
    setError(null)
    const response = await onSubmit({
      reason: reason.trim(),
      idempotencyKey: `central:escalate:${currentAction.id}:${crypto.randomUUID()}`,
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
      title="Pedir apoio do gerente"
      description={`${clientName} · ${currentAction.title}`}
      size="sm"
      referenceStyle
      closeOnEscape={!saving}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-5 py-2.5 text-body-sm font-semibold text-muted-foreground hover:bg-surface-alt disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={!reason.trim() || saving} className="rounded-xl bg-status-warning px-6 py-2.5 text-body-sm font-bold text-status-warning-foreground hover:bg-status-warning disabled:opacity-50">{saving ? 'Enviando...' : 'Pedir apoio'}</button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-[12px] text-muted-foreground">O gerente da loja será notificado com o motivo abaixo e a atividade fica marcada como aguardando apoio até que seja resolvida.</p>
        <div>
          <label htmlFor="central-escalate-reason" className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Motivo do apoio</label>
          <textarea id="central-escalate-reason" rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explique por que precisa do apoio do gerente..." className="mt-1.5 w-full resize-none rounded-md border border-border px-3 py-2 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" />
        </div>
        {error && <p role="alert" className="rounded-xl border border-status-error/30 bg-status-error-surface px-3 py-2 text-[12px] font-semibold text-status-error-text">{error}</p>}
      </div>
    </Modal>
  )
}
