import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ownerScopeUrl = new URL('../styles/owner-base44-visual-scope.css', import.meta.url)
const ownerScopeCss = existsSync(ownerScopeUrl) ? readFileSync(ownerScopeUrl, 'utf8') : ''
const ownerCockpit = read('../features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx')
const main = read('../main.tsx')

const requiredPalette = ['#ecfdf5', '#d1fae5', '#34d399', '#059669', '#064e3b']

describe('escopo visual Base44 da Visão do Dono', () => {
  test('aplica o escopo somente no cockpit do Dono e mantém o sidebar fora dele', () => {
    expect(ownerCockpit).toContain('owner-base44-scope')
    expect(main).toContain("./styles/owner-base44-visual-scope.css")
    expect(ownerScopeCss).toContain('.owner-base44-scope')
    expect(ownerScopeCss).not.toContain('aside[')
    expect(ownerScopeCss).not.toContain("[role='dialog']")
  })

  test('preserva a paleta aprovada do Base44 dentro do escopo do Dono', () => {
    const normalized = ownerScopeCss.toLowerCase()
    for (const color of requiredPalette) expect(normalized).toContain(color)
  })

  test('usa Lexend no corpo e Outfit na hierarquia de títulos do Dono', () => {
    expect(ownerScopeCss).toContain("font-family: 'Lexend'")
    expect(ownerScopeCss).toContain("font-family: 'Outfit'")
    expect(ownerScopeCss).toContain('.owner-base44-scope :is(h1, h2, h3, h4, h5, h6)')
  })
})
