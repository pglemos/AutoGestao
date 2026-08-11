import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('contrato do viewport de página', () => {
  it('define o único scroll owner vertical da página', () => {
    const viewport = read('src/design-system/page/PageViewport.tsx')
    const shell = read('src/components/MxSidebarShell.tsx')

    expect(viewport).toContain('data-mx-page-viewport=""')
    expect(viewport).toContain('overflow-y-auto')
    expect(viewport).toContain('overflow-x-hidden')
    expect(shell).toContain('<PageViewport>')
    expect(shell).not.toContain('overflow-y-auto overflow-x-hidden')
  })

  it('não permite que PageTemplate crie um segundo scroll owner', () => {
    const template = read('src/components/templates/PageTemplate.tsx')

    expect(template).not.toContain('overflow-y-auto')
    expect(template).not.toContain('data-mx-page-scroller=""')
    expect(template).toContain("as = 'div'")
  })

  it('mantém uma única landmark main no shell autenticado', () => {
    const shell = read('src/components/MxSidebarShell.tsx')
    const pageTemplate = read('src/components/templates/PageTemplate.tsx')

    expect((shell.match(/<main\b/g) ?? []).length).toBe(1)
    expect(pageTemplate).not.toContain("as = 'main'")
  })

  it('não permite scroll vertical concorrente nos wrappers de página delegados', () => {
    const modulePrimitives = read('src/components/module/MxModuleVisualPrimitives.tsx')
    const funnel = read('src/features/crm/FunilVendedor.container.tsx')
    const slotStyles = read('src/styles/internal-mx-template-slots.css')
    const canonicalStyles = read('src/styles/internal-mx-canonical-template.css')

    expect(modulePrimitives).not.toContain('overflow-y-auto')
    expect(funnel).not.toContain('overflow-y-auto')
    expect(slotStyles).not.toMatch(/data-mx-template-body\][^{]*\{[^}]*overflow-y-auto/s)
    expect(slotStyles).not.toMatch(/data-mx-template-page\][^{]*\{[^}]*overflow-y-auto/s)
    expect(canonicalStyles).not.toMatch(/data-mx-module-page\][^{]*\{[^}]*overflow-y-auto/s)
  })
})
