import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const path = 'supabase/migrations/20260727163000_action_plan_realtime_sources.sql'

test('publica somente tabelas canônicas filhas no realtime', () => {
  const sql = readFileSync(path, 'utf8')
  for (const table of ['historico_planos_acao', 'evidencias_planos_acao']) {
    expect(sql).toContain(table)
  }
  expect(sql).not.toContain('CREATE TABLE')
  expect(sql).not.toContain('itens_plano_acao')
  expect(sql).not.toContain('action_plan_history')
  expect(sql).toContain('pg_publication_tables')
})
