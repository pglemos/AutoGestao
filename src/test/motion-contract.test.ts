import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * FASE S — Motion/Transitions
 *
 * A escala de movimento é canônica: `--mx-duration-*` (instant/fast/normal/
 * slow/deliberate) + `--mx-easing-*` (standard/enter/exit/emphasized), MD3.
 * `transition-all` anima tudo que muda (incluindo layout/shadow custoso) —
 * deve ser substituído por propriedades explícitas (`transition-colors`,
 * `transition-[box-shadow]`, etc.) nos componentes canônicos.
 *
 * Overlays usam motion transform-based (`mx-overlay-*`, `slide-in-from-*`),
 * que não causa layout shift. prefers-reduced-motion é global no index.css.
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

const CANONICAL_COMPONENTS = [
  'src/components/atoms/Input.tsx',
  'src/components/atoms/Textarea.tsx',
  'src/components/atoms/Select.tsx',
  'src/components/atoms/DatePicker.tsx',
  'src/components/atoms/Checkbox.tsx',
  'src/components/atoms/Radio.tsx',
  'src/components/atoms/Switch.tsx',
  'src/components/atoms/Combobox.tsx',
  'src/components/molecules/Field.tsx',
  'src/components/molecules/FormField.tsx',
  'src/components/molecules/SearchField.tsx',
] as const

describe('FASE S — motion e transições', () => {
  test('tokens de duration e easing existem na escala canônica', () => {
    const primitives = read('src/design-system/tokens/primitives.css')
    for (const token of ['--mx-duration-instant', '--mx-duration-fast', '--mx-duration-normal', '--mx-duration-slow', '--mx-duration-deliberate']) {
      expect(primitives, `${token} ausente`).toContain(token)
    }
    for (const token of ['--mx-easing-standard', '--mx-easing-enter', '--mx-easing-exit', '--mx-easing-emphasized']) {
      expect(primitives, `${token} ausente`).toContain(token)
    }
  })

  test('prefers-reduced-motion é global (index.css)', () => {
    const css = read('src/index.css')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('transition-duration: 0.01ms !important')
    expect(css).toContain('animation-duration: 0.01ms !important')
  })

  test('componentes canônicos de form não usam transition-all', () => {
    for (const file of CANONICAL_COMPONENTS) {
      const source = read(file)
      expect(source, `${file} usa transition-all`).not.toContain('transition-all')
    }
  })

  test('molecules canônicos com hover de sombra usam transição de propriedade explícita', () => {
    const optionCard = read('src/components/molecules/OptionCard.tsx')
    expect(optionCard).not.toContain('transition-all')
    expect(optionCard).toMatch(/transition-\[[^\]]*box-shadow[^\]]*\]/)
    const mxScore = read('src/components/molecules/MXScoreCard.tsx')
    expect(mxScore).not.toContain('transition-all')
    expect(mxScore).toMatch(/transition-\[[^\]]*box-shadow[^\]]*\]/)
  })

  test('overlays usam motion transform-based, sem layout shift', () => {
    const sheet = read('src/components/ui/sheet.jsx')
    expect(sheet).toMatch(/slide-in-from-(top|bottom|left|right)/)
    expect(sheet).toMatch(/slide-out-to-(top|bottom|left|right)/)
    const dialog = read('src/components/ui/dialog.jsx')
    expect(dialog).toContain('mx-overlay-surface')
    const modal = read('src/components/organisms/Modal.tsx')
    expect(modal).toContain('mx-overlay-surface')
    expect(modal).toContain('mx-overlay-backdrop')
  })
})
