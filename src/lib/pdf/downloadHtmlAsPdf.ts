type Html2PdfOptions = {
  margin?: number | [number, number, number, number]
  filename: string
  image?: { type?: 'jpeg'; quality?: number }
  html2canvas?: Record<string, unknown>
  jsPDF?: {
    unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc'
    format?: string | [number, number]
    orientation?: 'landscape' | 'portrait'
  }
}

type JpegPage = {
  bytes: Uint8Array
  width: number
  height: number
}

const HTML_RENDER_TIMEOUT_MS = 18000
const A4_POINTS: [number, number] = [595.28, 841.89]
const encoder = new TextEncoder()

const concatBytes = (parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

const ascii = (value: string) => encoder.encode(value)

const pdfObject = (id: number, body: Uint8Array | string) => concatBytes([
  ascii(`${id} 0 obj\n`),
  typeof body === 'string' ? ascii(body) : body,
  ascii('\nendobj\n'),
])

const finishPdf = (objects: Uint8Array[]) => {
  const header = ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const offsets = [0]
  let cursor = header.length
  for (const object of objects) {
    offsets.push(cursor)
    cursor += object.length
  }
  const xrefOffset = cursor
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join('')
  return concatBytes([header, ...objects, ascii(xref)])
}

export function buildImagePdf(
  pages: JpegPage[],
  options: { pageWidth: number; pageHeight: number; margins: [number, number, number, number] },
) {
  if (pages.length === 0) throw new Error('O PDF precisa de ao menos uma página.')
  const [marginTop, marginRight, marginBottom, marginLeft] = options.margins
  const contentWidth = options.pageWidth - marginLeft - marginRight
  const contentHeight = options.pageHeight - marginTop - marginBottom
  const objectCount = 2 + (pages.length * 3)
  const objects = new Array<Uint8Array>(objectCount)
  const pageRefs: string[] = []

  pages.forEach((page, index) => {
    const pageId = 3 + (index * 3)
    const contentId = pageId + 1
    const imageId = pageId + 2
    const renderedHeight = Math.min(contentHeight, contentWidth * (page.height / page.width))
    const y = options.pageHeight - marginTop - renderedHeight
    const commands = `q\n${contentWidth.toFixed(2)} 0 0 ${renderedHeight.toFixed(2)} ${marginLeft.toFixed(2)} ${y.toFixed(2)} cm\n/Im${index + 1} Do\nQ`
    const contentBytes = ascii(commands)
    const imageBody = concatBytes([
      ascii(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      ascii('\nendstream'),
    ])

    pageRefs.push(`${pageId} 0 R`)
    objects[pageId - 1] = pdfObject(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${options.pageWidth} ${options.pageHeight}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects[contentId - 1] = pdfObject(contentId, concatBytes([
      ascii(`<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      ascii('\nendstream'),
    ]))
    objects[imageId - 1] = pdfObject(imageId, imageBody)
  })

  objects[0] = pdfObject(1, '<< /Type /Catalog /Pages 2 0 R >>')
  objects[1] = pdfObject(2, `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`)
  return finishPdf(objects)
}

const sanitizePdfText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E\n]/g, '?')
  .replaceAll('\\', '\\\\')
  .replaceAll('(', '\\(')
  .replaceAll(')', '\\)')

export function buildTextPdf(text: string) {
  const lines = sanitizePdfText(text).split(/\n/).flatMap((line) => {
    const chunks = line.match(/.{1,95}(?:\s|$)|.{1,95}/g)
    return chunks?.map((chunk) => chunk.trimEnd()) ?? ['']
  })
  const pageLines = Array.from({ length: Math.max(1, Math.ceil(lines.length / 58)) }, (_, index) => lines.slice(index * 58, (index + 1) * 58))
  const pageRefs: string[] = []
  const objects: Uint8Array[] = [
    pdfObject(1, '<< /Type /Catalog /Pages 2 0 R >>'),
    new Uint8Array(),
    pdfObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
  ]
  pageLines.forEach((page, index) => {
    const pageId = 4 + (index * 2)
    const contentId = pageId + 1
    const commands = `BT\n/F1 9 Tf\n12 TL\n40 800 Td\n${page.map((line, lineIndex) => `${lineIndex ? 'T* ' : ''}(${line}) Tj`).join('\n')}\nET`
    const content = ascii(commands)
    pageRefs.push(`${pageId} 0 R`)
    objects.push(pdfObject(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_POINTS[0]} ${A4_POINTS[1]}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`))
    objects.push(pdfObject(contentId, concatBytes([
      ascii(`<< /Length ${content.length} >>\nstream\n`),
      content,
      ascii('\nendstream'),
    ])))
  })
  objects[1] = pdfObject(2, `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageLines.length} >>`)
  return finishPdf(objects)
}

function clickBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('PDF HTML render timed out')), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId)
  }
}

function normalizeMargins(margin: Html2PdfOptions['margin']): [number, number, number, number] {
  if (Array.isArray(margin)) return margin
  const value = margin ?? 10
  return [value, value, value, value]
}

const dataUrlBytes = (dataUrl: string) => {
  const encoded = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(encoded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function createVisualPdf(element: HTMLElement, options: Html2PdfOptions) {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    ...options.html2canvas,
  })
  const orientation = options.jsPDF?.orientation ?? 'portrait'
  const [baseWidth, baseHeight] = A4_POINTS
  const pageWidth = orientation === 'landscape' ? baseHeight : baseWidth
  const pageHeight = orientation === 'landscape' ? baseWidth : baseHeight
  const marginsMm = normalizeMargins(options.margin)
  const margins = marginsMm.map((value) => value * (72 / 25.4)) as [number, number, number, number]
  const contentWidth = pageWidth - margins[1] - margins[3]
  const contentHeight = pageHeight - margins[0] - margins[2]
  const pixelsPerPage = Math.max(1, Math.floor(canvas.width * (contentHeight / contentWidth)))
  const quality = options.image?.quality ?? 0.95
  const pages: JpegPage[] = []

  for (let top = 0; top < canvas.height; top += pixelsPerPage) {
    const height = Math.min(pixelsPerPage, canvas.height - top)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = height
    const context = slice.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível para gerar PDF.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, slice.width, slice.height)
    context.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height)
    pages.push({
      bytes: dataUrlBytes(slice.toDataURL('image/jpeg', quality)),
      width: slice.width,
      height: slice.height,
    })
  }

  return new Blob([buildImagePdf(pages, { pageWidth, pageHeight, margins }) as BlobPart], {
    type: 'application/pdf',
  })
}

async function createTextFallbackPdf(element: HTMLElement, filename: string) {
  const title = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
  const rawText = (element.innerText || element.textContent || title)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  return new Blob([buildTextPdf(`${title}\n\n${rawText}`) as BlobPart], { type: 'application/pdf' })
}

export async function downloadHtmlAsPdf(element: HTMLElement, options: Html2PdfOptions) {
  let blob: Blob
  try {
    blob = await withTimeout(createVisualPdf(element, options), HTML_RENDER_TIMEOUT_MS)
  } catch {
    blob = await createTextFallbackPdf(element, options.filename)
  }
  clickBlobDownload(blob, options.filename)
}
