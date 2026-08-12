import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '../..')
const auditPath = path.join(root, '.superpowers/mx-foundation-zero/shadow/audit-07.010.json')

function runAudit() {
  execFileSync('node', ['scripts/audit-shadow-runtime.mjs'], { cwd: root, encoding: 'utf8' })
  return JSON.parse(readFileSync(auditPath, 'utf8'))
}

function withoutTimestamp(value: Record<string, unknown>) {
  const { timestamp: _timestamp, ...stable } = value
  return stable
}

const total = (map: Record<string, number>) => Object.values(map).reduce((sum, value) => sum + value, 0)

describe('07.010 shadow inventory', () => {
  test('declares the runtime scope and internally reconciles all counters', () => {
    const audit = runAudit()

    expect(audit.scope).toEqual({
      root: 'src',
      includePattern: 'shadow-|box-shadow|boxShadow|drop-shadow',
      excluded: ['src/base44-reference/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
    })
    expect(total(audit.tailwindStandard)).toBeGreaterThan(0)
    expect(total(audit.tailwindStandard) + total(audit.tailwindArbitraryVar) + total(audit.tailwindArbitraryOther)).toBeGreaterThan(0)
    expect(audit.cssBoxShadow.every((entry: { file?: string; line?: number }) => entry.file && entry.line > 0)).toBe(true)
    expect(audit.inlineBoxShadow.every((entry: { file?: string; line?: number }) => entry.file && entry.line > 0)).toBe(true)
  })

  test('is repeatable apart from its timestamp', () => {
    const first = runAudit()
    const second = runAudit()
    expect(withoutTimestamp(first)).toEqual(withoutTimestamp(second))
  })
})
