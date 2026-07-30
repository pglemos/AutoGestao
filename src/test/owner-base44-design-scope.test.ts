import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ownerCockpit = read('../features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx')
const main = read('../main.tsx')
const app = read('../App.tsx')
const layout = read('../components/Layout.tsx')
const appShell = read('../components/AppShell.tsx')
const semanticTokens = read('../design-system/tokens/semantic.css')

describe('escopo visual Base44 aprovado do módulo Dono', () => {
  test('monta o Dono no shell universal com providers e tokens executivos', () => {
    expect(app).toContain("const AppShell = lazy(() => import('@/components/AppShell'))")
    expect(appShell).toContain('<Layout />')
    expect(appShell).not.toContain('OwnerShell')
    expect(main).not.toContain('owner-base44-visual-scope')
    expect(layout).toContain('<OwnerProvider>')
    expect(layout).toContain('sidebarLabel={`Menu principal do ${perfilVisivel}`}')
    expect(ownerCockpit).not.toContain('owner-base44-scope')
  })

  test('os tokens aprovados do Base44 valem para todos os perfis', () => {
    // A verificação mudou de lugar de propósito. Antes exigia que
    // `owner-base44-exact.css` existisse e escopasse os tokens ao Dono; medimos
    // que 28 dos 33 tokens shadcn daquele arquivo já eram idênticos aos que
    // `.mx-ds` entrega a todo perfil, e que os cinco restantes (--chart-*) só
    // faltavam aos outros. Escopar ao Dono era a identidade por perfil que §5
    // proíbe, então os valores subiram para `.mx-ds` e o arquivo saiu.
    expect(semanticTokens).toContain('--primary: var(--mx-color-primary)')
    expect(semanticTokens).toContain('--chart-1: 12 76% 61%')
    expect(semanticTokens).toContain('--chart-5: 27 87% 67%')
    expect(semanticTokens).toContain('font-size: 14px')

    // Nenhum token de identidade pode voltar a depender do perfil. Casa o
    // seletor, não a menção: o próprio comentário da camada explica de onde os
    // valores vieram, e um `toContain` cru reprovaria a documentação.
    expect(semanticTokens).not.toMatch(/\.mx-ds\[data-mx-role/)
    expect(semanticTokens).not.toMatch(/\.owner-b44\s*[,{]/)
    expect(layout).not.toContain('owner-base44-exact')
  })
})
