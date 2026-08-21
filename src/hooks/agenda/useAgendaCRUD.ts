import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import {
  getPmrVisitDisplayLabel,
  isPmrSchedulableVisitNumber,
  nextPmrVisitNumber,
  pmrVisitRangeMessage,
  resolveProgramTotalVisits,
} from '@/lib/consultoria/pmr-visit-rules'
import { getCentralSyncError, syncScheduleEventToGoogle, syncVisitToGoogle } from './googleSync'
import type {
  AgendaClient,
  AgendaVisit,
  CreateVisitInput,
  ScheduleEventInput,
  UpdateVisitInput,
} from './types'

export type UseAgendaCRUDInput = {
  visits: AgendaVisit[]
  clients: AgendaClient[]
  /** `program_key` → total de visitas contratadas, do repositório de eventos. */
  programTotalVisits: Record<string, number>
  refetch: () => Promise<void>
  canViewAllAgendas: boolean
}

export type UseAgendaCRUDReturn = {
  createVisit: (input: CreateVisitInput) => Promise<{ error: string | null }>
  updateVisit: (input: UpdateVisitInput) => Promise<{ error: string | null }>
  updateVisitStatus: (visitId: string, status: string) => Promise<{ error: string | null }>
  deleteVisit: (visitId: string) => Promise<{ error: string | null }>
  createScheduleEvent: (input: ScheduleEventInput) => Promise<{ error: string | null }>
  updateScheduleEvent: (eventId: string, input: ScheduleEventInput) => Promise<{ error: string | null }>
  deleteScheduleEvent: (eventId: string) => Promise<{ error: string | null }>
  getNextVisitNumber: (clientId: string) => number
  /** Rótulo de exibição ("Visita 8/12", "Acompanhamento Mensal") já resolvido pelo programa do cliente. */
  getVisitLabel: (clientId: string, visitNumber: number) => string
}

/**
 * CRUD operations for visits and schedule events, including Google Calendar
 * synchronization. Triggers `refetch` on every successful mutation.
 */
