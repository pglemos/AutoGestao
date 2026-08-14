import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import { inspectOverlayGeometry, inspectOverlayGeometryRatchet } from '../../scripts/lint-overlay-geometry.mjs'

const src = (text: string) => ({ files: ['features/x/Sample.tsx'], sourceOf: () => text, allowlist: [] })

describe('contrato de geometria de overlay (AC-29.005)', () => {
  test('RED: overlay custom fixed inset-0 sem família canônica é flagrado', () => {
    const result = inspectOverlayGeometry({
      files: ['features/x/OverlayCustom.tsx'],
      sourceOf: () =>
        `export function OverlayCustom() {
           return <div className="fixed inset-0 z-[var(--mx-z-modal)] overflow-y-auto bg-white" role="dialog" aria-modal="true"><p>x</p></div>
         }`,
      allowlist: [],
    })

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'custom-fixed-overlay', file: 'features/x/OverlayCustom.tsx' }),
      ]),
    )
  })

  test('RED: scroll de overlay sem declaração é flagrado', () => {
    const result = inspectOverlayGeometry({
      files: ['features/x/DialogRaw.tsx'],
      sourceOf: () =>
        `import { DialogContent } from '@/components/ui/dialog'
         export function D() { return <DialogContent className="max-h-[90vh] overflow-y-auto"><p>x</p></DialogContent> }`,
      allowlist: [],
    })

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'undeclared-overlay-scroll' }),
        expect.objectContaining({ rule: 'raw-overlay-max-size', detail: 'max-h-[90vh]' }),
      ]),
    )
  })

  test('GREEN: arquivo allowlisted não viola', () => {
    const source = `export function L() { return <div className="fixed inset-0 overflow-y-auto"><p>x</p></div> }`
    const result = inspectOverlayGeometry({
      files: ['features/legacy/LegacyOverlay.tsx'],
      sourceOf: () => source,
      allowlist: ['features/legacy/LegacyOverlay.tsx'],
    })

    expect(result).toEqual([])
  })

  test('RATCHET: arquivo legado não pode acumular uma nova ocorrência', () => {
    const result = inspectOverlayGeometryRatchet({
      files: ['features/legacy/LegacyOverlay.tsx'],
      sourceOf: () => `import { DialogContent } from '@/components/ui/dialog'
        export function L() { return <DialogContent className="max-w-[80rem] max-w-[90rem]" /> }`,
      allowlist: ['features/legacy/LegacyOverlay.tsx'],
      baseline: { 'features/legacy/LegacyOverlay.tsx': { 'raw-overlay-max-size': 1 } },
    })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'legacy-ratchet-increase', file: 'features/legacy/LegacyOverlay.tsx' }),
      ]),
    )
  })

  test('GREEN: uso do organismo Modal com ModalBody não viola', () => {
    const result = inspectOverlayGeometry({
      files: ['features/x/ModalOk.tsx'],
      sourceOf: () =>
        `import { Modal, ModalBody } from '@/components/organisms/Modal'
         export function M() { return <Modal open title="t"><ModalBody><p>x</p></ModalBody></Modal> }`,
      allowlist: [],
    })

    expect(result).toEqual([])
  })

  test('GREEN: primitiva canônica é ignorada', () => {
    const result = inspectOverlayGeometry({
      files: ['components/ui/dialog.jsx'],
      sourceOf: () => `export const DialogContent = () => <div className="fixed inset-0 overflow-y-auto" />`,
      allowlist: [],
    })

    expect(result).toEqual([])
  })

  test('integração: árvore viva não tem violações fora da allowlist', () => {
    const SRC = join(process.cwd(), 'src')
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'base44-reference'].includes(entry.name)) walk(full, out)
        } else if (/\.(tsx|jsx|ts|js)$/.test(entry.name) && !/\.(test|spec|playwright)\./.test(entry.name)) {
          out.push(relative(SRC, full).replace(/\\/g, '/'))
        }
      }
      return out
    }
    const files = walk(SRC)
    const sourceOf = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

    const audit = inspectOverlayGeometryRatchet({ files, sourceOf })
    expect(audit.violations).toEqual([])
    expect(audit.allViolations.length).toBeGreaterThan(0)
  })
})
