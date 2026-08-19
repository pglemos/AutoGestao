// Acesso a dados do ciclo do plano estratégico.
//
// As transições passam por aqui para que a regra de `planCycle.ts` seja o único
// lugar que decide o que pode virar o quê. Escrever status direto na tabela
// contornaria a máquina de estados.

import { supabase } from '@/lib/supabase'
import { canTransition, type PlanCycleStatus } from './planCycle'

export type PlanCycle = {
  id: string
  client_id: string
  year: number
  status: PlanCycleStatus
  version_number: number
  package_version_id: string | null
  revised_from_id: string | null
  published_at: string | null
  published_by: string | null
  created_at: string
}

const COLUMNS =
  'id, client_id, year, status, version_number, package_version_id, revised_from_id, published_at, published_by, created_at'

/** Ciclo vigente do cliente no ano — o que não foi revisado. */
export async function fetchCurrentCycle(
  clientId: string,
  year: number,
): Promise<{ cycle: PlanCycle | null; error: string | null }> {
  const { data, error } = await supabase
    .from('ciclos_plano_estrategico')
    .select(COLUMNS)
    .eq('client_id', clientId)
    .eq('year', year)
    .neq('status', 'revisado')
    .maybeSingle()

  if (error) return { cycle: null, error: error.message }
  return { cycle: (data as PlanCycle) ?? null, error: null }
}

/**
 * Cria o ciclo do ano, ou devolve o que já existe.
 *
 * Idempotente de propósito: dois ciclos do mesmo cliente no mesmo ano é o defeito
 * que as operações de reconciliação do Base44 existem para limpar. O índice único
 * parcial garante isso no banco; aqui a corrida é resolvida relendo.
 */
export async function ensureCycle(input: {
  clientId: string
  year: number
  packageVersionId?: string | null
  userId?: string | null
}): Promise<{ cycle: PlanCycle | null; created: boolean; error: string | null }> {
  const existing = await fetchCurrentCycle(input.clientId, input.year)
  if (existing.error) return { cycle: null, created: false, error: existing.error }
  if (existing.cycle) return { cycle: existing.cycle, created: false, error: null }

  const { data, error } = await supabase
    .from('ciclos_plano_estrategico')
    .insert({
      client_id: input.clientId,
      year: input.year,
      status: 'rascunho',
      package_version_id: input.packageVersionId ?? null,
      created_by: input.userId ?? null,
    })
    .select(COLUMNS)
    .maybeSingle()

  if (error) {
    // 23505: outra sessão criou o ciclo entre a leitura e a escrita.
    if (error.code === '23505') {
      const reread = await fetchCurrentCycle(input.clientId, input.year)
      return { cycle: reread.cycle, created: false, error: reread.error }
    }
    return { cycle: null, created: false, error: error.message }
  }

  return { cycle: data as PlanCycle, created: true, error: null }
}

/** Move o ciclo, recusando transição que a máquina de estados não permite. */
export async function transitionCycle(input: {
  cycle: PlanCycle
  to: PlanCycleStatus
  userId?: string | null
}): Promise<{ cycle: PlanCycle | null; error: string | null }> {
  if (!canTransition(input.cycle.status, input.to)) {
    return {
      cycle: null,
      error: `Transição não permitida: ${input.cycle.status} → ${input.to}.`,
    }
  }

  const patch: Record<string, unknown> = { status: input.to, updated_at: new Date().toISOString() }
  if (input.to === 'publicado') {
    patch.published_at = new Date().toISOString()
    patch.published_by = input.userId ?? null
  }

  const { data, error } = await supabase
    .from('ciclos_plano_estrategico')
    .update(patch)
    .eq('id', input.cycle.id)
    // Só move se o status no banco ainda for o que a tela viu: evita publicar por
    // cima de uma transição feita por outra pessoa nesse meio-tempo.
    .eq('status', input.cycle.status)
    .select(COLUMNS)
    .maybeSingle()

  if (error) return { cycle: null, error: error.message }
  if (!data) return { cycle: null, error: 'O ciclo mudou de estado em outra sessão. Recarregue a tela.' }
  return { cycle: data as PlanCycle, error: null }
}

/**
 * Abre uma revisão: marca o ciclo publicado como revisado e cria o próximo.
 *
 * O ciclo anterior fica no histórico — é o que permite comparar o que mudou entre
 * a meta publicada e a revisão.
 */
export async function reviseCycle(input: {
  cycle: PlanCycle
  userId?: string | null
}): Promise<{ cycle: PlanCycle | null; error: string | null }> {
  const closed = await transitionCycle({ cycle: input.cycle, to: 'revisado', userId: input.userId })
  if (closed.error) return { cycle: null, error: closed.error }

  const { data, error } = await supabase
    .from('ciclos_plano_estrategico')
    .insert({
      client_id: input.cycle.client_id,
      year: input.cycle.year,
      status: 'rascunho',
      version_number: input.cycle.version_number + 1,
      package_version_id: input.cycle.package_version_id,
      revised_from_id: input.cycle.id,
      created_by: input.userId ?? null,
    })
    .select(COLUMNS)
    .maybeSingle()

  if (error) return { cycle: null, error: error.message }
  return { cycle: data as PlanCycle, error: null }
}
