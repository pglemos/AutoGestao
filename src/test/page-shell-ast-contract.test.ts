import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import * as ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

function jsxTagNames(source: string, fileName: string) {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const tags: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node)) tags.push(node.openingElement.tagName.getText(file))
    if (ts.isJsxSelfClosingElement(node)) tags.push(node.tagName.getText(file))
    ts.forEachChild(node, visit)
  }
  visit(file)
  return tags
}

describe('contrato AST do shell e do scroll owner', () => {
  test('mantém uma única landmark main e nenhum main em PageCanvas', () => {
    const shell = read('components/MxSidebarShell.tsx')
    const canvas = read('design-system/page/PageCanvas.tsx')
    const shellTags = jsxTagNames(shell, 'MxSidebarShell.tsx')
    const canvasTags = jsxTagNames(canvas, 'PageCanvas.tsx')

    expect(shellTags.filter((tag) => tag === 'main')).toHaveLength(1)
    expect(shell).toContain('id="main-content"')
    expect(canvasTags).not.toContain('main')
    expect(canvas).toMatch(/as\?:\s*'div'\s*\|\s*'section'/)
    expect(canvas).not.toMatch(/as\?:[^\n]*'main'/)
  })

  test('mantém PageViewport como único owner e o wrapper sem geometria de rolagem', () => {
    const viewport = read('design-system/page/PageViewport.tsx')
    const template = read('components/templates/PageTemplate.tsx')
    const viewportTags = jsxTagNames(viewport, 'PageViewport.tsx')
    const templateTags = jsxTagNames(template, 'PageTemplate.tsx')

    expect(viewportTags).toContain('Element')
    expect(viewport).toContain('data-mx-page-scroll-owner=""')
    expect(viewport).toContain('overflow-y-auto')
    expect(template).toContain('<PageCanvas as={as}')
    expect(template).not.toMatch(/overflow-y-(auto|scroll)/)
    expect(templateTags).toContain('PageCanvas')
  })
})
