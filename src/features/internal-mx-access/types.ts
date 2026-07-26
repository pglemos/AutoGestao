export type InternalMxAccessMode = 'hidden' | 'read' | 'manage'

export type InternalMxResource =
  | 'network'
  | 'store'
  | 'strategic-plan'
  | 'action-plan'
  | 'consulting-client'
  | 'consulting-visit'
  | 'agenda'
  | 'notification'
  | 'profile'
  | 'report'
  | 'diagnostic'
  | 'simulation'
  | 'reprocessing'

export type InternalMxAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'execute'
  | 'simulate'

export type InternalMxActionInput = {
  role: string | null | undefined
  resource: InternalMxResource
  action: InternalMxAction
  ownsScope?: boolean
}
