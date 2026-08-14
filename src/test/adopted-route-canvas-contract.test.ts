import { describe, expect, test } from 'bun:test'

import { inspectAdoptedRouteCanvas } from '../../scripts/lint-adopted-route-canvas.mjs'

const run = (appSource: string, metadataSource: string, files: Record<string, string>) =>
  inspectAdoptedRouteCanvas({
    appSource,
    metadataSource,
    readFile: (rel) => files[rel] ?? null,
  })

const routes = (body: string) =>
  `export function AppRoutes() { return <Routes>${body}</Routes> }`

describe('contrato de rotas adotadas × canvas (routeLayoutMetadata adopted:true)', () => {
  test('RED: flagra raiz adotada sem PageCanvas/PageTemplate', () => {
    const result = run(
      `const Organograma = lazy(() => import('@/features/organograma/OrganogramaPage'))
       ${routes(`<Route path="organograma" element={<RoleSwitch dono={<Organograma />} admin={<ForbiddenRoute />} />} />`)}`,
      `const layouts = { organograma: { width: 'dashboard', adopted: true } }`,
      {
        'src/features/organograma/OrganogramaPage.tsx':
          `export function OrganogramaPage() { return <div className="min-h-full"><h1>x</h1></div> }`,
      },
    )

    expect(result.pass).toBe(false)
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'missing-canvas', route: 'organograma' }),
      ]),
    )
  })

  test('RED: flagra width incompatível com a metadata', () => {
    const result = run(
      `const GerentePDI = lazy(() => import('@/pages/GerentePDI'))
       ${routes(`<Route path="pdi" element={<GerentePDI />} />`)}`,
      `const layouts = { pdi: { width: 'dashboard', adopted: true } }`,
      {
        'src/pages/GerentePDI.tsx':
          `import { PageCanvas } from '@/design-system/page'
           export function GerentePDI() { return <PageCanvas width="wide"><p>x</p></PageCanvas> }`,
      },
    )

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'width-mismatch', route: 'pdi' }),
      ]),
    )
  })

  test('RED: adopted sem clearance explícito na metadata não pode declarar clearance na página', () => {
    const result = run(
      `const FunilVendasGerente = lazy(() => import('@/features/gerente/FunilVendasGerente'))
       ${routes(`<Route path="funil-vendas" element={<FunilVendasGerente />} />`)}`,
      `const layouts = { 'funil-vendas': { width: 'dashboard', adopted: true } }`,
      {
        'src/features/gerente/FunilVendasGerente.tsx':
          `import { PageCanvas } from '@/design-system/page'
           export function FunilVendasGerente() { return <PageCanvas width="dashboard" bottomClearance="navigation"><p>x</p></PageCanvas> }`,
      },
    )

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: 'clearance-mismatch',
          route: 'funil-vendas',
        }),
      ]),
    )
  })

  test('GREEN: PageTemplate com width/clearance compatíveis passa', () => {
    const result = run(
      `const VendedorAjuda = lazy(() => import('@/pages/VendedorAjuda'))
       ${routes(`<Route path="ajuda" element={<VendedorAjuda />} />`)}`,
      `const layouts = { ajuda: { width: 'dashboard', bottomClearance: 'navigation', adopted: true } }`,
      {
        'src/pages/VendedorAjuda.tsx':
          `import { PageTemplate } from '@/components/templates/PageTemplate'
           export function VendedorAjuda() { return <PageTemplate as="div" width="dashboard" bottomClearance="navigation"><h1>ajuda</h1></PageTemplate> }`,
      },
    )

    expect(result.pass).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('RED: largura resolvida via resolveRouteLayout + useLocation é reconhecida como width dinâmico da metadata', () => {
    const result = run(
      `const DashboardLoja = lazy(() => import('@/pages/DashboardLoja'))
       ${routes(`<Route path="departamentos" element={<RoleSwitch dono={<DashboardLoja />} admin={<ForbiddenRoute />} />} />`)}`,
      `const layouts = { departamentos: { width: 'wide', adopted: true }, decisoes: { width: 'dashboard' } }`,
      {
        'src/pages/DashboardLoja.tsx':
          `export { DashboardLoja, default } from '@/features/dashboard-loja/DashboardLoja.container'`,
        'src/features/dashboard-loja/DashboardLoja.container.tsx':
          `import { PageCanvas, resolveRouteLayout } from '@/design-system/page'
           import { useLocation } from 'react-router-dom'
           export function DashboardLoja() {
             const location = useLocation()
             return <PageCanvas as="div" width={resolveRouteLayout(location.pathname).width} bottomClearance="navigation"><h1>x</h1></PageCanvas>
           }`,
      },
    )

    expect(result.pass).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('RED: wrapper de página que delega a outro componente segue até o canvas real', () => {
    const result = run(
      `const OwnerStoresNetworkPage = lazy(() => import('@/features/owner/OwnerStoresNetworkPage'))
       ${routes(`<Route path="minhas-lojas" element={<OwnerStoresNetworkPage />} />`)}`,
      `const layouts = { 'minhas-lojas': { width: 'wide', adopted: true } }`,
      {
        'src/features/owner/OwnerStoresNetworkPage.tsx':
          `import { NetworkDashboardPage } from '@/features/network-dashboard/NetworkDashboardPage'
           export default function OwnerStoresNetworkPage() { return <NetworkDashboardPage scope="owner" /> }`,
        'src/features/network-dashboard/NetworkDashboardPage.tsx':
          `import { MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
           import { resolveRouteLayout } from '@/design-system/page'
           import { useLocation } from 'react-router-dom'
           export function NetworkDashboardPage() {
             const location = useLocation()
             return <MxModulePage id="network" width={resolveRouteLayout(location.pathname).width}><h1>rede</h1></MxModulePage>
           }`,
      },
    )

    expect(result.pass).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('RED: largura dinâmica sem resolveRouteLayout continua não-literal', () => {
    const result = run(
      `const Pagina = lazy(() => import('@/pages/Pagina'))
       ${routes(`<Route path="pagina" element={<Pagina />} />`)}`,
      `const layouts = { pagina: { width: 'wide', adopted: true } }`,
      {
        'src/pages/Pagina.tsx':
          `import { PageCanvas } from '@/design-system/page'
           import { useLocation } from 'react-router-dom'
           export default function Pagina() {
             const location = useLocation()
             return <PageCanvas as="div" width={location.pathname.length}><h1>x</h1></PageCanvas>
           }`,
      },
    )

    expect(result.pass).toBe(false)
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'non-literal-canvas-prop', route: 'pagina' }),
      ]),
    )
  })

  test('GREEN: ignora ForbiddenRoute/Navigate e exige canvas do componente realmente renderizado', () => {
    const result = run(
      `const Checkin = lazy(() => import('@/features/checkin/Checkin.container'))
       ${routes(`<Route path="terminal-mx" element={<RoleSwitch vendedor={<Checkin />} gerente={<ForbiddenRoute />} dono={<Navigate to="/home" />} admin={<ForbiddenRoute />} />} />`)}`,
      `const layouts = { 'terminal-mx': { width: 'dashboard', bottomClearance: 'navigation', adopted: true } }`,
      {
        'src/features/checkin/Checkin.container.tsx':
          `import { PageCanvas } from '@/design-system/page'
           export default function Checkin() { return <div className="relative min-h-full bg-surface-alt"><PageCanvas width="dashboard" bottomClearance="navigation"><p>x</p></PageCanvas></div> }`,
      },
    )

    expect(result.pass).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('GREEN: MxModulePage na raiz com width/clearance compatíveis passa', () => {
    const result = run(
      `const Lojas = lazy(() => import('@/pages/Lojas'))
       ${routes(`<Route path="lojas" element={<Lojas />} />`)}`,
      `const layouts = { lojas: { width: 'wide', adopted: true } }`,
      {
        'src/pages/Lojas.tsx':
          `import { MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
           export default function Lojas() { return <MxModulePage width="wide"><h1>lojas</h1></MxModulePage> }`,
      },
    )

    expect(result.pass).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('RED: MxModulePage com width divergente da metadata gera width-mismatch', () => {
    const result = run(
      `const Lojas = lazy(() => import('@/pages/Lojas'))
       ${routes(`<Route path="lojas" element={<Lojas />} />`)}`,
      `const layouts = { lojas: { width: 'wide', adopted: true } }`,
      {
        'src/pages/Lojas.tsx':
          `import { MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
           export default function Lojas() { return <MxModulePage width="dashboard"><h1>lojas</h1></MxModulePage> }`,
      },
    )

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'width-mismatch', route: 'lojas' }),
      ]),
    )
  })

  test('GREEN: re-export de página (ADR-0050) é seguido até o container com canvas', () => {
    const result = run(
      `const Lojas = lazy(() => import('@/pages/Lojas'))
       ${routes(`<Route path="lojas" element={<Lojas />} />`)}`,
      `const layouts = { lojas: { width: 'wide', adopted: true } }`,
      {
        'src/pages/Lojas.tsx': `export { default } from '@/features/lojas/Lojas.container'`,
        'src/features/lojas/Lojas.container.tsx':
          `import { MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
           export default function Lojas() { return <MxModulePage width="wide"><h1>lojas</h1></MxModulePage> }`,
      },
    )

    expect(result.pass).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('RED: re-export seguido ainda flagra width divergente no container', () => {
    const result = run(
      `const Lojas = lazy(() => import('@/pages/Lojas'))
       ${routes(`<Route path="lojas" element={<Lojas />} />`)}`,
      `const layouts = { lojas: { width: 'wide', adopted: true } }`,
      {
        'src/pages/Lojas.tsx': `export { default } from '@/features/lojas/Lojas.container'`,
        'src/features/lojas/Lojas.container.tsx':
          `import { MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
           export default function Lojas() { return <MxModulePage width="dashboard"><h1>lojas</h1></MxModulePage> }`,
      },
    )

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'width-mismatch', route: 'lojas' }),
      ]),
    )
  })

  test('RED: tag renderizada sem resolução de arquivo gera falha clara', () => {
    const result = run(
      `const Desconhecida = lazy(() => import('@/features/x/Desconhecida'))
       ${routes(`<Route path="x" element={<Desconhecida />} />`)}`,
      `const layouts = { x: { width: 'dashboard', adopted: true } }`,
      {},
    )

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'unresolved-root', route: 'x' }),
      ]),
    )
  })
})
