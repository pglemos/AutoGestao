import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('contrato do módulo Dono Base44 aprovado', () => {
  it('monta /dono/* como módulo protegido e independente do shell universal', () => {
    const app = read('src/App.tsx')
    expect(app).toContain("const OwnerModule = lazy(() => import('@/features/owner-base44/OwnerModule'))")
    expect(app).toContain('<Route path="/dono/*" element={<ProtectedRoute><Suspense fallback={<Spinner />}><OwnerModule /></Suspense></ProtectedRoute>} />')
  })

  it('preserva o layout, a navegação e os tokens visuais aprovados', () => {
    const module = read('src/features/owner-base44/OwnerModule.tsx')
    const layout = read('src/components/owner/OwnerLayout.jsx')
    const sidebar = read('src/components/owner/OwnerSidebar.jsx')
    const topbar = read('src/components/owner/OwnerTopbar.jsx')
    const styles = read('src/styles/owner-base44-exact.css')

    expect(module).toContain("import OwnerLayout from '@/components/owner/OwnerLayout'")
    expect(module).toContain("import '@/styles/owner-base44-exact.css'")
    expect(module).toContain('<Route element={<OwnerLayout />}>')
    expect(module).toContain('<Route path="*" element={<OwnerLiveDataPage />} />')
    expect(layout).toContain('<OwnerSidebar')
    expect(layout).toContain('collapsed={sidebarCollapsed}')
    expect(sidebar).toContain('src="/landing/logo-mx.png"')
    expect(sidebar).toContain('MÓDULO EXECUTIVO')
    expect(sidebar).toContain('aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}')
    // Cartao de perfil compartilhado com os demais modulos: abre o menu de
    // conta (perfil, preferencias, notificacoes e sair) em vez de navegar.
    expect(sidebar).toContain('<MxSidebarProfileCard')
    expect(sidebar).toContain('onSignOut={')
    expect(layout).toContain('<OwnerTopbar')
    expect(layout).toContain('<ConsultantRequestModal />')
    for (const label of ['Início', 'Plano Estratégico', 'Plano de Ação', 'Consultoria', 'Departamentos', 'Mercado', 'Universidade MX', 'Falar com Consultor']) {
      expect(sidebar).toContain(label)
    }
    // Header do Dono segue o padrão dos demais módulos (MxSidebarShell):
    // sem topbar no desktop e header de marca + sino + avatar no mobile.
    expect(topbar).toContain('xl:hidden')
    expect(topbar).toContain('NotificationBellButton')
    expect(topbar).toContain('Módulo Executivo')
    expect(topbar).not.toContain('owner-base44-exact__topbar')
    expect(styles).toContain('.owner-b44')
    expect(styles).toContain('--color-primary: hsl(var(--primary))')
  })

  it('mantém todas as superfícies aprovadas disponíveis', () => {
    for (const file of [
      'src/features/owner-base44/OwnerModule.tsx',
      'src/components/owner/OwnerLayout.jsx',
      'src/components/owner/OwnerSidebar.jsx',
      'src/components/owner/OwnerTopbar.jsx',
      'src/pages/owner/OwnerHome.jsx',
      'src/pages/owner/PlanoEstrategico.jsx',
      'src/pages/owner/PlanoDeAcao.jsx',
      'src/pages/owner/Consultoria.jsx',
      'src/styles/owner-base44-exact.css',
    ]) {
      expect(existsSync(resolve(root, file)), `${file} must exist`).toBe(true)
    }
  })

  it('mantém o vínculo de consultoria à sessão autenticada', () => {
    const adapter = read('src/features/owner-base44/b44adapter.js')
    expect(adapter).toContain('const { data: auth, error: authError } = await supabase.auth.getUser()')
    expect(adapter).toContain("if (authError || !userId) throw new Error('Usuário não identificado')")
    expect(adapter).not.toContain('payload.created_by')
  })
})
