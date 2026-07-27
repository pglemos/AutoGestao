/**
 * useAuthProfile — fetches and maintains the operational profile + memberships.
 *
 * Story 2.9 / ADR-0052. Responsibilities:
 *  - Fetch `usuarios` row (profile)
 *  - Fetch `vinculos_loja` rows (active store memberships)
 *  - Trigger forced sign-out when the user has no valid role / inactive / no store
 *  - Maintain `activeStoreId` selection state
 */
import { useCallback, useEffect, useState, type MutableRefObject } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User as AppUser } from '@/types/database'
import { normalizeRole, isPerfilInternoMx } from '@/lib/auth/roles'
import { isTransientFetchError, PROFILE_SELECT, MEMBERSHIP_SELECT, writeSignoutReason } from './authHelpers'
import type { StoreMembership, StoreMembershipRow } from './authTypes'

export interface UseAuthProfileResult {
  profile: AppUser | null
  setProfile: React.Dispatch<React.SetStateAction<AppUser | null>>
  vinculos_loja: StoreMembership[]
  setMemberships: React.Dispatch<React.SetStateAction<StoreMembership[]>>
  activeStoreId: string | null
  setActiveStoreId: React.Dispatch<React.SetStateAction<string | null>>
  fetchProfile: (userId: string) => Promise<AppUser | null>
  fetchMemberships: (userId: string) => Promise<StoreMembership[]>
}

interface UseAuthProfileOptions {
  supabaseUser: SupabaseUser | null
  initialized: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  devBypassRef: MutableRefObject<boolean>
  lastLoadedUserIdRef: MutableRefObject<string | null>
  devProfile: AppUser | null
}

export function useAuthProfile(options: UseAuthProfileOptions): UseAuthProfileResult {
  const {
    supabaseUser,
    initialized,
    setLoading,
    devBypassRef,
    lastLoadedUserIdRef,
    devProfile,
  } = options

  const [profile, setProfile] = useState<AppUser | null>(null)
  const [vinculos_loja, setMemberships] = useState<StoreMembership[]>([])
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)

  // Mirror dev-bypass profile into the profile state so the rest of the
  // tree sees a consistent identity, exactly like the legacy bootstrap.
  useEffect(() => {
    if (devProfile) {
      setProfile(devProfile)
      setMemberships([])
      setActiveStoreId(null)
    }
  }, [devProfile])

  // IMPORTANTE: em erro de query (rede, timing de RLS/JWT logo após reload, timeout),
  // isto DEVE lançar em vez de devolver null/[] — devolver um valor "vazio" fazia o
  // chamador (loadUserData) confundir "erro transitório" com "perfil inválido / sem
  // loja", derrubando (signOut) uma sessão que continuava válida.
  const fetchProfile = useCallback(async (userId: string): Promise<AppUser | null> => {
    const { data, error } = await supabase
      .from('usuarios')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      if (!isTransientFetchError(error)) {
        console.error('Audit Error [useAuth]: fetchProfile fail ->', error.message)
      }
      throw error
    }
    setProfile((data as AppUser) || null)
    return (data as AppUser) || null
  }, [])

  const fetchMemberships = useCallback(async (userId: string): Promise<StoreMembership[]> => {
    const { data, error } = await supabase
      .from('vinculos_loja')
      .select(MEMBERSHIP_SELECT)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      if (!isTransientFetchError(error)) {
        console.error('Audit Error [useAuth]: fetchMemberships fail ->', error.message)
      }
      throw error
    }

    // Isolamento de Estado (Soft Delete): Lojas inativas não são exibidas na rede
    const result = ((data || []) as unknown as StoreMembershipRow[]).filter(
      (membership): membership is StoreMembership => Boolean(membership.store?.active),
    )

    setMemberships(result)
    setActiveStoreId(current => {
      if (current && result.some(m => m.store_id === current)) return current
      return result[0]?.store_id || null
    })
    return result
  }, [])

  // Reactive loader: runs whenever the session user changes.
  useEffect(() => {
    let mounted = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    async function loadUserData(userId: string) {
      if (devBypassRef.current) {
        setLoading(false)
        return
      }

      if (userId === lastLoadedUserIdRef.current && profile) {
        setLoading(false)
        return
      }

      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('[useAuth] Profile fetch taking longer than expected (>30s). Connection may be slow.')
        }
      }, 30000)

      try {
        let [loadedProfile, loadedMemberships] = await Promise.all([
          fetchProfile(userId),
          fetchMemberships(userId),
        ])

        const currentRole = loadedProfile ? normalizeRole(loadedProfile.role) : null

        if (!currentRole) {
          writeSignoutReason('no-profile')
          await supabase.auth.signOut()
          setProfile(null)
          setMemberships([])
          setActiveStoreId(null)
          return
        }

        if (loadedProfile?.active === false) {
          console.warn('[useAuth] inactive detected for', userId, loadedProfile?.email)
          const { data: reVerify } = await supabase
            .from('usuarios')
            .select('active, must_change_password')
            .eq('id', userId)
            .maybeSingle()
          if (reVerify?.active !== false) {
            console.error(
              '[useAuth] FALSE POSITIVE: active=false for',
              userId,
              loadedProfile?.email,
              're-verify shows',
              reVerify,
            )
            loadedProfile = { ...loadedProfile, active: true }
          } else {
            writeSignoutReason('inactive')
            await supabase.auth.signOut()
            setProfile(null)
            setMemberships([])
            setActiveStoreId(null)
            return
          }
        }

        // Ejeção Ativa (Sessões Existentes): perdeu a loja ativada enquanto logado
        if (
          currentRole !== 'dono' &&
          !isPerfilInternoMx(currentRole) &&
          loadedMemberships.length === 0
        ) {
          writeSignoutReason('no-store')
          await supabase.auth.signOut()
          setProfile(null)
          setMemberships([])
          return
        }

        if (!loadedMemberships.length && isPerfilInternoMx(currentRole)) setActiveStoreId(null)
        lastLoadedUserIdRef.current = userId
      } catch (err) {
        console.error('Audit Error [useAuth]: loadUserData fail ->', err)
      } finally {
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId)
          setLoading(false)
        }
      }
    }

    if (supabaseUser && !devBypassRef.current) {
      loadUserData(supabaseUser.id)
    } else if (initialized) {
      setLoading(false)
    }

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
    // Refs (devBypassRef, lastLoadedUserIdRef) are stable; including `profile`
    // would loop because the effect mutates it via fetchProfile.
  }, [supabaseUser, initialized, fetchProfile, fetchMemberships, setLoading])

  return {
    profile,
    setProfile,
    vinculos_loja,
    setMemberships,
    activeStoreId,
    setActiveStoreId,
    fetchProfile,
    fetchMemberships,
  }
}
