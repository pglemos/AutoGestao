export type OwnerStrategicPlanQueryScope = {
  clientAccountId?: string | null
  strategicPlanVersionId?: string | null
  referenceYear: number
  referenceMonth?: number | null
  selectedValueView?: string | null
  scopeType?: string | null
  storeId: string | null
  periodMode?: string | null
}

let cacheGeneration = 0

export function invalidateOwnerStrategicPlanCaches(): number {
  cacheGeneration += 1
  return cacheGeneration
}

export function ownerStrategicPlanCacheGeneration(): number {
  return cacheGeneration
}

/** Chave única por cliente + versão + competência + visão + unidade. */
export function ownerStrategicPlanQueryKey(input: OwnerStrategicPlanQueryScope): readonly unknown[] {
  return [
    'ownerStrategicPlan',
    input.clientAccountId ?? null,
    input.strategicPlanVersionId ?? null,
    input.referenceYear,
    input.referenceMonth ?? null,
    input.selectedValueView ?? null,
    input.scopeType ?? 'STORE',
    input.storeId,
    input.periodMode ?? null,
    cacheGeneration,
  ]
}

export function sameOwnerStrategicPlanQueryKey(
  left: OwnerStrategicPlanQueryScope,
  right: OwnerStrategicPlanQueryScope,
): boolean {
  const a = ownerStrategicPlanQueryKey(left)
  const b = ownerStrategicPlanQueryKey(right)
  return a.length === b.length && a.every((value, index) => value === b[index])
}
