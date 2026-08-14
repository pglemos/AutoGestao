import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * FASE J — 10.004/10.011/10.013 (DashboardLoja `/lojas/:slug`)
 *
 * O `DashboardHeader` renderiza as MESMAS abas (Performance/Metas/Equipe e
 * Mês/D-1) de duas formas conforme a ramificação de perfil:
 *   - ramificação owner/gerente: família canônica `TabNavPill` (roving tabindex
 *     + setas/Home/End);
 *   - ramificação `isPerfilInternoMx`: `<nav>`/`<div>` à mão com `LOJA_TABS`/
 *     `PERIODO_TABS` — sem roving, sem navegação por teclado, todos os botões
 *     na ordem de tabulação.
 *
 * Este contrato trava a unificação: nenhuma ramificação do DashboardHeader pode
 * manter tablist à mão; as duas abas (loja e período) precisam usar a mesma
 * família canônica `TabNavPill` do resto do arquivo.
 */
const root = resolve(import.meta.dir, '..', '..', '..', '..')

const source = readFileSync(
  resolve(root, 'src/features/dashboard-loja/sections/DashboardHeader.tsx'),
  'utf8',
)

describe('FASE J — abas canônicas no DashboardHeader (/lojas/:slug)', () => {
  test('não há tablist à mão (`<nav aria-label="Abas da loja">` com map de botão)', () => {
    expect(source).not.toContain('<nav className="flex rounded-xl bg-muted p-1"')
    expect(source).not.toContain('aria-label="Abas da loja">')
    expect(source).not.toMatch(/LOJA_TABS\.map\(/)
  })

  test('não há período à mão (`<div className="flex h-10 rounded-xl bg-muted p-1">`)', () => {
    expect(source).not.toContain('flex h-10 rounded-xl bg-muted p-1')
    expect(source).not.toMatch(/PERIODO_TABS\.map\(/)
  })

  test('as abas de loja e período usam a família canônica TabNavPill em TODAS as ramificações', () => {
    // Contagem de uso do canônico: as duas abas precisam estar cobertas.
    const pillUsages = source.match(/<TabNavPill\b/g) ?? []
    expect(pillUsages.length).toBeGreaterThanOrEqual(2)
    expect(source).toContain('aria-label="Abas da loja"')
    expect(source).toContain('aria-label="Período do dashboard"')
  })

  test('nenhuma aba à mão permanece com `aria-selected` construído manualmente', () => {
    expect(source).not.toMatch(/aria-selected=\{activeTab === tab\.key\}/)
    expect(source).not.toMatch(/aria-selected=\{viewMode === tab\.key\}/)
  })
})
