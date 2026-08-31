// Acesso a dados da leitura consolidada do planejamento de um cliente.
//
// A resolução das unidades passa por duas tabelas porque o vínculo cliente→lojas
// não é direto: `clientes_consultoria.primary_store_id` aponta a matriz, e as
// filiais são as lojas cujo `parent_loja_id` aponta para ela.

import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/supabasePagination'
import { ensureCycle, fetchCurrentCycle } from './planCycleRepository'
import { buildClientUnits, type ClientUnit } from './clientUnits'
import { decideProductPackage, productPackageDataError, type ProductPackageResolution } from './clientProductPackage'
import type { PlanningValueRow } from './clientPlanningConsolidation'

/** Unidades ativas e encerradas de um cliente, matriz primeiro. */
export async function fetchClientUnits(clientId: string): Promise<{ units: ClientUnit[]; error: string | null }> {
  const { data: client, error: clientError } = await supabase
    .from('clientes_consultoria')
    .select('primary_store_id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return { units: [], error: clientError.message }

  const matrizId = client?.primary_store_id ?? null
  if (!matrizId) return { units: [], error: null }

  const { data: stores, error: storesError } = await supabase
    .from('lojas')
    .select('id, name, active, parent_loja_id')
    .or(`id.eq.${matrizId},parent_loja_id.eq.${matrizId}`)

  if (storesError) return { units: [], error: storesError.message }

  return { units: buildClientUnits(matrizId, stores ?? []), error: null }
}

/** Resolve o id do cliente de consultoria a partir do slug da ficha. */
export async function fetchConsultingClientIdBySlug(slug: string): Promise<{ id: string | null; error: string | null }> {
  const normalized = slug.trim()
  if (!normalized) return { id: null, error: null }
  const { data, error } = await supabase
    .from('clientes_consultoria')
    .select('id')
    .or(`slug.eq.${normalized},id.eq.${normalized}`)
    .maybeSingle()
  if (error) return { id: null, error: error.message }
  return { id: data?.id ?? null, error: null }
}

export type ClientStrategicPlanRouteContext = {
  clientId: string
  clientSlug: string | null
  storeId: string | null
  cycleId: string | null
  year: number
}

/** Hidrata clientId, cycleId, year e storeId a partir do slug — URL direta /clientes/:slug/plano-estrategico/:year. */
export async function resolveClientStrategicPlanRoute(
  slug: string,
  year: number,
): Promise<{ context: ClientStrategicPlanRouteContext | null; error: string | null }> {
  const normalized = slug.trim()
  if (!normalized) return { context: null, error: 'Cliente não informado.' }

  const { data: client, error: clientError } = await supabase
    .from('clientes_consultoria')
    .select('id, slug, primary_store_id')
    .or(`slug.eq.${normalized},id.eq.${normalized}`)
    .maybeSingle()

  if (clientError) return { context: null, error: clientError.message }
  if (!client?.id) return { context: null, error: 'Cliente não encontrado.' }

  const current = await fetchCurrentCycle(client.id, year)
  if (current.error) return { context: null, error: current.error }

  let cycleId = current.cycle?.id ?? null
  if (!cycleId) {
    const ensured = await ensureCycle({ clientId: client.id, year })
    if (ensured.error) return { context: null, error: ensured.error }
    cycleId = ensured.cycle?.id ?? null
  }

  return {
    context: {
      clientId: client.id,
      clientSlug: client.slug ?? normalized,
      storeId: client.primary_store_id ?? null,
      cycleId,
      year,
    },
    error: null,
  }
}

/**
 * Cliente e matriz aos quais uma loja pertence.
 *
 * A loja selecionada pode ser uma filial: a matriz é o seu `parent_loja_id`, e é
 * a matriz que o cliente aponta em `primary_store_id`.
 */
export async function fetchClientOfStore(
  storeId: string,
): Promise<{ clientId: string | null; matrizId: string | null; error: string | null }> {
  const { data: store, error: storeError } = await supabase
    .from('lojas')
    .select('id, parent_loja_id')
    .eq('id', storeId)
    .maybeSingle()

  if (storeError) return { clientId: null, matrizId: null, error: storeError.message }
  if (!store) return { clientId: null, matrizId: null, error: null }

  const matrizId = store.parent_loja_id ?? store.id

  const { data: client, error: clientError } = await supabase
    .from('clientes_consultoria')
    .select('id')
    .eq('primary_store_id', matrizId)
    .maybeSingle()

  if (clientError) return { clientId: null, matrizId, error: clientError.message }
  return { clientId: client?.id ?? null, matrizId, error: null }
}

/**
 * Resolve o pacote de indicadores do cliente pelo produto contratado.
 *
 * O elo é `clientes_consultoria.program_template_key` → `programas_visita_consultoria.program_key`.
 */
export async function fetchClientProductPackage(clientId: string): Promise<ProductPackageResolution> {
  const { data: client, error: clientError } = await supabase
    .from('clientes_consultoria')
    .select('program_template_key')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return productPackageDataError(clientError.message)
  if (!client?.program_template_key) {
    return decideProductPackage({ programKey: null, product: null, packageVersion: null, items: [] })
  }

  const programKey = client.program_template_key

  const { data: product, error: productError } = await supabase
    .from('programas_visita_consultoria')
    .select('program_key, name, status, usa_plano_estrategico, indicator_package_version_id')
    .eq('program_key', programKey)
    .maybeSingle()

  if (productError) return productPackageDataError(productError.message)

  if (!product?.indicator_package_version_id) {
    return decideProductPackage({ programKey, product: product ?? null, packageVersion: null, items: [] })
  }

  const { data: packageVersion, error: packageVersionError } = await supabase
    .from('pacotes_indicadores_versoes')
    .select('id, nome, status, versao, total_indicadores')
    .eq('id', product.indicator_package_version_id)
    .maybeSingle()

  if (packageVersionError) return productPackageDataError(packageVersionError.message, product)

  const { data: items, error: itemsError } = await supabase
    .from('pacotes_indicadores_itens')
    .select('id, version_id, metric_key, label_snapshot, area_snapshot, input_mode_snapshot, ordem_snapshot, is_required, inclusion_reason, unit_entry_mode_snapshot, unit_rollup_method_snapshot, weight_indicator_code_snapshot')
    .eq('version_id', product.indicator_package_version_id)

  if (itemsError) return productPackageDataError(itemsError.message, product)

  return decideProductPackage({
    programKey,
    product,
    packageVersion: packageVersion ?? null,
    items: items ?? [],
  })
}

/**
 * Valores do ciclo (versão) — fonte do card Publicado/Rascunho.
 * Lê a tabela por `ciclo_id`, sem a view `vigentes` (join matriz frágil
 * some com filiais / primary_store desalinhado).
 */
export async function fetchCyclePlanningValues(
  cycleId: string,
): Promise<{ rows: PlanningValueRow[]; error: string | null }> {
  // Paginado: um ciclo multi-loja passa das 1000 linhas do PostgREST e a leitura
  // truncada apagava unidades inteiras do consolidado.
  const { rows, error } = await fetchAllRows<PlanningValueRow>((from, to) => supabase
    .from('valores_indicadores_planejamento')
    .select('loja_id, indicator_code, year, month, meta, realizado, ano_anterior')
    .eq('ciclo_id', cycleId)
    .order('loja_id', { ascending: true })
    .order('indicator_code', { ascending: true })
    .order('month', { ascending: true })
    .range(from, to))

  if (error) return { rows: [], error }
  return { rows, error: null }
}

/** Valores vigentes por lojas+ano (fallback legado sem ciclo). */
export async function fetchUnitsPlanningValues(
  unitIds: string[],
  year: number,
): Promise<{ rows: PlanningValueRow[]; error: string | null }> {
  if (unitIds.length === 0) return { rows: [], error: null }

  const vigentes = await fetchAllRows<PlanningValueRow>((from, to) => supabase
    .from('valores_indicadores_planejamento_vigentes')
    .select('loja_id, indicator_code, year, month, meta, realizado, ano_anterior')
    .in('loja_id', unitIds)
    .eq('year', year)
    .order('loja_id', { ascending: true })
    .order('indicator_code', { ascending: true })
    .order('month', { ascending: true })
    .range(from, to))

  // View vigentes pode estar vazia (join matriz/filial). Base por loja+ano
  // alimenta o consolidado sem depender de publicação na view.
  const base = await fetchAllRows<PlanningValueRow>((from, to) => supabase
    .from('valores_indicadores_planejamento')
    .select('loja_id, indicator_code, year, month, meta, realizado, ano_anterior')
    .in('loja_id', unitIds)
    .eq('year', year)
    .order('loja_id', { ascending: true })
    .order('indicator_code', { ascending: true })
    .order('month', { ascending: true })
    .range(from, to))

  const vigentesRows = vigentes.rows
  const baseRows = base.rows
  const useBase = vigentesRows.length === 0 && baseRows.length > 0
  const rows = useBase ? baseRows : vigentesRows
  const error = vigentes.error ?? base.error ?? null


  if (error && rows.length === 0) return { rows: [], error }
  return { rows, error: rows.length ? null : error }
}
