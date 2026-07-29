import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ownerCockpit = read('../features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx')
const main = read('../main.tsx')
const app = read('../App.tsx')
const layout = read('../components/Layout.tsx')
const appShell = read('../components/AppShell.tsx')
const ownerStyles = read('../styles/owner-base44-exact.css')

describe('escopo visual Base44 aprovado do módulo Dono', () => {
  test('monta o Dono no shell universal com providers e tokens executivos', () => {
    expect(app).toContain("const AppShell = lazy(() => import('@/components/AppShell'))")
    expect(appShell).toContain('<Layout />')
    expect(appShell).not.toContain('OwnerShell')
    expect(main).not.toContain('owner-base44-visual-scope')
    expect(layout).toContain('<OwnerProvider>')
    expect(layout).toContain('owner-base44-exact')
    expect(layout).toContain('sidebarLabel={`Menu principal do ${perfilVisivel}`}')
    expect(ownerCockpit).not.toContain('owner-base44-scope')
  })

  test('tokens do design aprovado ficam escopados ao módulo', () => {
    expect(ownerStyles).toContain(".mx-ds[data-mx-role='dono']")
    expect(ownerStyles).not.toContain('.owner-b44')
    expect(ownerStyles).toContain('--primary: 152 69% 31%')
    expect(ownerStyles).toContain('--color-primary: hsl(var(--primary))')
  })
})
