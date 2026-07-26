import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')

describe('Dono — contratos dos fluxos corrigidos', () => {
  test('rotas executivas usam o cockpit real e não páginas demonstrativas legadas', () => {
    const module = read('src/features/owner-base44/OwnerModule.tsx')
    expect(module).toContain("import OwnerLiveDataPage from '@/features/owner-base44/OwnerLiveDataPage'")
    expect(module).toContain('<Route path="*" element={<OwnerLiveDataPage />} />')
    expect(module).toContain('<Route path="plano-acao" element={<PlanoDeAcao />} />')
    expect(module).toContain('<OwnerProvider>')
    expect(module).toContain('<ConsultantRequestModal />')
    expect(module).not.toContain('OwnerLayout')
    expect(module).not.toContain('owner-base44-exact')
    expect(module).not.toContain("import OwnerHome from '@/pages/owner/OwnerHome'")
    expect(module).not.toContain("import PlanoEstrategico from '@/pages/owner/PlanoEstrategico'")
    expect(module).not.toContain("import Consultoria from '@/pages/owner/Consultoria'")
  })

  test('plano estratégico monta uma única matriz real', () => {
    const cockpit = read('src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx')
    expect(cockpit).toContain('<StrategicPlanningView data={data} planningIndicators={centralMx.planningIndicators} />')
    expect(cockpit).not.toContain('PlanejamentoEstrategico')
  })

  test('editar ação abre o formulário real e persiste no repositório live', () => {
    const page = read('src/pages/owner/PlanoDeAcao.jsx')
    expect(page).toContain('import EditActionModal from "@/components/owner/actionplan/EditActionModal"')
    expect(page).toContain('case "edit":')
    expect(page).toContain('await actionPlanLiveRepository.updateActionById(id, payload)')
    expect(page).toContain('<EditActionModal')
  })

  test('provider publica refresh e dashboard escuta o mesmo evento', () => {
    const context = read('src/components/owner/OwnerContext.jsx')
    const dashboard = read('src/features/dashboard-loja/hooks/useDashboardLojaData.ts')
    expect(context).toContain('new CustomEvent("owner:reload")')
    expect(dashboard).toContain('window.addEventListener(\'owner:reload\', onOwnerReload)')
    expect(dashboard).toContain('void handleRefresh()')
  })

  test('cockpit não esconde erro de fonte nem deixa o período só no texto', () => {
    const livePage = read('src/features/owner-base44/OwnerLiveDataPage.tsx')
    const dashboard = read('src/features/dashboard-loja/hooks/useDashboardLojaData.ts')
    expect(livePage).toContain('data.error')
    expect(dashboard).toContain('periodRange?.start')
    expect(dashboard).toContain('periodRange?.end')
    expect(dashboard).toContain('periodLabel')
  })

  test('gráfico executivo recebe dimensão inicial válida antes do ResizeObserver', () => {
    const widgets = read('src/features/dashboard-loja/sections/owner-cockpit/OwnerHomeWidgets.tsx')
    expect(widgets).toContain('initialDimension={{ width: 320, height: 250 }}')
  })

  test('previsão compara ritmo diário com necessidade diária', () => {
    const home = read('src/features/dashboard-loja/sections/owner-cockpit/OwnerHome.tsx')
    expect(home).toContain('const salesRunRate = data.metrics.totalSales / elapsedDays')
    expect(home).toContain('salesRunRate >= dailyNeed')
  })

  test('DRE não reaproveita registro fora do período selecionado', () => {
    const dashboard = read('src/features/dashboard-loja/hooks/useDashboardLojaData.ts')
    expect(dashboard).toContain('inRange.length > 0 ? computeDREFn(inRange[0]) : null')
  })
})
