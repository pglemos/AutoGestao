import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { getCentralSyncError, syncVisitToGoogle } from '@/hooks/useAgendaAdmin'
import type {
  ConsultingAssignableUser,
  ConsultingClientDetail,
  ConsultingInventorySnapshot,
  ConsultingVisit,
  ConsultingVisitAttachment,
  VisitOneQuantData,
} from '@/features/consultoria/types'
import {
  parseConsultingClientUnitArray,
  parseConsultingClientContactArray,
  parseConsultingAssignmentArray,
  parseConsultingFinancialArray,
  parseConsultingClientModuleArray,
  parseConsultingVisitArray,
  type ConsultingClient,
} from '@/lib/schemas/consulting-client.schema'
import { validateLegacyVisitCompletionInput } from '@/lib/consultoria/legacy-visit-completion'
import { isPmrSchedulableVisitNumber } from '@/lib/consultoria/pmr-visit-rules'

type VisitRowIdentity = {
  id: string
  visit_number: number
}

type VisitEvidenceRow = {
  id: string
  visita_id: string
  nome_arquivo: string | null
  tipo: string | null
  caminho_storage: string
  content_type: string
  tamanho_bytes: number | null
  created_at: string
}

function normalizeVisitQuantData(value: unknown): ConsultingVisit['quant_data'] {
  if (typeof value === 'undefined' || value === null) return value
  if (typeof value === 'object') return value as VisitOneQuantData | Record<string, unknown>
  return null
}

