import { describe, expect, test } from 'bun:test'
import { buildImagePdf, buildTextPdf } from '@/lib/pdf/downloadHtmlAsPdf'

const decode = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes)

describe('PDF writer', () => {
  test('gera PDF textual paginado com xref e trailer válidos', () => {
    const pdf = buildTextPdf(Array.from({ length: 70 }, (_, index) => `Linha ${index + 1}`).join('\n'))
    const text = decode(pdf)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Type /Pages')
    expect(text).toContain('/Count 2')
    expect(text).toContain('xref')
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
  })

  test('incorpora uma imagem JPEG como XObject', () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
    const pdf = buildImagePdf([{ bytes: jpeg, width: 20, height: 10 }], {
      pageWidth: 595.28,
      pageHeight: 841.89,
      margins: [20, 20, 20, 20],
    })
    const text = decode(pdf)
    expect(text).toContain('/Subtype /Image')
    expect(text).toContain('/Filter /DCTDecode')
    expect(text).toContain('/Count 1')
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
  })
})
