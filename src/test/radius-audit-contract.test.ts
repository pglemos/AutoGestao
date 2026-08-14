import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { scanSourceFiles } from './lib/scanSourceFiles'

const root = path.resolve(import.meta.dir, '../..')
const auditPath = path.join(root, '.superpowers/mx-foundation-zero/radius/audit-07.008.json')

function runAudit() {
  execFileSync('node', ['scripts/audit-radius-runtime.mjs'], {
    cwd: root,
    encoding: 'utf8',
  })
  return JSON.parse(readFileSync(auditPath, 'utf8'))
}

function withoutTimestamp(value: Record<string, unknown>) {
  const { timestamp: _timestamp, ...stable } = value
  return stable
}

/** C8: conta `rx=`/`ry=` por varredura fs — um `rg` aqui retornaria 0 sob bun test. */
function countSvgRadiusAttributes(): number {
  let count = 0
  for (const { lines } of scanSourceFiles({
    extraExcluded: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*', 'src/base44-reference/**'],
  })) {
    for (const line of lines) {
      const matches = line.match(/\b(rx|ry)=/g)
      if (matches) count += matches.length
    }
  }
  return count
}

describe('07.008 radius inventory', () => {
  test('declares its runtime scope and counts every SVG radius attribute', () => {
    const audit = runAudit()
    const expectedSvgOccurrences = countSvgRadiusAttributes()

    expect(audit.scope).toEqual({
      root: 'src',
      includePattern: 'rounded|border-.*radius|borderRadius|\\b(rx|ry)=',
      excluded: ['src/base44-reference/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
    })
    expect(audit.svgRxRy).toHaveLength(expectedSvgOccurrences)
    expect(audit.svgRxRy.every((entry: { attribute?: string }) => ['rx', 'ry'].includes(entry.attribute ?? ''))).toBe(true)
  })

  test('is repeatable apart from its timestamp', () => {
    const first = runAudit()
    const second = runAudit()

    expect(withoutTimestamp(first)).toEqual(withoutTimestamp(second))
  })
})
