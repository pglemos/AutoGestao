/** Diagnóstico read-only Admin↔Dono — não altera dados. */

export type DiagnosticSituation =
  | 'IGUAL'
  | 'FONTE DIFERENTE'
  | 'ESCOPO DIFERENTE'
  | 'COMPETÊNCIA DIFERENTE'
  | 'VALOR AUSENTE'
  | 'ERRO TÉCNICO'

export type DiagnosticValueSide = {
  value: number | null
  sourceEntity: string
  sourceRecordId: string | null
  sourceStoreId: string | null
  sourceScopeType: string | null
  sourceYear: number
  sourceMonth: number
}

export type DiagnosticFieldRow = {
  field: 'META' | 'REALIZADO' | 'ANO_ANTERIOR'
  admin: DiagnosticValueSide | null
  owner: DiagnosticValueSide
  situation: DiagnosticSituation
}

export type OwnerDiagnosticContext = {
  clientAccountId: string | null
  strategicPlanCycleId: string | null
  strategicPlanVersionId: string | null
  referenceYear: number
  referenceMonth: number
  selectedValueView: string
  scopeType: string | null
  selectedStoreId: string | null
  selectedStoreName: string | null
  selectedIndicatorId: string
  selectedIndicatorCode: string
}

export function compareDiagnosticValues(input: {
  admin: DiagnosticValueSide | null
  owner: DiagnosticValueSide
}): DiagnosticSituation {
  if (!input.admin) return 'VALOR AUSENTE'
  if (input.admin.sourceYear !== input.owner.sourceYear || input.admin.sourceMonth !== input.owner.sourceMonth) {
    return 'COMPETÊNCIA DIFERENTE'
  }
  if ((input.admin.sourceScopeType ?? '') !== (input.owner.sourceScopeType ?? '')) {
    return 'ESCOPO DIFERENTE'
  }
  const a = input.admin.value
  const b = input.owner.value
  if (a == null && b == null) return 'IGUAL'
  if (a == null || b == null) return 'VALOR AUSENTE'
  if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-6) return 'IGUAL'
  return 'FONTE DIFERENTE'
}

export function ownerSideFromSeries(input: {
  value: number | null
  storeId: string | null
  scopeType: string | null
  year: number
  month: number
  seriesId: string
}): DiagnosticValueSide {
  return {
    value: input.value,
    sourceEntity: 'owner_strategic_series',
    sourceRecordId: input.seriesId,
    sourceStoreId: input.storeId,
    sourceScopeType: input.scopeType,
    sourceYear: input.year,
    sourceMonth: input.month,
  }
}

export function buildOwnerFieldRows(input: {
  meta: number | null
  realizado: number | null
  anoAnterior: number | null
  storeId: string | null
  scopeType: string | null
  year: number
  month: number
  seriesId: string
  admin?: Partial<Record<'META' | 'REALIZADO' | 'ANO_ANTERIOR', DiagnosticValueSide | null>>
}): DiagnosticFieldRow[] {
  const mk = (field: DiagnosticFieldRow['field'], value: number | null): DiagnosticFieldRow => {
    const owner = ownerSideFromSeries({
      value,
      storeId: input.storeId,
      scopeType: input.scopeType,
      year: input.year,
      month: input.month,
      seriesId: input.seriesId,
    })
    const admin = input.admin?.[field] ?? null
    return { field, admin, owner, situation: compareDiagnosticValues({ admin, owner }) }
  }
  return [
    mk('META', input.meta),
    mk('REALIZADO', input.realizado),
    mk('ANO_ANTERIOR', input.anoAnterior),
  ]
}
