import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const source = readFileSync(new URL('./sentry.ts', import.meta.url), 'utf8')

describe('Sentry bundle contract', () => {
  test('uses named SDK imports so unused integrations remain tree-shakeable', () => {
    expect(source).not.toContain("import * as Sentry from '@sentry/react'")
    expect(source).toMatch(/import\s*\{[\s\S]*?\}\s*from ['"]@sentry\/react['"]/)
  })

  test('adapts the current Sentry metrics namespace to the MX observability facade', () => {
    expect(source).toContain('sentryMetrics.count(name, value')
    expect(source).toContain('metrics: sentryMetricBridge')
    expect(source).not.toContain('metrics: sentryMetrics')
  })
})
