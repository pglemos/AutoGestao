import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'
import { buildSaoPauloDateTime } from '@/hooks/useAgendaAdmin'
import { isPmrSchedulableVisitNumber } from '@/lib/consultoria/pmr-visit-rules'
import type {
  ConsultingClientDetail,
  ConsultingVisit,
} from '@/features/consultoria/types'
import type { ConsultingMethodologyStep } from '@/lib/schemas/consulting-client.schema'
import type { VisitManualForm } from '../data/types'

type UpsertVisitArgs = {
  id?: string
  visit_number: number
  status: ConsultingVisit['status']
  scheduled_at: string
  duration_hours: number
  modality: string
  consultant_id: string | null
  auxiliary_consultant_id: string | null
  visit_reason: string | null
  target_audience: string | null
  product_name: string | null
  objective: string | null
}

type Params = {
  client: ConsultingClientDetail | null
  methodologySteps: ConsultingMethodologyStep[]
  profileId: string | undefined
  upsertVisit: (args: UpsertVisitArgs) => Promise<{ error?: string | null }>
}

const initialForm: VisitManualForm = {
  visit_id: '',
  visit_number: '1',
  status: 'agendada',
  scheduled_at: format(new Date(), 'yyyy-MM-dd'),
  scheduled_time: '09:00',
  duration_hours: '3',
  modality: 'Presencial',
  consultant_id: '',
  auxiliary_consultant_id: '',
  visit_reason: '',
  target_audience: '',
  product_name: '',
  objective: '',
}

export function useVisitForm({ client, methodologySteps, profileId, upsertVisit }: Params) {
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [visitSubmitting, setVisitSubmitting] = useState(false)
  const [visitForm, setVisitForm] = useState<VisitManualForm>(initialForm)

  const openVisitModal = (visitNumber?: number) => {
    if (!client) return
    const fallbackVisitNumber = visitNumber
      || methodologySteps.find((step) => !client.visits?.some((visit) => visit.visit_number === step.visit_number))?.visit_number
      || methodologySteps[0]?.visit_number
      || 1
    const existingVisit = client.visits?.find((visit) => visit.visit_number === fallbackVisitNumber)
    const step = methodologySteps.find((item) => item.visit_number === fallbackVisitNumber)
    const scheduled = existingVisit?.scheduled_at ? new Date(existingVisit.scheduled_at) : new Date()

    setVisitForm({
      visit_id: existingVisit?.id || '',
      visit_number: String(fallbackVisitNumber),
      status: existingVisit?.status || 'agendada',
      scheduled_at: format(scheduled, 'yyyy-MM-dd'),
      scheduled_time: format(scheduled, 'HH:mm'),
      duration_hours: String(existingVisit?.duration_hours || 3),
      modality: existingVisit?.modality || client.modality || 'Presencial',
      consultant_id: existingVisit?.consultant_id || profileId || '',
      auxiliary_consultant_id: existingVisit?.auxiliary_consultant_id || '',
      visit_reason: existingVisit?.visit_reason || '',
      target_audience: existingVisit?.target_audience || step?.target || '',
      product_name: existingVisit?.product_name || client.product_name || '',
      objective: existingVisit?.objective || step?.objective || '',
    })
    setShowVisitModal(true)
  }

  const handleVisitNumberChange = (visitNumberValue: string) => {
    if (!client) return
    const visitNumber = Number(visitNumberValue)
    const existingVisit = client.visits?.find((visit) => visit.visit_number === visitNumber)
    const step = methodologySteps.find((item) => item.visit_number === visitNumber)
    const scheduled = existingVisit?.scheduled_at ? new Date(existingVisit.scheduled_at) : new Date()

    setVisitForm((prev) => ({
      ...prev,
      visit_id: existingVisit?.id || '',
      visit_number: visitNumberValue,
      status: existingVisit?.status || 'agendada',
      scheduled_at: existingVisit ? format(scheduled, 'yyyy-MM-dd') : prev.scheduled_at,
      scheduled_time: existingVisit ? format(scheduled, 'HH:mm') : prev.scheduled_time,
      duration_hours: String(existingVisit?.duration_hours || prev.duration_hours || 3),
      modality: existingVisit?.modality || prev.modality || client.modality || 'Presencial',
      consultant_id: existingVisit?.consultant_id || prev.consultant_id,
      auxiliary_consultant_id: existingVisit?.auxiliary_consultant_id || '',
      visit_reason: existingVisit?.visit_reason || prev.visit_reason,
      target_audience: existingVisit?.target_audience || step?.target || prev.target_audience,
      product_name: existingVisit?.product_name || prev.product_name,
      objective: existingVisit?.objective || step?.objective || prev.objective,
    }))
  }

  const handleSubmitManualVisit = async (event: React.FormEvent) => {
    event.preventDefault()
    const visitNumber = Number(visitForm.visit_number)
    if (!client || !isPmrSchedulableVisitNumber(visitNumber, client.journey_total_visits)) {
      toast.error('Selecione uma etapa válida da jornada contratada.')
      return
    }
    if (!visitForm.scheduled_at || !visitForm.scheduled_time) {
      toast.error('Informe data e horário da visita.')
      return
    }

    setVisitSubmitting(true)
    const { error: visitError } = await upsertVisit({
      id: visitForm.visit_id || undefined,
      visit_number: visitNumber,
      status: visitForm.status,
      scheduled_at: buildSaoPauloDateTime(visitForm.scheduled_at, visitForm.scheduled_time),
      duration_hours: Number(visitForm.duration_hours) || 3,
      modality: visitForm.modality,
      consultant_id: visitForm.consultant_id || null,
      auxiliary_consultant_id: visitForm.auxiliary_consultant_id || null,
      visit_reason: visitForm.visit_reason || null,
      target_audience: visitForm.target_audience || null,
      product_name: visitForm.product_name || null,
      objective: visitForm.objective || null,
    })
    setVisitSubmitting(false)

    if (visitError) {
      toast.error(visitError)
      return
    }

    toast.success(visitForm.visit_id ? `Visita V${visitNumber} atualizada.` : `Visita V${visitNumber} criada manualmente.`)
    setShowVisitModal(false)
  }

  return {
    showVisitModal,
    setShowVisitModal,
    visitSubmitting,
    visitForm,
    setVisitForm,
    openVisitModal,
    handleVisitNumberChange,
    handleSubmitManualVisit,
  }
}
