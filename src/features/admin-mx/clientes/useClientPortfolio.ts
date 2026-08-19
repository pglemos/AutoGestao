import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PortfolioClient } from './clientPortfolio'
import { buildClientJourney } from './clientJourney'

type State = { rows: PortfolioClient[]; loading: boolean; error: string | null; refetch: () => Promise<void> }

function countBy<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const counters = new Map<string, number>()
  for (const row of rows) {
    const id = key(row)
    if (!id) continue
    counters.set(id, (counters.get(id) ?? 0) + 1)
  }
  return counters
}

/**
 * Carteira administrativa: o cliente e os agregados que a equipe usa para
 * decidir o dia — estrutura, jornada, pessoas, módulos e responsável.
 */
export function useClientPortfolio(): State {
  const [rows, setRows] = useState<PortfolioClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: clients, error: clientsError } = await supabase
        .from('clientes_consultoria')
        .select('id, name, slug, cnpj, status, business_phase, product_name, program_template_key, structure_type, primary_store_id, implementation_owner_id, contract_end_date, onboarding_step, onboarding_completed, suspended_at, suspended_reason, activated_at, scheduled_activation_at')
        .neq('status', 'arquivado')
        .order('name', { ascending: true })
      if (clientsError) throw new Error(clientsError.message)

      const ids = (clients ?? []).map(client => client.id)
      if (!ids.length) {
        setRows([])
        return
      }

      const [units, visits, modules, assignments, access, owners, programs] = await Promise.all([
        supabase.from('unidades_cliente_consultoria').select('client_id, is_primary, city').in('client_id', ids),
        supabase.from('visitas_consultoria').select('client_id, visit_number, status').in('client_id', ids),
        supabase.from('modulos_cliente_consultoria').select('client_id, enabled').in('client_id', ids),
        supabase.from('atribuicoes_consultoria').select('client_id, user_id, assignment_role, active').in('client_id', ids),
        supabase.from('acessos_cliente_consultoria').select('client_id, status, nome, is_dono_master').in('client_id', ids),
        supabase.from('usuarios').select('id, name'),
        supabase.from('programas_visita_consultoria').select('program_key, total_visits'),
      ])

      const unitCount = countBy(units.data ?? [], row => row.client_id)
      const primaryUnitCity = new Map<string, string>()
      for (const row of (units.data ?? [])) {
        if (row.is_primary && row.city && !primaryUnitCity.has(row.client_id)) {
          primaryUnitCity.set(row.client_id, row.city)
        }
      }
      const primaryContact = new Map<string, string>()
      for (const row of (access.data ?? [])) {
        if (String(row.status ?? 'ativo') !== 'inativo' && row.nome) {
          if (!primaryContact.has(row.client_id) || row.is_dono_master) {
            primaryContact.set(row.client_id, row.nome)
          }
        }
      }
      const moduleCount = countBy((modules.data ?? []).filter(row => row.enabled !== false), row => row.client_id)
      const assignmentCount = countBy((assignments.data ?? []).filter(row => row.active !== false), row => row.client_id)
      const userCount = countBy((access.data ?? []).filter(row => String(row.status ?? 'ativo') !== 'inativo'), row => row.client_id)
      const ownerNames = new Map((owners.data ?? []).map(row => [row.id, row.name]))
      // Quem responde pelo cliente é o consultor com atribuição de responsável.
      // `implementation_owner_id` só está preenchido numa minoria dos clientes e
      // fica como segunda opção: sem isto a carteira dizia "Não atribuído" para
      // quase todo mundo, mesmo com atribuição ativa registrada.
      const responsibleId = new Map<string, string>()
      for (const row of (assignments.data ?? [])) {
        if (row.active === false || row.assignment_role !== 'responsavel' || !row.user_id) continue
        if (!responsibleId.has(row.client_id)) responsibleId.set(row.client_id, row.user_id)
      }
      const programTotals = new Map((programs.data ?? []).map(row => [row.program_key, row.total_visits]))

      setRows((clients ?? []).map(client => {
        const ownerId = responsibleId.get(client.id) ?? client.implementation_owner_id
        const journey = buildClientJourney({
          programKey: client.program_template_key,
          programTotal: programTotals.get(client.program_template_key ?? ''),
          visits: (visits.data ?? []).filter(visit => visit.client_id === client.id),
        })
        return {
        ...client,
        // O id acompanha o nome para o filtro por responsável continuar casando
        // com a coluna, e para dois consultores homônimos não colapsarem em um.
        implementation_owner_id: ownerId,
        implementation_owner_name: ownerId ? ownerNames.get(ownerId) ?? null : null,
        primary_store_city: primaryUnitCity.get(client.id) ?? null,
        main_contact_name: primaryContact.get(client.id) ?? null,
        units: unitCount.get(client.id) ?? 0,
        users: userCount.get(client.id) ?? 0,
        visitsDone: journey.completedVisits,
        visitsTotal: journey.totalVisits,
        modulesEnabled: moduleCount.get(client.id) ?? 0,
        assignments: assignmentCount.get(client.id) ?? 0,
        }
      }) as PortfolioClient[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a carteira de clientes.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  return { rows, loading, error, refetch }
}
