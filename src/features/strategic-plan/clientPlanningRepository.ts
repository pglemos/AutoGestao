// Acesso a dados da leitura consolidada do planejamento de um cliente.
//
// A resolução das unidades passa por duas tabelas porque o vínculo cliente→lojas
// não é direto: `clientes_consultoria.primary_store_id` aponta a matriz, e as
// filiais são as lojas cujo `parent_loja_id` aponta para ela.

import { supabase } from '@/lib/supabase'
import { buildClientUnits, type ClientUnit } from './clientUnits'
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

/** Valores de planejamento de todas as unidades informadas, num ano. */
export async function fetchUnitsPlanningValues(
  unitIds: string[],
  year: number,
): Promise<{ rows: PlanningValueRow[]; error: string | null }> {
  if (unitIds.length === 0) return { rows: [], error: null }

  const { data, error } = await supabase
    .from('valores_indicadores_planejamento')
    .select('loja_id, indicator_code, year, month, meta, realizado, ano_anterior')
    .in('loja_id', unitIds)
    .eq('year', year)

  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as PlanningValueRow[], error: null }
}
