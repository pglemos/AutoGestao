import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * Contrato FASE Q 17.010/17.011 — feedback offline e aria-live adequado.
 *
 * - 17.010: o feedback offline existe e é canônico (ícone + texto + tokens de
 *   status, nunca só cor) — `CheckinAutosaveStatus` cobre o autosave offline.
 * - 17.011: `aria-live` é usado com moderação e com texto legível:
 *   `AlertMessage.live` (politeness por tom) e o status de autosave
 *   (`role=status`, `aria-live=polite`) anunciam sem roubar foco.
 */
const autosave = readFileSync('src/features/checkin/autosave/CheckinAutosaveStatus.tsx', 'utf8')
const alertMessage = readFileSync('src/components/molecules/AlertMessage.tsx', 'utf8')

describe('FASE Q 17.010 — feedback offline/network canônico', () => {
  test('estado offline tem ícone, texto e token semântico (não só cor)', () => {
    expect(autosave).toContain("case 'offline':")
    expect(autosave).toContain('Sem conexão. Salvaremos ao reconectar.')
    expect(autosave).toContain('CloudOff')
    expect(autosave).toContain('border-status-warning/30 bg-status-warning-surface')
  })
})

describe('FASE Q 17.011 — aria-live adequado sem spam', () => {
  test('AlertMessage usa aria-live por tom com politeness correto', () => {
    expect(alertMessage).toContain("tone === 'danger' ? 'alert' : 'status'")
    expect(alertMessage).toContain("tone === 'danger' ? 'assertive' : 'polite'")
  })

  test('status de autosave anuncia mudança via role=status aria-live=polite', () => {
    expect(autosave).toContain('role="status"')
    expect(autosave).toContain('aria-live="polite"')
  })
})
