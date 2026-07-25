import { useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'

const MOTIVO_MIN_LENGTH = 10

export type CancelarVendaResumo = {
  cliente: string
  veiculo: string | null
  valor: number
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format

export function CancelarVendaModal({
  open,
  resumo,
  saving,
  onConfirm,
  onClose,
}: {
  open: boolean
  resumo: CancelarVendaResumo | null
  saving: boolean
  onConfirm: (motivo: string) => void
  onClose: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const motivoValido = motivo.trim().length >= MOTIVO_MIN_LENGTH
  const podeConfirmar = motivoValido && confirmado && !saving

  function handleClose() {
    setMotivo('')
    setConfirmado(false)
    onClose()
  }

  function handleConfirm() {
    if (!podeConfirmar) return
    onConfirm(motivo.trim())
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cancelar venda"
      description={resumo ? `${resumo.cliente}${resumo.veiculo ? ` — ${resumo.veiculo}` : ''}` : undefined}
      footer={(
        <div className="flex justify-end gap-mx-sm">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Voltar</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!podeConfirmar} loading={saving}>Cancelar venda</Button>
        </div>
      )}
    >
      <div className="space-y-mx-md">
        <div className="rounded-mx-lg border border-status-warning/20 bg-status-warning/5 p-mx-md">
          <Typography variant="p" className="text-sm">
            Esta ação marca a venda{resumo ? ` de ${BRL(resumo.valor)}` : ''} como cancelada e fica registrada para auditoria. O evento original da venda não é apagado.
          </Typography>
        </div>
        <div>
          <label htmlFor="cancelar-venda-motivo" className="mb-1 block">
            <Typography variant="caption" tone="muted" className="font-bold uppercase tracking-normal">Motivo do cancelamento *</Typography>
          </label>
          <Textarea
            id="cancelar-venda-motivo"
            value={motivo}
            onChange={event => setMotivo(event.target.value)}
            placeholder="Descreva por que o cliente desistiu ou por que a venda está sendo revertida (mínimo 10 caracteres)."
            rows={3}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={confirmado} onChange={event => setConfirmado(event.target.checked)} />
          <Typography variant="p" className="text-sm">Confirmo que desejo cancelar esta venda.</Typography>
        </label>
      </div>
    </Modal>
  )
}
