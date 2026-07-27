import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const migratedContainers = [
  'src/pages/Configuracoes.tsx',
  'src/pages/ManagerDevelopment.tsx',
  'src/features/digital-products/DigitalProductsPage.tsx',
]

describe('internal mx wave 2 architecture', () => {
  test('migrated containers use canonical page primitives', () => {
    for (const path of migratedContainers) {
      const source = read(path)
      if (path !== 'src/pages/Configuracoes.tsx') expect(source).toContain('MxModulePage')
      expect(source).not.toContain('PageHeading')
      expect(source).not.toMatch(/<main[\s>]/)
    }
    expect(read('src/features/configuracoes/components/ConfiguracoesShell.tsx')).toContain('MxModulePage')
    expect(read('src/features/configuracoes/components/ConfiguracoesShell.tsx')).toContain('MxModuleHeader')
  })

  test('configurations keep a single 13-tab registry and Option B internal parity', () => {
    const registry = read('src/features/configuracoes/tabRegistry.ts')
    const keys = registry.match(/key:\s*'[^']+'/g) ?? []
    expect(keys).toHaveLength(13)
    expect(registry).toContain('EquipeUsuariosTabRouter')
    expect(registry).not.toContain("readOnlyRoles: ['consultor_mx', 'dono']")
    expect(registry).not.toContain("readOnlyRoles: ['consultor_mx']")
    expect(registry.match(/readOnlyRoles: \['dono'\]/g) ?? []).toHaveLength(3)
  })

  test('development is decomposed into canonical metrics, filters and tables', () => {
    for (const path of [
      'src/features/manager/development/DevelopmentFeedbackMetrics.tsx',
      'src/features/manager/development/DevelopmentFeedbackFilters.tsx',
      'src/features/manager/development/DevelopmentFeedbackTable.tsx',
      'src/features/manager/development/DevelopmentPdiMetrics.tsx',
      'src/features/manager/development/DevelopmentPdiFilters.tsx',
      'src/features/manager/development/DevelopmentPdiTable.tsx',
    ]) expect(() => read(path)).not.toThrow()
  })

  test('digital products is decomposed by responsibility', () => {
    const page = read('src/pages/ProdutosDigitais.tsx')
    expect(page).toContain('DigitalProductsPage')
    expect(page.split('\n').length).toBeLessThanOrEqual(20)
    for (const path of [
      'src/features/digital-products/hooks/useDigitalProductsController.ts',
      'src/features/digital-products/lib/digitalProductPolicy.ts',
      'src/features/digital-products/lib/digitalProductSchema.ts',
      'src/features/digital-products/components/DigitalProductFormModal.tsx',
    ]) expect(() => read(path)).not.toThrow()
  })
})
