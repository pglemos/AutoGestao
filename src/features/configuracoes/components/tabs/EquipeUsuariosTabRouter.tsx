import { useAuth } from '@/hooks/useAuth'
import { isPerfilInternoMx } from '@/lib/auth/roles'
import type { TabContext } from '@/features/configuracoes/types'
import { EquipeUsuariosTab } from './EquipeUsuariosTab'
import { InternalMxUsersTab } from './InternalMxUsersTab'

export function EquipeUsuariosTabRouter(context: TabContext) {
  const { role } = useAuth()
  if (isPerfilInternoMx(role)) return <InternalMxUsersTab />
  return <EquipeUsuariosTab {...context} />
}

export default EquipeUsuariosTabRouter
