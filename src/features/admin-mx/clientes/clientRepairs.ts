import { supabase } from '@/lib/supabase'
import { DEFAULT_CONSULTING_MODULES } from '@/hooks/useConsultingModules'

export type RepairKey = 'consultor-responsavel' | 'modulos' | 'loja-principal'

export type RepairPlan =
  | { kind: 'promover-responsavel'; assignmentId: string }
  | { kind: 'aplicar-modulos-do-produto'; programKey: string }
  | { kind: 'vincular-loja'; storeId: string; storeName: string }
  | { kind: 'nada-a-fazer'; reason: string }

/**
 * Decide o reparo do check "Consultor responsável": havendo vínculos ativos
 * mas nenhum marcado como responsável, o mais antigo assume o papel.
 */
export function planResponsibleRepair(
  assignments: Array<{ id: string; active: boolean | null; assignment_role: string | null; created_at: string | null }>,
): RepairPlan {
  const active = assignments.filter(item => item.active !== false)
  if (!active.length) return { kind: 'nada-a-fazer', reason: 'Nenhum consultor vinculado ao cliente.' }
  if (active.some(item => item.assignment_role === 'responsavel')) {
    return { kind: 'nada-a-fazer', reason: 'O cliente já tem consultor responsável.' }
  }
  const oldest = [...active].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0]
  return { kind: 'promover-responsavel', assignmentId: oldest.id }
}

/** Decide o reparo do check "Módulos liberados" a partir do produto contratado. */
export function planModulesRepair(
  programKey: string | null,
  modules: Array<{ enabled: boolean | null }>,
): RepairPlan {
  if (modules.some(module => module.enabled !== false)) {
    return { kind: 'nada-a-fazer', reason: 'O cliente já tem módulos liberados.' }
  }
  if (!programKey) return { kind: 'nada-a-fazer', reason: 'Sem produto contratado não há matriz de módulos padrão.' }
  return { kind: 'aplicar-modulos-do-produto', programKey }
}

/**
 * Decide o reparo do check "Loja principal": vincula quando existe **uma única**
 * loja livre cujo nome casa com o do cliente. Com mais de uma candidata a
 * escolha é da equipe — reparo automático aqui erraria silenciosamente.
 */
export function planStoreRepair(
  clientName: string,
  candidates: Array<{ id: string; name: string | null }>,
): RepairPlan {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const target = normalize(clientName)
  if (!target) return { kind: 'nada-a-fazer', reason: 'Cliente sem nome para comparar.' }
  const matches = candidates.filter(store => {
    const name = normalize(store.name ?? '')
    return name && (name === target || name.startsWith(target) || target.startsWith(name))
  })
  if (matches.length === 1) return { kind: 'vincular-loja', storeId: matches[0].id, storeName: matches[0].name ?? '' }
  if (matches.length > 1) return { kind: 'nada-a-fazer', reason: `${matches.length} lojas com nome parecido — escolha manual.` }
  return { kind: 'nada-a-fazer', reason: 'Nenhuma loja livre com nome equivalente ao do cliente.' }
}

async function fetchAssignments(clientId: string) {
  const { data } = await supabase
    .from('atribuicoes_consultoria')
    .select('id, active, assignment_role, created_at')
    .eq('client_id', clientId)
  return data ?? []
}

/** Executa o reparo do check e devolve a mensagem para o usuário. */
export async function runClientRepair(input: {
  key: RepairKey
  clientId: string
  clientName: string
  programKey: string | null
  userId: string
}): Promise<{ repaired: boolean; message: string }> {
  if (input.key === 'consultor-responsavel') {
    const plan = planResponsibleRepair(await fetchAssignments(input.clientId))
    if (plan.kind !== 'promover-responsavel') return { repaired: false, message: plan.kind === 'nada-a-fazer' ? plan.reason : 'Reparo indisponível.' }
    const { error } = await supabase
      .from('atribuicoes_consultoria')
      .update({ assignment_role: 'responsavel', updated_at: new Date().toISOString() })
      .eq('id', plan.assignmentId)
    return error
      ? { repaired: false, message: error.message }
      : { repaired: true, message: 'Consultor mais antigo promovido a responsável.' }
  }

  if (input.key === 'modulos') {
    const { data: modules } = await supabase
      .from('modulos_cliente_consultoria')
      .select('enabled')
      .eq('client_id', input.clientId)
    const plan = planModulesRepair(input.programKey, modules ?? [])
    if (plan.kind !== 'aplicar-modulos-do-produto') return { repaired: false, message: plan.kind === 'nada-a-fazer' ? plan.reason : 'Reparo indisponível.' }

    const { data: defaults } = await supabase
      .from('modulos_produto_consultoria')
      .select('module_key, label, incluido')
      .eq('program_key', plan.programKey)
    let included = (defaults ?? [])
      .filter(item => item.incluido !== false)
      .map(item => ({ module_key: item.module_key, label: item.label, premium: false }))

    if (!included.length) {
      const isPlus = plan.programKey === 'pmr_plus' || plan.programKey?.toLowerCase().includes('plus')
      included = DEFAULT_CONSULTING_MODULES
        .filter(item => item.enabled || (isPlus && item.module_key === 'dre'))
        .map(item => ({
          module_key: item.module_key,
          label: item.label,
          premium: item.premium,
        }))
    }

    if (!included.length) return { repaired: false, message: 'O produto não tem módulos padrão configurados.' }

    const { error } = await supabase.from('modulos_cliente_consultoria').upsert(
      included.map(item => ({
        client_id: input.clientId,
        module_key: item.module_key,
        label: item.label,
        premium: item.premium,
        enabled: true,
        configured_by: input.userId,
        configured_at: new Date().toISOString(),
      })),
      { onConflict: 'client_id,module_key' },
    )
    return error
      ? { repaired: false, message: error.message }
      : { repaired: true, message: `${included.length} módulo(s) padrão aplicados ao cliente.` }
  }

  const [{ data: stores }, { data: clients }] = await Promise.all([
    supabase.from('lojas').select('id, name'),
    supabase.from('clientes_consultoria').select('primary_store_id, status'),
  ])
  const busy = new Set(
    (clients ?? [])
      .filter(client => ['ativo', 'ativa', 'active'].includes(String(client.status ?? '').toLowerCase()))
      .map(client => client.primary_store_id)
      .filter((id): id is string => Boolean(id)),
  )
  const plan = planStoreRepair(input.clientName, (stores ?? []).filter(store => !busy.has(store.id)))
  if (plan.kind !== 'vincular-loja') return { repaired: false, message: plan.kind === 'nada-a-fazer' ? plan.reason : 'Reparo indisponível.' }

  const { error } = await supabase
    .from('clientes_consultoria')
    .update({ primary_store_id: plan.storeId, updated_at: new Date().toISOString() })
    .eq('id', input.clientId)
  return error
    ? { repaired: false, message: error.message }
    : { repaired: true, message: `Loja "${plan.storeName}" vinculada como principal.` }
}

export const REPAIRABLE_CHECKS: RepairKey[] = ['consultor-responsavel', 'modulos', 'loja-principal']
