import { useMemo } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'
import { Select } from '@/components/atoms/Select'
import { DatePicker } from '@/components/atoms/DatePicker'
import type { AgendaClient, AgendaConsultant } from '@/hooks/agenda'

export type ScheduleForm = {
  client_id: string
  visit_number: string
  status: string
  scheduled_at: string
  scheduled_time: string
  duration_hours: string
  modality: string
  consultant_id: string
  auxiliary_consultant_id: string
  visit_reason: string
  target_audience: string
  product_name: string
  objective: string
}

interface VisitaModalProps {
  open: boolean
  onClose: () => void
  editingVisitId: string | null
  scheduleForm: ScheduleForm
  setScheduleForm: React.Dispatch<React.SetStateAction<ScheduleForm>>
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  clients: AgendaClient[]
  consultants: AgendaConsultant[]
  visitReasonSelectOptions: string[]
  targetAudienceSelectOptions: string[]
  productSelectOptions: string[]
  getNextVisitNumber: (clientId: string) => number
  getVisitLabel: (clientId: string, visitNumber: number) => string
}

export function getSelectableAgendaClients(clients: AgendaClient[]) {
  return clients
}

export function VisitaModal({
  open, onClose, editingVisitId,
  scheduleForm, setScheduleForm,
  submitting, onSubmit,
  clients, consultants,
  visitReasonSelectOptions, targetAudienceSelectOptions, productSelectOptions,
  getNextVisitNumber, getVisitLabel,
}: VisitaModalProps) {
  const handleSelectClient = (clientId: string) => {
    setScheduleForm((prev) => ({ ...prev, client_id: clientId }))
  }

  const selectedClientVisitNum = useMemo(() => {
    if (!scheduleForm.client_id) return null
    if (editingVisitId) return Number(scheduleForm.visit_number) || null
    return getNextVisitNumber(scheduleForm.client_id)
  }, [editingVisitId, scheduleForm.client_id, scheduleForm.visit_number, getNextVisitNumber])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingVisitId ? 'Editar Visita de Consultoria' : 'Agendar Visita de Consultoria'}
      description="Vincule a um cliente do CRM de consultoria"
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>CANCELAR</Button>
          <Button type="submit" form="agenda-schedule-form" disabled={submitting || !scheduleForm.client_id} className="">
            {submitting ? 'SALVANDO...' : editingVisitId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR AGENDAMENTO'}
          </Button>
        </>
      }
    >
      <form id="agenda-schedule-form" onSubmit={onSubmit} className="space-y-mx-lg">
        <div className="space-y-mx-xs">
          <Select
            id="agenda-client"
            label="Cliente da Consultoria *"
            value={scheduleForm.client_id}
            onChange={(e) => handleSelectClient(e.target.value)}
          >
            <option value="">Selecionar cliente...</option>
            {getSelectableAgendaClients(clients).map((c) => (
              <option key={c.id} value={c.id}>{c.name} (Etapa atual: {c.current_visit_step || 0})</option>
            ))}
          </Select>
          {selectedClientVisitNum && (
            <Typography variant="tiny" tone="muted">
              Será {getVisitLabel(scheduleForm.client_id, selectedClientVisitNum).toLowerCase()} deste cliente
            </Typography>
          )}
        </div>

        {editingVisitId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="agenda-visit-number" variant="caption" className="">Número da visita</Typography>
              <Input
                id="agenda-visit-number"
                type="number"
                min="1"
                value={scheduleForm.visit_number}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, visit_number: e.target.value }))}
              />
            </div>
            <Select
              id="agenda-visit-status"
              label="Status"
              value={scheduleForm.status}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="agendada">Agendada</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-date" variant="caption" className="">Data *</Typography>
            <DatePicker
              id="agenda-date"
              value={scheduleForm.scheduled_at}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
            />
          </div>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-time" variant="caption" className="">Horário *</Typography>
            <Input
              id="agenda-time"
              type="time"
              value={scheduleForm.scheduled_time}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduled_time: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-duration" variant="caption" className="">Duração (horas)</Typography>
            <Input
              id="agenda-duration"
              type="number"
              min="1"
              max="12"
              value={scheduleForm.duration_hours}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
            />
          </div>
          <Select
            id="agenda-modality"
            label="Modalidade"
            value={scheduleForm.modality}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, modality: e.target.value }))}
          >
            <option value="Presencial">Presencial</option>
            <option value="Online">Online</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="agenda-consultant"
            label="Consultor Responsável"
            value={scheduleForm.consultant_id}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, consultant_id: e.target.value }))}
          >
            <option value="">Sem consultor...</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select
            id="agenda-aux"
            label="Consultor Auxiliar"
            value={scheduleForm.auxiliary_consultant_id}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, auxiliary_consultant_id: e.target.value }))}
          >
            <option value="">Sem auxiliar...</option>
            {consultants.filter((c) => c.id !== scheduleForm.consultant_id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-mx-xs">
          <Select
            id="agenda-visit-reason"
            label="Motivo da visita"
            value={scheduleForm.visit_reason}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, visit_reason: e.target.value }))}
          >
            <option value="">Selecionar motivo...</option>
            {visitReasonSelectOptions.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="agenda-target-audience"
            label="Alvo"
            value={scheduleForm.target_audience}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, target_audience: e.target.value }))}
          >
            <option value="">Selecionar alvo...</option>
            {targetAudienceSelectOptions.map((target) => (
              <option key={target} value={target}>{target}</option>
            ))}
          </Select>
          <Select
            id="agenda-product-name"
            label="Produto"
            value={scheduleForm.product_name}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, product_name: e.target.value }))}
          >
            <option value="">Selecionar produto...</option>
            {productSelectOptions.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-mx-xs">
          <Typography as="label" htmlFor="agenda-objective" variant="caption" className="">Objetivo da Visita</Typography>
          <Textarea
            id="agenda-objective"
            value={scheduleForm.objective}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, objective: e.target.value }))}
            placeholder="Descreva o objetivo principal desta visita..."
            className="min-h-mx-24"
          />
        </div>
      </form>
    </Modal>
  )
}
