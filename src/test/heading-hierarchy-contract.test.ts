import { describe, expect, test } from 'bun:test'

import { inspectHeadingHierarchy } from '../../scripts/lint-heading-hierarchy.mjs'

describe('contrato FASE V 22.002 — heading hierarchy por rota', () => {
  test('RED: documento com múltiplos h1 é flagrado', () => {
    const source = `
      export function Page() {
        return <>
          <h1>Principal</h1>
          <h1>Outro título</h1>
          <h2>Seção</h2>
        </>
      }
    `
    expect(inspectHeadingHierarchy(source, 'x/Page.tsx')).toEqual([
      expect.objectContaining({ rule: 'duplicate-h1' }),
    ])
  })

  test('RED: h3 sem h2 anterior é flagrado (heading pulado)', () => {
    const source = `
      export function Page() {
        return <><h1>Título</h1><h3>Sub seção</h3></>
      }
    `
    expect(inspectHeadingHierarchy(source, 'x/Page.tsx')).toEqual([
      expect.objectContaining({ rule: 'skipped-heading' }),
    ])
  })

  test('GREEN: h1 único com hierarquia h1→h2→h3 não é flagrado', () => {
    const source = `
      export function Page() {
        return <>
          <h1>Principal</h1>
          <h2>Seção</h2>
          <h3>Sub</h3>
        </>
      }
    `
    expect(inspectHeadingHierarchy(source, 'x/Page.tsx')).toEqual([])
  })

  test('GREEN: rota sem heading (h2 de modal em página) não é flagrado', () => {
    const source = `
      export function Page() {
        return <main><h1>Página</h1><h2>Detalhe</h2></main>
      }
    `
    expect(inspectHeadingHierarchy(source, 'x/Page.tsx')).toEqual([])
  })
})
