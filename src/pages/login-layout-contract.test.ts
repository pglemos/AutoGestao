import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

describe('contrato de layout do Login — painel flex-1 com min-w-0 (FASE I 09.011)', () => {
  test('painel do formulário encolhe abaixo do conteúdo (sem overflow em 320px + zoom)', () => {
    const source = readFileSync('src/pages/Login.tsx', 'utf8')
    const panels = source.match(/className="[^"]*flex-1[^"]*bg-white[^"]*"/g) ?? []

    expect(panels.length).toBeGreaterThan(0)
    for (const panel of panels) {
      // Sem `min-w-0`, um item `flex-1` não encolhe abaixo do conteúdo e empurra
      // o documento além da viewport (reproduzido em /login 320x568 + zoom 2:
      // painel do formulário com right:342, docOverflow=true). `min-w-0` permite
      // o shrink canônico (09.011) preservando o visual desktop.
      expect(panel).toContain('min-w-0')
    }
  })

  test('marca visível no mobile mantém o heading principal da página', () => {
    const source = readFileSync('src/pages/Login.tsx', 'utf8')
    const mobileBrand = source.match(/<div className="lg:hidden mb-12 text-center">([\s\S]*?)<\/div>/)?.[1] ?? ''

    expect(mobileBrand).toContain('<h1')
    expect(mobileBrand).not.toContain('<h2')
  })
})
