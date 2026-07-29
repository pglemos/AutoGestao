/**
 * Contexto de correlação ponta a ponta.
 *
 * Campos padronizados (§11 do runbook): environment, release, correlation_id,
 * trace_id, request_id, user_role, store_id, module, route, operation.
 *
 * Nunca guarda PII. `user_id` é o UUID interno do Supabase, que já é opaco.
 */

import { getEnvironment, getRelease, getBranch, getDeploymentId } from './release'

export interface UserScope {
    userId?: string
    role?: string
    storeId?: string
    companyId?: string
}

export interface OperationScope {
    module?: string
    route?: string
    operation?: string
}

const userScope: UserScope = {}
const operationScope: OperationScope = {}

type SentryLike = {
    setTag?: (key: string, value: string | undefined) => void
    setUser?: (user: Record<string, unknown> | null) => void
}

function sentry(): SentryLike | undefined {
    return (globalThis as unknown as { Sentry?: SentryLike }).Sentry
}

function setTag(key: string, value: string | undefined): void {
    try {
        sentry()?.setTag?.(key, value)
    } catch {
        // Sentry pode não estar inicializado (dev sem DSN) — no-op.
    }
}

/**
 * Aplica identidade após login. Só campos não-PII trafegam.
 */
export function setUserScope(scope: UserScope): void {
    Object.assign(userScope, scope)
    try {
        sentry()?.setUser?.({
            id: scope.userId,
            role: scope.role,
            store_id: scope.storeId,
            company_id: scope.companyId,
        })
    } catch {
        // no-op
    }
    setTag('mx.user_role', scope.role)
    setTag('mx.store_scope', scope.storeId)
    setTag('mx.company_scope', scope.companyId)
}

/** Limpa identidade e tags após logout. */
export function clearUserScope(): void {
    for (const key of Object.keys(userScope)) {
        delete (userScope as Record<string, unknown>)[key]
    }
    try {
        sentry()?.setUser?.(null)
    } catch {
        // no-op
    }
    setTag('mx.user_role', undefined)
    setTag('mx.store_scope', undefined)
    setTag('mx.company_scope', undefined)
}

/** Marca o módulo/rota/operação corrente para agrupamento de eventos. */
export function setOperationScope(scope: OperationScope): void {
    Object.assign(operationScope, scope)
    setTag('mx.module', scope.module)
    setTag('mx.route', scope.route)
    setTag('mx.operation', scope.operation)
}

export function getUserScope(): Readonly<UserScope> {
    return userScope
}

export function getOperationScope(): Readonly<OperationScope> {
    return operationScope
}

/** Snapshot completo usado por logger, métricas e logs persistentes. */
export function getObservabilityContext(): Record<string, string | undefined> {
    return {
        environment: getEnvironment(),
        release: getRelease(),
        branch: getBranch(),
        deployment_id: getDeploymentId(),
        user_role: userScope.role,
        store_id: userScope.storeId,
        company_id: userScope.companyId,
        module: operationScope.module,
        route: operationScope.route,
        operation: operationScope.operation,
    }
}
