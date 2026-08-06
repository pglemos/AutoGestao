import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const oportunidadesSource = readFileSync(new URL('./useOportunidades.ts', import.meta.url), 'utf8')
const agendamentosSource = readFileSync(new URL('./useAgendamentos.ts', import.meta.url), 'utf8')
const rpcMigration = readFileSync(
  new URL('../../../../supabase/migrations/20260805224000_crm_transactional_commercial_events.sql', import.meta.url),
  'utf8',
)
const backfillMigration = readFileSync(
  new URL('../../../../supabase/migrations/20260805225000_backfill_eventos_comerciais_orfaos.sql', import.meta.url),
  'utf8',
)
const revokeMigration = readFileSync(
  new URL('../../../../supabase/migrations/20260805230000_revoke_anon_from_crm_rpcs.sql', import.meta.url),
  'utf8',
)

describe('fluxos críticos deixam de gravar evento em best-effort', () => {
  test('criar oportunidade passa por RPC transacional', () => {
    expect(oportunidadesSource).toContain("supabase.rpc('criar_oportunidade_crm'")
    expect(oportunidadesSource).not.toContain("from('oportunidades').insert(")
  })

  test('mudar etapa passa por RPC transacional', () => {
    expect(oportunidadesSource).toContain("supabase.rpc('atualizar_etapa_oportunidade_crm'")
  })

  test('criar agendamento passa por RPC transacional', () => {
    expect(agendamentosSource).toContain("supabase.rpc('criar_agendamento_crm'")
    expect(agendamentosSource).not.toContain("from('agendamentos').insert(")
  })

  test('marcar comparecimento passa por RPC transacional', () => {
    expect(agendamentosSource).toContain("supabase.rpc('atualizar_status_agendamento_crm'")
  })

  test('nenhum fluxo crítico ainda chama registrarEventoComercial solto', () => {
    expect(oportunidadesSource).not.toContain('registrarEventoComercial')
    expect(agendamentosSource).not.toContain('registrarEventoComercial')
  })

  test('erro da RPC é propagado — nada de sucesso com indicador inconsistente', () => {
    expect(oportunidadesSource).toContain("if (!result?.ok) return { error: result?.error || 'Não foi possível registrar a oportunidade.' }")
    expect(agendamentosSource).toContain("if (!result?.ok) return { error: result?.error || 'Não foi possível registrar o agendamento.' }")
  })
})

describe('RPCs transacionais do CRM', () => {
  test('entidade e evento no mesmo commit, com rollback em qualquer falha', () => {
    for (const fn of [
      'criar_oportunidade_crm',
      'atualizar_etapa_oportunidade_crm',
      'criar_agendamento_crm',
      'atualizar_status_agendamento_crm',
    ]) {
      expect(rpcMigration).toContain(`CREATE OR REPLACE FUNCTION public.${fn}`)
    }
    const rollbacks = rpcMigration.match(/'code', 'TRANSACTION_FAILED'/g) ?? []
    expect(rollbacks.length).toBe(4)
  })

  test('idempotência determinística por entidade', () => {
    expect(rpcMigration).toContain("'crm:cliente_qualificado:' || v_oportunidade_id::text")
    expect(rpcMigration).toContain("'crm:venda_realizada:' || p_oportunidade_id::text")
    expect(rpcMigration).toContain("'crm:atendimento_comercial_realizado:' || p_agendamento_id::text")
    const conflicts = rpcMigration.match(/ON CONFLICT \(idempotency_key\) WHERE idempotency_key IS NOT NULL DO NOTHING/g) ?? []
    expect(conflicts.length).toBe(5)
  })

  test('postura de segurança: definer, search_path fixo e auth obrigatório', () => {
    const definers = rpcMigration.match(/SECURITY DEFINER/g) ?? []
    expect(definers.length).toBeGreaterThanOrEqual(5)
    const paths = rpcMigration.match(/SET search_path TO 'public'/g) ?? []
    expect(paths.length).toBeGreaterThanOrEqual(5)
    const authChecks = rpcMigration.match(/IF v_caller IS NULL THEN/g) ?? []
    expect(authChecks.length).toBe(4)
  })

  test('ownership e escopo de loja validados no servidor', () => {
    expect(rpcMigration).toContain('crm_assert_store_access')
    const ownership = rpcMigration.match(/v_row\.seller_user_id <> v_caller AND NOT public\.crm_assert_store_access/g) ?? []
    expect(ownership.length).toBe(2)
  })

  test('erro não vaza existência de registro de outra loja', () => {
    expect(rpcMigration).toContain('Oportunidade não encontrada para esta operação.')
    expect(rpcMigration).toContain('Agendamento não encontrado para esta operação.')
  })

  test('anon não executa nenhuma das RPCs', () => {
    for (const fn of [
      'criar_oportunidade_crm(jsonb)',
      'atualizar_etapa_oportunidade_crm(uuid, jsonb)',
      'criar_agendamento_crm(jsonb)',
      'atualizar_status_agendamento_crm(uuid, jsonb)',
    ]) {
      expect(revokeMigration).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM anon`)
      expect(revokeMigration).toContain(`GRANT EXECUTE ON FUNCTION public.${fn} TO authenticated`)
    }
  })
})

/** SQL executável, sem os comentários (o bloco DOWN documenta um DELETE). */
const backfillExecutavel = backfillMigration
  .split('\n')
  .filter(line => !line.trimStart().startsWith('--'))
  .join('\n')

describe('backfill de órfãos', () => {
  test('é aditivo: nunca apaga nem atualiza dado real', () => {
    expect(backfillExecutavel).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(backfillExecutavel.match(/^\s*UPDATE\s+public\./gim)).toBeNull()
    expect(backfillExecutavel).not.toMatch(/TRUNCATE/i)
  })

  test('é reexecutável sem duplicar', () => {
    const guards = backfillMigration.match(/ON CONFLICT \(idempotency_key\) WHERE idempotency_key IS NOT NULL DO NOTHING/g) ?? []
    expect(guards.length).toBe(3)
    const notExists = backfillMigration.match(/NOT EXISTS \(/g) ?? []
    expect(notExists.length).toBe(3)
  })

  test('preserva o timestamp real do fato, não now()', () => {
    expect(backfillMigration).toContain('coalesce(o.closed_at, o.updated_at, o.created_at)')
    expect(backfillMigration).toContain('coalesce(a.data_hora, a.updated_at, a.created_at)')
    expect(backfillMigration).not.toMatch(/data_evento[^\n]*now\(\)/)
  })

  test('usa a mesma chave de idempotência das RPCs (não duplica no uso futuro)', () => {
    expect(backfillMigration).toContain("'crm:venda_realizada:' || o.id::text")
    expect(backfillMigration).toContain("'crm:atendimento_comercial_realizado:' || a.id::text")
  })

  test('os eventos criados são rastreáveis', () => {
    const marcas = backfillMigration.match(/Evento reconciliado pelo backfill de 2026-08-05/g) ?? []
    expect(marcas.length).toBeGreaterThanOrEqual(3)
  })
})
