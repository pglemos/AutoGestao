import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('Foundation Zero accessibility contracts', () => {
  test('names feedback actions, benchmarking selects and progress indicators', () => {
    const feedback = read('src/features/gerente-feedback/sections/FeedbackList.tsx')
    const benchmarking = read('src/features/dashboard-loja/sections/owner-cockpit/BenchmarkingView.tsx')
    const progress = read('src/components/ui/progress.jsx')

    expect(feedback).toMatch(/aria-label=\{`Compartilhar devolutiva de \$\{sellerName\}`\}/)
    expect(benchmarking).toContain('aria-label={label}')
    expect(progress).toContain("aria-label={props['aria-label'] ?? 'Progresso'}")
  })

  test('names action-plan icon controls and contextual checkboxes', () => {
    const kanban = read('src/components/owner/actionplan/board/KanbanCard.jsx')
    const list = read('src/components/owner/actionplan/board/ListView.jsx')

    expect(kanban).toMatch(/aria-label=\{`Ações para \$\{action\.title\}`\}/)
    expect(list).toContain('aria-label="Selecionar todas as ações"')
    expect(list).toMatch(/aria-label=\{`Selecionar ação \$\{action\.title\}`\}/)
    expect(list).toMatch(/aria-label=\{`Ações para \$\{action\.title\}`\}/)
    expect(list).toContain('role="region"')
    expect(list).toContain('aria-label="Lista de ações com rolagem horizontal"')
  })

  test('names strategic controls and only points tabs at mounted panels', () => {
    const indicator = read('src/components/owner/strategic/StrategicIndicatorSelector.jsx')
    const view = read('src/components/owner/strategic/ViewSelector.jsx')
    const display = read('src/components/owner/strategic/DisplayModeSelector.jsx')
    const tabs = read('src/components/owner/strategic/StrategicPlanTabs.jsx')

    expect(indicator).toContain('aria-label="Selecionar indicador"')
    expect(indicator).toContain('aria-label="Filtrar por área"')
    expect(view).toContain('aria-label="Selecionar visualização"')
    expect(display).toContain('aria-label={mode.label}')
    expect(tabs).toContain('aria-controls={active ? `spe-tab-panel-${t.value}` : undefined}')
  })

  test('marks loading and horizontal-scroll regions with their required semantics', () => {
    const routine = read('src/features/manager/day-routine/ManagerDayRoutineView.tsx')
    const today = read('src/features/central-execucao/tabs/HojeTab.tsx')
    const morning = read('src/features/morning-report/LegacyMorningReportPage.tsx')
    const consulting = read('src/pages/owner/Consultoria.jsx')

    expect(routine).toContain('role="status"')
    expect(routine).toContain('aria-label="Filtros da rotina"')
    expect(today).toContain('role="status"')
    expect(morning).toContain('role="status"')
    expect(morning).toContain('aria-label="Grade operacional da rede com rolagem horizontal"')
    expect(morning).toContain('aria-label="Grade operacional do time com rolagem horizontal"')
    expect(consulting).toContain('role="status"')
  })

  test('uses the readable info token for text on the info surface', () => {
    const pdi = read('src/pages/GerentePDI.tsx')
    expect(pdi).not.toMatch(/PDI como acompanhamento do Dono[\s\S]{0,260}text-status-info["']/)
    expect(pdi).toContain('text-status-info-text')
  })
})
