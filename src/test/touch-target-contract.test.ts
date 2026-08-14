import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..', '..')
const componentsCss = readFileSync(resolve(root, 'src/design-system/tokens/components.css'), 'utf8')

/**
 * Contrato FASE T 20.008 — pointer target mínimo em mobile (WCAG 2.5.8).
 *
 * O design system define `--mx-touch-target-min: 44px` como o alvo mínimo de
 * toque. Icon-only buttons (sem rótulo textual) devem usar o token para
 * expandir o hit area sem alterar o visual compacto.
 */
describe('FASE T 20.008 — touch target mínimo', () => {
  test('token --mx-touch-target-min existe e é >= 44px', () => {
    expect(componentsCss).toContain('--mx-touch-target-min: 44px')
  })

  test('token --mx-overlay-close-size deriva do touch target (44px)', () => {
    expect(componentsCss).toContain('--mx-overlay-close-size: var(--mx-touch-target-min)')
  })

  test('icon-only buttons canônicos (Modal/sheet) usam mx-overlay-close', () => {
    const modal = readFileSync(resolve(root, 'src/components/organisms/Modal.tsx'), 'utf8')
    const sheet = readFileSync(resolve(root, 'src/components/ui/sheet.jsx'), 'utf8')
    expect(modal).toContain('mx-overlay-close')
    expect(sheet).toContain('mx-overlay-close')
  })

  test('icon-only 32px conhecidos usam o token de touch target no hit area', () => {
    const files = [
      'src/components/vendedor/CalculationDetailsDrawer.jsx',
      'src/components/fechamento/DisciplinaModal.jsx',
      'src/features/agenda-admin/components/AgendaSidebar.tsx',
      'src/features/agenda-admin/components/AgendaEventDrawer.tsx',
      'src/features/agenda-admin/sections/AgendaHeader.tsx',
      'src/features/remuneracao/components/dashboard/CalculationDetailsDrawer.tsx',
    ]
    for (const file of files) {
      const src = readFileSync(resolve(root, file), 'utf8')
      expect(src, `${file} deve usar --mx-touch-target-min`).toContain('var(--mx-touch-target-min)')
    }
  })
})
