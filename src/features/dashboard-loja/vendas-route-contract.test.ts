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

  test('resolve /vendas e ?tab=vendas para a tabela histórica escopada por loja', () => {
    const dashboard = read('src/features/dashboard-loja/DashboardLoja.container.tsx')
    const goalReference = read('src/features/manager/meta/ManagerStoreGoalReference.tsx')
    const resolution = read('src/features/dashboard-loja/hooks/useStoreResolution.ts')
    const hook = read('src/features/vendas-loja/hooks/useVendasLoja.ts')

    expect(dashboard).toContain("location.pathname === '/vendas'")
    expect(dashboard).toContain("tab === 'metas' || tab === 'equipe' || tab === 'vendas'")
    expect(dashboard).toContain('<VendasFechadasLoja')
    expect(dashboard).not.toContain('periodStartDate={data.periodStartDate}')
    expect(dashboard).not.toContain('periodEndDate={data.periodEndDate}')
    expect(dashboard).not.toContain('activeSellerIds=')
    expect(goalReference).not.toContain('activeSellerIds=')
    expect(goalReference).not.toContain('periodStartDate={data.periodStartDate}')
    expect(goalReference).not.toContain('periodEndDate={data.periodEndDate}')
    expect(resolution).toContain("location.pathname !== '/vendas'")
    expect(hook).toContain(".from('eventos_comerciais')")
    expect(hook).toContain(".eq('loja_id', storeId)")
    expect(hook).toContain(".in('tipo_evento', ['venda_realizada', 'venda_cancelada'])")
    expect(hook).toContain('evento_origem_id')
    expect(hook).not.toContain(".in('seller_user_id'")
    expect(hook).toContain('.range(from, from + pageSize - 1)')
    expect(hook).not.toContain(".from('oportunidades')")
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
