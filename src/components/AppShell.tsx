import { Suspense, lazy } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppShellFrame } from '@/design-system/shell/AppShellFrame'
import Layout from './Layout'

const OwnerShell = lazy(() => import('@/features/owner-base44/OwnerShell'))

/**
 * Moldura das rotas autenticadas.
 *
 * Todas as telas vivem no mesmo roteador, sem prefixo por perfil: o Dono
 * recebe o shell do módulo executivo (sidebar + topbar com filtros) e os
 * demais perfis recebem o shell universal. Quem decide é o login.
 *
 * `AppShellFrame` envolve os dois: é ele que aplica o escopo de tokens do
 * Design System, a densidade do perfil, o skip-link e o foco ao trocar de
 * rota — comportamentos que precisam valer para todo o produto, não por shell.
 */
export default function AppShell() {
  const { role } = useAuth()

  return (
    <AppShellFrame role={role}>
      {role === 'dono' ? (
        <Suspense fallback={<div className="h-screen w-full bg-mxsb-surface" />}>
          <OwnerShell />
        </Suspense>
      ) : (
        <Layout />
      )}
    </AppShellFrame>
  )
}
