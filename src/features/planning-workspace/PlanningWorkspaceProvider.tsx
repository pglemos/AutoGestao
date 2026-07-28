import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'
import { resolvePlanningCapabilities } from './planningCapabilities'
import type { PlanningActor, PlanningShell, PlanningWorkspaceValue } from './planningWorkspace.types'

const PlanningWorkspaceContext = createContext<PlanningWorkspaceValue | null>(null)

export function PlanningWorkspaceProvider({
  shell,
  storeId,
  actor,
  children,
}: PropsWithChildren<{
  shell: PlanningShell
  storeId: string | null
  actor: PlanningActor
}>) {
  const capabilities = resolvePlanningCapabilities(actor.role)
  const value = useMemo<PlanningWorkspaceValue>(
    () => ({ shell, storeId, actor, capabilities }),
    [actor, capabilities, shell, storeId],
  )

  return <PlanningWorkspaceContext.Provider value={value}>{children}</PlanningWorkspaceContext.Provider>
}

export function usePlanningWorkspace(): PlanningWorkspaceValue {
  const value = useContext(PlanningWorkspaceContext)
  if (!value) throw new Error('usePlanningWorkspace must be used inside PlanningWorkspaceProvider')
  return value
}
