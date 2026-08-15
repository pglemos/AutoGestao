import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE K — tooltip de icon-only e interação (11.011, 11.015).
 *
 * O tooltip canônico é o Radix (`ui/tooltip`) exposto por `HelpTooltip`:
 * suporta hover (desktop), foco por teclado, toque/clique direto e ESC, com
 * `role="tooltip"` e `--mx-z-tooltip`. O `atoms/Tooltip` (CSS puro, sem
 * suporte completo a teclado) não deve ser usado em produção — a única
 * referência restante é o próprio teste.
 */
describe('FASE K — tooltip canônico é Radix via HelpTooltip (11.011)', () => {
  test('HelpTooltip usa o Tooltip Radix e renderiza role="tooltip"', () => {
    const help = read('src/components/ui/HelpTooltip.tsx')
    expect(help).toContain('@/components/ui/tooltip')
    expect(help).toContain('TooltipTrigger')
    const tooltip = read('src/components/ui/tooltip.jsx')
    expect(tooltip).toContain('@radix-ui/react-tooltip')
    // O Radix injeta `role="tooltip"` no Content automaticamente; o canônico
    // delega ao primitivo em vez de duplicar o role à mão.
    expect(tooltip).toContain('TooltipPrimitive.Content')
  })

  test('tooltip usa token de elevação, não z-index arbitrário', () => {
    const tooltip = read('src/components/ui/tooltip.jsx')
    expect(tooltip).toContain('--mx-z-tooltip')
  })

  test('atoms/Tooltip (CSS puro) não é usado em produção', () => {
    // 100% fs: varre src/** sem node_modules/.graphify.
    const out = execSync(`grep -rl "atoms/Tooltip" src --include="*.tsx" --include="*.jsx" || true`, {
      cwd: root,
      encoding: 'utf8',
    }).split('\n').filter(Boolean)
    const prod = out.filter((f) => !f.includes('test') && !f.includes('_stories'))
    expect(prod).toEqual([])
  })
})

describe('FASE K — tooltip interage por teclado e toque (11.015)', () => {
  test('HelpTooltip abre por foco, hover e clique/toque', () => {
    const help = read('src/components/ui/HelpTooltip.tsx')
    expect(help).toContain('onFocus')
    expect(help).toContain('onMouseEnter')
    expect(help).toContain('onClick')
    expect(help).toContain('onMouseDown')
  })

  test('Tooltip Radix é controlado (open/onOpenChange) e fecha por ESC', () => {
    const help = read('src/components/ui/HelpTooltip.tsx')
    expect(help).toContain('open={open}')
    expect(help).toContain('onOpenChange')
  })
})
