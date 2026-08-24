import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { SIDEBAR } from '@/design-system/sidebar/tokens'
import { isNavItemActive } from './MxSidebarShell'

const layoutUrl = new URL('./Layout.tsx', import.meta.url)
const shellUrl = new URL('./MxSidebarShell.tsx', import.meta.url)
const legacyUrls = [
  new URL('./ManagerSidebarShell.tsx', import.meta.url),
  new URL('./SellerSidebar.tsx', import.meta.url),
  new URL('../design-system/internal-mx/MxInternalShell.tsx', import.meta.url),
]

const layoutSource = readFileSync(layoutUrl, 'utf8')
const shellSource = existsSync(shellUrl) ? readFileSync(shellUrl, 'utf8') : ''

const occurrences = (source: string, pattern: string) =>
  source.split(pattern).length - 1

describe('sidebar universal MX', () => {
  test('resolve rota ativa por destino canônico, alias legado e query exata', () => {
    const item = {
      label: 'Início',
      path: '/dono',
      activePaths: ['/dono', '/home'],
    }
    expect(isNavItemActive(item, { pathname: '/dono', search: '' })).toBe(true)
    expect(isNavItemActive(item, { pathname: '/home', search: '' })).toBe(true)
    expect(isNavItemActive(item, { pathname: '/mercado', search: '' })).toBe(false)

    const consultant = {
      label: 'Falar com Consultor',
      path: '/dono/consultoria?openConsultant=1',
      activePaths: [
        '/dono/consultoria?openConsultant=1',
        '/consultoria?openConsultant=1',
      ],
    }
    expect(isNavItemActive(consultant, {
      pathname: '/consultoria',
      search: '?openConsultant=1',
    })).toBe(true)
    expect(isNavItemActive(consultant, {
      pathname: '/consultoria',
      search: '',
    })).toBe(false)
  })
  test('renderiza um único shell canônico para todos os perfis autenticados', () => {
    expect(layoutSource).toContain("from './MxSidebarShell'")
    expect(occurrences(layoutSource, '<MxSidebarShell')).toBe(1)
    expect(layoutSource).not.toContain('<ManagerSidebarShell')
    expect(layoutSource).not.toContain('<SellerLayoutShell')
    expect(layoutSource).not.toContain('<MxInternalShell')
  })

  test('remove os shells legados do código executável', () => {
    for (const legacyUrl of legacyUrls) expect(existsSync(legacyUrl)).toBe(false)
  })

  test('reproduz as dimensões e superfícies da sidebar oficial do Dono', () => {
    // As classes vivem em src/design-system/sidebar/tokens.ts (contrato próprio).
    expect(shellSource).toContain("from '@/design-system/sidebar/tokens'")
    expect(shellSource).toContain('SIDEBAR.asideWidthCollapsed : SIDEBAR.asideWidth')
    expect(shellSource).toContain('xl:pl-[var(--mx-sidebar-width-collapsed)]')
    expect(shellSource).toContain('xl:pl-[var(--mx-sidebar-width-expanded)]')
    // A borda canônica vem do token, não de classe reescrita no shell.
    expect(shellSource).toContain('SIDEBAR.aside')
    expect(SIDEBAR.aside).toContain('border-mxsb-line')

    expect(shellSource).not.toContain('bg-white shadow-sm')
    expect(shellSource).not.toContain("w-[264px]")
    expect(shellSource).not.toContain("w-[80px]")
    expect(shellSource).not.toContain('border-slate-200 bg-white shadow-lg')
  })

  test('usa um único item ativo em verde suave, sem trilho lateral ou caixa de ícone paralela', () => {
    expect(shellSource).toContain('const activeNavItem = useMemo')
    expect(shellSource).toContain('const active = item === activeNavItem')
    expect(shellSource).toContain('active ? SIDEBAR.itemActive : SIDEBAR.itemIdle')
    expect(shellSource).not.toContain('bg-emerald-600 text-white shadow-sm')
    expect(shellSource).not.toContain('bg-emerald-50 text-emerald-800')
    expect(shellSource).not.toContain('absolute bottom-2 left-0 top-2 w-1')
  })

  test('suporta grupos hierárquicos com subitens recuados no desktop e no drawer', () => {
    expect(shellSource).toContain('children?: MxSidebarNavItem[]')
    expect(shellSource).toContain('flattenLeafItems')
    expect(shellSource).toContain('data-sidebar-group={item.label}')
    expect(shellSource).toContain('data-sidebar-subnav={item.label}')
    expect(shellSource).toContain('aria-expanded={expanded}')
    expect(shellSource).toContain('className={SIDEBAR.subnav}')
    expect(shellSource).toContain('active ? SIDEBAR.nestedItemActive : SIDEBAR.nestedItemIdle')
  })

  test('mantém navegação, acessibilidade e drawer mobile', () => {
    expect(shellSource).toContain("aria-current={active ? 'page' : undefined}")
    expect(shellSource).toContain('aria-modal="true"')
    expect(shellSource).toContain('useFocusTrap(drawerRef, mobileOpen)')
    expect(shellSource).toContain('navSections')
    expect(shellSource).toContain('NotificationBellButton')
    expect(shellSource).toContain('renderProfileCard')
    expect(shellSource).toContain('onStopSimulation')
  })

  test('fecha o drawer por Escape mesmo quando algo interrompe a propagação', () => {
    // O keydown de Escape chega ao document na fase de captura mas não na de
    // bolha com o drawer aberto (medido com contador nas duas fases). Um
    // listener de bolha deixa o drawer sem fechamento por teclado — WCAG 2.1.2.
    expect(shellSource).toContain("document.addEventListener('keydown', handleKeyDown, true)")
    expect(shellSource).toContain("document.removeEventListener('keydown', handleKeyDown, true)")
    expect(shellSource).not.toMatch(/addEventListener\('keydown', handleKeyDown\)/)
  })

  test('mantém o cabeçalho móvel em três colunas sem sobrepor a marca e o título', () => {
    expect(shellSource).toContain('grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')
    expect(shellSource).toContain('min-[500px]:block')
    expect(shellSource).toContain('justify-self-end')
    expect(shellSource).not.toContain('absolute left-1/2 top-[calc(50%+env(safe-area-inset-top)/2)]')
  })

  test('mantém menus do cabeçalho móvel acima do conteúdo da página', () => {
    expect(shellSource).toContain('data-mx-mobile-header=""')
    expect(shellSource).toContain('z-[var(--mx-z-popover)]')
  })

  test('não depende do pacote visual legado', () => {
    expect(shellSource).not.toContain('mxds-')
    expect(shellSource).not.toContain('AppShell')
    expect(shellSource).not.toContain('SidebarBrandHeader')
    expect(shellSource).not.toContain('#051923')
    expect(shellSource).not.toContain('#102C37')
  })

  test('define a identidade correta de módulo para cada perfil', () => {
    for (const label of [
      "administrador_geral: 'Admin'",
      "administrador_mx: 'Admin MX'",
      "consultor_mx: 'Consultoria'",
      "dono: 'Executivo'",
      "gerente: 'Gerencial'",
      "vendedor: 'Comercial'",
    ]) {
      expect(layoutSource).toContain(label)
    }
    expect(shellSource).toContain('moduleLabel')
    expect(layoutSource).toContain('dono: ownerNavConfig')
    expect(layoutSource).toContain('path: ownerNavigationCanonicalPath(item)')
    expect(layoutSource).toContain('activePaths: ownerNavigationActivePaths(item)')
    expect(layoutSource).toContain('children: item.children?.map')
    expect(layoutSource).toContain("badge: item.badge ?? badgeForPath(item.path)")
    expect(layoutSource).toContain('key: `${sectionLabel}:${item.label}`')
    expect(layoutSource).toContain('key: item.key')
    expect(shellSource).toContain('data-sidebar-surface="true"')
  })
})
