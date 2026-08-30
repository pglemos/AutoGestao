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

/** Informações de uma aba localizada no arquivo .xlsx. */
export type SheetDescriptor = {
  name: string
  sheetId: string
  path: string
}

/** Caminho da primeira planilha, seguindo workbook.xml -> rels. */
const firstSheetPath = (files: Record<string, Uint8Array>) => {
  const sheets = listXlsxSheets(files)
  if (sheets.length > 0) return sheets[0].path
  if (files['xl/worksheets/sheet1.xml']) return 'xl/worksheets/sheet1.xml'
  return Object.keys(files).find(name => name.startsWith('xl/worksheets/') && name.endsWith('.xml'))
}

/** Lista todas as abas presentes no workbook na ordem declarada. */
export function listXlsxSheets(files: Record<string, Uint8Array>): SheetDescriptor[] {
  const workbook = files['xl/workbook.xml']
  const rels = files['xl/_rels/workbook.xml.rels']
  if (!workbook || !rels) {
    if (files['xl/worksheets/sheet1.xml']) return [{ name: 'Sheet1', sheetId: '1', path: 'xl/worksheets/sheet1.xml' }]
    const fallback = Object.keys(files).find(name => name.startsWith('xl/worksheets/') && name.endsWith('.xml'))
    return fallback ? [{ name: 'Sheet1', sheetId: '1', path: fallback }] : []
  }

  const relsXml = strFromU8(rels)
  const relMap = new Map<string, string>()
  for (const rel of relsXml.match(/<Relationship[^>]*\/>/g) ?? []) {
    const id = /Id="([^"]+)"/.exec(rel)?.[1]
    const target = /Target="([^"]+)"/.exec(rel)?.[1]
    if (id && target) {
      const normalized = target.replace(/^\/?xl\//, '').replace(/^\//, '')
      relMap.set(id, `xl/${normalized}`)
    }
  }

  const workbookXml = strFromU8(workbook)
  const sheets: SheetDescriptor[] = []
  for (const sheetTag of workbookXml.match(/<sheet[^>]*\/>|<sheet[^>]*>[\s\S]*?<\/sheet>/g) ?? []) {
    const name = /name="([^"]+)"/.exec(sheetTag)?.[1]
    const sheetId = /sheetId="([^"]+)"/.exec(sheetTag)?.[1] ?? ''
    const rId = /r:id="([^"]+)"/.exec(sheetTag)?.[1]
    const path = rId ? relMap.get(rId) : undefined
    if (name && path && files[path]) {
      sheets.push({ name: decodeXml(name), sheetId, path })
    }
  }

  if (!sheets.length) {
    if (files['xl/worksheets/sheet1.xml']) sheets.push({ name: 'Sheet1', sheetId: '1', path: 'xl/worksheets/sheet1.xml' })
  }

  return sheets
}

export type XlsxTable = {
  /** Nome da aba lida. */
  sheetName?: string
  /** Cabeçalhos na ordem em que aparecem na primeira linha. */
  headers: string[]
  rows: Array<Record<string, unknown>>
}

export type XlsxWorkbook = {
  sheetNames: string[]
  sheets: Record<string, XlsxTable>
  config: Record<string, unknown>
  targetTable: XlsxTable
}

function parseSheetXmlToTable(sheetXml: string, shared: string[], sheetName?: string): XlsxTable {
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
  if (!header) return { sheetName, headers: [], rows: [] }

  const headers = header.map(value => String(value ?? '').trim())
  const records = body
    .filter(row => row.some(value => value !== undefined && value !== ''))
    .map(row => {
      const record: Record<string, unknown> = {}
      headers.forEach((name, index) => {
        if (name) record[name] = row[index] ?? ''
      })
      return record
    })

  return { sheetName, headers: headers.filter(name => name !== ''), rows: records }
}

const DEFAULT_PRIORITY_SHEETS = ['METAS', 'DADOS', 'PLANILHA', 'DATA', 'TARGETS']

