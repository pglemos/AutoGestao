import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

describe('contrato de provider de toast', () => {
  test('mantém um único viewport global e o adapter legado não renderiza provider', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    const layout = readFileSync('src/components/Layout.tsx', 'utf8')
    const adapter = readFileSync('src/components/ui/toaster.jsx', 'utf8')
    const compat = readFileSync('src/components/ui/use-toast.jsx', 'utf8')

    expect((app.match(/<Toaster\b/g) ?? []).length).toBe(1)
    expect(layout).not.toContain('OwnerToaster')
    expect(adapter).toContain('return null')
    expect(compat).toContain("from 'sonner'")
    expect(compat).not.toContain('ToastProvider')
  })
})
