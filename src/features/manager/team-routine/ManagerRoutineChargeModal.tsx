import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="manager-routine-charge-title">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button type="button" aria-label="Fechar modal" onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-muted-foreground"><X size={18}/></button>
        <h2 id="manager-routine-charge-title" className="mb-1 text-lg font-semibold text-foreground">Cobrar rotina do vendedor</h2>
        <p className="mb-4 text-xs text-muted-foreground">Uma notificação interna será registrada para o vendedor.</p>
        <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-routine-charge-seller">Vendedor</label>
          <div id="manager-routine-charge-seller" className="rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm text-foreground">{sellerName}</div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-routine-charge-date">Data</label>
          <div id="manager-routine-charge-date" className="rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm text-foreground">{date}</div>
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
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancelar</button>
          <button type="button" className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover disabled:opacity-50" onClick={() => void handleSend()} disabled={sending || sent}>{sending ? 'Enviando...' : 'Enviar cobrança'}</button>
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_MESSAGE }