export function useConsultingClientDetailBySlug(slug?: string) {
  const { supabaseUser, role, profile } = useAuth()
  const [client, setClient] = useState<ConsultingClientDetail | null>(null)
  const [assignableUsers, setAssignableUsers] = useState<ConsultingAssignableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canManage = isPerfilInternoMx(role)

  const fetchClient = useCallback(async () => {
    if (!supabaseUser || !slug || slug === 'undefined') {
      setClient(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    
    let query = supabase.from('clientes_consultoria').select('*')
    if (isUuid) {
      query = query.or(`slug.eq.${slug},id.eq.${slug}`)
    } else {
      query = query.eq('slug', slug)
    }

    const { data: clientData, error: clientError } = await query.maybeSingle()

    if (clientError || !clientData) {
      setError(clientError?.message || 'Cliente não encontrado.')
      setClient(null)
      setLoading(false)
      return
    }

    const clientId = clientData.id

    const [unitsRes, contactsRes, assignmentsRes, visitsRes, financialsRes, modulesRes, usersRes, inventoryRes] = await Promise.all([
      supabase.from('unidades_cliente_consultoria').select('*').eq('client_id', clientId).order('is_primary', { ascending: false }).order('name', { ascending: true }),
      supabase.from('contatos_cliente_consultoria').select('*').eq('client_id', clientId).order('is_primary', { ascending: false }).order('name', { ascending: true }),
      supabase.from('atribuicoes_consultoria').select('*, user:usuarios(id,name,email,role)').eq('client_id', clientId).order('created_at', { ascending: true }),
      supabase
        .from('visitas_consultoria')
        .select('*, consultant:usuarios!visitas_consultoria_consultor_id_fkey(name,email), auxiliary_consultant:usuarios!visitas_consultoria_consultor_auxiliar_id_fkey(name,email)')
        .eq('client_id', clientId)
        .order('visit_number', { ascending: true }),
      supabase.from('financeiro_consultoria').select('*').eq('client_id', clientId).order('reference_date', { ascending: false }),
      supabase.from('modulos_cliente_consultoria').select('*').eq('client_id', clientId).order('module_key', { ascending: true }),
      supabase.from('usuarios').select('id,name,email,role').eq('active', true).order('name', { ascending: true }),
      supabase.from('snapshots_estoque_consultoria').select('*').eq('client_id', clientId).order('reference_month', { ascending: false }),
    ])

    const visitRows = ((visitsRes.data || []) as VisitRowIdentity[]).filter((visit) => isPmrSchedulableVisitNumber(visit.visit_number))
    const visitIds = visitRows.map((visit) => visit.id).filter(Boolean)
    const { data: evidenceRows } = visitIds.length
      ? await supabase.from('evidencias_visita').select('*').in('visita_id', visitIds)
      : { data: [] as VisitEvidenceRow[] }
    const evidenceByVisit = new Map<string, ConsultingVisitAttachment[]>()
    for (const evidence of (evidenceRows || []) as VisitEvidenceRow[]) {
      const list = evidenceByVisit.get(evidence.visita_id) || []
      list.push({
        id: evidence.id,
        filename: evidence.nome_arquivo || evidence.tipo || 'evidencia',
        storage_path: evidence.caminho_storage,
        content_type: evidence.content_type,
        size_bytes: evidence.tamanho_bytes || 0,
        uploaded_at: evidence.created_at,
      })
      evidenceByVisit.set(evidence.visita_id, list)
    }
    const visitsWithEvidence: ConsultingVisit[] = parseConsultingVisitArray(visitRows).map((visit) => ({
      ...visit,
      quant_data: normalizeVisitQuantData(visit.quant_data),
      attachments: evidenceByVisit.get(visit.id) || [],
    }))

    const detail: ConsultingClientDetail = {
      ...(clientData as ConsultingClient),
      id: clientData.id,
      store_id: clientData.store_id || null,
      primary_store_id: clientData.primary_store_id || null,
      units: parseConsultingClientUnitArray(unitsRes.data || []),
      contacts: parseConsultingClientContactArray(contactsRes.data || []),
      assignments: parseConsultingAssignmentArray(assignmentsRes.data || []),
      visits: visitsWithEvidence,
      financials: parseConsultingFinancialArray(financialsRes.data || []),
      modules: parseConsultingClientModuleArray(modulesRes.data || []),
      inventory_snapshots: (inventoryRes.data || []) as ConsultingInventorySnapshot[],
    }

    setClient(detail)
    setAssignableUsers((usersRes.data || []) as ConsultingAssignableUser[])
    setLoading(false)
  }, [slug, supabaseUser])

  const clientId = client?.id

  const createUnit = useCallback(async (input: {
    name: string
    city?: string
    state?: string
    is_primary?: boolean
  }) => {
    if (!supabaseUser || !clientId || !canManage) {
      return { error: 'Apenas perfis MX podem cadastrar unidade.' }
    }

    const { error: insertError } = await supabase.from('unidades_cliente_consultoria').insert({
      client_id: clientId,
      name: input.name.trim(),
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      is_primary: input.is_primary ?? false,
    })

    if (insertError) return { error: insertError.message }
    await fetchClient()
    return { error: null }
  }, [canManage, clientId, fetchClient, supabaseUser])

  const createContact = useCallback(async (input: {
    name: string
    email?: string
    phone?: string
    role?: string
    is_primary?: boolean
  }) => {
    if (!supabaseUser || !clientId || !canManage) {
      return { error: 'Apenas perfis MX podem cadastrar contato.' }
    }

    const { error: insertError } = await supabase.from('contatos_cliente_consultoria').insert({
      client_id: clientId,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role: input.role?.trim() || null,
      is_primary: input.is_primary ?? false,
    })

    if (insertError) return { error: insertError.message }
    await fetchClient()
    return { error: null }
  }, [canManage, clientId, fetchClient, supabaseUser])

  const upsertAssignment = useCallback(async (input: {
    user_id: string
    assignment_role: 'responsavel' | 'auxiliar' | 'viewer'
    active?: boolean
  }) => {
    if (!supabaseUser || !clientId || !canManage) {
      return { error: 'Apenas perfis MX podem vincular consultores.' }
    }

    const { error: upsertError } = await supabase.from('atribuicoes_consultoria').upsert({
      client_id: clientId,
      user_id: input.user_id,
      assignment_role: input.assignment_role,
      active: input.active ?? true,
    }, { onConflict: 'client_id,user_id' })

    if (upsertError) return { error: upsertError.message }
    await fetchClient()
    return { error: null }
  }, [canManage, clientId, fetchClient, supabaseUser])

  const toggleAssignment = useCallback(async (assignmentId: string, active: boolean) => {
    if (!supabaseUser || !canManage) {
      return { error: 'Apenas perfis MX podem alterar vínculos.' }
    }

    const { error: updateError } = await supabase
      .from('atribuicoes_consultoria')
      .update({ active })
      .eq('id', assignmentId)

    if (updateError) return { error: updateError.message }
    await fetchClient()
    return { error: null }
  }, [canManage, fetchClient, supabaseUser])

  const upsertFinancial = useCallback(async (input: {
    id?: string
    reference_date: string
    revenue: number
    fixed_expenses: number
    marketing_expenses: number
    investments: number
    financing: number
  }) => {
    if (!supabaseUser || !clientId || !canManage) {
      return { error: 'Apenas perfis MX podem lançar dados financeiros.' }
    }

    const net_profit = input.revenue - input.fixed_expenses - input.marketing_expenses - input.investments - input.financing
    const roi = input.investments > 0 ? Number((net_profit / input.investments).toFixed(2)) : 0

    const payload = {
      client_id: clientId,
      reference_date: input.reference_date,
      revenue: input.revenue,
      fixed_expenses: input.fixed_expenses,
      marketing_expenses: input.marketing_expenses,
      investments: input.investments,
      financing: input.financing,
      net_profit,
      roi,
      conversion_rate: 0,
    }

    if (input.id) {
      const { error: updateError } = await supabase
        .from('financeiro_consultoria')
        .update(payload)
        .eq('id', input.id)
      if (updateError) return { error: updateError.message }
    } else {
      const { error: insertError } = await supabase
        .from('financeiro_consultoria')
        .insert(payload)
      if (insertError) return { error: insertError.message }
    }

    await fetchClient()
    return { error: null }
  }, [canManage, clientId, fetchClient, supabaseUser])

  const deleteFinancial = useCallback(async (financialId: string) => {
    if (!supabaseUser || !canManage) {
      return { error: 'Apenas perfis MX podem excluir dados financeiros.' }
    }

    const { error: deleteError } = await supabase
      .from('financeiro_consultoria')
      .delete()
      .eq('id', financialId)

    if (deleteError) return { error: deleteError.message }
    await fetchClient()
    return { error: null }
  }, [canManage, fetchClient, supabaseUser])

  const upsertVisit = useCallback(async (input: {
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
  }) => {
    if (!supabaseUser || !clientId || !canManage) {
      return { error: 'Apenas administradores MX podem criar visitas manualmente.' }
    }
    if (!isPmrSchedulableVisitNumber(input.visit_number)) {
      return { error: 'O PMR trabalha com visitas de 1 a 7 e acompanhamento mensal.' }
    }

    const payload = {
      client_id: clientId,
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
      const { error: updateError } = await supabase
        .from('visitas_consultoria')
        .update(payload)
        .eq('id', visitId)
      if (updateError) return { error: updateError.message }
    } else {
      const { data: insertedVisit, error: insertError } = await supabase
        .from('visitas_consultoria')
        .insert(payload)
        .select('id')
        .single()
      if (insertError) return { error: insertError.message }
      visitId = insertedVisit?.id
    }

    if (visitId) {
      const syncResult = await syncVisitToGoogle(visitId, 'upsert')
      const syncError = getCentralSyncError(syncResult)
      await fetchClient()
      return { error: syncError }
    }

    await fetchClient()
    return { error: null }
  }, [canManage, clientId, fetchClient, supabaseUser])

  const completeLegacyVisits = useCallback(async (input: {
    visitNumbers: number[]
    summary: string
    effectiveVisitDate: string
  }) => {
    if (!supabaseUser || !clientId || !canManage) {
      return { error: 'Apenas administradores MX podem concluir visitas legadas.' }
    }

    const validationError = validateLegacyVisitCompletionInput(input)
    if (validationError) return { error: validationError }

    const { error: rpcError } = await supabase.rpc('concluir_visitas_legadas_consultoria', {
      p_cliente_id: clientId,
      p_visit_numbers: input.visitNumbers,
      p_resumo_geral: input.summary.trim(),
      p_effective_visit_date: input.effectiveVisitDate,
    })

    if (rpcError) return { error: rpcError.message }
    await fetchClient()
    return { error: null }
  }, [canManage, clientId, fetchClient, supabaseUser])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  useEffect(() => {
    const handlePlanningReload = () => { void fetchClient() }
    window.addEventListener('mx:planning-reload', handlePlanningReload)
    return () => window.removeEventListener('mx:planning-reload', handlePlanningReload)
  }, [fetchClient])

  return { 
    client, 
    assignableUsers, 
    loading, 
    error, 
    canManage,
    refetch: fetchClient,
    createUnit,
    createContact,
    upsertAssignment,
    toggleAssignment,
    upsertFinancial,
    deleteFinancial,
    upsertVisit,
    completeLegacyVisits,
  }
}
