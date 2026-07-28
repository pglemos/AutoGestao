import { actionPlanLiveRepository } from '@/components/owner/actionplan/actionPlanLiveRepository'
import type { ActionPlanRepository } from './actionPlan.types'

const REQUIRED_METHODS = [
  'getActions',
  'getResponsiblePeople',
  'createAction',
  'updateActionById',
  'approveAction',
  'delegateAction',
  'startAction',
  'updateProgress',
  'blockAction',
  'unblockAction',
  'submitForValidation',
  'validateAction',
  'returnToExecution',
  'reopenAction',
  'cancelAction',
  'deleteAction',
  'updateDueDate',
  'duplicateAction',
] as const

export function createActionPlanRepositoryAdapter(source: unknown): ActionPlanRepository {
  if (!source || typeof source !== 'object') throw new Error('Contrato incompleto do repositório de Plano de Ação')
  const candidate = source as Record<string, unknown>
  const missing = REQUIRED_METHODS.filter(method => typeof candidate[method] !== 'function')
  if (missing.length) throw new Error(`Contrato incompleto do repositório de Plano de Ação: ${missing.join(', ')}`)
  return source as ActionPlanRepository
}

export const actionPlanDataSource = createActionPlanRepositoryAdapter(actionPlanLiveRepository)
