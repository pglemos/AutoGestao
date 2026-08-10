import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('contrato de viewport do toaster global', () => {
  test('mantém os toasts contidos no viewport mobile', () => {
    const app = read('src/App.tsx')
    const css = read('src/index.css')

    expect(app).toContain('className="mx-sonner-toaster"')
    expect(app).toContain(
      'mobileOffset={{ top: 16, right: 16, bottom: 16, left: 16 }}',
    )
    expect(css).toContain(
      '[data-sonner-toaster].mx-sonner-toaster {\n    width: min(var(--width), calc(100% - (var(--mx-space-4) * 2)));',
    )
    expect(css).toContain(
      '[data-sonner-toaster].mx-sonner-toaster [data-sonner-toast] {\n    width: 100%;',
    )
  })
})
