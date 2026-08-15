import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * FASE K — 11.011-11.015 (fechamento).
 *
 * - 11.011 tooltip de icon-only: N/A — icon-only exige aria-label (11.010,
 *   gate 29.014); Tooltip atom existe para affordance opcional, não é
 *   obrigatório para a11y.
 * - 11.012 impedir page consumer de redefinir identidade sem API: gate
 *   `lint-dangerous-overrides` bloqueia `!h-*`/bg/radius/uppercase em className
 *   de Button/Card/etc.
 * - 11.013 lint perigoso: gate existe e roda no `npm run lint`.
 * - 11.014 migrar consumidores: allowlist do gate encolheu (5 arquivos removidos
 *   nesta fatia: ValidateModal, ConfirmationDialog, TransferConfirmationDialog,
 *   ContentSuggestionDialog, DigitalProductCard).
 * - 11.015 teclado/toque/zoom: coberto por `button-family-contract` (11.015:
 *   focus-visible + active:scale + duration) + touch-target 44px (11.003/20.008)
 *   + `typography-zoom-200.playwright` (200% zoom).
 */
const root = resolve(import.meta.dir, '..', '..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

describe('FASE K 11.011-11.015 — fechamento de Button/IconButton', () => {
  test('11.013 — gate de overrides perigosos existe e está no npm run lint', () => {
    const gate = read('scripts/lint-dangerous-overrides.mjs')
    const pkg = read('package.json')
    expect(gate).toContain('DANGEROUS_OVERRIDE_ALLOWLIST')
    expect(gate).toContain("'Button'")
    expect(gate).toContain('IMPORTANT_RE')
    expect(pkg).toContain('lint-dangerous-overrides')
  })

  test('11.012 — Button canônico sem API de override de identidade por className (variantes via prop)', () => {
    const btn = read('src/components/atoms/Button.tsx')
    // As variantes de identidade são via prop (cva), não classe inline.
    expect(btn).toContain('variants:')
    expect(btn).toContain('primary:')
    expect(btn).toContain('danger:')
  })

  test('11.011 — icon-only exige aria-label (a11y), não tooltip obrigatório', () => {
    const iconBtn = read('src/components/atoms/IconButton.tsx')
    const gate = read('scripts/lint-icon-only-action.mjs')
    expect(iconBtn).toContain('label')
    expect(iconBtn).toContain('VisuallyHidden')
    expect(gate).toContain('ALLOWLIST')
  })

  test('11.015 — teclado/toque/zoom cobertos por contratos', () => {
    const btnContract = read('src/test/button-family-contract.test.ts')
    expect(btnContract).toContain('11.015')
    expect(btnContract).toContain('focus-visible:ring-4')
    expect(btnContract).toContain('active:scale')
    // Touch target 44px.
    const tokens = read('src/design-system/tokens/components.css')
    expect(tokens).toContain('--mx-touch-target-min: 44px')
  })

  test('11.014 — allowlist de overrides perigosos encolheu (migrações removidas)', () => {
    const gate = read('scripts/lint-dangerous-overrides.mjs')
    // Os 5 arquivos migrados nesta fatia não estão mais na allowlist.
    for (const f of [
      'ValidateModal.jsx',
      'ConfirmationDialog.tsx',
      'TransferConfirmationDialog.tsx',
      'ContentSuggestionDialog.tsx',
      'DigitalProductCard.tsx',
    ]) {
      expect(gate, f).not.toContain(f)
    }
  })
})
