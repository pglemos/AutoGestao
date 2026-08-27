import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260827120000_merge_cadastros_duplicados_vendedores.sql', import.meta.url),
  'utf8',
)

describe('merge de cadastros duplicados', () => {
  test('roda inteiro ou não roda', () => {
    expect(sql).toContain('BEGIN;')
    expect(sql).toContain('COMMIT;')
    expect(sql).toContain('RAISE EXCEPTION')
    expect(sql).toContain('perdedor IS NULL OR vencedor IS NULL OR perdedor = vencedor')
  })

  test('não apaga cadastro nem histórico', () => {
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i)
    expect(sql).not.toMatch(/\bTRUNCATE\b/i)
  })

  test('marca o perdedor pela convenção de merge do projeto', () => {
    expect(sql).toContain('merged_into_id = p.vencedor')
    expect(sql).toContain('merged_at = now()')
    expect(sql).toContain('merge_reason')
    expect(sql).toContain('active = false')
  })

  test('é idempotente: não re-unifica quem já foi unificado', () => {
    expect(sql).toContain('AND u.merged_into_id IS NULL')
  })

  test('encerra os vínculos do perdedor em vez de movê-los', () => {
    // vinculos_loja e vendedores_loja são únicos por (loja, pessoa) e o vencedor
    // já está ativo na mesma loja — mover violaria a unique.
    expect(sql).toContain('UPDATE public.vinculos_loja v')
    expect(sql).toContain('UPDATE public.vendedores_loja s')
    expect(sql).toMatch(/SET\s+is_active = false,\s+ended_at = COALESCE/)
  })

  test('não mexe no que colide com o cadastro vencedor', () => {
    expect(sql).not.toMatch(/UPDATE public\.seller_routine_snapshots/i)
    expect(sql).not.toMatch(/UPDATE public\.metas/i)
  })

  test('move a operação comercial do perdedor para o vencedor', () => {
    for (const tabela of [
      'eventos_comerciais',
      'oportunidades',
      'clientes',
      'agendamentos',
      'execution_actions',
      'lancamentos_diarios',
      'notificacoes',
    ]) {
      expect(sql).toContain(`UPDATE public.${tabela}`)
    }
  })

  test('os três pares vencedor/perdedor são os definidos pela operação', () => {
    expect(sql).toContain("'gustavobirotrendauto@gmail.com', 'gvtrend@outlook.com'")
    expect(sql).toContain("'andersontupy@gmail.com',         'v8consultoriaveiculos@gmail.com'")
    expect(sql).toContain("'edier.junior@yahoo.com.br',      'edier.souza@promac.com.br'")
  })
})
