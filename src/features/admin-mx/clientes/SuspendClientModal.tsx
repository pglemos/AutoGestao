import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'

export function SuspendClientModal(props: {
  open: boolean
  clientName: string
  submitting: boolean
  onSubmit: (reason: string) => Promise<string | null>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!props.open) return
    setReason('')
    setError('')
  }, [props.open])

  const submit = async () => {
    if (!reason.trim()) {
      setError('Informe o motivo da suspensão.')
      return
    }
    setError('')
    const err = await props.onSubmit(reason)
    if (err) setError(err)
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Suspender cliente — ${props.clientName}`}
      description="O cliente deixa de produzir a jornada de encontros até a reativação."
      size="md"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button variant="danger" onClick={() => void submit()} disabled={props.submitting || !reason.trim()}>
            {props.submitting ? 'Suspending...' : 'Suspender'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone="warning"><AlertTriangle size={14} /> A suspensão interrompe Contratos, Ativação de jornada e Notificações. A reativação devolve o cliente a Ativo.</MxStatusBanner>
        {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}
        <MxField label="Motivo da suspensão" htmlFor="suspend-reason">
          <Input
            id="suspend-reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Ex.: inadimplência, pausa contratual"
            autoFocus
          />
        </MxField>
      </div>
    </Modal>
  )
}