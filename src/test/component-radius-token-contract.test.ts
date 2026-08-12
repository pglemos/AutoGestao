import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '../..')

const families = [
  ['src/components/atoms/Button.tsx', '--mx-button-radius'],
  ['src/components/atoms/Input.tsx', '--mx-input-radius'],
  ['src/components/atoms/Select.tsx', '--mx-input-radius'],
  ['src/components/atoms/Textarea.tsx', '--mx-input-radius'],
  ['src/components/atoms/Skeleton.tsx', '--mx-card-radius'],
  ['src/components/molecules/Card.tsx', '--mx-card-radius'],
  ['src/components/molecules/AlertCard.tsx', '--mx-card-radius'],
  ['src/components/molecules/OptionCard.tsx', '--mx-card-radius'],
  ['src/components/ui/PageHeader.jsx', '--mx-card-radius'],
  ['src/components/ui/StatCard.jsx', '--mx-card-radius'],
] as const

describe('07.009 component radius ownership', () => {
  test('core component families consume their component radius token', () => {
    for (const [relativePath, token] of families) {
      const source = readFileSync(path.join(root, relativePath), 'utf8')
      expect(source, relativePath).toContain(token)
      expect(source, relativePath).not.toMatch(/\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/)
      expect(source, relativePath).not.toMatch(/(?<![-\w])shadow-(?:sm|md|lg|xl|2xl)\b/)
    }
  })

  test('overlay primitives do not override the global overlay radius at a breakpoint', () => {
    const dialog = readFileSync(path.join(root, 'src/components/ui/dialog.jsx'), 'utf8')
    const sheet = readFileSync(path.join(root, 'src/components/ui/sheet.jsx'), 'utf8')

    expect(dialog).toContain('mx-overlay-surface')
    expect(dialog).not.toContain('sm:rounded-lg')
    expect(sheet).toContain('mx-overlay-surface')
    expect(sheet).not.toMatch(/\brounded-(?:sm|md|lg|xl|2xl)\b/)
  })
})
