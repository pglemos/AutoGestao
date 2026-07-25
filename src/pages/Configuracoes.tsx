import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ConfiguracoesShell } from '@/features/configuracoes/components/ConfiguracoesShell'
import type { ConfigTabKey } from '@/features/configuracoes/types'

interface ConfiguracoesProps {
  initialTab?: ConfigTabKey
}

export default function Configuracoes({ initialTab }: ConfiguracoesProps) {
  const { role, profile, signOut } = useAuth()
  if (!role) return <Navigate to="/home" replace />
  return (
    <ConfiguracoesShell
      role={role}
      profileEmail={profile?.email}
      initialTab={initialTab}
      onSignOut={signOut}
    />
  )
}
