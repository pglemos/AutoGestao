import { Navigate, useLocation } from 'react-router-dom'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { AppShellFrame } from '@/design-system/shell/AppShellFrame'
import { resolveInternalMxCanonicalRoute } from '@/lib/navigation/internalMxCanonicalRoutes'
import Layout from './Layout'

/**
 * Moldura das rotas autenticadas.
 *
 * Todos os perfis usam a mesma estrutura de sidebar, drawer, landmark e
 * conteúdo. O perfil altera somente configuração, navegação e providers de
 * domínio dentro de `Layout`.
 */
export default function AppShell() {
  const { role } = useAuth()
  const location = useLocation()
  const viewAs = new URLSearchParams(location.search).get('viewAs')
  const viewAsDono = viewAs === 'dono' || viewAs === 'owner'
  const frameRole = viewAsDono ? 'dono' : role

  if (isPerfilInternoMx(role) && !viewAsDono) {
    const canonicalRoute = resolveInternalMxCanonicalRoute(location.pathname, location.search)
    if (canonicalRoute) return <Navigate to={canonicalRoute} replace />
  }

  return (
    <AppShellFrame role={frameRole}>
      <Layout />
    </AppShellFrame>
  )
}
