import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const read = (path: string) => readFileSync(path, 'utf8')

describe('regressão do MDV — vendas da loja', () => {
  test('mantém a rota, autorização e classificação de layout da superfície própria', () => {
    const app = read('src/App.tsx')
    const access = read('src/lib/auth/routeAccess.ts')
    const metadata = read('src/design-system/page/routeLayoutMetadata.ts')

    expect(app).toContain('path="vendas"')
    expect(app).toContain('gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />}')
    expect(access).toContain("{ pattern: '/vendas', roles: MANAGEMENT_ROLES }")
    expect(metadata).toContain("vendas: { width: 'dashboard' }")
  })

  test('resolve /vendas e ?tab=vendas para a tabela fechada escopada por loja', () => {
    const dashboard = read('src/features/dashboard-loja/DashboardLoja.container.tsx')
    const resolution = read('src/features/dashboard-loja/hooks/useStoreResolution.ts')
    const hook = read('src/features/vendas-loja/hooks/useVendasLoja.ts')

    expect(dashboard).toContain("location.pathname === '/vendas'")
    expect(dashboard).toContain("tab === 'metas' || tab === 'equipe' || tab === 'vendas'")
    expect(dashboard).toContain('<VendasFechadasLoja')
    expect(resolution).toContain("location.pathname !== '/vendas'")
    expect(hook).toContain(".eq('loja_id', storeId)")
    expect(hook).toContain(".in('etapa', ['ganho', 'cancelada'])")
  })

  test('expõe Vendas no menu canônico e preserva o alias /gerente/vendas', () => {
    const layout = read('src/components/Layout.tsx')
    const internalNavigation = read('src/design-system/internal-mx/internalMxNavigation.tsx')
    const legacyPaths = read('src/lib/navigation/managerLegacyPaths.ts')

    expect(layout).toContain("{ label: 'Vendas', path: '/vendas'")
    expect(internalNavigation).toContain("label: 'Vendas', path: '/vendas'")
    expect(legacyPaths).toContain("'vendas': '/vendas'")
  })
})
