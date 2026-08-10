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
    const canvasTag = dashboardSource.match(/<ConditionalPageCanvas\b[^>]*>/)?.[0] ?? ''
    expect(canvasTag).toContain('enabled={!isFocusedRolePerformance || isOwner}')
    expect(canvasTag).toContain('as="div"')
    expect(source).not.toContain('p-mx-sm')
    expect(source).not.toContain('md:p-mx-lg')
  })
})
