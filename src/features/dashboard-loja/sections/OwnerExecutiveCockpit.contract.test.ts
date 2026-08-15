import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./OwnerExecutiveCockpit.tsx', import.meta.url), 'utf8')
const dashboardSource = readFileSync(
  new URL('../DashboardLoja.container.tsx', import.meta.url),
  'utf8',
)

describe('OwnerExecutiveCockpit data-backed sections', () => {
  test('não importa nem renderiza placeholders para as rotas do Dono', () => {
    expect(source).not.toContain('@/pages/owner/Placeholders')
    expect(source).toContain('OwnerRoutineView')
    expect(source).toContain('OwnerDecisionCenter')
    expect(source).toContain('DepartmentsView')
    expect(source).toContain('BenchmarkingView')
    expect(source).toContain('universityContent')
  })

  test('mantém o cockpit do Dono dentro do PageCanvas canônico', () => {
    const canvasTag = dashboardSource.match(/<PageCanvas\b[^>]*>/)?.[0] ?? ''
    expect(canvasTag).toContain('as="div"')
    // Largura resolvida da metadata da rota (Padrão A C7): DashboardLoja é
    // compartilhado por rotas dashboard/wide/focused e segue a metadata em vez
    // de um literal fixo. O contrato passa a exigir a resolução dinâmica.
    expect(canvasTag).toMatch(/width=\{pageWidth\}/)
    expect(dashboardSource).toContain('resolveRouteLayout(location.pathname)')
    expect(source).not.toContain('p-mx-sm')
    expect(source).not.toContain('md:p-mx-lg')
  })

  test('não aninha canvas ao renderizar Universidade MX dentro do cockpit', () => {
    expect(source).toContain('<UniversidadeMx userId={profile?.id ?? null} embedded />')
  })

  test('não aninha canvas ao renderizar a Meta da Loja no DashboardLoja', () => {
    expect(dashboardSource).toContain('onStoreChange={setActiveStoreId} embedded />')
  })
})
