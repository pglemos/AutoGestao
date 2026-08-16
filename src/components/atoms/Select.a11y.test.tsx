import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Select } from './Select'
import { MxField } from '@/components/module/MxModuleVisualPrimitives'

/**
 * O Select já aplicou `aria-label="Seleção"` por padrão. Como aria-label vence
 * o `<label>` que envolve o campo, todo select dentro de MxField se anunciava
 * como "Seleção" em vez do nome real — e sumia de `getByLabel` nos testes.
 */
describe('Select — nome acessível', () => {
  test('sem rótulo próprio não inventa aria-label', () => {
    const html = renderToStaticMarkup(<Select><option value="a">A</option></Select>)
    expect(html).not.toContain('aria-label')
  })

  test('dentro de MxField o rótulo do campo permanece o nome acessível', () => {
    const html = renderToStaticMarkup(
      <MxField label="Produto contratado">
        <Select><option value="a">A</option></Select>
      </MxField>,
    )
    expect(html).toContain('Produto contratado')
    expect(html).not.toContain('aria-label="Seleção"')
  })

  test('aria-label explícito é respeitado', () => {
    const html = renderToStaticMarkup(
      <Select aria-label="Loja de destino"><option value="a">A</option></Select>,
    )
    expect(html).toContain('aria-label="Loja de destino"')
  })

  test('prop label continua rotulando e associando por id', () => {
    const html = renderToStaticMarkup(
      <Select label="Modalidade"><option value="a">A</option></Select>,
    )
    expect(html).toContain('Modalidade')
    expect(html).toContain('<label')
  })
})
