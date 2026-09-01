import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSafeUserFacingDataError } from '@/lib/errors/user-facing-error'
import { archiveBranchClients } from './lifecycleMutations'
import { branchClientsToArchive, clientStoreIds, excludeBranchClients, type PortfolioClient } from './clientPortfolio'
import { buildClientJourney } from './clientJourney'
import { isVinculoActive, personIdentityKey } from './mergeClientPeople'

type State = { rows: PortfolioClient[]; loading: boolean; error: string | null; lastUpdatedAt: Date | null; refetch: () => Promise<void> }

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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

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
        setLastUpdatedAt(new Date())
        return
      }

      const [units, visits, modules, assignments, access, owners, programs, lojas] = await Promise.all([
        supabase.from('unidades_cliente_consultoria').select('client_id, is_primary, city, store_id').in('client_id', ids),
        supabase.from('visitas_consultoria').select('client_id, visit_number, status').in('client_id', ids),
        supabase.from('modulos_cliente_consultoria').select('client_id, enabled').in('client_id', ids),
        supabase.from('atribuicoes_consultoria').select('client_id, user_id, assignment_role, active').in('client_id', ids),
        supabase.from('acessos_cliente_consultoria').select('client_id, status, nome, email, is_dono_master').in('client_id', ids),
        supabase.from('usuarios').select('id, name, email, active'),
        supabase.from('programas_visita_consultoria').select('program_key, total_visits'),
        supabase.from('lojas').select('id, parent_loja_id'),
      ])
      const relatedQueryError = [units, visits, modules, assignments, access, owners, programs, lojas]
        .map(result => result.error)
        .find(Boolean)
      if (relatedQueryError) throw new Error(relatedQueryError.message)

      const primaryUnitCity = new Map<string, string>()
      for (const row of (units.data ?? [])) {
        if (row.is_primary && row.city && !primaryUnitCity.has(row.client_id)) {
          primaryUnitCity.set(row.client_id, row.city)
        }
      }
      // Dono Master é designação da consultoria e só existe em acessos. Um
      // `role = 'dono'` em vinculos_loja diz quem é dono da loja, não quem
      // responde pela conta — inferir daí promoveria alguém em silêncio.
      const masterClients = new Set<string>()
      const primaryContact = new Map<string, string>()
      for (const row of (access.data ?? [])) {
        if (String(row.status ?? 'ativo') === 'inativo') continue
        if (row.is_dono_master) masterClients.add(row.client_id)
        if (row.nome) {
          if (!primaryContact.has(row.client_id) || row.is_dono_master) {
            primaryContact.set(row.client_id, row.nome)
          }
        }
      }
      const moduleCount = countBy((modules.data ?? []).filter(row => row.enabled !== false), row => row.client_id)
      const assignmentCount = countBy((assignments.data ?? []).filter(row => row.active !== false), row => row.client_id)
      const ownersById = new Map((owners.data ?? []).map(row => [row.id, row]))

      // "Pessoas" precisa contar quem existe de fato: o cadastro da consultoria
      // mais a equipe com vínculo ativo nas lojas do cliente. Contar só acessos
      // mostrava zero em clientes que já operam no app. A contagem é distinta
      // por e-mail para quem tem vínculo em matriz e filial não valer por dois.
      const unitsByClient = new Map<string, Array<{ store_id?: string | null }>>()
      for (const row of (units.data ?? [])) {
        const list = unitsByClient.get(row.client_id) ?? []
        list.push(row)
        unitsByClient.set(row.client_id, list)
      }
      const storeIdsByClient = new Map<string, string[]>()
      const allStoreIds = new Set<string>()
      for (const client of (clients ?? [])) {
        const storeIds = clientStoreIds(client, lojas.data ?? [], unitsByClient.get(client.id) ?? [])
        storeIdsByClient.set(client.id, storeIds)
        for (const storeId of storeIds) allStoreIds.add(storeId)
      }

      const vinculos = allStoreIds.size
        ? await supabase
          .from('vinculos_loja')
          .select('user_id, store_id, is_active, ended_at')
          .in('store_id', [...allStoreIds])
        : { data: [], error: null }
      if (vinculos.error) throw new Error(vinculos.error.message)

      const usuarioById = new Map((owners.data ?? []).map(row => [row.id, row]))
      const peopleByStore = new Map<string, Set<string>>()
      for (const row of (vinculos.data ?? [])) {
        if (!isVinculoActive(row)) continue
        const usuario = usuarioById.get(row.user_id)
        if (usuario?.active === false) continue
        const key = personIdentityKey({ email: usuario?.email, user_id: row.user_id })
        if (!key) continue
        const set = peopleByStore.get(row.store_id) ?? new Set<string>()
        set.add(key)
        peopleByStore.set(row.store_id, set)
      }

      const accessByClient = new Map<string, Set<string>>()
      for (const row of (access.data ?? [])) {
        if (String(row.status ?? 'ativo') === 'inativo') continue
        const key = personIdentityKey({ email: row.email })
        if (!key) continue
        const set = accessByClient.get(row.client_id) ?? new Set<string>()
        set.add(key)
        accessByClient.set(row.client_id, set)
      }

      const userCount = new Map<string, number>()
      for (const client of (clients ?? [])) {
        const people = new Set(accessByClient.get(client.id) ?? [])
        for (const storeId of storeIdsByClient.get(client.id) ?? []) {
          for (const key of peopleByStore.get(storeId) ?? []) people.add(key)
        }
        userCount.set(client.id, people.size)
      }
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

      const mapped = (clients ?? []).map(client => {
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
        implementation_owner_name: ownerId ? ownersById.get(ownerId)?.name ?? null : null,
        implementation_owner_email: ownerId ? ownersById.get(ownerId)?.email ?? null : null,
        primary_store_city: primaryUnitCity.get(client.id) ?? null,
        main_contact_name: primaryContact.get(client.id) ?? null,
        hasDonoMaster: masterClients.has(client.id),
        units: storeIdsByClient.get(client.id)?.length ?? 0,
        users: userCount.get(client.id) ?? 0,
        visitsDone: journey.completedVisits,
        visitsTotal: journey.totalVisits,
        modulesEnabled: moduleCount.get(client.id) ?? 0,
        assignments: assignmentCount.get(client.id) ?? 0,
        }
      }) as PortfolioClient[]
      const lojaRows = lojas.data ?? []
      const toArchive = branchClientsToArchive(mapped, lojaRows)
      if (toArchive.length) {
        const archived = await archiveBranchClients(toArchive.map(client => client.id))
        if (archived.error) throw new Error(archived.error)
      }
      setRows(excludeBranchClients(mapped, lojaRows))
      setLastUpdatedAt(new Date())
    } catch (cause) {
      setError(getSafeUserFacingDataError(cause, 'Não foi possível carregar a carteira de clientes.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  return { rows, loading, error, lastUpdatedAt, refetch }
}
