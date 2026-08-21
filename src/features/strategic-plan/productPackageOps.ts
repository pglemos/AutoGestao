import { supabase } from '@/lib/supabase'
import { fetchClientProductPackage } from './clientPlanningRepository'
import { diffRosterAgainstPackage, type PackageItemRow, type ProductPackageResolution } from './clientProductPackage'
import { ensureCycle, fetchCurrentCycle, type PlanCycle } from './planCycleRepository'

export type ProductPlanOperationResult = {
  cycle: PlanCycle | null
  created: boolean
  indicatorCount: number
  manualCount: number
  calculatedCount: number
  packageVersionId: string | null
  error: string | null
  resolution: ProductPackageResolution
}

export type StrategicPlanIndicatorRoster = PackageItemRow & {
  origin_type: 'PRODUCT_PACKAGE'
}

/**
 * Nome explícito da ponte Base44. A leitura permanece na implementação MX
 * existente para que contrato → produto → pacote tenha uma única fonte.
 */
export async function resolveClientProductPackage(clientId: string): Promise<ProductPackageResolution> {
  return fetchClientProductPackage(clientId)
}

export async function getStrategicPlanIndicatorRoster(
  strategicPlanCycleId: string,
): Promise<{ rows: StrategicPlanIndicatorRoster[]; error: string | null }> {
  const { data: cycle, error: cycleError } = await supabase
    .from('ciclos_plano_estrategico')
    .select('id, package_version_id')
    .eq('id', strategicPlanCycleId)
    .maybeSingle()
  if (cycleError) return { rows: [], error: cycleError.message }
  if (!cycle) return { rows: [], error: 'Ciclo do Plano Estratégico não encontrado.' }
  if (!cycle.package_version_id) return { rows: [], error: 'Ciclo sem pacote de indicadores congelado.' }

  const { data: items, error: itemsError } = await supabase
    .from('pacotes_indicadores_itens')
    .select('id, version_id, metric_key, label_snapshot, area_snapshot, input_mode_snapshot, ordem_snapshot, is_required, inclusion_reason, unit_entry_mode_snapshot, unit_rollup_method_snapshot, weight_indicator_code_snapshot')
    .eq('version_id', cycle.package_version_id)
    .order('ordem_snapshot', { ascending: true, nullsFirst: true })
  if (itemsError) return { rows: [], error: itemsError.message }

  return {
    rows: (items ?? []).map(item => ({ ...item, origin_type: 'PRODUCT_PACKAGE' as const })),
    error: null,
  }
}

export async function createStrategicPlanFromProduct(input: {
  clientId: string
  referenceYear: number
  userId?: string | null
}): Promise<ProductPlanOperationResult> {
  const resolution = await resolveClientProductPackage(input.clientId)
  if (!resolution.ok) {
    return {
      cycle: null, created: false, indicatorCount: 0, manualCount: 0, calculatedCount: 0,
      packageVersionId: null, error: resolution.message, resolution,
    }
  }

  const existing = await fetchCurrentCycle(input.clientId, input.referenceYear)
  if (existing.error) {
    return {
      cycle: null, created: false, indicatorCount: resolution.resolution.indicatorCodes.length,
      manualCount: resolution.resolution.manualCount, calculatedCount: resolution.resolution.calculatedCount,
      packageVersionId: resolution.resolution.packageVersion.id, error: existing.error, resolution,
    }
  }

  const result = await ensureCycle({
    clientId: input.clientId,
    year: input.referenceYear,
    packageVersionId: resolution.resolution.packageVersion.id,
    userId: input.userId,
  })
  return {
    cycle: result.cycle,
    created: result.created && !existing.cycle,
    indicatorCount: resolution.resolution.indicatorCodes.length,
    manualCount: resolution.resolution.manualCount,
    calculatedCount: resolution.resolution.calculatedCount,
    packageVersionId: resolution.resolution.packageVersion.id,
    error: result.error,
    resolution,
  }
}

export async function syncStrategicPlanWithProductPackage(input: {
  strategicPlanCycleId: string
  userId?: string | null
}): Promise<{
  cycle: PlanCycle | null
  added: string[]
  removed: string[]
  aligned: boolean
  error: string | null
}> {
  const { data: cycleRow, error: cycleError } = await supabase
    .from('ciclos_plano_estrategico')
    .select('id, client_id, year, status, version_number, package_version_id, revised_from_id, published_at, published_by, created_at')
    .eq('id', input.strategicPlanCycleId)
    .maybeSingle()
  if (cycleError) return { cycle: null, added: [], removed: [], aligned: false, error: cycleError.message }
  if (!cycleRow) return { cycle: null, added: [], removed: [], aligned: false, error: 'Ciclo do Plano Estratégico não encontrado.' }

  const parsedCycle = cycleRow as PlanCycle
  if (parsedCycle.status === 'publicado') {
    return { cycle: parsedCycle, added: [], removed: [], aligned: false, error: 'Plano publicado é imutável. Abra uma revisão antes de sincronizar.' }
  }

  const resolution = await resolveClientProductPackage(parsedCycle.client_id)
  if (!resolution.ok) return { cycle: parsedCycle, added: [], removed: [], aligned: false, error: resolution.message }

  const currentRoster = await getStrategicPlanIndicatorRoster(parsedCycle.id)
  if (currentRoster.error) return { cycle: parsedCycle, added: [], removed: [], aligned: false, error: currentRoster.error }
  const diff = diffRosterAgainstPackage(
    currentRoster.rows.map(item => item.metric_key),
    resolution.resolution.indicatorCodes,
  )

  const { data: updatedRows, error: updateError } = await supabase
    .from('ciclos_plano_estrategico')
    .update({ package_version_id: resolution.resolution.packageVersion.id })
    .eq('id', parsedCycle.id)
    .in('status', ['rascunho', 'em_validacao'])
    .select('id')
  if (updateError) return { cycle: parsedCycle, added: diff.missing, removed: diff.extra, aligned: false, error: updateError.message }
  if (!updatedRows?.length) return { cycle: parsedCycle, added: diff.missing, removed: diff.extra, aligned: false, error: 'O ciclo mudou de estado antes da sincronização; atualize e tente novamente.' }

  const updated = await fetchCurrentCycle(parsedCycle.client_id, parsedCycle.year)
  return {
    cycle: updated.cycle ?? parsedCycle,
    added: diff.missing,
    removed: diff.extra,
    aligned: diff.aligned,
    error: updated.error,
  }
}
