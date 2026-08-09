import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'src/base44-reference/pages/PDIPage.jsx'), 'utf8')

describe('Vendedor PDI visual contract', () => {
  test('initializes both competency radars with positive dimensions', () => {
    const normalizedSource = source.replace(/\s+/g, ' ')

    expect(normalizedSource.match(/className="h-64 mb-6 w-full min-w-0"/g)?.length).toBe(2)
    expect(normalizedSource.match(/minWidth=\{0\}/g)?.length).toBe(2)
    expect(normalizedSource.match(/initialDimension=\{\{ width: 320, height: 256 \}\}/g)?.length).toBe(2)
  })
})
