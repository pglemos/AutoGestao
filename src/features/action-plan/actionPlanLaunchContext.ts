export type ActionPlanInitialValues = {
  title?: string
  description?: string
  problemOrOpportunity?: string
  strategicObjective?: string
  department?: string
  indicator?: string
  priority?: string
  dueDate?: string
  origin?: string
  evidenceRequired?: boolean
}

export type ActionPlanLaunchContext = {
  autoOpen: boolean
  initialValues: ActionPlanInitialValues
}

const LAUNCH_KEYS = [
  'createAction', 'origin', 'visitId', 'indicator', 'title', 'description',
  'problemOrOpportunity', 'strategicObjective', 'department', 'priority',
  'dueDate', 'evidenceRequired',
] as const

function text(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)?.trim()
  return value || undefined
}

export function readActionPlanLaunchContext(search: string): ActionPlanLaunchContext {
  const params = new URLSearchParams(search)
  const autoOpen = params.get('createAction') === '1'
  const origin = text(params, 'origin')
  const visitId = text(params, 'visitId')
  const indicator = text(params, 'indicator')
  const fromConsulting = origin === 'consulting'
  const contextualDescription = fromConsulting && visitId
    ? `Ação originada do encontro de Consultoria ${visitId}.`
    : undefined

  return {
    autoOpen,
    initialValues: {
      title: text(params, 'title') || (fromConsulting ? 'Implementar entrega da Consultoria' : undefined),
      description: text(params, 'description') || contextualDescription,
      problemOrOpportunity: text(params, 'problemOrOpportunity') || (fromConsulting ? 'Entrega ou melhoria definida durante a Consultoria.' : undefined),
      strategicObjective: text(params, 'strategicObjective') || (fromConsulting ? 'standardize_operations' : undefined),
      department: text(params, 'department') || (fromConsulting ? 'general' : undefined),
      indicator,
      priority: text(params, 'priority') || (fromConsulting ? 'medium' : undefined),
      dueDate: text(params, 'dueDate'),
      origin,
      evidenceRequired: params.get('evidenceRequired') === '1' || (fromConsulting ? true : undefined),
    },
  }
}

export function clearActionPlanLaunchContext(search: string): string {
  const params = new URLSearchParams(search)
  for (const key of LAUNCH_KEYS) params.delete(key)
  const result = params.toString()
  return result ? `?${result}` : ''
}
