import { Button } from '@/components/atoms/Button'
import { DatePicker } from '@/components/atoms/DatePicker'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'
import { getPmrVisitDisplayLabel } from '@/lib/consultoria/pmr-visit-rules'
import type {
  ConsultingAssignableUser,
  ConsultingClientDetail,
  ConsultingVisit,
} from '@/features/consultoria/types'
import type { ConsultingMethodologyStep } from '@/lib/schemas/consulting-client.schema'
import type { VisitManualForm } from '../data/types'

type Props = {
  open: boolean
  onClose: () => void
  client: ConsultingClientDetail
  methodologySteps: ConsultingMethodologyStep[]
  internalUsers: ConsultingAssignableUser[]
  productSelectOptions: string[]
  visitReasonSelectOptions: string[]
  targetAudienceSelectOptions: string[]
  visitForm: VisitManualForm
  setVisitForm: React.Dispatch<React.SetStateAction<VisitManualForm>>
  visitSubmitting: boolean
  handleVisitNumberChange: (visitNumberValue: string) => void
  handleSubmit: (event: React.FormEvent) => void | Promise<void>
}

export function VisitFormModal({
  open,
  onClose,
  client,
  methodologySteps,
  internalUsers,
  productSelectOptions,
  visitReasonSelectOptions,
  targetAudienceSelectOptions,
  visitForm,
  setVisitForm,
  visitSubmitting,
  handleVisitNumberChange,
  handleSubmit,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={visitForm.visit_id ? 'Editar visita manual' : 'Criar visita manual'}
      description={`Admin master MX pode selecionar qualquer etapa da jornada contratada${client.journey_total_visits && client.journey_total_visits <= 7 ? ' ou acompanhamento mensal' : ''}.`}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>CANCELAR</Button>
          <Button type="submit" form="client-manual-visit-form" disabled={visitSubmitting} className="">
            {visitSubmitting ? 'SALVANDO...' : visitForm.visit_id ? 'SALVAR VISITA' : 'CRIAR VISITA'}
          </Button>
        </>
      }
    >
      <form id="client-manual-visit-form" onSubmit={handleSubmit} className="space-y-mx-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="client-visit-number"
            label="Visita *"
            value={visitForm.visit_number}
            onChange={(event) => handleVisitNumberChange(event.target.value)}
          >
            {methodologySteps.map((step) => {
              const existingVisit = client.visits?.find((visit) => visit.visit_number === step.visit_number)
              return (
                <option key={step.id} value={step.visit_number}>
                  {getPmrVisitDisplayLabel(step.visit_number, client.journey_total_visits)} - {existingVisit ? 'editar agendada' : 'criar manual'}
                </option>
              )
            })}
          </Select>
          <Select
            id="client-visit-status"
            label="Status"
            value={visitForm.status}
            onChange={(event) => setVisitForm((prev) => ({ ...prev, status: event.target.value as ConsultingVisit['status'] }))}
          >
            <option value="agendada">Agendada</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="client-visit-date" variant="caption" className="">Data *</Typography>
            <DatePicker
              id="client-visit-date"
              value={visitForm.scheduled_at}
              onChange={(event) => setVisitForm((prev) => ({ ...prev, scheduled_at: event.target.value }))}
            />
          </div>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="client-visit-time" variant="caption" className="">Horário *</Typography>
            <Input
              id="client-visit-time"
              type="time"
              value={visitForm.scheduled_time}
              onChange={(event) => setVisitForm((prev) => ({ ...prev, scheduled_time: event.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="client-visit-duration" variant="caption" className="">Duração (horas)</Typography>
            <Input
              id="client-visit-duration"
              type="number"
              min="1"
              max="12"
              value={visitForm.duration_hours}
              onChange={(event) => setVisitForm((prev) => ({ ...prev, duration_hours: event.target.value }))}
            />
          </div>
          <Select
            id="client-visit-modality"
            label="Modalidade"
            value={visitForm.modality}
            onChange={(event) => setVisitForm((prev) => ({ ...prev, modality: event.target.value }))}
          >
            <option value="Presencial">Presencial</option>
            <option value="Online">Online</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="client-visit-consultant"
            label="Consultor responsável"
            value={visitForm.consultant_id}
            onChange={(event) => setVisitForm((prev) => ({ ...prev, consultant_id: event.target.value }))}
          >
            <option value="">Sem consultor...</option>
            {internalUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </Select>
          <Select
            id="client-visit-aux"
            label="Consultor auxiliar"
            value={visitForm.auxiliary_consultant_id}
            onChange={(event) => setVisitForm((prev) => ({ ...prev, auxiliary_consultant_id: event.target.value }))}
          >
            <option value="">Sem auxiliar...</option>
            {internalUsers.filter((user) => user.id !== visitForm.consultant_id).map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </Select>
        </div>

        <Select
          id="client-visit-reason"
          label="Motivo da visita"
          value={visitForm.visit_reason}
          onChange={(event) => setVisitForm((prev) => ({ ...prev, visit_reason: event.target.value }))}
        >
          <option value="">Selecionar motivo...</option>
          {visitReasonSelectOptions.map((reason) => (
            <option key={reason} value={reason}>{reason}</option>
          ))}
        </Select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="client-visit-target"
            label="Alvo"
            value={visitForm.target_audience}
            onChange={(event) => setVisitForm((prev) => ({ ...prev, target_audience: event.target.value }))}
          >
            <option value="">Selecionar alvo...</option>
            {targetAudienceSelectOptions.map((target) => (
              <option key={target} value={target}>{target}</option>
            ))}
          </Select>
          <Select
            id="client-visit-product"
            label="Produto"
            value={visitForm.product_name}
            onChange={(event) => setVisitForm((prev) => ({ ...prev, product_name: event.target.value }))}
          >
            <option value="">Selecionar produto...</option>
            {productSelectOptions.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-mx-xs">
          <Typography as="label" htmlFor="client-visit-objective" variant="caption" className="">Objetivo da visita</Typography>
          <Textarea
            id="client-visit-objective"
            value={visitForm.objective}
            onChange={(event) => setVisitForm((prev) => ({ ...prev, objective: event.target.value }))}
            placeholder="Descreva o objetivo principal desta visita..."
            className="min-h-mx-24"
          />
        </div>
      </form>
    </Modal>
  )
}

export default VisitFormModal
