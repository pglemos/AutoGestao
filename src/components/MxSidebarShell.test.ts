import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

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
    expect(shellSource).toContain('border-gray-100 bg-white shadow-sm')
    expect(shellSource).toContain("collapsed ? 'w-16'")
    expect(shellSource).toContain(": 'w-64'")
    expect(shellSource).toContain("collapsed ? 'md:pl-16' : 'md:pl-64'")

    expect(shellSource).not.toContain("w-[264px]")
    expect(shellSource).not.toContain("w-[80px]")
    expect(shellSource).not.toContain('border-slate-200 bg-white shadow-lg')
  })

  test('usa um único item ativo em verde suave, sem trilho lateral ou caixa de ícone paralela', () => {
    expect(shellSource).toContain('const activeNavItem = useMemo')
    expect(shellSource).toContain('const active = item === activeNavItem')
    expect(shellSource).toContain('bg-emerald-50 font-semibold text-emerald-700')
    expect(shellSource).toContain('text-gray-600 hover:bg-gray-50 hover:text-gray-900')
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
    expect(shellSource).toContain('border-l border-gray-200')
    expect(shellSource).toContain('bg-emerald-50 font-semibold text-emerald-700')
  })

  test('mantém navegação, acessibilidade e drawer mobile', () => {
    expect(shellSource).toContain("aria-current={active ? 'page' : false}")
    expect(shellSource).toContain('aria-modal="true"')
    expect(shellSource).toContain('useFocusTrap(drawerRef, mobileOpen)')
    expect(shellSource).toContain('navSections')
    expect(shellSource).toContain('NotificationBellButton')
    expect(shellSource).toContain('renderProfileCard')
    expect(shellSource).toContain('onStopSimulation')
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
      'Módulo Administrativo',
      'Módulo Admin MX',
      'Módulo Consultoria',
      'Módulo Executivo',
      'Módulo Gerencial',
      'Módulo Comercial',
    ]) {
      expect(layoutSource).toContain(label)
    }
    expect(shellSource).toContain('moduleLabel')
    expect(layoutSource).toContain('dono: ownerNavConfig')
    expect(layoutSource).toContain('path: ownerNavigationCanonicalPath(item)')
    expect(layoutSource).toContain('children: item.children?.map')
    expect(layoutSource).toContain("badge: item.badge ?? badgeForPath(item.path)")
    expect(layoutSource).toContain('key: `${sectionLabel}:${item.label}`')
    expect(layoutSource).toContain('key: item.key')
  })
})
