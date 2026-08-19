import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import type {
  ConsultingClientContact,
  ConsultingClientDetail,
  ConsultingVisit,
} from '@/features/consultoria/types'
import {
  parseConsultingClientArray,
  parseConsultingClientUnitArray,
  parseConsultingClientContactArray,
  parseConsultingAssignmentArray,
  parseConsultingFinancialArray,
  parseConsultingMethodologyStepArray,
  parseConsultingClientModuleArray,
  parseConsultingVisitProgram,
  type ConsultingClient,
  type ConsultingClientUnit,
  type ConsultingAssignment,
  type ConsultingFinancial,
  type ConsultingMethodologyStep,
  type ConsultingVisitProgram,
} from '@/lib/schemas/consulting-client.schema'
import { buildClientJourney, isClientVisitInScope, isCompletedClientVisit } from '@/features/admin-mx/clientes/clientJourney'

type ConsultingAssignableUser = {
  id: string
  name: string
  email: string
  role: string
}

type CreateConsultingClientInput = {
  id?: string
  name: string
  legal_name?: string
  cnpj?: string
  product_name?: string
  notes?: string
  enabled_modules?: string[]
}

type ConsultingVisitSummaryRow = Pick<ConsultingVisit, 'visit_number' | 'status' | 'created_at'> & {
  effective_visit_date?: string | null
}

type ConsultingClientWithVisits = ConsultingClient & {
  visitas_consultoria?: ConsultingVisitSummaryRow[] | null
}

