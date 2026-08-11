import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const harness = readFileSync('scripts/foundation_zero_harness.ts', 'utf8')

const REQUIRED_VIEWPORTS = [
  '320x568', '360x800', '390x844', '412x915', '599x900', '600x900',
  '639x900', '640x900', '768x1024', '839x1024', '840x1024', '1023x768',
  '1024x768', '1199x900', '1200x900', '1279x900', '1280x800', '1440x900',
  '1599x1000', '1600x1000', '1920x1080', 'zoom-200', 'reduced-motion',
  'safe-area-mobile', 'tablet-landscape',
]

describe('Foundation Zero browser harness', () => {
  test('keeps the required viewport denominator explicit', () => {
    expect(REQUIRED_VIEWPORTS).toHaveLength(25)
    for (const viewport of REQUIRED_VIEWPORTS) expect(harness).toContain(`key: '${viewport}'`)
  })

  test('emits the seven required evidence artifacts for captured cases', () => {
    for (const artifact of ['screenshot.png', 'fullpage.png', 'dom-metrics.json', 'console.json', 'network.json', 'a11y.json', 'state.json']) {
      expect(harness).toContain(`'${artifact}'`)
    }
    expect(harness).toContain("row.surface !== 'STANDARD_CANVAS'")
    expect(harness).toContain("process.env.E2E_ROLE_PASSWORD || process.env.E2E_AUTH_PASSWORD")
  })

  test('redacts URL/query credentials before persisting network evidence', () => {
    expect(harness).toContain('redactUrl')
    expect(harness).toContain('<REDACTED>')
    expect(harness).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })
})
