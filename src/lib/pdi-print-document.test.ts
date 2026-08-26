import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260826170000_pdi_print_bundle_expose_ids.sql', import.meta.url),
  'utf8',
)
const appRoutes = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const printPage = readFileSync(new URL('../pages/PDIPrint.tsx', import.meta.url), 'utf8')
const printCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('bundle de impressão do PDI', () => {
  test('expõe os ids necessários para corrigir nota e alvo', () => {
    expect(migration).toContain("'id', a.id")
    expect(migration).toContain("'competencia_id', a.competencia_id")
    expect(migration).toContain("'id', pa.id")
  })

  test('mantém a autorização original da função', () => {
    expect(migration).toContain('public.is_manager_of(s.loja_id)')
    expect(migration).toContain('public.is_owner_of(s.loja_id)')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.get_pdi_print_bundle(uuid)')
  })
})

describe('impressão de todas as folhas', () => {
  test('a rota do documento fica fora do AppShell (que recorta na 1a folha)', () => {
    expect(appRoutes).toContain('<Route path="/pdi/:id/print" element={<ProtectedRoute>')
    expect(appRoutes).not.toContain('<Route path="pdi/:id/print"')
  })

  test('nenhuma folha usa altura fixa na impressão', () => {
    expect(printPage).not.toMatch(/(?<!min-)h-\[297mm\]/)
    expect(printPage.match(/min-h-\[297mm\] print:min-h-0/g)?.length).toBe(3)
    expect(printPage).toContain('print:gap-y-0')
  })

  test('o print CSS global não engole os cabeçalhos das folhas', () => {
    expect(printCss).toContain('.print-document header')
    expect(printPage).toContain('className="print-document')
  })
})
