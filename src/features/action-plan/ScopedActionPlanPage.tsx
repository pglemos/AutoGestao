import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { PlanningWorkspaceProvider } from '@/features/planning-workspace'
import type { PlanningActor, PlanningRole } from '@/features/planning-workspace/planningWorkspace.types'
import { useAuth } from '@/hooks/useAuth'
import { ActionPlanWorkspace } from './ActionPlanWorkspace'

const SCOPED_ROLES = new Set<PlanningRole>(['dono', 'gerente', 'vendedor'])

export default function ScopedActionPlanPage() {
  const { profile, role, storeId, activeStoreId } = useAuth()
  const planningRole = role as PlanningRole | null

  if (!profile || !planningRole || !SCOPED_ROLES.has(planningRole)) {
    return <MxStatusBanner tone="danger">Perfil sem acesso ao Plano de Ação.</MxStatusBanner>
  }

  const email = profile.email?.trim() || null
  const actor: PlanningActor = {
    id: profile.id,
    name: profile.name?.trim() || email || profile.id,
    email,
    role: planningRole,
  }

  return (
    <PlanningWorkspaceProvider
      shell="internal"
      storeId={storeId || activeStoreId || null}
      actor={actor}
    >
      <ActionPlanWorkspace />
    </PlanningWorkspaceProvider>
  )
}
