import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts

/** Gates AC do Foundation Zero que devem rodar dentro do `npm run lint`. */
const AC_GATES: Record<string, string> = {
  'lint:page-roots': 'node scripts/lint-page-roots.mjs',
  'lint:page-roots:delegated': 'node scripts/lint-page-roots-delegated.mjs',
  'lint:route-layout': 'node scripts/lint-route-layout-metadata.mjs',
  'lint:adopted-route-canvas': 'node scripts/lint-adopted-route-canvas.mjs',
  'lint:overlay-geometry': 'node scripts/lint-overlay-geometry.mjs',
}

describe('cadeia de lint Foundation Zero', () => {
  test('executa o gate adopted-route-canvas dentro do lint principal', () => {
    expect(scripts['lint:adopted-route-canvas']).toBe('node scripts/lint-adopted-route-canvas.mjs')
    expect(scripts.lint).toContain('node scripts/lint-adopted-route-canvas.mjs')
  })

  test('executa todos os gates AC dentro do lint principal', () => {
    for (const [entry, command] of Object.entries(AC_GATES)) {
      expect(scripts[entry], `entry "${entry}"`).toBe(command)
      expect(scripts.lint, `gate "${entry}" ausente na cadeia lint`).toContain(command)
    }
  })
})
