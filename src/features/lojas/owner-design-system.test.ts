import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

const sources = {
  container: read('./Lojas.container.tsx'),
  header: read('./sections/LojasHeader.tsx'),
  executive: read('./sections/OwnerExecutiveSection.tsx'),
  metrics: read('./sections/CorporateMetricsSection.tsx'),
  grid: read('./sections/StoresGridSection.tsx'),
  columns: read('./data/storeColumns.tsx'),
  loading: read('./sections/LojasLoadingSkeleton.tsx'),
}

function hasLegacyUppercaseTrackingPair(source: string) {
  const classAttributes = source.match(/className\s*=\s*(?:"[^"]*"|'[^']*')/g) || []
  return classAttributes.some(
    (classAttribute) =>
      /\buppercase\b/.test(classAttribute) && /\btracking(?:-[\w-]+)?\b/.test(classAttribute),
  )
}

describe('design system do módulo Dono', () => {
  test('usa a mesma fundação de página e cabeçalho do Gerente', () => {
    expect(sources.container).toContain('MxModulePage')
    expect(sources.header).toContain('MxModuleHeader')
    expect(sources.loading).toContain('MxModulePage')
    expect(sources.loading).toContain('MxLoadingState')
    expect(sources.header).not.toContain('PageHeading')
  })

  test('usa superfícies e métricas canônicas', () => {
    expect(sources.executive).toContain('MxSectionCard')
    expect(sources.metrics).toContain('MxMetricCard')
    expect(sources.grid).toContain('MxSectionCard')
  })

  test('remove marcas da composição visual antiga', () => {
    for (const source of Object.values(sources)) {
      expect(source).not.toContain('font-black')
      expect(source).not.toContain('bg-mx-black')
      expect(source).not.toContain('backdrop-blur')
      expect(hasLegacyUppercaseTrackingPair(source)).toBe(false)
      expect(source).not.toContain('group-hover:rotate')
    }
  })

  test('mantém cabeçalhos e ações em linguagem natural', () => {
    for (const header of ['Unidade', 'Status', 'Operacional', 'Pré-cadastro', 'Ações']) {
      expect(sources.columns).toContain(`header: '${header}'`)
    }
    expect(sources.header).toContain('Nova loja')
    expect(sources.header).toContain('Localizar loja')
  })

  test('expõe edição da filial e o link real do pré-cadastro na rede', () => {
    expect(sources.container).toContain('<StoreEditModal')
    expect(sources.columns).toContain('onEditStore: (store: Store) => void')
    expect(sources.columns).toContain('href={getRegistrationLink(store.name)}')
  })
})
