// Shim do AuthContext do export Base44 sobre o useAuth real do MX.
// Mantém o shape { user, logout } esperado pelos componentes portados.
import { useMemo } from 'react'
import { useAuth as useMxAuth } from '@/hooks/useAuth'

export function useAuth() {
  const { profile, role, signOut, activeStoreId, setActiveStoreId } = useMxAuth()

  const user = useMemo(() => {
    if (!profile) return null
    return {
      id: profile.id,
      email: profile.email || '',
      full_name: profile.name || 'Nome não informado',
      role: role === 'admin' ? 'admin' : role,
    }
  }, [profile, role])

  return { user, logout: signOut, activeStoreId, setActiveStoreId }
}
