// Contexto de compatibilidade do módulo Dono sobre a sessão canônica do MX.
// O shape estável evita que componentes portados conheçam o contrato interno
// de autenticação e mantém a migração de dados separada da UI.
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
      role: role === 'administrador_geral' || role === 'administrador_mx' ? 'admin' : role,
    }
  }, [profile, role])

  return { user, logout: signOut, activeStoreId, setActiveStoreId }
}