export function useAgendaCRUD({
  visits,
  clients,
  programTotalVisits,
  refetch,
  canViewAllAgendas,
}: UseAgendaCRUDInput): UseAgendaCRUDReturn {
  const { supabaseUser, role } = useAuth()

  const totalVisitsForClient = useCallback((clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    return resolveProgramTotalVisits(client?.program_template_key, programTotalVisits)
  }, [clients, programTotalVisits])

  const createVisit = useCallback(async (input: CreateVisitInput) => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      return { error: 'Apenas perfis MX podem agendar visitas.' }
    }
    const totalVisits = totalVisitsForClient(input.client_id)
    if (!isPmrSchedulableVisitNumber(input.visit_number, totalVisits)) {
      return { error: pmrVisitRangeMessage(totalVisits) }
    }

    const consultantId = canViewAllAgendas ? input.consultant_id : supabaseUser.id
    const auxiliaryConsultantId = canViewAllAgendas ? input.auxiliary_consultant_id : null

    let targetClientId = input.client_id
    const { data: existingClient } = await supabase
      .from('clientes_consultoria')
      .select('id')
      .or(`id.eq.${input.client_id},primary_store_id.eq.${input.client_id}`)
      .maybeSingle()

    if (existingClient?.id) {
      targetClientId = existingClient.id
    } else {
      const { data: storeData } = await supabase
        .from('lojas')
        .select('id, name')
        .eq('id', input.client_id)
        .maybeSingle()

      if (storeData) {
        const { data: createdClient } = await supabase
          .from('clientes_consultoria')
          .insert({
            name: storeData.name,
            slug: storeData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            status: 'ativo',
            primary_store_id: storeData.id,
            created_by: supabaseUser.id,
            current_visit_step: 0,
          })
          .select('id')
          .single()

        if (createdClient?.id) {
          targetClientId = createdClient.id
        }
      }
    }

    const { data: insertedVisit, error: insertError } = await supabase
      .from('visitas_consultoria')
      .insert({
        client_id: targetClientId,
        visit_number: input.visit_number,
        scheduled_at: input.scheduled_at,
        duration_hours: input.duration_hours,
        modality: input.modality,
        consultant_id: consultantId || null,
        auxiliary_consultant_id: auxiliaryConsultantId || null,
        objective: input.objective || null,
        visit_reason: input.visit_reason || null,
        target_audience: input.target_audience || null,
        product_name: input.product_name || null,
        status: 'agendada',
      })
      .select('id')
      .single()

    if (insertError) return { error: insertError.message }

    if (insertedVisit?.id) {
      const syncResult = await syncVisitToGoogle(insertedVisit.id, 'upsert')
      const syncError = getCentralSyncError(syncResult)
      if (syncError) {
        await refetch()
        return { error: syncError }
      }
    }
    await refetch()
    return { error: null }
  }, [supabaseUser, role, refetch, canViewAllAgendas, totalVisitsForClient])

  const updateVisitStatus = useCallback(async (visitId: string, status: string) => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      return { error: 'Apenas perfis MX podem alterar status.' }
    }

    const { error: updateError } = await supabase
      .from('visitas_consultoria')
      .update({ status })
      .eq('id', visitId)

    if (updateError) return { error: updateError.message }

    const syncResult = await syncVisitToGoogle(visitId, 'upsert')
    const syncError = getCentralSyncError(syncResult)
    await refetch()
    return { error: syncError }
  }, [supabaseUser, role, refetch])

  const updateVisit = useCallback(async (input: UpdateVisitInput) => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      return { error: 'Apenas perfis MX podem editar visitas.' }
    }
    const totalVisits = totalVisitsForClient(input.client_id)
    if (!isPmrSchedulableVisitNumber(input.visit_number, totalVisits)) {
      return { error: pmrVisitRangeMessage(totalVisits) }
    }

    const consultantId = canViewAllAgendas ? input.consultant_id : supabaseUser.id
    const auxiliaryConsultantId = canViewAllAgendas ? input.auxiliary_consultant_id : null

    const { error: updateError } = await supabase
      .from('visitas_consultoria')
      .update({
        client_id: input.client_id,
        visit_number: input.visit_number,
        scheduled_at: input.scheduled_at,
        duration_hours: input.duration_hours,
        modality: input.modality,
        consultant_id: consultantId || null,
        auxiliary_consultant_id: auxiliaryConsultantId || null,
        objective: input.objective || null,
        visit_reason: input.visit_reason || null,
        target_audience: input.target_audience || null,
        product_name: input.product_name || null,
        status: input.status,
      })
      .eq('id', input.id)

    if (updateError) return { error: updateError.message }

    const syncResult = await syncVisitToGoogle(input.id, 'upsert')
    const syncError = getCentralSyncError(syncResult)
    await refetch()
    return { error: syncError }
  }, [supabaseUser, role, refetch, canViewAllAgendas, totalVisitsForClient])

  const deleteVisit = useCallback(async (visitId: string) => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      return { error: 'Apenas perfis MX podem cancelar visitas.' }
    }

    const syncResult = await syncVisitToGoogle(visitId, 'delete')
    const syncError = getCentralSyncError(syncResult)
    if (syncError) return { error: syncError }

    const { error: deleteError } = await supabase
      .from('visitas_consultoria')
      .delete()
      .eq('id', visitId)

    if (deleteError) return { error: deleteError.message }

    await refetch()
    return { error: null }
  }, [supabaseUser, role, refetch])

  const createScheduleEvent = useCallback(async (input: ScheduleEventInput) => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      return { error: 'Apenas perfis MX podem criar eventos e aulas.' }
    }

    const eventInput = {
      ...input,
      responsible_user_id: canViewAllAgendas
        ? input.responsible_user_id
        : input.responsible_user_id || supabaseUser.id,
    }

    const { data: insertedEvent, error: insertError } = await supabase
      .from('eventos_agenda_consultoria')
      .insert({
        ...eventInput,
        status: eventInput.status || 'agendado',
        created_by: supabaseUser.id,
      })
      .select('id')
      .single()

    if (insertError) return { error: insertError.message }
    if (insertedEvent?.id) {
      const syncResult = await syncScheduleEventToGoogle(insertedEvent.id, 'upsert')
      const syncError = getCentralSyncError(syncResult)
      if (syncError) {
        await refetch()
        return { error: syncError }
      }
    }
    await refetch()
    return { error: null }
  }, [refetch, role, supabaseUser, canViewAllAgendas])

  const updateScheduleEvent = useCallback(async (eventId: string, input: ScheduleEventInput) => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      return { error: 'Apenas perfis MX podem editar eventos e aulas.' }
    }

    const eventInput = {
      ...input,
      responsible_user_id: canViewAllAgendas
        ? input.responsible_user_id
        : input.responsible_user_id || supabaseUser.id,
    }

    const { error: updateError } = await supabase
      .from('eventos_agenda_consultoria')
      .update({
        ...eventInput,
        status: eventInput.status || 'agendado',
      })
      .eq('id', eventId)

    if (updateError) return { error: updateError.message }
    const syncResult = await syncScheduleEventToGoogle(eventId, 'upsert')
    const syncError = getCentralSyncError(syncResult)
    await refetch()
    return { error: syncError }
  }, [refetch, role, supabaseUser, canViewAllAgendas])

  const deleteScheduleEvent = useCallback(async (eventId: string) => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      return { error: 'Apenas perfis MX podem excluir eventos e aulas.' }
    }

    const syncResult = await syncScheduleEventToGoogle(eventId, 'delete')
    const syncError = getCentralSyncError(syncResult)
    if (syncError) return { error: syncError }

    const { error: deleteError } = await supabase
      .from('eventos_agenda_consultoria')
      .delete()
      .eq('id', eventId)

    if (deleteError) return { error: deleteError.message }
    await refetch()
    return { error: null }
  }, [refetch, role, supabaseUser])

  const getNextVisitNumber = useCallback((clientId: string) => {
    const clientVisits = visits.filter((v) => v.client_id === clientId)
    const maxNum = clientVisits.reduce((max, v) => Math.max(max, v.visit_number), 0)
    return nextPmrVisitNumber(maxNum, totalVisitsForClient(clientId))
  }, [visits, totalVisitsForClient])

  const getVisitLabel = useCallback((clientId: string, visitNumber: number) => (
    getPmrVisitDisplayLabel(visitNumber, totalVisitsForClient(clientId))
  ), [totalVisitsForClient])

  return {
    createVisit,
    updateVisit,
    updateVisitStatus,
    deleteVisit,
    createScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    getNextVisitNumber,
    getVisitLabel,
  }
}
