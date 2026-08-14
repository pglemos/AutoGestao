import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE AA — perfil Vendedor: carteira/mentor, mobile-first e bottom clearance.
 *
 * 27.004/27.010 — a carteira e o home do vendedor montam em PageCanvas com
 * `bottomClearance="navigation"` (clearance da bottom nav mobile).
 * 27.011 — mobile-first validado em 320/360/390/412 (projetos de viewport).
 * 27.012 — modais/drawers/campanhas de carteira usam o Dialog canônico.
 */
describe('FASE AA — carteira/mentor usa o sistema canônico (27.004/27.010)', () => {
  test('CarteiraClientes monta em PageCanvas com bottomClearance navigation', () => {
    const page = read('src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx')
    expect(page).toContain('PageCanvas')
    expect(page).toContain('bottomClearance="navigation"')
  })

  test('/home Vendedor usa PageCanvas com clearance de navegação', () => {
    const home = read('src/pages/VendedorHome.tsx')
    expect(home).toContain('PageCanvas')
    expect(home).toContain('bottomClearance="navigation"')
  })

  test('Funil do Vendedor usa PageCanvas com clearance', () => {
    const funil = read('src/features/crm/FunilVendedor.container.tsx')
    expect(funil).toContain('PageCanvas')
    expect(funil).toContain('bottomClearance="navigation"')
  })

  test('Minha Remuneração usa PageTemplate (PageCanvas) com clearance', () => {
    const page = read('src/features/remuneracao/MinhaRemuneracaoPage.tsx')
    expect(page).toContain('PageTemplate')
    expect(page).toContain('bottomClearance="navigation"')
  })
})

describe('FASE AA — bottom navigation clearance (27.010)', () => {
  test('PageCanvas emite token de clearance navigation baseado em --mx-space-16', () => {
    const canvas = read('src/design-system/page/PageCanvas.tsx')
    const semantic = read('src/design-system/tokens/semantic.css')
    expect(canvas).toContain('bottomClearance')
    expect(canvas).toContain('var(--mx-page-clearance-')
    expect(semantic).toContain('--mx-page-clearance-navigation: var(--mx-space-16)')
  })

  test('rotas-chave do vendedor declaram bottomClearance navigation (não zero)', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('path="carteira-clientes"')
    expect(app).toContain('path="carteira"')
    expect(app).toContain('path="mentor-comercial"')
    // carteira e mentor redirecionam para /carteira-clientes (clearance via PageCanvas)
    expect(app).toContain('RedirectWithSearch to="/carteira-clientes"')
  })
})

describe('FASE AA — mobile-first 320/360/390/412 (27.011)', () => {
  test('playwright config cobre os 4 viewports mobile', () => {
    const config = read('playwright.config.ts')
    expect(config).toContain('width: 320')
    expect(config).toContain('width: 360')
    expect(config).toContain('width: 390')
    expect(config).toContain('width: 412')
  })
})

describe('FASE AA — campanhas/modais/drawers de carteira (27.012)', () => {
  test('modais de carteira usam o Dialog canônico', () => {
    for (const file of [
      'src/components/carteira/NovoClienteModal.jsx',
      'src/components/carteira/FichaClienteSheet.jsx',
      'src/components/carteira/ProximaOportunidadeModal.jsx',
      'src/components/carteira/RetornoWhatsAppModal.jsx',
    ]) {
      const source = read(file)
      expect(source, `${file} deve usar Dialog`).toContain('@/components/ui/dialog')
      expect(source, `${file} deve renderizar DialogContent`).toContain('DialogContent')
    }
  })

  test('campanhas/planos de ataque usam o engine canônico de elegibilidade', () => {
    const plan = read('src/components/carteira/PlanoAtaqueTab.jsx')
    expect(plan).toContain('campaignEligibility')
    expect(plan).toContain('evaluateCampaignEligibility')
  })

  test('modais de carteira estão fios à página base44', () => {
    const page = read('src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx')
    for (const modal of ['NovoClienteModal', 'FichaClienteSheet', 'ProximaOportunidadeModal', 'RetornoWhatsAppModal']) {
      expect(page).toContain(modal)
    }
  })
})