function normalizeSheetKey(value: string): string {
  return value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Converte a planilha do arquivo em registros chaveados pelo cabeçalho.
 * Quando o arquivo contém múltiplas abas (ex: INSTRUÇÕES, METAS, MX_CONFIG),
 * seleciona prioritariamente a aba de dados (METAS) ou a indicada em `options.sheetName`.
 */
export function readXlsxTable(
  buffer: ArrayBuffer,
  options?: { sheetName?: string; prioritizeSheetNames?: string[] },
): XlsxTable {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new Error('Arquivo não é uma planilha .xlsx válida.')
  }

  const sheets = listXlsxSheets(files)
  if (!sheets.length) throw new Error('A planilha não contém nenhuma aba legível.')

  let selectedSheet: SheetDescriptor | undefined
  if (options?.sheetName) {
    const targetNorm = normalizeSheetKey(options.sheetName)
    selectedSheet = sheets.find(s => normalizeSheetKey(s.name) === targetNorm)
  }

  if (!selectedSheet) {
    const priorityList = options?.prioritizeSheetNames ?? DEFAULT_PRIORITY_SHEETS
    for (const prio of priorityList) {
      const prioNorm = normalizeSheetKey(prio)
      const found = sheets.find(s => normalizeSheetKey(s.name) === prioNorm)
      if (found) {
        selectedSheet = found
        break
      }
    }
  }

  if (!selectedSheet) {
    // Se não encontrou por nome prioritário, busca a primeira aba que não seja 'INSTRUÇÕES'
    const nonInstruction = sheets.find(s => !normalizeSheetKey(s.name).startsWith('INSTRU'))
    selectedSheet = nonInstruction ?? sheets[0]
  }

  const sheetFile = files[selectedSheet.path]
  if (!sheetFile) throw new Error(`A aba "${selectedSheet.name}" não pôde ser lida.`)

  const shared = parseSharedStrings(files['xl/sharedStrings.xml'] ? strFromU8(files['xl/sharedStrings.xml']) : undefined)
  const sheetXml = strFromU8(sheetFile)

  return parseSheetXmlToTable(sheetXml, shared, selectedSheet.name)
}

/** Atalho para quem só precisa dos registros. */
export function readXlsxRows(buffer: ArrayBuffer, options?: { sheetName?: string }): Array<Record<string, unknown>> {
  return readXlsxTable(buffer, options).rows
}

/** Lê todas as abas e extrai metadados do MX_CONFIG quando disponível. */
export function readXlsxWorkbook(buffer: ArrayBuffer): XlsxWorkbook {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new Error('Arquivo não é uma planilha .xlsx válida.')
  }

  const sheets = listXlsxSheets(files)
  if (!sheets.length) throw new Error('A planilha não contém nenhuma aba legível.')

  const shared = parseSharedStrings(files['xl/sharedStrings.xml'] ? strFromU8(files['xl/sharedStrings.xml']) : undefined)
  const parsedSheets: Record<string, XlsxTable> = {}

  for (const s of sheets) {
    const file = files[s.path]
    if (file) {
      parsedSheets[s.name] = parseSheetXmlToTable(strFromU8(file), shared, s.name)
    }
  }

  // Extrair config de MX_CONFIG se presente
  const config: Record<string, unknown> = {}
  const configSheetKey = Object.keys(parsedSheets).find(k => normalizeSheetKey(k) === 'MX_CONFIG' || normalizeSheetKey(k) === 'CONFIG')
  if (configSheetKey && parsedSheets[configSheetKey]) {
    const configTable = parsedSheets[configSheetKey]
    for (const row of configTable.rows) {
      const key = String(row['Chave'] ?? row['chave'] ?? row['Key'] ?? row['key'] ?? '').trim()
      const val = row['Valor'] ?? row['valor'] ?? row['Value'] ?? row['value']
      if (key) config[key] = val
    }
  }

  const targetTable = readXlsxTable(buffer)

  return {
    sheetNames: sheets.map(s => s.name),
    sheets: parsedSheets,
    config,
    targetTable,
  }
}
