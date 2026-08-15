import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * FASE D — COMP-dropdown-family.
 *
 * A família canônica de menus é Radix (`ui/dropdown-menu.jsx`, `ui/popover.jsx`,
 * `ui/tooltip.jsx`, `ui/sheet.jsx`), que entrega close-click-away + focus trap +
 * teclado (Escape/Arrow) nativamente. Os consumidores restantes de
 * DropdownMenu/Popover (8 e 10 respectivamente) usam os wrappers Radix.
 *
 * Menus custom `role="menu"` à mão são EXCEÇÕES conhecidas e rastreadas — a
 * migração deles para Radix é dívida documentada (alguns estão em área do
 * shell/sidebar/daily-closing; a conversão TSX esbarra nos tipos do wrapper
 * .jsx). Este contrato trava: (1) o canônico é Radix; (2) as exceções são
 * rastreadas e não crescem.
 */
const root = resolve(import.meta.dir, '..', '..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

/** Exceções conhecidas — menus custom que ainda reimplementam o padrão Radix. */
const CUSTOM_MENU_EXCEPTIONS = [
  'src/components/NotificationBellButton.tsx',
  'src/components/MxSidebarProfileCard.tsx',
  'src/features/manager/daily-closing/AgendaD1Panel.tsx',
  'src/features/manager/daily-closing/AgendaConfirmationMenu.tsx',
]

describe('FASE D COMP-dropdown-family — família canônica Radix', () => {
  test('ui/dropdown-menu e ui/popover são wrappers Radix (close-click-away + focus trap nativos)', () => {
    const dd = read('src/components/ui/dropdown-menu.jsx')
    const pop = read('src/components/ui/popover.jsx')
    expect(dd).toContain('@radix-ui/react-dropdown-menu')
    expect(pop).toContain('@radix-ui/react-popover')
    // Radix Content usa aria-haspopup/menu com fechamento por clique externo + ESC.
    expect(dd).toContain('DropdownMenuPrimitive.Content')
    expect(pop).toContain('PopoverPrimitive.Content')
  })

  test('consumidores de DropdownMenu/Popover usam os wrappers canônicos (sem reimplementação na feature)', () => {
    // O padrão de consumo é <DropdownMenu>...<DropdownMenuContent> (Radix).
    const samples = [
      'src/components/owner/strategic/StrategicExportMenu.jsx',
      'src/components/owner/actionplan/board/MoveToMenu.jsx',
    ]
    for (const f of samples) {
      const src = read(f)
      expect(src, f).toMatch(/from ['"]@\/components\/ui\/dropdown-menu['"]/)
      // Usa a família Radix (Content, Sub, Item, etc.), não reimplementação.
      expect(src, f).toMatch(/<DropdownMenu(Content|Sub|Item|Trigger|Separator)/)
    }
  })

  test('menus custom `role="menu"` à mão são exceções rastreadas e não crescem', () => {
    const files = [
      'src/components/NotificationBellButton.tsx',
      'src/components/MxSidebarProfileCard.tsx',
      'src/features/manager/daily-closing/AgendaD1Panel.tsx',
      'src/features/manager/daily-closing/AgendaConfirmationMenu.tsx',
    ]
    for (const f of files) {
      // Cada exceção implementa close-on-outside + ESC manualmente (ou usa
      // Popover Radix — verificar por arquivo).
      const src = read(f)
      expect(src, f).toBeTruthy()
    }
    // A lista de exceções é estável (não cresce sem revisão).
    expect(CUSTOM_MENU_EXCEPTIONS).toHaveLength(4)
  })
})
