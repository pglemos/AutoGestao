import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const source = readFileSync(new URL('./ManagerDailyClosingBase44.tsx', import.meta.url), 'utf8')

describe('ManagerDailyClosing Base44 layout contract', () => {
  test('uses the shared PageCanvas for both loaded and loading roots', () => {
    expect(source).toContain('import { PageCanvas } from "@/design-system/page"')
    expect(source).toContain(
      '<PageCanvas as="div" width="dashboard" bottomClearance="actions" aria-busy={false} className="flex flex-col gap-5">',
    )
    expect(source).toContain(
      '<PageCanvas as="div" width="dashboard" bottomClearance="actions" className="flex flex-col gap-5" aria-busy="true">',
    )
    expect(source).not.toContain('mx-auto flex w-full max-w-7xl')
    expect(source).not.toContain('min-h-full bg-gray-50 px-4 py-6')
    expect(source).not.toContain('space-y-5 bg-gray-50 p-6')
  })
})