export function useConsultingClients() {
  const { supabaseUser, role } = useAuth()
  const [clients, setClients] = useState<ConsultingClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = isPerfilInternoMx(role)

  const fetchClients = useCallback(async () => {
    if (!supabaseUser) {
      setClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [{ data, error: fetchError }, { data: programRows }] = await Promise.all([
      supabase
        .from('clientes_consultoria')
        .select('*, visitas_consultoria(visit_number, status, created_at, effective_visit_date)')
        .order('name', { ascending: true }),
      supabase.from('programas_visita_consultoria').select('program_key, total_visits'),
    ])

    if (fetchError) {
      setError(fetchError.message)
      setClients([])
    } else {
      try {
        const clientRows = (data || []) as unknown as ConsultingClientWithVisits[]
        const programTotals = new Map((programRows ?? []).map(program => [program.program_key, program.total_visits]))
        const clientsWithLastVisit = clientRows.map(client => {
          const journey = buildClientJourney({
            programKey: client.program_template_key,
            programTotal: programTotals.get(client.program_template_key ?? ''),
            visits: client.visitas_consultoria || [],
          })
          const finishedVisits = journey.contractedVisits
            .filter(v => isCompletedClientVisit(v.status))
            .sort((a, b) => new Date(String(b.effective_visit_date ?? b.created_at ?? '')).getTime() - new Date(String(a.effective_visit_date ?? a.created_at ?? '')).getTime())
          
          const lastVisit = finishedVisits[0]
          return {
            ...client,
            current_visit_step: journey.completedVisits,
            journey_completed_visits: journey.completedVisits,
            journey_total_visits: journey.totalVisits,
            last_visit_at: lastVisit ? (lastVisit.effective_visit_date || lastVisit.created_at) : null
          }
        })
        setClients(parseConsultingClientArray(clientsWithLastVisit))
      } catch {
        setError('Dados de clientes da consultoria fora do contrato esperado.')
        setClients((data || []) as ConsultingClient[])
      }
    }

    setLoading(false)
  }, [supabaseUser])

  const BLOCKED_NAMES = ['MX PERFORMANCE', 'MX GESTAO PREDITIVA', 'MXGESTAO']

  const createClient = useCallback(async (input: CreateConsultingClientInput) => {
    if (!canCreate || !supabaseUser) {
      return { error: 'Apenas perfis MX podem criar clientes da consultoria.' }
    }

    if (BLOCKED_NAMES.includes(input.name.trim().toUpperCase())) {
      return { error: 'Não é possível cadastrar o próprio sistema como cliente.' }
    }

    const payload = {
      name: input.name.trim(),
      legal_name: input.legal_name?.trim() || null,
      cnpj: input.cnpj?.trim() || null,
      product_name: input.product_name?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: supabaseUser.id,
    }

    const { data: newClient, error: insertError } = await supabase
      .from('clientes_consultoria')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) {
      return { error: insertError.message }
    }

    // Dispara criação da pasta no Drive (fire-and-forget)
    if (newClient?.id) {
      supabase.functions.invoke('google-drive-files', {
        body: { action: 'setup_client', clientId: newClient.id },
      }).catch(() => {})
    }

    // If modules were selected, insert them
    if (input.enabled_modules && input.enabled_modules.length > 0 && newClient) {
      const { DEFAULT_CONSULTING_MODULES } = await import('@/hooks/useConsultingModules')
      
      const moduleInserts = input.enabled_modules.map(moduleKey => {
        const defaults = DEFAULT_CONSULTING_MODULES.find(m => m.module_key === moduleKey)
        return {
          client_id: newClient.id,
          module_key: moduleKey,
          label: defaults?.label || moduleKey,
          premium: defaults?.premium || false,
          enabled: true,
          configured_by: supabaseUser.id,
        }
      })

      if (moduleInserts.length > 0) {
        await supabase.from('modulos_cliente_consultoria').insert(moduleInserts)
      }
    }

    await fetchClients()
    return { error: null }
  }, [canCreate, fetchClients, supabaseUser])

  const updateClient = useCallback(async (input: CreateConsultingClientInput): Promise<{ error: string | null }> => {
    if (!isPerfilInternoMx(role) || !supabaseUser || !input.id) {
      return { error: 'Apenas perfis MX podem editar clientes da consultoria.' }
    }
    if (!input.name.trim()) return { error: 'Nome do cliente é obrigatório.' }
    const { error: updateError } = await supabase
      .from('clientes_consultoria')
      .update({
        name: input.name.trim(),
        legal_name: input.legal_name?.trim() || null,
        cnpj: input.cnpj?.trim() || null,
        product_name: input.product_name?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .eq('id', input.id)
    if (updateError) return { error: updateError.message }
    await fetchClients()
    return { error: null }
  }, [fetchClients, role, supabaseUser])

  const archiveClient = useCallback(async (clientId: string): Promise<{ error: string | null }> => {
    if (!isPerfilInternoMx(role)) return { error: 'Sem permissão para excluir clientes.' }
    try {
      const { error: archiveError } = await supabase
        .from('clientes_consultoria')
        .update({ status: 'arquivado' })
        .eq('id', clientId)
      if (archiveError) return { error: archiveError.message }

      await fetchClients()
      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir cliente.' }
    }
  }, [role, fetchClients])

  const restoreClient = useCallback(async (clientId: string): Promise<{ error: string | null }> => {
    if (!isPerfilInternoMx(role)) return { error: 'Sem permissão para restaurar clientes.' }
    const { error: restoreError } = await supabase
      .from('clientes_consultoria')
      .update({ status: 'ativo' })
      .eq('id', clientId)
    if (restoreError) return { error: restoreError.message }
    await fetchClients()
    return { error: null }
  }, [fetchClients, role])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    const handlePlanningReload = () => { void fetchClients() }
    window.addEventListener('mx:planning-reload', handlePlanningReload)
    return () => window.removeEventListener('mx:planning-reload', handlePlanningReload)
  }, [fetchClients])

  return {
    clients,
    loading,
    error,
    canCreate,
    refetch: fetchClients,
    createClient,
    updateClient,
    archiveClient,
    restoreClient,
    deleteClient: archiveClient,
  }
}

