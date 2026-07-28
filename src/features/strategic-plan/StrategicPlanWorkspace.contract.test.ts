import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const read = (path: string) => readFileSync(path, 'utf8')

describe('workspace estratégico compartilhado', () => {
  test('wrappers usam a mesma view sem importar um ao outro', () => {
    const owner = read('src/pages/owner/PlanoEstrategico.jsx')
    const internal = read('src/features/internal-mx-planning/InternalStrategicPlanPage.tsx')
    expect(owner).toContain('StrategicPlanWorkspace')
    expect(owner).toContain('PlanningWorkspaceProvider')
    expect(owner).toContain('useCallback')
    expect(owner).toContain('onUpdated={handleUpdated}')
    expect(owner).not.toContain('onUpdated={(at) =>')
    expect(internal).toContain('StrategicPlanWorkspace')
    expect(internal).toContain('InternalMxPlanningShell')
    expect(internal).not.toContain('@/pages/owner/')
  })

  test('workspace preserva composição funcional final', () => {
    const source = read('src/features/strategic-plan/StrategicPlanWorkspace.tsx')
    expect(source).toContain('StrategicPlanTabs')
    expect(source).toContain('StrategicIndicatorSummaryCards')
    expect(source).toContain('StrategicIndicatorComparisonTable')
    expect(source).toContain('StrategicIndicatorChart')
    expect(source).toContain('xl:grid-cols-[58%_42%]')
    expect(source).toContain('height={360}')
  })

  test('Consultoria do Dono preserva o resumo aprovado com dados reais', () => {
    const source = read('src/pages/owner/Consultoria.jsx')

    expect(source).toContain('useOwnerConsultingProgram')
    expect(source).toContain('Acompanhe o programa e os encontros persistidos da unidade.')
    expect(source).toContain('Jornada do programa')
    expect(source).not.toContain('ConsultingJourneyWorkspace')
  })
})
