import { useEffect, useState } from 'react'
import { Modal } from '@/components/organisms/Modal'

const DEFAULT_MESSAGE = 'Você possui pendências na Rotina do Dia. Conclua as ações planejadas e atualize o Plano de Ataque para que a gestão acompanhe corretamente sua execução.'

type ManagerRoutineChargeModalProps = {
  open: boolean
  sellerName: string
  date: string
  onClose: () => void
  onSave: (message: string) => void | Promise<void>
}

export function ManagerRoutineChargeModal({ open, sellerName, date, onClose, onSave }: ManagerRoutineChargeModalProps) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) return
    setMessage(DEFAULT_MESSAGE)
    setSending(false)
    setSent(false)
  }, [open, sellerName, date])

  const handleSend = async () => {
    setSending(true)
    try {
      await onSave(message)
      setSent(true)
      window.setTimeout(onClose, 1400)
    } catch {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cobrar rotina do vendedor"
      description="Uma notificação interna será registrada para o vendedor."
      size="md"
      footer={(
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancelar</button>
          <button type="button" className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover disabled:opacity-50" onClick={() => void handleSend()} disabled={sending || sent}>{sending ? 'Enviando...' : 'Enviar cobrança'}</button>
        </>
      )}
    >
        <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-routine-charge-seller">Vendedor</label>
          <div id="manager-routine-charge-seller" className="rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-foreground">{sellerName}</div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-routine-charge-date">Data</label>
          <div id="manager-routine-charge-date" className="rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-foreground">{date}</div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-routine-charge-message">Mensagem</label>
          <textarea
            id="manager-routine-charge-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-status-success"
          />
        </div>
        {sent && <div className="rounded-xl bg-status-success-surface px-3 py-2 text-sm font-medium text-status-success-text">Cobrança registrada.</div>}
        </div>
    </Modal>
  )
}

export { DEFAULT_MESSAGE }
