// Acesso a dados do ciclo do plano estratégico.
//
// As transições passam por aqui para que a regra de `planCycle.ts` seja o único
// lugar que decide o que pode virar o quê. Escrever status direto na tabela
// contornaria a máquina de estados.

import { supabase } from '@/lib/supabase'
import { canTransition, type PlanCycleStatus, type PlanReadiness } from './planCycle'

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

type CycleOperation = 'ensure' | 'submit_validation' | 'return_draft' | 'publish' | 'revise'
const CYCLE_STATUSES = new Set<PlanCycleStatus>(['rascunho', 'em_validacao', 'publicado', 'revisado'])

export function parsePlanCycleResponse(
  data: unknown,
  options: { nullable?: boolean } = {},
): { cycle: PlanCycle | null; error: string | null } {
  if (data == null && options.nullable) return { cycle: null, error: null }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { cycle: null, error: 'Resposta inválida ao carregar o ciclo do plano estratégico.' }
  }
  const value = data as Record<string, unknown>
  if (
    typeof value.id !== 'string'
    || typeof value.client_id !== 'string'
    || typeof value.year !== 'number'
    || typeof value.status !== 'string'
    || !CYCLE_STATUSES.has(value.status as PlanCycleStatus)
    || typeof value.version_number !== 'number'
    || typeof value.created_at !== 'string'
  ) {
    return { cycle: null, error: 'Resposta incompleta ao carregar o ciclo do plano estratégico.' }
  }
  return { cycle: value as unknown as PlanCycle, error: null }
}

async function operateCycle(input: {
  operation: CycleOperation
  clientId?: string | null
  year?: number | null
  cycleId?: string | null
  expectedStatus?: PlanCycleStatus | null
  packageVersionId?: string | null
}): Promise<{ cycle: PlanCycle | null; error: string | null }> {
  const args: {
    p_operation: string
    p_client_id?: string
    p_year?: number
    p_cycle_id?: string
    p_expected_status?: string
    p_package_version_id?: string
  } = {
    p_operation: input.operation,
  }
  if (input.clientId) args.p_client_id = input.clientId
  if (input.year != null) args.p_year = input.year
  if (input.cycleId) args.p_cycle_id = input.cycleId
  if (input.expectedStatus) args.p_expected_status = input.expectedStatus
  if (input.packageVersionId) args.p_package_version_id = input.packageVersionId

  const { data, error } = await supabase.rpc('operar_ciclo_plano_estrategico', args)
  if (error) return { cycle: null, error: error.message }
  return parsePlanCycleResponse(data)
}

const COLUMNS =
  'id, client_id, year, status, version_number, package_version_id, revised_from_id, published_at, published_by, created_at'

/** Valida o payload JSON antes de deixá-lo controlar a publicação na UI. */
export function parseCycleReadinessResponse(
  data: unknown,
): { readiness: PlanReadiness | null; error: string | null } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { readiness: null, error: 'Resposta inválida ao validar o plano estratégico.' }
  }

  const value = data as Record<string, unknown>
  if (
    typeof value.total !== 'number'
    || typeof value.ready !== 'number'
    || typeof value.pending !== 'number'
    || typeof value.canPublish !== 'boolean'
    || !Array.isArray(value.issues)
    || value.issues.some(issue => (
      !issue
      || typeof issue !== 'object'
      || Array.isArray(issue)
      || !['critico', 'pendencia'].includes(String((issue as Record<string, unknown>).severity))
      || typeof (issue as Record<string, unknown>).message !== 'string'
    ))
  ) {
    return { readiness: null, error: 'Resposta incompleta ao validar o plano estratégico.' }
  }
  return { readiness: value as unknown as PlanReadiness, error: null }
}

/** Prontidão autoritativa: pacote congelado + todas as unidades + valores do ciclo. */
export async function validateCycleReadiness(
  cycleId: string,
): Promise<{ readiness: PlanReadiness | null; error: string | null }> {
  const { data, error } = await supabase.rpc('validar_ciclo_plano_estrategico', {
    p_cycle_id: cycleId,
  })
  if (error) return { readiness: null, error: error.message }
  return parseCycleReadinessResponse(data)
}

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
  return parsePlanCycleResponse(data, { nullable: true })
}

/**
 * Última versão já publicada ao Dono (status publicado ou revisado com published_at).
 * O card da Visão Geral usa isto — não misturar contagem do rascunho atual.
 */
export async function fetchLatestPublishedCycle(
  clientId: string,
  year: number,
): Promise<{ cycle: PlanCycle | null; error: string | null }> {
  const { data, error } = await supabase
    .from('ciclos_plano_estrategico')
    .select(COLUMNS)
    .eq('client_id', clientId)
    .eq('year', year)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { cycle: null, error: error.message }
  return parsePlanCycleResponse(data, { nullable: true })
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
  const before = await fetchCurrentCycle(input.clientId, input.year)
  if (before.error) return { cycle: null, created: false, error: before.error }
  const result = await operateCycle({
    operation: 'ensure',
    clientId: input.clientId,
    year: input.year,
    packageVersionId: input.packageVersionId,
  })
  return { ...result, created: !before.cycle && Boolean(result.cycle) }
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

  const operation: CycleOperation = input.to === 'em_validacao'
    ? 'submit_validation'
    : input.to === 'rascunho'
      ? 'return_draft'
      : input.to === 'publicado'
        ? 'publish'
        : 'revise'
  return operateCycle({
    operation,
    cycleId: input.cycle.id,
    expectedStatus: input.cycle.status,
  })
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
  if (!canTransition(input.cycle.status, 'revisado')) {
    return { cycle: null, error: `Transição não permitida: ${input.cycle.status} → revisado.` }
  }
  return operateCycle({
    operation: 'revise',
    cycleId: input.cycle.id,
    expectedStatus: input.cycle.status,
  })
}
