import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { SIDEBAR, SIDEBAR_METRICS } from './tokens'

/**
 * Contrato do design system da sidebar.
 * Fonte da verdade: docs/design-system/sidebar-dono.md
 *
 * Toda sidebar do sistema (shell universal e módulo do Dono) precisa consumir
 * os tokens deste módulo — nada de classe escrita à mão na superfície.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

const shell = read('../../components/MxSidebarShell.tsx')
const ownerSidebar = read('../../components/owner/OwnerSidebar.jsx')
const ownerLayout = read('../../components/owner/OwnerLayout.jsx')
const profileCard = read('../../components/MxSidebarProfileCard.tsx')
const consumers = { shell, ownerSidebar, ownerLayout }

describe('design tokens da sidebar', () => {
  test('mantém as medidas documentadas', () => {
    expect(SIDEBAR_METRICS.width).toBe(256)
    expect(SIDEBAR_METRICS.widthCollapsed).toBe(64)
    expect(SIDEBAR_METRICS.headerHeight).toBe(54)
    expect(SIDEBAR_METRICS.itemHeight).toBe(36)
    expect(SIDEBAR_METRICS.nestedItemHeight).toBe(28)
    expect(SIDEBAR_METRICS.iconSize).toBe(16)
    expect(SIDEBAR_METRICS.desktopBreakpoint).toBe(1280)
    expect(SIDEBAR_METRICS.widthTransitionMs).toBe(300)
  })

  test('descreve a superfície, os raios e a tipografia da documentação', () => {
    expect(SIDEBAR.asideWidth).toBe('w-64')
    expect(SIDEBAR.asideWidthCollapsed).toBe('w-16')
    expect(SIDEBAR.root).toContain('bg-mxsb-surface')
    expect(SIDEBAR.header).toContain('h-[54px]')
    expect(SIDEBAR.item).toContain('rounded-lg')
    expect(SIDEBAR.item).toContain('gap-2.5')
    expect(SIDEBAR.nestedItem).toContain('rounded-md')
    expect(SIDEBAR.nestedItem).toContain('text-[13px]')
    expect(SIDEBAR.itemActive).toContain('bg-mxsb-active-surface')
    expect(SIDEBAR.itemActive).toContain('text-mxsb-active')
    expect(SIDEBAR.badge).toContain('text-[9px]')
    expect(SIDEBAR.badgeWarning).toContain('amber')
    expect(SIDEBAR.brandTitle).toContain('text-[13px]')
    expect(SIDEBAR.brandModule).toContain('tracking-[0.14em]')
    expect(SIDEBAR.sectionLabel).toContain('text-[10px]')
    expect(SIDEBAR.subnav).toContain('border-l')
  })

  test('usa o mesmo drawer em mobile e tablet', () => {
    expect(SIDEBAR.drawerPanel).toContain('w-72')
    expect(SIDEBAR.drawerPanel).toContain('max-w-[85vw]')
    expect(SIDEBAR.drawerPanel).toContain('sm:w-80')
    expect(SIDEBAR.drawerOverlay).toContain('xl:hidden')
    expect(SIDEBAR.drawerScrim).toContain('bg-black/40')
  })

  test('não reintroduz o verde sólido nem sombra na coluna', () => {
    expect(SIDEBAR.itemActive).not.toContain('bg-emerald-600')
    expect(SIDEBAR.aside).not.toContain('shadow')
    expect(SIDEBAR.root).not.toContain('shadow')
  })
})

describe('consumidores do design system', () => {
  test('shell e sidebar do Dono importam os tokens', () => {
    for (const [name, source] of Object.entries(consumers)) {
      expect(source, `${name} deve importar os tokens`).toContain('design-system/sidebar/tokens')
      expect(source).toContain('SIDEBAR')
    }
  })

  test('não repetem as classes da superfície fora dos tokens', () => {
    for (const [name, source] of Object.entries(consumers)) {
      expect(source, `${name} não deve fixar a superfície`).not.toContain('bg-white shadow-sm')
      expect(source).not.toContain('bg-emerald-600 text-white')
      expect(source).not.toContain('rounded-xl px-3 py-2.5')
    }
  })

  test('respeitam o corte xl para a coluna fixa', () => {
    expect(shell).toContain("collapsed ? 'xl:pl-16' : 'xl:pl-64'")
    expect(shell).toContain('xl:flex')
    expect(shell).toContain('xl:hidden')
    expect(SIDEBAR.aside).toContain('xl:block')
  })

  test('cumprem os requisitos de acessibilidade documentados', () => {
    // item ativo, grupos e drawer
    expect(shell).toContain("aria-current={active ? 'page' : false}")
    expect(shell).toContain('aria-controls={subnavId}')
    expect(shell).toContain('useFocusTrap(drawerRef, mobileOpen)')
    expect(ownerLayout).toContain('useFocusTrap(drawerRef, sidebarOpen)')
    expect(ownerLayout).toContain('aria-modal="true"')
    expect(ownerSidebar).toContain('aria-controls={`sidebar-subnav-${item.group}`}')
    // rótulo quando recolhida
    expect(shell).toContain('title={isCollapsed ? item.label : undefined}')
    expect(ownerSidebar).toContain('title={collapsed ? item.label : undefined}')
    // menu de conta
    expect(profileCard).toContain('aria-haspopup="menu"')
    expect(profileCard).toContain('role="menuitem"')
  })
})
