import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260811160000_fix_checkin_audit_logs_columns_and_rpc.sql', import.meta.url),
  'utf8',
)

describe('checkin_audit_logs schema and RPC fix migration', () => {
  test('adds missing seller_id, store_id, and reason columns safely to checkin_audit_logs', () => {
    expect(sql).toContain('ALTER TABLE IF EXISTS public.checkin_audit_logs')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS seller_id')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS store_id')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS reason')
  })

  test('updates aplicar_regularizacao_fechamento to insert valid audit log fields', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.aplicar_regularizacao_fechamento')
    expect(sql).toContain('INSERT INTO public.checkin_audit_logs')
    expect(sql).toContain('correction_request_id, seller_id, store_id, changed_by, change_type')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.aplicar_regularizacao_fechamento(uuid) TO authenticated, service_role;')
  })
})
