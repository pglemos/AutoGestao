import { useOutletContext } from 'react-router-dom'
import { useOwner } from '@/components/owner/OwnerContext'
import { useAuth } from '@/lib/owner-b44/AuthContext'
import { PlanningWorkspaceProvider } from '@/features/planning-workspace'
import { resolveOwnerPlanningStoreId, toOwnerPlanningActor } from '@/components/owner/ownerPlanningAdapter'
import { StrategicPlanWorkspace } from '@/features/strategic-plan/StrategicPlanWorkspace'

export default function PlanoEstrategico() {
  const { setLastUpdated } = useOutletContext() || {}
  const { currentUnits, unitId } = useOwner()
  const { user } = useAuth()
  const storeId = resolveOwnerPlanningStoreId(unitId, currentUnits)

  if (!user) {
    return <div className="rounded-xl border border-destructive/30 bg-card p-6 text-sm text-muted-foreground">Sessão do Dono indisponível.</div>
  }

  const actor = toOwnerPlanningActor(user)
  return (
    <PlanningWorkspaceProvider shell="owner" storeId={storeId} actor={actor}>
      <StrategicPlanWorkspace onUpdated={(at) => setLastUpdated?.(at)} />
    </PlanningWorkspaceProvider>
  )
}
