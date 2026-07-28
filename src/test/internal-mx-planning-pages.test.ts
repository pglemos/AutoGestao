import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const read = (path: string) => readFileSync(path, 'utf8')

const pages = {
  strategic: 'src/features/internal-mx-planning/InternalStrategicPlanPage.tsx',
  action: 'src/features/internal-mx-planning/InternalActionPlanPage.tsx',
  consulting: 'src/features/internal-mx-planning/InternalConsultingPage.tsx',
}

describe('páginas de planejamento do módulo interno MX', () => {
  test('usa a fundação compartilhada sem importar páginas ou provider do Dono', () => {
    for (const page of Object.values(pages)) {
      const source = read(page)
      expect(source).toContain('InternalMxPlanningShell')
      expect(source).not.toContain('@/pages/owner/')
      expect(source).not.toContain('OwnerProvider')
    }
    expect(read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')).toContain('PlanningWorkspaceProvider')
  })

  test('monta as três superfícies funcionais canônicas', () => {
    expect(read(pages.strategic)).toContain('StrategicPlanWorkspace')
    expect(read(pages.action)).toContain('ActionPlanWorkspace')
    expect(read(pages.consulting)).toContain('ConsultingJourneyWorkspace')
  })

  test('mantém overlays nos próprios workspaces acima da navegação', () => {
    expect(read('src/features/consulting-journey/components/ConsultingMeetingDialog.tsx')).toContain('z-[140]')
    expect(read('src/features/action-plan/components/DeleteActionDialog.tsx')).toContain('Dialog')
    expect(read('src/features/strategic-plan/StrategicPlanWorkspace.tsx')).not.toContain('fixed inset-0 z-50')
  })

  test('mantém seleção global de loja e realtime compartilhado', () => {
    const shell = read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')
    const realtime = read('src/features/planning-workspace/usePlanningRealtime.ts')
    expect(shell).toContain('useStores')
    expect(shell).toContain("url.searchParams.set('storeId'")
    expect(realtime).toContain('strategic:')
    expect(realtime).toContain('action:')
    expect(realtime).toContain('consulting:')
  })
})
