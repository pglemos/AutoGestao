import { Suspense, lazy } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Layout from './Layout'

const OwnerShell = lazy(() => import('@/features/owner-base44/OwnerShell'))

/**
 * Moldura das rotas autenticadas.
 *
 * Todas as telas vivem no mesmo roteador, sem prefixo por perfil: o Dono
 * recebe o shell do módulo executivo (sidebar + topbar com filtros) e os
 * demais perfis recebem o shell universal. Quem decide é o login.
 */
export default function AppShell() {
  const { role } = useAuth()

  if (role === 'dono') {
    return (
      <Suspense fallback={<div className="h-screen w-full bg-mxsb-surface" />}>
        <OwnerShell />
      </Suspense>
    )
  }

  return <Layout />
}
