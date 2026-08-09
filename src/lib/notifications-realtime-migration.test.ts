import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const migrationPath = new URL(
  '../../supabase/migrations/20260809172708_add_notificacoes_realtime_publication.sql',
  import.meta.url,
)

describe('notification realtime migration', () => {
  it('publishes notificacoes idempotently for authenticated subscriptions', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain("to_regclass('public.notificacoes')")
    expect(sql).toContain("pubname = 'supabase_realtime'")
    expect(sql).toContain("tablename = 'notificacoes'")
    expect(sql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes')
  })
})
