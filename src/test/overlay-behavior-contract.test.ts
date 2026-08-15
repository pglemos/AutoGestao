import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * FASE O — 15.012 / 15.015 / 15.016 / 15.017 / 15.018 / 15.019
 *
 * Comportamento canônico de overlays:
 * - 15.012: open/close motion com reduced-motion fallback global.
 * - 15.015: ESC fecha (Radix default) exceto quando destructive-confirmation
 *   bloqueada explicitamente por requisito.
 * - 15.016: clique no overlay fecha conforme semanticidade (modal padrão);
 *   destructive-confirmation não fecha no click sem confirmação.
 * - 15.017: aria-labelledby (título) e aria-describedby (descrição) via
 *   DialogTitle/DialogDescription (Radix liga automaticamente).
 * - 15.018: ordem confirm/cancel — no desktop, cancel à esquerda, confirm à
 *   direita; no mobile, coluna invertida (Radix Footer).
 * - 15.019: alert destructive usa AlertDialog + botão danger, nunca Button cru
 *   sem o canal de confirmação.
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

describe('FASE O — comportamento canônico de overlays', () => {
  test('15.012 open/close motion com reduced-motion global', () => {
    const css = read('src/index.css')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    const dialog = read('src/components/ui/dialog.jsx')
    expect(dialog).toMatch(/data-\[state=open\]:animate-in/)
    expect(dialog).toMatch(/data-\[state=closed\]:animate-out/)
  })

  test('15.015 ESC fecha (Modal expõe closeOnEscape; ui/dialog usa default Radix)', () => {
    const modal = read('src/components/organisms/Modal.tsx')
    expect(modal).toContain('closeOnEscape')
    expect(modal).toContain('onEscapeKeyDown')
    const dialog = read('src/components/ui/dialog.jsx')
    expect(dialog).toContain('DialogPrimitive.Root')
  })

  test('15.016 overlay click fecha (Radix default no ui/dialog)', () => {
    // ui/dialog não intercepta onInteractOutside — o clique no backdrop fecha.
    const dialog = read('src/components/ui/dialog.jsx')
    expect(dialog).not.toContain('onInteractOutside')
    expect(dialog).not.toContain('onPointerDownOutside')
  })

  test('15.017 aria-labelledby/description via título+descrição', () => {
    const dialog = read('src/components/ui/dialog.jsx')
    expect(dialog).toContain('DialogTitle')
    expect(dialog).toContain('DialogDescription')
    const modal = read('src/components/organisms/Modal.tsx')
    expect(modal).toContain('Dialog.Title')
    expect(modal).toContain('Dialog.Description')
  })

  test('15.018 confirm/cancel order no footer (desktop cancel→confirm)', () => {
    const alertFooter = read('src/components/ui/alert-dialog.jsx')
    expect(alertFooter).toContain('flex-col-reverse')
    expect(alertFooter).toContain('sm:flex-row')
    expect(alertFooter).toContain('sm:justify-end')
  })

  test('15.019 alert destructive usa AlertDialog + botão danger, com canal de confirmação', () => {
    const deleteDialog = read('src/features/action-plan/components/DeleteActionDialog.tsx')
    expect(deleteDialog).toContain('AlertDialog')
    expect(deleteDialog).toContain('AlertDialogCancel')
    expect(deleteDialog).toContain('variant="danger"')
    // Confirmação por digitação — não fecha sem confirmação.
    expect(deleteDialog).toContain('canDelete')
    // O ConfirmationDialog (team-panel) também é AlertDialog, não Dialog cru.
    const confirmation = read('src/features/lojas/components/team-panel/ConfirmationDialog.tsx')
    expect(confirmation).toContain('AlertDialog')
    expect(confirmation).toContain('AlertDialogTitle')
    expect(confirmation).toContain('AlertDialogCancel')
  })
})
