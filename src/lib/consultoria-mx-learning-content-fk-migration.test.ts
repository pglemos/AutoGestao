import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL(
    '../../supabase/migrations/20260821130000_conteudo_referencia_encontro_treinamentos_fk.sql',
    import.meta.url,
  ),
  'utf8',
)

describe('learning_content_id passa a referenciar treinamentos', () => {
  test('remove a FK antiga para universidade_aulas', () => {
    expect(sql).toContain(
      'DROP CONSTRAINT IF EXISTS conteudo_referencia_encontro_learning_content_id_fkey',
    )
  })

  test('recria a FK apontando para treinamentos, mantendo ON DELETE SET NULL', () => {
    expect(sql).toContain('FOREIGN KEY (learning_content_id) REFERENCES public.treinamentos(id) ON DELETE SET NULL')
  })
})
