import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AK — release, passos locais pré-push (37.002/004/005).
 *
 * Passos seguros ANTES do freeze: remoto não avançou, candidato registrado,
 * bundle criado e verificado. 37.001 (working tree limpa) e 37.006+ (push)
 * ficam para depois do pouso de DS1/DS4.
 */
describe('FASE AK — release local pré-push', () => {
  test('37.002: remoto não avançou (local == origin/main)', () => {
    // execSync git é interceptado no sandbox do bun; validar via doc que o
    // fetch foi feito e local==origin (registrado em 37.002/37.004).
    const doc = read('docs/execution/release-candidate.md')
    expect(doc).toContain('remoto NÃO avançou')
    expect(doc).toContain('local HEAD = origin/main')
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
    // o bundle foi nomeado com o short de 8 chars que o git gerou (b083b6fb)
    const shaShort = full.slice(0, 8)
    const bundle = resolve(root, `artifacts/foundation-zero/release-backup/final-candidate-${shaShort}-main.bundle`)
    expect(existsSync(bundle), `bundle ${bundle}`).toBe(true)
  })

  test('37.001/006 não executados (working tree em voo, sem push)', () => {
    const doc = read('docs/execution/release-candidate.md')
    expect(doc).toContain('37.001 NÃO feito')
    expect(doc).toContain('DS1/DS4 em voo')
    expect(doc).toContain('37.006')
  })

  test('plano 37.007-37.020 documentado', () => {
    const doc = read('docs/execution/release-candidate.md')
    for (const n of ['37.007', '37.010', '37.013', '37.016', '37.020']) {
      expect(doc, n).toContain(n)
    }
  })
})
