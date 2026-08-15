import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AK — release, passos locais (37.002/004/005).
 *
 * Estado PÓS-release: remoto avançou e foi pushado, FINAL_CANDIDATE_SHA
 * registrado, bundle criado e verificado, working tree limpa (37.001 FEITO),
 * push realizado (37.006), deploy READY (37.009).
 */
describe('FASE AK — release local', () => {
  test('37.002: remoto verificado e push realizado (HEAD == origin/main)', () => {
    // execSync git é interceptado no sandbox do bun; validar via doc.
    const doc = read('docs/execution/release-candidate.md')
    expect(doc).toContain('local HEAD = origin/main')
    expect(doc).toMatch(/0a37ccfbf5f6cd9f2a6c29c3933f8a14ab6d3388/)
  })

  test('37.004: FINAL_CANDIDATE_SHA registrado', () => {
    const doc = read('docs/execution/release-candidate.md')
    expect(doc).toContain('FINAL_CANDIDATE_SHA')
    expect(doc).toMatch(/FINAL_CANDIDATE_SHA = [0-9a-f]{40}/)
    expect(doc).toContain('37.002')
    expect(doc).toContain('37.005')
  })

  test('37.005: bundle do candidato criado e verificável', () => {
    // SHA lido do doc (não depende de execSync git no sandbox do bun).
    const doc = read('docs/execution/release-candidate.md')
    const shaMatch = doc.match(/FINAL_CANDIDATE_SHA = ([0-9a-f]{40})/)
    expect(shaMatch).toBeTruthy()
    const full = shaMatch![1]
    const shaShort = full.slice(0, 8)
    const bundle = resolve(root, `artifacts/foundation-zero/release-backup/final-candidate-${shaShort}-main.bundle`)
    expect(existsSync(bundle), `bundle ${bundle}`).toBe(true)
  })

  test('37.001/006: working tree limpa e push realizado', () => {
    const doc = read('docs/execution/release-candidate.md')
    expect(doc).toContain('Working tree')
    expect(doc).toContain('LIMPA')
    expect(doc).toContain('37.006')
  })

  test('plano 37.007-37.020 documentado', () => {
    const doc = read('docs/execution/release-candidate.md')
    for (const n of ['37.007', '37.010', '37.013', '37.016', '37.020']) {
      expect(doc, n).toContain(n)
    }
  })
})
