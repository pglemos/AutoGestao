import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { applyHexTokenRules } from '../../scripts/migrate-hex-tokens.mjs'

const root = resolve(import.meta.dir, '..', '..')

/**
 * Varredura determinística do runtime (Node/Bun, sem child_process): o preload
 * happy-dom do bun test intercepta o spawn e faria o gate passar cegamente.
 * Escopo e exclusões espelham o guard 07.021 original.
 */
async function scanRuntimeClassNames(): Promise<Array<{ file: string; line: number }>> {
  const hits: Array<{ file: string; line: number }> = []
  const HEX_UTIL = /(?:^|\s)(?:!)?(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|divide|decoration|accent|caret|placeholder|hover:bg|focus-visible:ring|focus:ring)-\[#[0-9A-Fa-f]{6}\]/

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'base44-reference' || entry.name === '_stories') continue
        if (entry.name === 'node_modules') continue
        await walk(path)
        continue
      }
      if (!/\.(css|ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue
      if (/(\.test\.|\.spec\.|\.playwright\.)/.test(entry.name)) continue
      if (path.includes('design-system/tokens') || path.endsWith('index.css')) continue
      const content = await readFile(path, 'utf8')
      content.split('\n').forEach((line, idx) => {
        if (HEX_UTIL.test(line)) hits.push({ file: path, line: idx + 1 })
      })
    }
  }

  await walk(resolve(root, 'src'))
  return hits.map((h) => ({ file: h.file.replace(resolve(root) + '/', ''), line: h.line }))
}

describe('07.021 hex tokens migration (COMP-hex-tokens)', () => {
  test('runtime has no arbitrary hex utilities outside exceptions', async () => {
    const hits = await scanRuntimeClassNames()
    expect(hits).toEqual([])
  })

  test('maps the info-consultive hex to status-info', () => {
    const result = applyHexTokenRules(
      'bg-[#005BFF] text-[#005BFF] border-[#005BFF] ring-[#005BFF] from-[#005BFF] to-[#005BFF] hover:bg-[#005BFF]',
    )

    expect(result.next).toBe(
      'bg-status-info text-status-info-text border-status-info ring-status-info from-status-info to-status-info hover:bg-status-info',
    )
  })

  test('maps navy, muted and border hexes', () => {
    const result = applyHexTokenRules(
      'text-[#031B3D] text-[#0F172A] text-[#526B7A] text-[#64748B] border-[#DFE0E1] border-[#E5E7EB] bg-[#F7F8F8]',
    )

    expect(result.next).toBe(
      'text-mx-navy text-mx-navy text-muted-foreground text-muted-foreground border-border border-border bg-surface-alt',
    )
  })

  test('maps success/warning/error hexes', () => {
    const result = applyHexTokenRules(
      'text-[#00A89D] bg-[#22C55E] text-[#F59E0B] bg-[#EF4444] text-[#EF4343] text-[#92400E]',
    )

    expect(result.next).toBe(
      'text-status-success bg-status-success text-status-warning-text bg-status-error text-status-error text-status-warning-text',
    )
  })

  test('is idempotent and does not remigrate semantic utilities', () => {
    const first = applyHexTokenRules('bg-[#005BFF] bg-status-info text-mx-navy')
    const second = applyHexTokenRules(first.next)

    expect(first.next).toBe('bg-status-info bg-status-info text-mx-navy')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})
