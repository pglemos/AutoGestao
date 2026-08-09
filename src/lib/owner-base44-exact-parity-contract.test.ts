import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('contrato do módulo Dono Base44 aprovado', () => {
  it('registra as telas do Dono na raiz e usa o shell compartilhado', () => {
    const app = read('src/App.tsx')
    const appShell = read('src/components/AppShell.tsx')
    expect(app).toContain("const AppShell = lazy(() => import('@/components/AppShell'))")
    expect(app).toContain('<Route path="/dono/*" element={<OwnerLegacyPathRedirect />} />')
    expect(app).not.toContain('owner-base44/OwnerModule')
    expect(appShell).toContain('<Layout />')
    expect(appShell).not.toContain('OwnerShell')
  })

  it('preserva o layout, a navegação e os tokens visuais aprovados', () => {
    const layout = read('src/components/Layout.tsx')
    const sidebar = read('src/components/MxSidebarShell.tsx')
    const tokens = read('src/design-system/tokens/semantic.css')

    expect(layout).toContain('<OwnerProvider>')
    expect(layout).toContain('<MxSidebarShell')
    expect(sidebar).toContain('src={SIDEBAR_LOGO}')
    expect(layout).toContain("'Módulo Executivo'")
    expect(sidebar).toContain("isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'")
    // Cartao de perfil compartilhado com os demais modulos: abre o menu de
    // conta (perfil, preferencias, notificacoes e sair) em vez de navegar.
    expect(sidebar).toContain('<MxSidebarProfileCard')
    expect(sidebar).toContain('onSignOut={')
    expect(layout).toContain('<ConsultantRequestModal />')
    for (const label of ['Início', 'Plano Estratégico', 'Plano de Ação', 'Consultoria', 'Departamentos', 'Mercado', 'Universidade MX', 'Falar com Consultor']) {
      expect(layout).toContain(label)
    }
    // Header do Dono segue o padrão dos demais módulos (MxSidebarShell):
    // sem topbar no desktop e header de marca + sino + avatar no mobile.
    expect(sidebar).toContain('xl:hidden')
    expect(sidebar).toContain('NotificationBellButton')
    // Os tokens medidos do export Base44 agora vivem na camada semântica e
    // valem para todo perfil — ver owner-base44-design-scope.test.ts.
    // (`--color-*` é o mapa do Tailwind, declarado em index.css; aqui checamos
    // a ponte shadcn, que é o que a camada semântica de fato publica.)
    expect(tokens).toContain('--primary: var(--mx-color-primary)')
    expect(tokens).toContain('--mx-color-primary: var(--mx-green-600)')
    expect(tokens).not.toMatch(/\.mx-ds\[data-mx-role/)
  })

  it('mantém todas as superfícies aprovadas disponíveis', () => {
    for (const file of [
      'src/components/Layout.tsx',
      'src/components/MxSidebarShell.tsx',
      'src/pages/owner/OwnerHome.jsx',
      'src/pages/owner/PlanoEstrategico.jsx',
      'src/pages/owner/PlanoDeAcao.jsx',
      'src/pages/owner/Consultoria.jsx',
      // A folha de estilo do Dono saiu desta lista: seus valores foram
      // absorvidos por src/design-system/tokens/semantic.css.
      'src/design-system/tokens/semantic.css',
    ]) {
      expect(existsSync(resolve(root, file)), `${file} must exist`).toBe(true)
    }
  })

  it('mantém o vínculo de consultoria à sessão autenticada', () => {
    const adapter = read('src/features/owner/ownerRepository.js')
    expect(adapter).toContain('const { data: auth, error: authError } = await supabase.auth.getUser()')
    expect(adapter).toContain("if (authError || !userId) throw new Error('Usuário não identificado')")
    expect(adapter).not.toContain('payload.created_by')
  })
})
