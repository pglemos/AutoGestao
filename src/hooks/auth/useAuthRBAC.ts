import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as AppUser, Store, UserRole } from '@/types/database'
import { normalizeRole, isPerfilInternoMx } from '@/lib/auth/roles'
import {
  ROLE_SIMULATION_STORAGE_KEY,
  MEMBERSHIP_SELECT,
  PROFILE_SELECT,
  clearSimulationStorage,
  pickSimulationStore,
  readSimulationRole,
  writeSimulationContext,
  type SimulationRole,
} from './authHelpers'
import type { StoreMembership, SimulationMembershipRow } from './authTypes'

interface UseAuthRBACOptions {
  profile: AppUser | null
  vinculos_loja: StoreMembership[]
  activeStoreId: string | null
  setActiveStoreId: React.Dispatch<React.SetStateAction<string | null>>
  loading: boolean
}

export interface UseAuthRBACResult {
  baseRole: UserRole | null
  baseMembership: StoreMembership | null
  canSimulate: boolean
  simulationRole: SimulationRole | null
  simulationProfile: AppUser | null
  simulationMemberships: StoreMembership[]
  simulationLoading: boolean
  isSimulating: boolean
  effectiveRole: UserRole | null
  effectiveProfile: AppUser | null
  effectiveMemberships: StoreMembership[]
  effectiveMembership: StoreMembership | null
  effectiveStoreId: string | null
  startSimulation: (role: SimulationRole) => void
  stopSimulation: () => void
}

export function useAuthRBAC(options: UseAuthRBACOptions): UseAuthRBACResult {
  const { profile, vinculos_loja, activeStoreId, setActiveStoreId, loading } = options
  const [simulationRole, setSimulationRole] = useState<SimulationRole | null>(() => readSimulationRole())
  const [simulationProfile, setSimulationProfile] = useState<AppUser | null>(null)
  const [simulationMemberships, setSimulationMemberships] = useState<StoreMembership[]>([])
  const [simulationLoading, setSimulationLoading] = useState(false)

  const baseRole = profile ? normalizeRole(profile.role) : null
  const baseMembership = vinculos_loja.find(membership => membership.store_id === activeStoreId) || vinculos_loja[0] || null
  const canSimulate = isPerfilInternoMx(baseRole)

  const stopSimulation = useCallback(() => {
    clearSimulationStorage()
    setSimulationRole(null)
    setSimulationProfile(null)
    setSimulationMemberships([])
    setSimulationLoading(false)
  }, [])

  const startSimulation = useCallback((role: SimulationRole) => {
    if (!canSimulate) return
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ROLE_SIMULATION_STORAGE_KEY, role)
      writeSimulationContext(null)
    }
    setSimulationRole(role)
    setSimulationLoading(true)
  }, [canSimulate])

  useEffect(() => {
    let mounted = true
    async function loadSimulationIdentity(role: SimulationRole) {
      if (!canSimulate) {
        if (!profile && loading) return
        stopSimulation()
        return
      }
      setSimulationLoading(true)
      try {
        const { data: stores, error: storesError } = await supabase
          .from('lojas')
          .select('id, name, manager_email, legal_name, cnpj, address, administrative_phone, partners, active, source_mode, created_at, updated_at')
          .eq('active', true)
        if (storesError) throw storesError
        const store = pickSimulationStore((stores || []) as Store[], activeStoreId || baseMembership?.store_id)
        if (!store) throw new Error('Selecione uma loja ativa antes de iniciar a simulação.')

        const { data: memberships, error: membershipError } = await supabase
          .from('vinculos_loja')
          .select(`${MEMBERSHIP_SELECT}, users:usuarios(${PROFILE_SELECT})`)
          .eq('store_id', store.id)
          .eq('role', role)
          .eq('is_active', true)
        if (membershipError) throw membershipError

        const rows = (memberships || []) as unknown as SimulationMembershipRow[]
        const selected = rows.find(row => row.users?.active && (role !== 'vendedor' || !row.users.is_venda_loja)) || rows.find(row => row.users?.active)
        if (!selected?.users) throw new Error(`Nenhum usuário ativo encontrado para simular o perfil ${role} na loja ${store.name}.`)

        const user = { ...selected.users, role, store_id: store.id }
        const membership: StoreMembership = {
          id: selected.id,
          user_id: user.id,
          store_id: store.id,
          role,
          created_at: selected.created_at,
          store: selected.store || store,
        }
        if (!mounted) return
        setSimulationProfile(user)
        setSimulationMemberships([membership])
        writeSimulationContext({
          role,
          sellerUserId: user.id,
          storeId: store.id,
          realRole: baseRole || undefined,
          startedAt: new Date().toISOString(),
        })
        setActiveStoreId(store.id)
      } catch (error) {
        if (import.meta.env.DEV) console.error('Audit Error [useAuth]: simulation identity fail ->', error)
        if (mounted) stopSimulation()
      } finally {
        if (mounted) setSimulationLoading(false)
      }
    }

    if (!simulationRole) {
      setSimulationProfile(null)
      setSimulationMemberships([])
      setSimulationLoading(false)
      return () => { mounted = false }
    }
    void loadSimulationIdentity(simulationRole)
    return () => { mounted = false }
  }, [activeStoreId, baseMembership?.store_id, baseRole, canSimulate, loading, profile, setActiveStoreId, simulationRole, stopSimulation])

  const isSimulating = Boolean(canSimulate && simulationRole && simulationProfile)
  const effectiveProfile = isSimulating ? simulationProfile : profile
  const effectiveMemberships = isSimulating ? simulationMemberships : vinculos_loja
  const effectiveRole = isSimulating ? simulationRole : baseRole
  const effectiveMembership = effectiveMemberships.find(membership => membership.store_id === activeStoreId) || effectiveMemberships[0] || null
  const effectiveStoreId = activeStoreId || effectiveMembership?.store_id || (!isPerfilInternoMx(effectiveRole) ? effectiveProfile?.store_id : null) || null

  return {
    baseRole,
    baseMembership,
    canSimulate,
    simulationRole,
    simulationProfile,
    simulationMemberships,
    simulationLoading,
    isSimulating,
    effectiveRole,
    effectiveProfile,
    effectiveMemberships,
    effectiveMembership,
    effectiveStoreId,
    startSimulation,
    stopSimulation,
  }
}
