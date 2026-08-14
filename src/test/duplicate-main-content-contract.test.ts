import { describe, expect, test } from 'bun:test'

import {
  inspectDuplicateMainContent,
  runDuplicateMainContentGate,
} from '../../scripts/lint-duplicate-main-content.mjs'

describe('contrato AC-29.015 — duplicate main-content', () => {
  test('RED: arquivo fora do shell declarando id="main-content" é flagrado', () => {
    const source = `
      export function Pagina() {
        return <main id="main-content"><p>conteúdo</p></main>
      }
    `
    expect(inspectDuplicateMainContent(source, 'features/x/Pagina.tsx')).toEqual([
      expect.objectContaining({ file: 'features/x/Pagina.tsx' }),
    ])
  })

  test('RED: div com id="main-content" também é flagrado', () => {
    const source = `export const X = () => <div id="main-content">x</div>`
    expect(inspectDuplicateMainContent(source, 'pages/Y.tsx')).toEqual([
      expect.objectContaining({ file: 'pages/Y.tsx' }),
    ])
  })

  test('o inspetor conta a ocorrência do shell (o gate decide a posse)', () => {
    const source = `
      import { PageViewport } from '@/design-system/page'
      export function Shell() {
        return (
          <main id="main-content" data-mx-shell-main="">
            <PageViewport>{children}</PageViewport>
          </main>
        )
      }
    `
    expect(inspectDuplicateMainContent(source, 'src/components/MxSidebarShell.tsx')).toHaveLength(1)
  })

  test('GREEN: comentário citando main-content não é violação', () => {
    const source = `
      // o shell já renderiza id="main-content"; páginas não devem repetir.
      export function Pagina() {
        return <div className="p-4">conteúdo</div>
      }
    `
    expect(inspectDuplicateMainContent(source, 'features/x/Pagina.tsx')).toEqual([])
  })

  test('GREEN: referência a mainContentId como constante não é violação', () => {
    const source = `
      export const mainContentId = 'main-content'
      export const config = { mainContentId }
    `
    expect(inspectDuplicateMainContent(source, 'src/design-system/shell/appShellConfig.ts')).toEqual([])
  })

  test('GREEN: data-id e aria-labelledby="main-content" não são violação', () => {
    expect(inspectDuplicateMainContent(`export const X = () => <div data-id="main-content">x</div>`, 'pages/D.tsx')).toEqual([])
    expect(inspectDuplicateMainContent(`export const X = () => <div aria-labelledby="main-content">x</div>`, 'pages/E.tsx')).toEqual([])
  })

  test('RED: id={"main-content"} (expressão) é flagrado', () => {
    expect(inspectDuplicateMainContent(`export const X = () => <main id={"main-content"}>x</main>`, 'pages/F.tsx')).toHaveLength(1)
  })

  test('integração: árvore viva tem um único main-content no shell', () => {
    const violations = runDuplicateMainContentGate()
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})
