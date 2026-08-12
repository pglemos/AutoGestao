import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { SIDEBAR, SIDEBAR_LOGO, SIDEBAR_METRICS } from './tokens'

/**
 * Contrato do design system da sidebar.
 * Fonte da verdade: docs/design-system/sidebar-dono.md
 *
 * A única sidebar do sistema precisa consumir os tokens deste módulo — nada
 * de classe escrita à mão na superfície.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

const shell = read('../../components/MxSidebarShell.tsx')
const profileCard = read('../../components/MxSidebarProfileCard.tsx')
const components = read('../tokens/components.css')
const consumers = { shell }

describe('design tokens da sidebar', () => {
  test('mantém as medidas documentadas', () => {
    expect(SIDEBAR_METRICS.width).toBe(256)
    expect(SIDEBAR_METRICS.widthCollapsed).toBe(64)
    expect(SIDEBAR_METRICS.headerHeight).toBe(52)
    expect(SIDEBAR_METRICS.mobileHeaderHeight).toBe(72)
    expect(SIDEBAR_METRICS.touchTargetMin).toBe(44)
    expect(SIDEBAR_METRICS.itemHeight).toBe(36)
    expect(SIDEBAR_METRICS.nestedItemHeight).toBe(28)
    expect(SIDEBAR_METRICS.iconSize).toBe(16)
    expect(SIDEBAR_METRICS.desktopBreakpoint).toBe(1280)
    expect(SIDEBAR_METRICS.widthTransitionMs).toBe(300)
  })

  test('descreve a superfície, os raios e a tipografia da documentação', () => {
    expect(SIDEBAR.asideWidth).toBe('w-[var(--mx-sidebar-width-expanded)]')
    expect(SIDEBAR.asideWidthCollapsed).toBe('w-[var(--mx-sidebar-width-collapsed)]')
    expect(SIDEBAR.root).toContain('bg-mxsb-surface')
    expect(SIDEBAR.header).toContain('h-[var(--mx-sidebar-header-height)]')
    expect(SIDEBAR.item).toContain('rounded-[var(--mx-sidebar-item-radius)]')
    expect(SIDEBAR.item).toContain('gap-2.5')
    expect(SIDEBAR.nestedItem).toContain('rounded-[var(--mx-sidebar-subitem-radius)]')
    expect(SIDEBAR.nestedItem).toContain('text-body-sm')
    expect(SIDEBAR.itemActive).toContain('bg-mxsb-active-surface')
    expect(SIDEBAR.itemActive).toContain('text-mxsb-active')
    expect(SIDEBAR.badge).toContain('text-caption')
    expect(SIDEBAR.badgeWarning).toContain('status-warning')
    expect(SIDEBAR.brandTitle).toContain('text-body-sm')
    expect(SIDEBAR.brandModule).toContain('tracking-[0.14em]')
    expect(SIDEBAR.sectionLabel).toContain('text-caption')
    expect(SIDEBAR.subnav).toContain('border-l')
  })

  test('usa o mesmo drawer em mobile e tablet', () => {
    expect(SIDEBAR.drawerPanel).toContain('w-[var(--mx-sidebar-drawer-width)]')
    expect(SIDEBAR.drawerPanel).toContain('max-w-[var(--mx-sidebar-drawer-max-width)]')
    expect(SIDEBAR.drawerPanel).toContain('sm:w-[var(--mx-sidebar-drawer-width-sm)]')
    expect(SIDEBAR.drawerOverlay).toContain('xl:hidden')
    expect(SIDEBAR.drawerScrim).toContain('bg-black/40')
  })

  test('usa uma única marca e um ícone neutro também no item ativo', () => {
    expect(SIDEBAR_LOGO).toBe('/landing/logo-mx.png')
    expect(shell).toContain('src={SIDEBAR_LOGO}')
    expect(shell).not.toContain('@/assets/mx-logo.png')
    // o Dono mantém o ícone em cinza mesmo no item ativo
    expect(SIDEBAR).not.toHaveProperty('itemIconActive')
    expect(shell).toContain('className={SIDEBAR.itemIcon}')
  })

  test('expõe o CTA do rodapé como token compartilhado', () => {
    expect(SIDEBAR.ctaButton).toContain('bg-mxsb-active')
    expect(SIDEBAR.ctaButton).toContain('h-9')
    expect(shell).toContain('SIDEBAR.ctaButton')
  })

  test('herda a mesma escala tipográfica e a mesma fonte em toda a coluna', () => {
    expect(SIDEBAR.root).toContain('text-sm')
    expect(SIDEBAR.root).toContain('font-sans')
    expect(SIDEBAR.root).toContain('antialiased')
    expect(SIDEBAR.aside).toContain('font-sans')
    expect(SIDEBAR.aside).toContain('antialiased')
  })

  test('deriva os raios do contrato canônico, imunes ao --radius de cada escopo', () => {
    // O vendedor roda fora do escopo manager, onde --radius pode variar; a
    // família usa aliases de componentes que resolvem a escala primitiva.
    for (const key of ['item', 'nestedItem', 'toggle', 'ctaButton'] as const) {
      expect(SIDEBAR[key], key).not.toMatch(/rounded-(sm|md|lg|xl|2xl)\b/)
    }
    expect(SIDEBAR.item).toContain('rounded-[var(--mx-sidebar-item-radius)]')
    expect(SIDEBAR.nestedItem).toContain('rounded-[var(--mx-sidebar-subitem-radius)]')
    expect(SIDEBAR.toggle).toContain('rounded-[var(--mx-sidebar-toggle-radius)]')
    expect(profileCard).toContain('rounded-[var(--mx-radius-2xl)]')
    for (const token of [
      '--mx-sidebar-header-height',
      '--mx-sidebar-width-expanded',
      '--mx-sidebar-width-collapsed',
      '--mx-mobile-header-height',
      '--mx-mobile-header-touch-target',
    ]) {
      expect(components).toContain(`${token}:`)
    }
  })

  test('renderiza os ícones com o mesmo peso do Dono', () => {
    // tamanho pela classe (h-4 w-4) e traço padrão do lucide (2)
    expect(shell).not.toContain('strokeWidth={1.8}')
    expect(SIDEBAR.itemIcon).toContain('h-4 w-4')
  })

  test('não reintroduz o verde sólido nem sombra na coluna', () => {
    expect(SIDEBAR.itemActive).not.toContain('bg-emerald-600')
    expect(SIDEBAR.aside).not.toContain('shadow')
    expect(SIDEBAR.root).not.toContain('shadow')
  })
})

describe('consumidores do design system', () => {
  test('o shell único importa os tokens', () => {
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
    expect(shell).toContain('xl:pl-[var(--mx-sidebar-width-collapsed)]')
    expect(shell).toContain('xl:pl-[var(--mx-sidebar-width-expanded)]')
    expect(shell).toContain('xl:hidden')
    // O corte `xl:block` vive no token e é composto pelo shell — não é mais
    // reescrito à mão, para que os dois shells não divirjam.
    expect(SIDEBAR.aside).toContain('xl:block')
    expect(shell).toContain('SIDEBAR.aside')
    expect(shell).toContain('SIDEBAR.asideFixed')
  })

  test('não reescrevem a superfície da coluna fixa fora do token', () => {
    // Antes, MxSidebarShell duplicava a lista de classes de `SIDEBAR.aside`
    // acrescentando o posicionamento fixo; qualquer ajuste na superfície
    // canônica precisaria ser feito em dois lugares.
    expect(shell).not.toContain('border-r border-mxsb-line font-sans')
    expect(SIDEBAR.asideFixed).toContain('fixed')
  })

  test('o shell único monta o painel canônico de drawer', () => {
    expect(shell).toContain('className={SIDEBAR.drawerPanel}')
    expect(SIDEBAR.drawerPanel).not.toContain('border-r')
  })

  test('cumprem os requisitos de acessibilidade documentados', () => {
    // item ativo, grupos e drawer
    expect(shell).toContain("aria-current={active ? 'page' : false}")
    expect(shell).toContain('aria-controls={subnavId}')
    expect(shell).toContain('useFocusTrap(drawerRef, mobileOpen)')
    expect(shell).toContain('aria-modal="true"')
    // rótulo quando recolhida
    expect(shell).toContain('title={isCollapsed ? item.label : undefined}')
    // menu de conta
    expect(profileCard).toContain('aria-haspopup="menu"')
    expect(profileCard).toContain('role="menuitem"')
  })
})
