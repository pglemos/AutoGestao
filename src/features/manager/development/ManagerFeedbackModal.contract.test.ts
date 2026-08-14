import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./ManagerFeedbackModal.tsx', import.meta.url), 'utf8')

describe('contrato do overlay de feedback gerencial', () => {
  test('usa a família Dialog canônica e não cria geometria/stacking próprios', () => {
    expect(source).toContain("from '@/components/ui/dialog'")
    expect(source).toContain('<Dialog open={open}')
    expect(source).toContain('<DialogBody')
    expect(source).not.toContain('fixed inset-0 z-[var(--mx-z-modal)]')
    expect(source).not.toContain('useFocusTrap')
  })

  test('mantém um único scroll owner interno e não fecha durante salvamento', () => {
    expect(source).toContain('max-h-[var(--mx-overlay-max-height)]')
    expect(source).toContain('overflow-y-auto')
    expect(source).toContain('if (!nextOpen && !saving) onClose()')
  })
})
