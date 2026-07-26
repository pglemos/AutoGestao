import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const read = (path: string) => readFileSync(path, 'utf8')

describe('páginas de planejamento do módulo interno MX', () => {
  const pages = [
    'src/features/internal-mx-planning/InternalStrategicPlanPage.tsx',
    'src/features/internal-mx-planning/InternalActionPlanPage.tsx',
    'src/features/internal-mx-planning/InternalConsultingPage.tsx',
  ]

  test('não reutiliza telas, contexto ou shell do Dono', () => {
    for (const page of pages) {
      const source = read(page)
      expect(source).toContain('InternalMxPlanningShell')
      expect(source).not.toContain('@/pages/owner/')
      expect(source).not.toContain('InternalMxOwnerBridge')
      expect(source).not.toContain('OwnerProvider')
    }
  })

  test('mantém a superfície canônica do módulo Admin', () => {
    expect(read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')).toContain('MxModulePage')
    expect(read('src/features/internal-mx-planning/InternalStrategicPlanPage.tsx')).toContain('MxPageTabs')
    expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).toContain('Evidências')
    expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).toContain('Histórico')
    expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).toContain('Impacto')
  })

  test('mantém os modais acima da sidebar interna', () => {
    const actionPage = read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')
    const strategicPage = read('src/features/internal-mx-planning/InternalStrategicPlanPage.tsx')
    expect(actionPage.match(/fixed inset-0 z-50/g)).toBeNull()
    expect(strategicPage.match(/fixed inset-0 z-50/g)).toBeNull()
    expect(actionPage.match(/fixed inset-0 z-\[120\]/g)?.length).toBe(2)
    expect(strategicPage).toContain('fixed inset-0 z-[120]')
  })

  test('mantém a seleção global de loja e o realtime no módulo interno', () => {
    const source = read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')
    expect(source).toContain('useStores')
    expect(source).toContain("table: 'planos_acao'")
    expect(source).toContain("table: 'regras_metas_loja'")
    expect(source).toContain("table: 'clientes_consultoria'")
  })
})
