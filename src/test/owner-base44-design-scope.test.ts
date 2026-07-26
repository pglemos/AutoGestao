import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ownerCockpit = read('../features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx')
const main = read('../main.tsx')
const app = read('../App.tsx')
const layout = read('../components/Layout.tsx')
const ownerModule = read('../features/owner-base44/OwnerModule.tsx')
const ownerLayout = read('../components/owner/OwnerLayout.jsx')
const ownerStyles = read('../styles/owner-base44-exact.css')

describe('escopo visual Base44 aprovado do módulo Dono', () => {
  test('monta o Dono fora do shell universal e mantém o shell Base44 dedicado', () => {
    expect(app).toContain("const OwnerModule = lazy(() => import('@/features/owner-base44/OwnerModule'))")
    expect(app).toContain('path="/dono/*"')
    expect(main).not.toContain('owner-base44-visual-scope')
    expect(layout).toContain('const isOwnerRoute')
    expect(ownerModule).toContain('OwnerLayout')
    expect(ownerModule).toContain('owner-base44-exact')
    expect(ownerLayout).toContain('aria-label="Menu principal do Dono"')
    expect(ownerCockpit).not.toContain('owner-base44-scope')
  })

  test('tokens do design aprovado ficam escopados ao módulo', () => {
    expect(ownerStyles).toContain('.owner-b44')
    expect(ownerStyles).toContain('--primary: 152 69% 31%')
    expect(ownerStyles).toContain('--color-primary: hsl(var(--primary))')
  })
})
