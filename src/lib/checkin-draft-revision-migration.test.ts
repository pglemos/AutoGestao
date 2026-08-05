import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260805220000_checkin_draft_revision_optimistic_lock.sql', import.meta.url),
  'utf8',
)

describe('migration draft_revision / controle otimista do rascunho', () => {
  test('adiciona as colunas de versionamento de forma idempotente e aditiva', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS draft_revision bigint NOT NULL DEFAULT 0')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS last_draft_saved_at timestamptz NULL')
    expect(migration).not.toMatch(/DROP\s+COLUMN/i)
    expect(migration).not.toMatch(/DELETE\s+FROM/i)
    expect(migration).not.toMatch(/TRUNCATE/i)
  })

  test('trava a linha antes de comparar revisão (sem FOR UPDATE haveria corrida)', () => {
    expect(migration).toMatch(/SELECT\s+ld\.draft_revision[\s\S]*?FOR UPDATE/)
  })

  test('recusa gravação com revisão desatualizada devolvendo DRAFT_VERSION_CONFLICT', () => {
    expect(migration).toContain("'code', 'DRAFT_VERSION_CONFLICT'")
    expect(migration).toContain("'server_revision', coalesce(v_current_revision, 0)")
    expect(migration).toContain('v_expected_revision IS NOT NULL AND coalesce(v_current_revision, 0) <> v_expected_revision')
  })

  test('cliente antigo sem expected_draft_revision continua aceito', () => {
    // O guard só dispara quando o campo veio no payload — rollout sem quebrar
    // quem ainda está com o bundle anterior.
    expect(migration).toContain("v_expected_revision bigint := nullif(p_payload->>'expected_draft_revision', '')::bigint")
  })

  test('revisão é server-owned: derivada da linha, nunca do payload', () => {
    expect(migration).toContain('draft_revision = lancamentos_diarios.draft_revision + 1')
    expect(migration).toContain('coalesce(v_current_revision, 0) + 1')
    expect(migration).not.toContain("(p_payload->>'draft_revision')")
  })

  test('retorno inclui revisão, updated_at e status para o cliente hidratar', () => {
    expect(migration).toContain("'draft_revision', v_result_revision")
    expect(migration).toContain("'updated_at', v_result_updated_at")
    expect(migration).toContain("'submission_status', v_result_status")
  })

  test('last_draft_saved_at só avança em gravação de rascunho', () => {
    expect(migration).toMatch(/last_draft_saved_at = CASE\s*\n\s*WHEN EXCLUDED\.submission_status = 'draft' THEN now\(\)/)
  })

  test('preserva o guard de fechamento já concluído', () => {
    expect(migration).toContain('Fechamento já concluído para esta data. Use o histórico para solicitar correção.')
    expect(migration).toContain("WHERE EXCLUDED.metric_scope <> 'daily'")
  })

  test('mantém a postura de segurança da RPC', () => {
    expect(migration).toContain('SECURITY DEFINER')
    expect(migration).toContain("SET search_path TO 'public'")
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.submit_checkin(jsonb) TO authenticated')
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.submit_checkin(jsonb) FROM anon')
  })

  test('rascunho não dispara o pg_notify de check-in novo', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.notify_manager_on_checkin()')
    expect(migration).toMatch(/IF coalesce\(NEW\.submission_status, 'draft'\) = 'draft' THEN\s*\n\s*RETURN NEW;/)
  })

  test('tem bloco DOWN documentado (gate de reversibilidade)', () => {
    expect(migration).toMatch(/^--\s*DOWN\b/im)
  })
})
