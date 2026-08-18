import { strFromU8, unzipSync } from 'fflate'

/**
 * Leitor mínimo de .xlsx, espelhando o escritor de `@/lib/export`.
 *
 * Lê a primeira planilha e devolve uma linha por registro, usando a primeira
 * linha como cabeçalho — o mesmo contrato de `XLSX.utils.sheet_to_json`, que
 * era o único uso de leitura do pacote `xlsx`. Reaproveita o `fflate` que já
 * empacota o workbook na exportação, então não adiciona dependência.
 *
 * Cobre o que o escritor produz e o que o Excel/Sheets gera ao salvar:
 * strings compartilhadas (`t="s"`), inline (`t="inlineStr"`), resultado de
 * fórmula (`t="str"`), booleanos (`t="b"`) e números.
 */

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

const decodeXml = (value: string) => value.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (match, entity: string) => {
  if (entity.startsWith('#x') || entity.startsWith('#X')) {
    const code = Number.parseInt(entity.slice(2), 16)
    return Number.isFinite(code) ? String.fromCodePoint(code) : match
  }
  if (entity.startsWith('#')) {
    const code = Number.parseInt(entity.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : match
  }
  return XML_ENTITIES[entity] ?? match
})

/** Índice da coluna a partir da referência da célula ("C7" -> 2). */
const columnIndex = (reference: string) => {
  let index = 0
  for (const char of reference) {
    const code = char.charCodeAt(0)
    if (code < 65 || code > 90) break
    index = index * 26 + (code - 64)
  }
  return index - 1
}

/** Texto de um `<si>` da tabela de strings, concatenando os runs. */
const sharedStringText = (block: string) => {
  const parts = block.match(/<t[^>]*>[\s\S]*?<\/t>/g)
  if (!parts) return ''
  return parts.map(part => decodeXml(part.replace(/^<t[^>]*>/, '').replace(/<\/t>$/, ''))).join('')
}

const parseSharedStrings = (xml: string | undefined) => {
  if (!xml) return []
  const blocks = xml.match(/<si>[\s\S]*?<\/si>/g)
  if (!blocks) return []
  return blocks.map(sharedStringText)
}

const cellValue = (cell: string, shared: string[]): unknown => {
  const type = /\st="([^"]+)"/.exec(cell)?.[1]
  if (type === 'inlineStr') {
    const inline = /<is>([\s\S]*?)<\/is>/.exec(cell)?.[1]
    return inline ? sharedStringText(inline) : ''
  }
  const raw = /<v>([\s\S]*?)<\/v>/.exec(cell)?.[1]
  if (raw === undefined) return ''
  const decoded = decodeXml(raw)
  if (type === 's') {
    const index = Number.parseInt(decoded, 10)
    return shared[index] ?? ''
  }
  if (type === 'b') return decoded === '1'
  if (type === 'str' || type === 'e') return decoded
  const numeric = Number(decoded)
  return Number.isFinite(numeric) && decoded.trim() !== '' ? numeric : decoded
}

/** Caminho da primeira planilha, seguindo workbook.xml -> rels. */
const firstSheetPath = (files: Record<string, Uint8Array>) => {
  const workbook = files['xl/workbook.xml']
  const rels = files['xl/_rels/workbook.xml.rels']
  if (workbook && rels) {
    const id = /<sheet[^>]*r:id="([^"]+)"/.exec(strFromU8(workbook))?.[1]
    if (id) {
      const relsXml = strFromU8(rels)
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const target = new RegExp(`<Relationship[^>]*Id="${escaped}"[^>]*Target="([^"]+)"`).exec(relsXml)?.[1]
      if (target) {
        const normalized = target.replace(/^\/?xl\//, '').replace(/^\//, '')
        const candidate = `xl/${normalized}`
        if (files[candidate]) return candidate
      }
    }
  }
  if (files['xl/worksheets/sheet1.xml']) return 'xl/worksheets/sheet1.xml'
  return Object.keys(files).find(name => name.startsWith('xl/worksheets/') && name.endsWith('.xml'))
}

/**
 * Converte a primeira planilha do arquivo em registros chaveados pelo
 * cabeçalho. Lança `Error` com mensagem em português quando o arquivo não é
 * um .xlsx legível.
 */
export function readXlsxRows(buffer: ArrayBuffer): Array<Record<string, unknown>> {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new Error('Arquivo não é uma planilha .xlsx válida.')
  }

  const sheetPath = firstSheetPath(files)
  const sheetFile = sheetPath ? files[sheetPath] : undefined
  if (!sheetFile) throw new Error('A planilha não contém nenhuma aba legível.')

  const shared = parseSharedStrings(files['xl/sharedStrings.xml'] ? strFromU8(files['xl/sharedStrings.xml']) : undefined)
  const sheetXml = strFromU8(sheetFile)

  const rows: unknown[][] = []
  for (const rowXml of sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const cells: unknown[] = []
    for (const cell of rowXml.match(/<c[^>]*\/>|<c[^>]*>[\s\S]*?<\/c>/g) ?? []) {
      const reference = /\sr="([A-Z]+)/.exec(cell)?.[1]
      const index = reference ? columnIndex(reference) : cells.length
      cells[index] = cellValue(cell, shared)
    }
    rows.push(cells)
  }

  const [header, ...body] = rows
  if (!header) return []

  const headers = header.map(value => String(value ?? '').trim())
  return body
    .filter(row => row.some(value => value !== undefined && value !== ''))
    .map(row => {
      const record: Record<string, unknown> = {}
      headers.forEach((name, index) => {
        if (name) record[name] = row[index] ?? ''
      })
      return record
    })
}