export function useConsultingClientDetail(clientId?: string) {
  const { supabaseUser, role } = useAuth()
  const [client, setClient] = useState<ConsultingClientDetail | null>(null)
  const [assignableUsers, setAssignableUsers] = useState<ConsultingAssignableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canManage = isPerfilInternoMx(role)

  const fetchClient = useCallback(async () => {
    if (!supabaseUser || !clientId) {
      setClient(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [clientRes, unitsRes, contactsRes, assignmentsRes, visitsRes, financialsRes, modulesRes, usersRes] = await Promise.all([
      supabase.from('clientes_consultoria').select('*').eq('id', clientId).maybeSingle(),
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
    ])

    if (clientRes.error) {
      setError(clientRes.error.message)
      setClient(null)
      setLoading(false)
      return
    }

    const programRes = clientRes.data?.program_template_key
      ? await supabase
          .from('programas_visita_consultoria')
          .select('program_key,total_visits')
          .eq('program_key', clientRes.data.program_template_key)
          .maybeSingle()
      : { data: null }
    const journey = buildClientJourney({
      programKey: clientRes.data?.program_template_key,
      programTotal: programRes.data?.total_visits,
      visits: (visitsRes.data || []) as unknown as ConsultingVisit[],
    })

    const detail = clientRes.data
      ? {
          ...(clientRes.data as ConsultingClient),
          store_id: clientRes.data.store_id || null,
          units: parseConsultingClientUnitArray(unitsRes.data || []),
          contacts: parseConsultingClientContactArray(contactsRes.data || []),
          assignments: parseConsultingAssignmentArray(assignmentsRes.data || []),
          visits: ((visitsRes.data || []) as unknown as ConsultingVisit[])
            .filter(visit => isClientVisitInScope(visit.visit_number, journey.totalVisits)),
          journey_completed_visits: journey.completedVisits,
          journey_total_visits: journey.totalVisits,
          financials: parseConsultingFinancialArray(financialsRes.data || []),
          modules: parseConsultingClientModuleArray(modulesRes.data || []),
        } as ConsultingClientDetail
      : null

    setClient(detail)
    setAssignableUsers((usersRes.data || []) as ConsultingAssignableUser[])
    setLoading(false)
  }, [clientId, supabaseUser])

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

  useEffect(() => {
    fetchClient()
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
  }
}

export function useConsultingMethodology(programKey = 'pmr_7') {
  const normalizedProgramKey = programKey.trim()
  const [steps, setSteps] = useState<ConsultingMethodologyStep[]>([])
  const [program, setProgram] = useState<ConsultingVisitProgram | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSteps() {
      if (!normalizedProgramKey) {
        setSteps([])
        setProgram(null)
        setLoading(false)
        return
      }

      setLoading(true)
      const [programRes, templateRes] = await Promise.all([
        supabase.from('programas_visita_consultoria').select('*').eq('program_key', normalizedProgramKey).maybeSingle(),
        supabase
          .from('etapas_modelo_visita_consultoria')
          .select('*')
          .eq('program_key', normalizedProgramKey)
          .eq('active', true)
          .order('visit_number', { ascending: true }),
      ])

      if (programRes.data) {
        setProgram(parseConsultingVisitProgram(programRes.data))
      } else {
        setProgram(null)
      }

      if (templateRes.data && templateRes.data.length > 0) {
        setSteps(parseConsultingMethodologyStepArray(templateRes.data || []))
      } else if (normalizedProgramKey === 'pmr_7') {
        const { data } = await supabase
          .from('etapas_metodologia_consultoria')
          .select('*')
          .order('visit_number', { ascending: true })
        setSteps(parseConsultingMethodologyStepArray(data || []))
      } else {
        setSteps([])
      }
      setLoading(false)
    }
    fetchSteps()
  }, [normalizedProgramKey])

  return { steps, program, loading }
}

export function useConsultingClientMetrics() {
  const { clients, loading } = useConsultingClients()

  const metrics = useMemo(() => {
    const total = clients.length
    const active = clients.filter((client) => client.status === 'ativo').length
    const paused = clients.filter((client) => client.status !== 'ativo').length

    return { total, active, paused }
  }, [clients])

  return { metrics, loading }
}
