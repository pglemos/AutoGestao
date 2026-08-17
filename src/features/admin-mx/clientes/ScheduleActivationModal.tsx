import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'

export function ScheduleActivationModal(props: {
  open: boolean
  clientName: string
  submitting: boolean
  onSubmit: (scheduledFor: string) => Promise<string | null>
  onClose: () => void
}) {
  const [scheduledFor, setScheduledFor] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!props.open) return
    setScheduledFor('')
    setError('')
  }, [props.open])

  const today = new Date().toISOString().slice(0, 10)

  const submit = async () => {
    if (!scheduledFor) {
      setError('Informe a data prevista da ativação.')
      return
    }
    setError('')
    const err = await props.onSubmit(scheduledFor)
    if (err) setError(err)
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Programar ativação — ${props.clientName}`}
      description="A ativação é agendada para a data prevista sem liberar a jornada agora."
      size="md"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={props.submitting || !scheduledFor}>
            {props.submitting ? 'Agendando...' : 'Programar ativação'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone="info"><CalendarClock size={14} /> O cliente permanece inativo até a data. Ao vencer, a jornada pode ser ativada.</MxStatusBanner>
        {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}
        <MxField label="Data prevista" htmlFor="schedule-activation-date">
          <Input
            id="schedule-activation-date"
            type="date"
            min={today}
            value={scheduledFor}
            onChange={event => setScheduledFor(event.target.value)}
          />
        </MxField>
      </div>
    </Modal>
  )
}