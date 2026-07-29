import { useAuth } from '@/hooks/useAuth'
import { AppShellFrame } from '@/design-system/shell/AppShellFrame'
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

  return (
    <AppShellFrame role={role}>
      <Layout />
    </AppShellFrame>
  )
}
