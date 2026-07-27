import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const compact = (value: string) => value.replace(/\s+/g, ' ').trim()

const migrationPath = 'supabase/migrations/20260727040000_internal_mx_option_b_global_admin.sql'
const migration = compact(read(migrationPath))
const transactionMigration = compact(read('supabase/migrations/20260727043000_internal_mx_transactional_admin_rpcs.sql'))
const managerCron = compact(read('supabase/migrations/20260727041000_manager_routine_snapshot_cron.sql'))
const registerUser = compact(read('supabase/functions/register-user/index.ts'))
const manageStoreTeam = compact(read('supabase/functions/manage-store-team/index.ts'))
const manageGlobalUser = compact(read('supabase/functions/manage-global-user/index.ts'))

describe('Opção B: administração global equivalente da área interna MX', () => {
  test('treats the three internal roles as the same database administrator contract', () => {
    expect(migration).toContain('SELECT public.eh_area_interna_mx(uid)')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.eh_administrador_mx')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.eh_admin_master_mx')
    expect(migration).not.toContain('lower(u.email) = ANY')
  })

  test('keeps privileged mutations behind authenticated service-role functions', () => {
    expect(registerUser).toContain("const internalAdminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']")
    expect(registerUser).toContain('const globallyCreatableRoles')
    expect(manageStoreTeam).toContain("const adminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']")
    expect(manageGlobalUser).toContain("const internalAdminRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']")
    expect(manageGlobalUser).toContain("type GlobalUserAction = 'update' | 'delete' | 'force_password_change'")
    expect(migration).not.toMatch(/GRANT UPDATE ON public\.usuarios TO authenticated/i)
    expect(migration).toContain('REVOKE UPDATE ON public.usuarios FROM authenticated')
  })

  test('persists the canonical role and multi-table state inside transactional RPCs', () => {
    expect(transactionMigration).toContain('CREATE OR REPLACE FUNCTION public.internal_mx_role_id')
    expect(transactionMigration).toContain('role_id = v_role_id')
    expect(transactionMigration).toContain('CREATE OR REPLACE FUNCTION public.internal_mx_finalize_registered_user')
    expect(transactionMigration).toContain('CREATE OR REPLACE FUNCTION public.internal_mx_apply_global_user_mutation')
    expect(transactionMigration).toContain('CREATE OR REPLACE FUNCTION public.internal_mx_apply_store_team_mutation')
    expect(registerUser).toContain("adminClient.rpc( 'internal_mx_finalize_registered_user'")
    expect(manageGlobalUser).toContain("adminClient.rpc( 'internal_mx_apply_global_user_mutation'")
    expect(manageStoreTeam).toContain("adminClient.rpc( 'internal_mx_apply_store_team_mutation'")
  })

  test('validates privileged payloads and applies an administrative rate limit', () => {
    for (const source of [registerUser, manageStoreTeam, manageGlobalUser]) {
      expect(source).toContain('safeParse')
      expect(source).toContain('internal_mx_consume_admin_rate_limit')
      expect(source).not.toContain('error.message }, 500')
    }
  })

  test('provides literal audited store deletion with exact-name confirmation', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.admin_hard_delete_store')
    expect(migration).toContain("'hard_delete'")
    expect(migration).toContain("p_confirmation, '') IS DISTINCT FROM v_store.name")
    expect(migration).toContain('DELETE FROM public.lojas WHERE id = p_store_id')
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.admin_hard_delete_store(uuid,text) FROM PUBLIC, anon')
  })

  test('publishes operational progress sources used by the global real-time cockpit', () => {
    for (const table of [
      'planos_acao',
      'clientes_consultoria',
      'visitas_consultoria',
      'seller_routine_snapshots',
      'manager_routine_snapshots',
      'valores_indicadores_planejamento',
      'score_calculations',
      'score_history',
    ]) {
      expect(migration).toContain(`'${table}'`)
    }
    expect(migration).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE')
  })

  test('refreshes manager routine snapshots hourly for active managers and stores', () => {
    expect(managerCron).toContain('CREATE OR REPLACE FUNCTION public.run_manager_routine_snapshot_refresh_clock()')
    expect(managerCron).toContain("u.role = 'gerente'")
    expect(managerCron).toContain('u.active = true')
    expect(managerCron).toContain('l.active = true')
    expect(managerCron).toContain('public.consolidate_manager_routine_snapshot')
    expect(managerCron).toContain("'mx-refresh-manager-routine-snapshots'")
    expect(managerCron).toContain("'25 * * * *'")
    expect(managerCron).toContain('TO service_role')
  })

  test('records privileged mutations in an immutable audit surface', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.internal_mx_admin_audit')
    expect(migration).toContain('internal_mx_admin_audit_no_direct_write')
    expect(transactionMigration).toContain('INSERT INTO public.internal_mx_admin_audit')
    expect(manageGlobalUser).toContain(".from('internal_mx_admin_audit')")
  })
})
