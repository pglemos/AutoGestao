import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260807150000_fix_checkin_regularization_unique_constraint.sql', import.meta.url),
  'utf8',
)

describe('checkin regularization unique constraint fix migration', () => {
  test('drops legacy daily_checkins_user_id_store_id_date_key unique constraint and index', () => {
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS daily_checkins_user_id_store_id_date_key')
    expect(sql).toContain('DROP INDEX IF EXISTS public.daily_checkins_user_id_store_id_date_key')
  })

  test('cleans up abandoned daily drafts before promoting historical placeholder to daily', () => {
    expect(sql).toContain("DELETE FROM public.lancamentos_diarios")
    expect(sql).toContain("metric_scope = 'daily'")
    expect(sql).toContain("submission_status = 'draft' OR submitted_at IS NULL")
  })

  test('allows promoting historical checkin if existing daily checkin was only a draft', () => {
    expect(sql).toContain("coalesce(ld.submission_status, '') <> 'draft'")
    expect(sql).toContain("ld.submitted_at IS NOT NULL")
  })
})
