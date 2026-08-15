import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { classifyEvent, classifyEvents } from '../../scripts/classify-supabase-events.mjs'

const root = process.cwd()

/**
 * FASE AH — classificação de eventos de log do Supabase (34.004/34.005/34.012).
 *
 * Eventos típicos capturados no delta pré/pós E2E devem ser classificados de
 * forma determinística em PRODUCTION_BUG / EXPECTED_TEST_TRAFFIC /
 * ENVIRONMENT_NOISE / UNCLASSIFIED — sem afrouxar RLS por causa de teste (34.006).
 */
describe('FASE AH — classificação de eventos Supabase', () => {
  test('recipient_id com coluna inexistente é PRODUCTION_BUG', () => {
    expect(classifyEvent('column "recipient_id" does not exist at character 45')).toBe('PRODUCTION_BUG')
  })

  test('statement timeout é PRODUCTION_BUG (RPC pesado ou plano ruim)', () => {
    expect(classifyEvent('canceling statement due to statement timeout')).toBe('PRODUCTION_BUG')
    expect(classifyEvent('statement_timeout exceeded in query for network dashboard')).toBe('PRODUCTION_BUG')
  })

  test('new row violates RLS em vendedor de fixture é EXPECTED_TEST_TRAFFIC', () => {
    expect(classifyEvent('new row violates row-level security policy for "vinculos_loja"')).toBe('EXPECTED_TEST_TRAFFIC')
    expect(classifyEvent('vendedores_loja: 0 rows returned for e2e-seller fixture')).toBe('EXPECTED_TEST_TRAFFIC')
  })

  test('ruído de ambiente (websocket, analytics, dev server) é ENVIRONMENT_NOISE', () => {
    expect(classifyEvent('WebSocket connection to realtime/v1/websocket failed')).toBe('ENVIRONMENT_NOISE')
    expect(classifyEvent('GET /_vercel/insights 404')).toBe('ENVIRONMENT_NOISE')
  })

  test('evento sem padrão é UNCLASSIFIED (não força categoria errada)', () => {
    expect(classifyEvent('um evento novo sem padrão ainda')).toBe('UNCLASSIFIED')
  })

  test('classifyEvents agrega contagens por categoria com amostras', () => {
    const lines = [
      'column "recipient_id" does not exist at character 45',
      'canceling statement due to statement timeout',
      'new row violates row-level security policy for "vinculos_loja"',
      'WebSocket connection to realtime/v1/websocket failed',
      '',
      'linha sem classificação',
    ]
    const result = classifyEvents(lines)
    const byCategory = Object.fromEntries(result.map((r) => [r.category, r.count]))
    expect(byCategory.PRODUCTION_BUG).toBe(2)
    expect(byCategory.EXPECTED_TEST_TRAFFIC).toBe(1)
    expect(byCategory.ENVIRONMENT_NOISE).toBe(1)
    expect(byCategory.UNCLASSIFIED).toBe(1)
  })

  test('relatório de classificação existe (34.004/34.005/34.012)', () => {
    const report = readFileSync(join(root, 'docs/qa/supabase-log-classification.md'), 'utf8')
    expect(report).toContain('PRODUCTION_BUG')
    expect(report).toContain('EXPECTED_TEST_TRAFFIC')
    expect(report).toContain('recipient_id')
    expect(report).toContain('statement timeout')
    expect(report).toContain('vendedor sem vínculo')
  })
})
