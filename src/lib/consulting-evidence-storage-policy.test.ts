import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260809205000_fix_consulting_evidence_storage_rls_definer.sql',
  ),
  'utf8',
)

describe('consulting evidence Storage policy contract', () => {
  test('resolves protected consulting linkage through a constrained helper', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.pode_ler_evidencia_consultoria(')
    expect(migration).toContain('SECURITY DEFINER')
    expect(migration).toContain('SET search_path = public')
    expect(migration).toContain('public.tem_papel_loja(')
    expect(migration).toContain("ARRAY['dono', 'gerente']")
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.pode_ler_evidencia_consultoria(text, uuid) FROM PUBLIC')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.pode_ler_evidencia_consultoria(text, uuid) TO authenticated')
    expect(migration).toContain('public.pode_ler_evidencia_consultoria(name)')
    expect(migration).not.toContain('WHERE ev.caminho_storage = storage.objects.name')
  })
})
