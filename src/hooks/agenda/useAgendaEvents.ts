import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { isAdminMasterMxProfile } from '@/lib/agenda/admin-master'
import type {
  AgendaClient,
  AgendaConsultant,
  GoogleMeetArtifact,
  AgendaProduct,
  AgendaScheduleEvent,
  AgendaVisit,
  VisitCalendarRow,
} from './types'

export type UseAgendaEventsReturn = {
  visits: AgendaVisit[]
  scheduleEvents: AgendaScheduleEvent[]
  clients: AgendaClient[]
  consultants: AgendaConsultant[]
  products: AgendaProduct[]
  /** `program_key` → total de visitas contratadas. Governa o intervalo válido de `visit_number`. */
  programTotalVisits: Record<string, number>
  loading: boolean
  error: string | null
  canViewAllAgendas: boolean
  refetch: () => Promise<void>
}

/**
 * Fetches visits, schedule events, clients, consultants and products from Supabase.
 * Owns the source-of-truth state for agenda data.
 */
export function useAgendaEvents(): UseAgendaEventsReturn {
  const { supabaseUser, role, profile } = useAuth()
  const canViewAllAgendas = isAdminMasterMxProfile(profile, import.meta.env.VITE_MX_ADMIN_MASTER_EMAILS)

  const [visits, setVisits] = useState<AgendaVisit[]>([])
  const [scheduleEvents, setScheduleEvents] = useState<AgendaScheduleEvent[]>([])
  const [clients, setClients] = useState<AgendaClient[]>([])
  const [consultants, setConsultants] = useState<AgendaConsultant[]>([])
  const [products, setProducts] = useState<AgendaProduct[]>([])
  const [programTotalVisits, setProgramTotalVisits] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!supabaseUser || !isPerfilInternoMx(role)) {
      setVisits([])
      setScheduleEvents([])
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let visitsQuery = supabase
      .from('visitas_consultoria')
      .select(`
          *,
          consultant:usuarios!visitas_consultoria_consultor_id_fkey(name, email),
          auxiliary_consultant:usuarios!visitas_consultoria_consultor_auxiliar_id_fkey(name, email),
          client:clientes_consultoria!client_id(name, slug, status, modality)
        `)
      .gte('visit_number', 1)
      .order('scheduled_at', { ascending: true })

    let eventsQuery = supabase
      .from('eventos_agenda_consultoria')
      .select('*, responsible:usuarios!eventos_agenda_consultoria_responsavel_usuario_id_fkey(name, email)')
      .order('starts_at', { ascending: true })

    if (!canViewAllAgendas) {
      visitsQuery = visitsQuery.or(`consultant_id.eq.${supabaseUser.id},auxiliary_consultant_id.eq.${supabaseUser.id}`)
      eventsQuery = eventsQuery.or(`responsible_user_id.eq.${supabaseUser.id},and(responsible_user_id.is.null,created_by.eq.${supabaseUser.id})`)
    }

    const [visitsRes, eventsRes, clientsRes, storesRes, usersRes, productsRes, programsRes] = await Promise.all([
      visitsQuery,
      eventsQuery,
      supabase
        .from('clientes_consultoria')
        .select('id, name, slug, status, current_visit_step, primary_store_id, program_template_key')
        .order('name', { ascending: true }),
      supabase
        .from('lojas')
        .select('id, name, active')
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('usuarios')
        .select('id, name, email')
        .in('role', ['administrador_geral', 'administrador_mx', 'consultor_mx'])
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('produtos_digitais')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('programas_visita_consultoria')
        .select('program_key, total_visits'),
    ])

    // Governa o intervalo válido de `visit_number` por programa contratado —
    // sem isto, todo cliente ficava travado no limite do PMR de 7 visitas,
    // mesmo os 51 dos 52 clientes ativos que contrataram PMR de 9 ou 12.
    if (programsRes.error) {
      setError((current) => current || programsRes.error.message)
      setProgramTotalVisits({})
    } else {
      const totals: Record<string, number> = {}
      for (const row of programsRes.data ?? []) {
        if (row.program_key && typeof row.total_visits === 'number') totals[row.program_key] = row.total_visits
      }
      setProgramTotalVisits(totals)
    }

    let mappedVisits: AgendaVisit[] = []
    let mappedEvents: AgendaScheduleEvent[] = []

    if (visitsRes.error) {
      setError(visitsRes.error.message)
      setVisits([])
    } else {
      const visitRows = (visitsRes.data || []) as VisitCalendarRow[]
      mappedVisits = visitRows.map((v): AgendaVisit => ({
        ...v,
        client_name: v.client?.name || 'Desconhecido',
        client_slug: v.client?.slug || v.client_id || 'cliente',
        client_status: v.client?.status || 'ativo',
        client_modality: v.client?.modality || null,
      }))
    }

    if (eventsRes.error) {
      setError((current) => current || eventsRes.error.message)
      setScheduleEvents([])
    } else {
      mappedEvents = (eventsRes.data || []) as AgendaScheduleEvent[]
    }

    const sourceIds = [...mappedVisits.map((visit) => visit.id), ...mappedEvents.map((event) => event.id)]
    if (sourceIds.length > 0) {
      const { data: meetArtifacts } = await supabase
        .from('reunioes_google_meet_atas')
        .select(`
          id,
          source_kind,
          source_id,
          title,
          meeting_code,
          google_meet_link,
          transcript_state,
          transcript_text,
          ata_text,
          status,
          error_message,
          processed_at,
          updated_at
        `)
        .in('source_id', sourceIds)

      const artifactsBySource = new Map(
        ((meetArtifacts || []) as GoogleMeetArtifact[]).map((artifact) => [`${artifact.source_kind}:${artifact.source_id}`, artifact]),
      )

      mappedVisits = mappedVisits.map((visit) => ({
        ...visit,
        meet_artifact: artifactsBySource.get(`visit:${visit.id}`) ?? null,
      }))
      mappedEvents = mappedEvents.map((event) => ({
        ...event,
        meet_artifact: artifactsBySource.get(`schedule_event:${event.id}`) ?? null,
      }))
    }

    setVisits(mappedVisits)
    setScheduleEvents(mappedEvents)

    const rawClients = (clientsRes.data || []) as (AgendaClient & { primary_store_id?: string | null })[]
    const existingPrimaryStoreIds = new Set(rawClients.map((c) => c.primary_store_id).filter(Boolean))
    const existingClientIds = new Set(rawClients.map((c) => c.id))
    const existingNames = new Set(rawClients.map((c) => c.name.toLowerCase().trim()))

    const fallbackStoreClients: AgendaClient[] = []
    if (storesRes.data) {
      for (const store of storesRes.data) {
        const isAlreadyPresent =
          existingClientIds.has(store.id) ||
          existingPrimaryStoreIds.has(store.id) ||
          existingNames.has(store.name.toLowerCase().trim())

        if (!isAlreadyPresent) {
          fallbackStoreClients.push({
            id: store.id,
            name: store.name,
            status: 'ativo',
            current_visit_step: 0,
            primary_store_id: store.id,
            program_template_key: null,
          })
        }
      }
    }

    const allSelectableClients = [...rawClients, ...fallbackStoreClients].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    )
    setClients(allSelectableClients)
    const loadedConsultants = (usersRes.data || []) as AgendaConsultant[]
    setConsultants(canViewAllAgendas
      ? loadedConsultants
      : loadedConsultants.filter((consultant) => consultant.id === supabaseUser.id))

    if (productsRes.error) {
      setProducts([])
    } else {
      setProducts(((productsRes.data || []) as AgendaProduct[])
        .filter((product) => !product.status || product.status === 'ativo')
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    }
    setLoading(false)
  }, [supabaseUser, role, canViewAllAgendas])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    visits,
    scheduleEvents,
    clients,
    consultants,
    products,
    programTotalVisits,
    loading,
    error,
    canViewAllAgendas,
    refetch,
  }
}
