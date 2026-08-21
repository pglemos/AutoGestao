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
      expect(source).not.toContain('@/pages/owner/')
      expect(source).not.toContain('OwnerProvider')
    }
    expect(read(pages.strategic)).toContain('InternalMxPlanningShell')
    expect(read(pages.action)).toContain('InternalMxPlanningShell')
    expect(read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')).toContain('PlanningWorkspaceProvider')
  })

  test('monta as três superfícies funcionais canônicas', () => {
    expect(read(pages.strategic)).toContain('StrategicPlanWorkspace')
    expect(read(pages.action)).toContain('ActionPlanWorkspace')
    expect(read(pages.consulting)).toContain('AdminConsultingOverviewPage')
  })

  test('monta o overview administrativo no modo operação sem duplicar shell de planejamento', () => {
    const consultingPage = read(pages.consulting)
    expect(consultingPage).toContain('<AdminConsultingOverviewPage />')
    expect(consultingPage).not.toContain('ConsultingJourneyWorkspace')
    expect(consultingPage).not.toContain('InternalMxPlanningShell')
    expect(consultingPage).not.toContain('className="-mx-4 lg:-mx-6"')
  })

  test('mantém overlays nos próprios workspaces acima da navegação', () => {
    const meetingDialog = read('src/features/consulting-journey/components/ConsultingMeetingDialog.tsx')
    expect(meetingDialog).toContain('<DialogContent')
    expect(meetingDialog).toContain('<DialogBody')
    expect(meetingDialog).toContain('mx-overlay-close')
    expect(read('src/features/action-plan/components/DeleteActionDialog.tsx')).toContain('Dialog')
    expect(read('src/features/strategic-plan/StrategicPlanWorkspace.tsx')).not.toContain('fixed inset-0 z-[var(--mx-z-overlay)]')
  })

  test('mantém seleção global de loja e realtime compartilhado', () => {
    const shell = read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')
    const realtime = read('src/features/planning-workspace/usePlanningRealtime.ts')
    expect(shell).toContain('useStores')
    expect(shell).toContain("params.set('storeId'")
    expect(shell).toContain("navigate({ pathname: location.pathname")
    expect(shell).toContain('{ replace: true }')
    expect(realtime).toContain('strategic:')
    expect(realtime).toContain('action:')
    expect(realtime).toContain('consulting:')
  })

  // Decisão de produto (2026-08-05): o Plano de Ação saiu do módulo do gerente.
  // A rota atende apenas dono e perfis internos MX; gerente e vendedor caem em
  // ForbiddenRoute, e `ScopedActionPlanPage` foi removido por ficar sem uso.
  test('bloqueia gerente e vendedor na rota de plano de ação', () => {
    const app = read('src/App.tsx')
    const planRoute = app
      .split('\n')
      .find((line) => line.includes('path="plano-acao"')) || ''

    expect(planRoute).toContain('gerente={<ForbiddenRoute />}')
    expect(planRoute).toContain('vendedor={<ForbiddenRoute />}')
    expect(planRoute).toContain('dono={<OwnerPlanoDeAcao />}')
    expect(planRoute).toContain('admin={<InternalActionPlanPage />}')
    expect(app).not.toContain('ScopedActionPlanPage')
  })
})
