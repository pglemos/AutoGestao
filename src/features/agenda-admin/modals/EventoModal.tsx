import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'
import { Select } from '@/components/atoms/Select'
import { DatePicker } from '@/components/atoms/DatePicker'
import type { AgendaConsultant, AgendaScheduleEvent } from '@/hooks/agenda'

export type EventForm = {
  event_type: AgendaScheduleEvent['event_type']
  title: string
  topic: string
  starts_at: string
  starts_time: string
  duration_hours: string
  modality: string
  location: string
  target_audience: string
  audience_goal: string
  responsible_user_id: string
  responsible_name: string
  ticket_price_text: string
  visit_reason: string
  product_name: string
  google_event_id: string
  status: AgendaScheduleEvent['status']
}

interface EventoModalProps {
  open: boolean
  onClose: () => void
  editingEventId: string | null
  eventForm: EventForm
  setEventForm: React.Dispatch<React.SetStateAction<EventForm>>
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  consultants: AgendaConsultant[]
  visitReasonSelectOptions: string[]
  targetAudienceSelectOptions: string[]
  productSelectOptions: string[]
}

export function EventoModal({
  open, onClose, editingEventId,
  eventForm, setEventForm,
  submitting, onSubmit,
  consultants,
  visitReasonSelectOptions, targetAudienceSelectOptions, productSelectOptions,
}: EventoModalProps) {
  const isBlock = eventForm.event_type === 'bloqueio'
  const submitDisabled = submitting || !eventForm.title.trim() || (isBlock && !eventForm.responsible_user_id)
  const handleChangeType = (eventType: AgendaScheduleEvent['event_type']) => {
    setEventForm((prev) => ({
      ...prev,
      event_type: eventType,
      title: eventType === 'bloqueio' && !prev.title.trim() ? 'Agenda bloqueada' : prev.title,
      duration_hours: eventType === 'bloqueio' ? prev.duration_hours || '8' : prev.duration_hours,
      modality: eventType === 'bloqueio' ? 'Bloqueio' : eventType === 'evento_presencial' ? 'Presencial' : 'Online',
      location: eventType === 'bloqueio' ? '' : eventType === 'evento_presencial' ? '' : 'Google Meet',
      visit_reason: eventType === 'bloqueio' ? 'Agenda bloqueada' : prev.visit_reason,
      target_audience: eventType === 'bloqueio' ? '' : prev.target_audience,
      audience_goal: eventType === 'bloqueio' ? '' : prev.audience_goal,
      product_name: eventType === 'bloqueio' ? '' : prev.product_name,
      ticket_price_text: eventType === 'bloqueio' ? '' : prev.ticket_price_text,
      google_event_id: eventType === 'bloqueio' ? '' : prev.google_event_id,
    }))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBlock ? editingEventId ? 'Editar Bloqueio' : 'Bloquear Agenda' : editingEventId ? 'Editar Evento/Aula' : 'Novo Evento/Aula'}
      description={isBlock ? 'Reserve um período indisponível para um consultor MX' : 'Cadastre aulas, eventos online e eventos presenciais do cronograma MX'}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>CANCELAR</Button>
          <Button type="submit" form="agenda-event-form" disabled={submitDisabled} className="">
            {submitting ? 'SALVANDO...' : isBlock ? 'SALVAR BLOQUEIO' : 'SALVAR EVENTO/AULA'}
          </Button>
        </>
      }
    >
      <form id="agenda-event-form" onSubmit={onSubmit} className="space-y-mx-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="agenda-event-type"
            label="Tipo"
            value={eventForm.event_type}
            onChange={(e) => handleChangeType(e.target.value as AgendaScheduleEvent['event_type'])}
          >
            <option value="aula">Aula</option>
            <option value="evento_online">Evento online</option>
            <option value="evento_presencial">Evento presencial</option>
            <option value="bloqueio">Bloqueio</option>
          </Select>
          <Select
            id="agenda-event-status"
            label="Status"
            value={eventForm.status}
            onChange={(e) => setEventForm((prev) => ({ ...prev, status: e.target.value as AgendaScheduleEvent['status'] }))}
          >
            <option value="agendado">Agendado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </div>

        <div className="space-y-mx-xs">
          <Typography as="label" htmlFor="agenda-event-title" variant="caption" className="">
            {isBlock ? 'Motivo do bloqueio *' : 'Evento/Aula *'}
          </Typography>
          <Input
            id="agenda-event-title"
            value={eventForm.title}
            onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder={isBlock ? 'Ex: José indisponível' : 'Ex: Formação de Vendedores'}
          />
        </div>

        <div className="space-y-mx-xs">
          <Typography as="label" htmlFor="agenda-event-topic" variant="caption" className="">
            {isBlock ? 'Observação' : 'Tema'}
          </Typography>
          <Input
            id="agenda-event-topic"
            value={eventForm.topic}
            onChange={(e) => setEventForm((prev) => ({ ...prev, topic: e.target.value }))}
            placeholder={isBlock ? 'Detalhe opcional' : 'Tema ou pauta principal'}
          />
        </div>

        {!isBlock && (
          <div className="space-y-mx-xs">
            <Select
              id="agenda-event-reason"
              label="Motivo da visita"
              value={eventForm.visit_reason}
              onChange={(e) => setEventForm((prev) => ({ ...prev, visit_reason: e.target.value }))}
            >
              <option value="">Selecionar motivo...</option>
              {visitReasonSelectOptions.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-event-date" variant="caption" className="">Data *</Typography>
            <DatePicker
              id="agenda-event-date"
              value={eventForm.starts_at}
              onChange={(e) => setEventForm((prev) => ({ ...prev, starts_at: e.target.value }))}
            />
          </div>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-event-time" variant="caption" className="">Horário *</Typography>
            <Input
              id="agenda-event-time"
              type="time"
              value={eventForm.starts_time}
              onChange={(e) => setEventForm((prev) => ({ ...prev, starts_time: e.target.value }))}
            />
          </div>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-event-duration" variant="caption" className="">Duração</Typography>
            <Input
              id="agenda-event-duration"
              type="number"
              min="1"
              max="24"
              value={eventForm.duration_hours}
              onChange={(e) => setEventForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="agenda-event-responsible"
            label={isBlock ? 'Consultor MX *' : 'Responsável'}
            value={eventForm.responsible_user_id}
            onChange={(e) => {
              const selected = consultants.find((item) => item.id === e.target.value)
              setEventForm((prev) => ({
                ...prev,
                responsible_user_id: e.target.value,
                responsible_name: selected?.name || '',
              }))
            }}
          >
            <option value="">{isBlock ? 'Selecione o consultor...' : 'Sem responsável...'}</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-event-location" variant="caption" className="">Local</Typography>
            <Input
              id="agenda-event-location"
              value={eventForm.location}
              onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Google Meet, Online, Lagoa Santa / MG..."
            />
          </div>
        </div>

        {!isBlock && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-mx-md">
              <Select
                id="agenda-event-target"
                label="Alvo"
                value={eventForm.target_audience}
                onChange={(e) => setEventForm((prev) => ({ ...prev, target_audience: e.target.value }))}
              >
                <option value="">Selecionar alvo...</option>
                {targetAudienceSelectOptions.map((target) => (
                  <option key={target} value={target}>{target}</option>
                ))}
              </Select>
              <Select
                id="agenda-event-product-name"
                label="Produto"
                value={eventForm.product_name}
                onChange={(e) => setEventForm((prev) => ({ ...prev, product_name: e.target.value }))}
              >
                <option value="">Selecionar produto...</option>
                {productSelectOptions.map((product) => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </Select>
              <div className="space-y-mx-xs">
                <Typography as="label" htmlFor="agenda-event-goal" variant="caption" className="">Meta de público</Typography>
                <Input
                  id="agenda-event-goal"
                  type="number"
                  min="0"
                  value={eventForm.audience_goal}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, audience_goal: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
              <div className="space-y-mx-xs">
                <Typography as="label" htmlFor="agenda-event-ticket" variant="caption" className="">Valor do ingresso</Typography>
                <Input
                  id="agenda-event-ticket"
                  value={eventForm.ticket_price_text}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, ticket_price_text: e.target.value }))}
                  placeholder="R$ 297,00"
                />
              </div>
              <div className="space-y-mx-xs">
                <Typography as="label" htmlFor="agenda-event-google-id" variant="caption" className="">ID Google</Typography>
                <Input
                  id="agenda-event-google-id"
                  value={eventForm.google_event_id}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, google_event_id: e.target.value }))}
                />
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
