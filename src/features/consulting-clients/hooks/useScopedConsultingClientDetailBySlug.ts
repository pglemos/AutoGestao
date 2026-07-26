import { useCallback, useMemo } from 'react'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useConsultingClientDetailBySlug } from '@/hooks/useConsultingClientBySlug'
import { getCentralSyncError, syncVisitToGoogle } from '@/hooks/useAgendaAdmin'
import { supabase } from '@/lib/supabase'
import { validateLegacyVisitCompletionInput } from '@/lib/consultoria/legacy-visit-completion'
import { isPmrSchedulableVisitNumber } from '@/lib/consultoria/pmr-visit-rules'
import type { ConsultingVisit } from '@/features/consultoria/types'
import { canManageConsultingClient } from '../lib/consultingClientPolicy'

type ManualVisitInput = {
  id?: string
  visit_number: number
  scheduled_at: string
  duration_hours: number
  modality: string
  status?: ConsultingVisit['status']
  consultant_id?: string | null
  auxiliary_consultant_id?: string | null
  objective?: string | null
  visit_reason?: string | null
  target_audience?: string | null
  product_name?: string | null
}

type LegacyCompletionInput = {
  visitNumbers: number[]
  summary: string
  effectiveVisitDate: string
}

export function useScopedConsultingClientDetailBySlug(slug?: string) {
  const base = useConsultingClientDetailBySlug(slug)
  const { role, profile, supabaseUser } = useAuth()
  const assigned = useMemo(
    () => Boolean(base.client?.assignments?.some(
      assignment => assignment.active && assignment.user_id === profile?.id,
    )),
    [base.client?.assignments, profile?.id],
  )
  const canManage = canManageConsultingClient({ role, assigned })

  const upsertVisit = useCallback(async (input: ManualVisitInput) => {
    if (!canManage || !base.client?.id || !supabaseUser) {
      return { error: 'Seu perfil não pode alterar visitas deste cliente.' }
    }
    if (isPerfilInternoMx(role)) return base.upsertVisit(input)
    if (!isPmrSchedulableVisitNumber(input.visit_number)) {
      return { error: 'O PMR trabalha com visitas de 1 a 7 e acompanhamento mensal.' }
    }

    const payload = {
      client_id: base.client.id,
      visit_number: input.visit_number,
      scheduled_at: input.scheduled_at,
      duration_hours: input.duration_hours,
      modality: input.modality,
      status: input.status || 'agendada',
      consultant_id: input.consultant_id || null,
      auxiliary_consultant_id: input.auxiliary_consultant_id || null,
      objective: input.objective?.trim() || null,
      visit_reason: input.visit_reason || null,
      target_audience: input.target_audience || null,
      product_name: input.product_name || null,
    }

    let visitId = input.id
    if (visitId) {
      const { error } = await supabase.from('visitas_consultoria').update(payload).eq('id', visitId)
      if (error) return { error: error.message }
    } else {
      const { data, error } = await supabase
        .from('visitas_consultoria')
        .insert(payload)
        .select('id')
        .single()
      if (error) return { error: error.message }
      visitId = data?.id
    }

    if (visitId) {
      const syncResult = await syncVisitToGoogle(visitId, 'upsert')
      const syncError = getCentralSyncError(syncResult)
      await base.refetch()
      return { error: syncError }
    }

    await base.refetch()
    return { error: null }
  }, [base, canManage, role, supabaseUser])

  const completeLegacyVisits = useCallback(async (input: LegacyCompletionInput) => {
    if (!canManage || !base.client?.id || !supabaseUser) {
      return { error: 'Seu perfil não pode concluir visitas deste cliente.' }
    }
    if (isPerfilInternoMx(role)) return base.completeLegacyVisits(input)

    const validationError = validateLegacyVisitCompletionInput(input)
    if (validationError) return { error: validationError }

    const { error } = await supabase.rpc('concluir_visitas_legadas_consultoria', {
      p_cliente_id: base.client.id,
      p_visit_numbers: input.visitNumbers,
      p_resumo_geral: input.summary.trim(),
      p_effective_visit_date: input.effectiveVisitDate,
    })
    if (error) return { error: error.message }
    await base.refetch()
    return { error: null }
  }, [base, canManage, role, supabaseUser])

  return { ...base, canManage, upsertVisit, completeLegacyVisits }
}
