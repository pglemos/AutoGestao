import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ownerCockpit = read('../features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx')
const main = read('../main.tsx')
const layout = read('../components/Layout.tsx')
const ownerModule = read('../features/owner-base44/OwnerModule.tsx')

describe('escopo visual universal do módulo Dono', () => {
  test('usa somente o shell e o escopo visual canônicos do MX', () => {
    expect(main).toContain("./styles/manager-visual-scope.css")
    expect(main).not.toContain('owner-base44-visual-scope')
    expect(layout).toContain('<MxRoleVisualScope manager={role !== \'vendedor\'}>')
    expect(layout).not.toContain('isOwnerRoute')
    expect(ownerModule).not.toContain('owner-base44-exact')
    expect(ownerModule).not.toContain('owner-b44')
    expect(ownerCockpit).not.toContain('owner-base44-scope')
  })

  test('estados vazios usam tokens semânticos do design system MX', () => {
    for (const file of [
      '../features/dashboard-loja/sections/owner-cockpit/ActionPlanView.tsx',
      '../features/dashboard-loja/sections/owner-cockpit/AgendaView.tsx',
      '../features/dashboard-loja/sections/owner-cockpit/ConsultingProgramCard.tsx',
      '../features/dashboard-loja/sections/owner-cockpit/DepartmentsView.tsx',
    ]) {
      expect(read(file)).not.toContain('owner-base44-exact__empty-state')
    }
  })
})
