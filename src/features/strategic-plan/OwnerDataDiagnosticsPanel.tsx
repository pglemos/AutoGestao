import { useEffect, useMemo, useState } from 'react'
import { Stethoscope, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxSectionCard, MxSectionHeader } from '@/components/module/MxModuleVisualPrimitives'
import { useAuth, isAdministradorMx } from '@/hooks/useAuth'
import { useOwnerOptional } from '@/components/owner/OwnerContext'
import { ALL_OWNER_UNITS } from '@/components/owner/ownerPlanningAdapter'
import { supabase } from '@/lib/supabase'
import {
  buildOwnerFieldRows,
  resolveAdminStoreDiagnosticSides,
  type DiagnosticValueSide,
  type OwnerDiagnosticContext,
} from './ownerDataDiagnostics'
import type { StrategicPlanController } from './useStrategicPlanController'
import { useClientScope } from './useClientScope'

function fmt(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

async function fetchAdminStoreCell(input: {
  storeId: string
  year: number
  month: number
  indicatorCode: string
}): Promise<Partial<Record<'META' | 'REALIZADO' | 'ANO_ANTERIOR', DiagnosticValueSide | null>>> {
  const { data, error } = await supabase
    .from('valores_indicadores_planejamento_vigentes')
    .select('indicator_code,month,meta,realizado,ano_anterior,loja_id')
    .eq('loja_id', input.storeId)
    .eq('year', input.year)

  if (error) {
    return { META: null, REALIZADO: null, ANO_ANTERIOR: null }
  }

  const rows = (data ?? []).map(row => ({
    loja_id: String(row.loja_id ?? input.storeId),
    indicator_code: String(row.indicator_code),
    year: input.year,
    month: Number(row.month),
    meta: row.meta == null ? null : Number(row.meta),
    realizado: row.realizado == null ? null : Number(row.realizado),
    ano_anterior: row.ano_anterior == null ? null : Number(row.ano_anterior),
  }))

  return resolveAdminStoreDiagnosticSides({
    rows,
    storeId: input.storeId,
    year: input.year,
    month: input.month,
    indicatorCode: input.indicatorCode,
  })
}

/** Painel temporário Etapa A — só Admin MX / Geral. Zero writes. */
export function OwnerDataDiagnosticsPanel({ controller }: { controller: StrategicPlanController }) {
  const { role } = useAuth()
  const owner = useOwnerOptional() as { unitId?: string; currentUnits?: Array<{ id: string; name: string }> } | null
  const [open, setOpen] = useState(false)
  const [adminSides, setAdminSides] = useState<Partial<Record<'META' | 'REALIZADO' | 'ANO_ANTERIOR', DiagnosticValueSide | null>>>({})
  const [adminError, setAdminError] = useState<string | null>(null)

  const diag = controller.diagnosticContext
  const monthIndex = controller.selectedMonthIndex
  const indicator = controller.indicator
  const consolidationIndicators = useMemo(
    () => (indicator ? [{ code: String(indicator.metricCode || indicator.code), formula_expression: null, global_display_order: null }] : []),
    [indicator],
  )
  const clientScope = useClientScope(diag.storeId, diag.referenceYear, consolidationIndicators)

  const selectedStoreName = owner?.unitId === ALL_OWNER_UNITS
    ? 'Todas as unidades'
    : (owner?.currentUnits?.find(unit => unit.id === owner.unitId)?.name ?? null)

  const context: OwnerDiagnosticContext | null = indicator ? {
    clientAccountId: diag.clientAccountId,
    strategicPlanCycleId: diag.strategicPlanVersionId,
    strategicPlanVersionId: diag.strategicPlanVersionId,
    referenceYear: diag.referenceYear,
    referenceMonth: diag.referenceMonth,
    selectedValueView: diag.selectedValueView,
    scopeType: diag.scopeType,
    selectedStoreId: diag.scopeType === 'CONSOLIDATED' ? null : diag.storeId,
    selectedStoreName,
    selectedIndicatorId: indicator.id,
    selectedIndicatorCode: String(indicator.metricCode || indicator.code),
  } : null

  useEffect(() => {
    if (!open || !context || !indicator) return
    let active = true
    setAdminError(null)

    void (async () => {
      try {
        if (diag.scopeType === 'CONSOLIDATED' && clientScope.consolidated) {
          const code = context.selectedIndicatorCode
          const month = context.referenceMonth
          const mk = (field: 'meta' | 'realizado' | 'ano_anterior', value: number | null): DiagnosticValueSide => ({
            value,
            sourceEntity: 'client_planning_consolidation',
            sourceRecordId: `${code}:${month}:${field}`,
            sourceStoreId: null,
            sourceScopeType: 'CONSOLIDATED',
            sourceYear: context.referenceYear,
            sourceMonth: month,
          })
          if (!active) return
          setAdminSides({
            META: mk('meta', clientScope.consolidated.meta.valueMap[code]?.[month] ?? null),
            REALIZADO: mk('realizado', clientScope.consolidated.realizado.valueMap[code]?.[month] ?? null),
            ANO_ANTERIOR: mk('ano_anterior', clientScope.consolidated.ano_anterior.valueMap[code]?.[month] ?? null),
          })
          return
        }

        if (!diag.storeId) {
          if (active) setAdminSides({ META: null, REALIZADO: null, ANO_ANTERIOR: null })
          return
        }
        const next = await fetchAdminStoreCell({
          storeId: diag.storeId,
          year: context.referenceYear,
          month: context.referenceMonth,
          indicatorCode: context.selectedIndicatorCode,
        })
        if (active) setAdminSides(next)
      } catch (cause) {
        if (active) setAdminError(cause instanceof Error ? cause.message : 'Falha ao ler célula Admin')
      }
    })()

    return () => { active = false }
  }, [
    clientScope.consolidated,
    context?.referenceMonth,
    context?.referenceYear,
    context?.selectedIndicatorCode,
    diag.scopeType,
    diag.storeId,
    indicator,
    open,
  ])

  if (!isAdministradorMx(role) && role !== 'administrador_geral') return null

  const rows = indicator && context
    ? buildOwnerFieldRows({
      meta: indicator.targetValues[monthIndex] ?? null,
      realizado: indicator.currentValues[monthIndex] ?? null,
      anoAnterior: indicator.previousYearValues[monthIndex] ?? null,
      storeId: context.selectedStoreId,
      scopeType: context.scopeType,
      year: context.referenceYear,
      month: context.referenceMonth,
      seriesId: indicator.id,
      admin: adminSides,
    })
    : []

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(v => !v)}>
          <Stethoscope className="h-4 w-4" />
          {open ? 'Fechar diagnóstico' : 'Diagnóstico de Dados'}
        </Button>
      </div>
      {open && context ? (
        <MxSectionCard>
          <MxSectionHeader
            title="Diagnóstico de Dados"
            description="Somente leitura. Compara a mesma célula Admin (Metas/Realizados) × Visão do Dono — não recalcula nem grava."
            actions={(
              <Button variant="ghost" size="sm" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          />
          <div className="space-y-4 p-4 text-sm">
            {adminError ? <p className="text-xs text-danger">{adminError}</p> : null}
            <dl className="grid gap-2 sm:grid-cols-2">
              {(Object.entries(context) as Array<[keyof OwnerDiagnosticContext, string | number | null]>).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border-subtle bg-surface-alt/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{key}</dt>
                  <dd className="break-all font-mono text-xs">{value == null || value === '' ? '—' : String(value)}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">Comparação de Fonte</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="py-2 pr-2">Campo</th>
                      <th className="py-2 pr-2">Admin</th>
                      <th className="py-2 pr-2">Dono</th>
                      <th className="py-2 pr-2">Fonte Admin</th>
                      <th className="py-2 pr-2">Fonte Dono</th>
                      <th className="py-2 pr-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.field} className="border-b border-border-subtle/70">
                        <td className="py-2 pr-2 font-medium">{row.field}</td>
                        <td className="py-2 pr-2 font-mono">{fmt(row.admin?.value ?? null)}</td>
                        <td className="py-2 pr-2 font-mono">{fmt(row.owner.value)}</td>
                        <td className="py-2 pr-2 font-mono">{row.admin?.sourceEntity ?? '—'}</td>
                        <td className="py-2 pr-2 font-mono">{row.owner.sourceEntity}</td>
                        <td className="py-2 pr-2">{row.situation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </MxSectionCard>
      ) : null}
    </div>
  )
}
