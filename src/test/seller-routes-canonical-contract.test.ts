import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE AA — perfil Vendedor: todas as rotas no sistema canônico (27.001-27.009).
 *
 * Nenhuma rota do Vendedor deve ter página "solta" fora do sistema: toda
 * superfície monta em PageCanvas/PageTemplate/MxModulePage e o shell emite
 * `main#main-content` único. O bottom nav mobile exige `bottomClearance=
 * "navigation"` nas rotas com bottom nav. Este contrato fixa cada raiz
 * vendedor para o drift regressivo não voltar.
 */
describe('FASE AA — rotas do Vendedor usam o sistema canônico (27.001-27.009)', () => {
  test('/home Vendedor monta em PageCanvas com clearance de navegação', () => {
    const home = read('src/pages/VendedorHome.tsx')
    expect(home).toContain('PageCanvas')
    expect(home).toContain('bottomClearance="navigation"')
  })

  test('Central de Execução monta em PageCanvas canônico', () => {
    const page = read('src/features/central-execucao/pages/CentralExecucaoPage.tsx')
    expect(page).toContain('PageCanvas')
    expect(page).toContain('bottomClearance="navigation"')
  })

  test('Fechamento Diário/Terminal MX usa Checkin em PageCanvas canônico', () => {
    const checkin = read('src/features/checkin/Checkin.container.tsx')
    expect(checkin).toContain('PageCanvas')
    expect(checkin).toContain('bottomClearance={pageBottomClearance}')
  })

  test('Minha Meta/Funil monta em PageCanvas com clearance', () => {
    const funil = read('src/features/crm/FunilVendedor.container.tsx')
    expect(funil).toContain('PageCanvas')
    expect(funil).toContain('bottomClearance="navigation"')
  })

  test('Ranking/Classificação usa a visão canônica da loja (PageCanvas)', () => {
    const storeView = read('src/features/ranking/views/StoreRankingView.tsx')
    expect(storeView).toContain('PageCanvas')
    expect(storeView).toContain('bottomClearance="navigation"')
  })

  test('Universidade MX/Treinamentos e Desenvolvimento usam rotas canônicas', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('path="universidade-mx"')
    expect(app).toContain('path="treinamentos"')
    // Desenvolvimento monta em PageCanvas no wrapper de rota (focused)
    const dev = read('src/pages/VendedorDesenvolvimento.tsx')
    expect(dev).toContain('PageCanvas')
    expect(dev).toContain('width={pageLayout.width}')
  })

  test('Desenvolvimento/Feedbacks/PDI monta em PageCanvas (focused)', () => {
    const dev = read('src/pages/VendedorDesenvolvimento.tsx')
    expect(dev).toContain('PageCanvas')
    expect(dev).toContain('width={pageLayout.width}')
    expect(dev).toContain('resolveRouteLayout')
  })

  test('Perfil/Ajuda/Configurações montam em PageTemplate/PageCanvas com clearance', () => {
    const perfil = read('src/features/vendedor-perfil/MeuPerfilVendedor.container.tsx')
    expect(perfil).toContain('PageTemplate')
    expect(perfil).toContain('bottomClearance="navigation"')
    const ajuda = read('src/pages/VendedorAjuda.tsx')
    expect(ajuda).toContain('PageTemplate')
    expect(ajuda).toContain('bottomClearance="navigation"')
    const config = read('src/pages/VendedorConfiguracoes.tsx')
    expect(config).toContain('PageTemplate')
  })

  test('shell mantém main#main-content único (sem página solta com shell próprio)', () => {
    const shell = read('src/components/MxSidebarShell.tsx')
    const appShell = read('src/components/AppShell.tsx')
    const layout = read('src/components/Layout.tsx')
    expect(shell).toContain('id="main-content"')
    expect(appShell).toContain('AppShellFrame')
    expect(layout).toContain('<OwnerProvider>')
    // sem identidade visual por perfil (§5 proíbe)
    expect(layout).not.toContain('SellerShell')
    expect(appShell).not.toContain('SellerShell')
  })
})
