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

  test('Button e TabNav usam transições de propriedade explícita, não transition-all (19.007)', () => {
    const button = read('src/components/atoms/Button.tsx')
    expect(button).not.toContain('transition-all')
    expect(button).toMatch(/transition-\[[^\]]*background-color[^\]]*\]/)
    expect(button).toContain('duration-fast')
    const tabNav = read('src/components/molecules/TabNav.tsx')
    expect(tabNav).not.toContain('transition-all')
    expect(tabNav).toContain('transition-colors')
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

  test('Button tem hover e press (active) feedback com tokens (19.006)', () => {
    const button = read('src/components/atoms/Button.tsx')
    expect(button).toContain('hover:bg-brand-primary-hover')
    expect(button).toContain('active:scale-[0.98]')
    expect(button).toContain('active:duration-fast')
  })

  test('sem delays arbitrários em listas nos canônicos (19.008)', () => {
    for (const file of ['src/components/atoms/Button.tsx', 'src/components/molecules/TabNav.tsx']) {
      const source = read(file)
      expect(source, `${file} tem delay arbitrário`).not.toMatch(/transitionDelay|animationDelay|delay-\[/)
    }
  })

  test('MotionConfig reducedMotion="user" está ativo (19.009)', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('reducedMotion="user"')
    expect(app).toContain('<MotionConfig')
  })

  test('page transition (MotionPage) usa tokens e reduz com motion (19.004)', () => {
    const layout = read('src/components/Layout.tsx')
    expect(layout).toContain('<MotionPage key={location.pathname}')
    const variants = read('src/design/motion/variants.js')
    expect(variants).toContain('MX_MOTION')
    expect(variants).toContain('pageVariants')
    expect(variants).toContain('duration.normal')
    expect(variants).toContain('easing.standard')
    const motionIndex = read('src/design/motion/index.tsx')
    expect(motionIndex).toContain('useReducedMotion')
    // página usa opacity/transform, não layout (sem shift)
    expect(variants).toContain('opacity: 0, y: 10')
  })
})
