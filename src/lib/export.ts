import { strToU8, zipSync } from 'fflate'
import type { TeamContactsWorkbookSheet } from '@/lib/team-contacts-export'

type WorkbookSheet = {
  name: string
  headers: string[]
  rows: Record<string, unknown>[]
}

const xmlEscape = (value: string) => value
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const columnName = (index: number) => {
  let name = ''
  for (let current = index + 1; current > 0; current = Math.floor((current - 1) / 26)) {
    name = String.fromCharCode(65 + ((current - 1) % 26)) + name
  }
  return name
}

const cellXml = (reference: string, value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`
  }
  const normalized = value instanceof Date
    ? value.toISOString()
    : typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : String(value ?? '')
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(normalized)}</t></is></c>`
}

const worksheetXml = (sheet: WorkbookSheet) => {
  const rows = [sheet.headers, ...sheet.rows.map((row) => sheet.headers.map((header) => row[header]))]
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cellXml(`${columnName(columnIndex)}${rowIndex + 1}`, value)).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const columns = sheet.headers.map((header, index) => {
    const width = Math.max(12, Math.min(32, header.length + 8))
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  }).join('')
  const columnsXml = columns ? `<cols>${columns}</cols>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${columnsXml}<sheetData>${body}</sheetData></worksheet>`
}

export function buildXlsxWorkbook(sheets: WorkbookSheet[]) {
  if (sheets.length === 0) throw new Error('O workbook precisa de ao menos uma planilha.')
  const usedNames = new Set<string>()
  const normalizedNames = sheets.map((sheet, index) => {
    const base = sheet.name.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || `Planilha ${index + 1}`
    let candidate = base
    let suffix = 2
    while (usedNames.has(candidate.toLocaleLowerCase('pt-BR'))) {
      const marker = ` (${suffix})`
      candidate = `${base.slice(0, 31 - marker.length)}${marker}`
      suffix += 1
    }
    usedNames.add(candidate.toLocaleLowerCase('pt-BR'))
    return candidate
  })
  const workbookSheets = normalizedNames
    .map((name, index) => `<sheet name="${xmlEscape(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('')
  const relationships = sheets
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join('')
  const overrides = sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('')

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`),
  }
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet))
  })
  return zipSync(files, { level: 6 })
}

const downloadWorkbook = (sheets: WorkbookSheet[], filename: string) => {
  const bytes = buildXlsxWorkbook(sheets)
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}_${Date.now()}.xlsx`
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Dados') {
  try {
    const headers = [...new Set(data.flatMap((row) => Object.keys(row)))]
    downloadWorkbook([{ name: sheetName, headers, rows: data }], filename)
    return true
  } catch (error) {
    console.error('Erro na exportação Excel:', error)
    return false
  }
}

export function exportWorkbookToExcel(sheets: TeamContactsWorkbookSheet[], filename: string) {
  try {
    const normalized = sheets.map((sheet) => ({
      name: sheet.name,
      headers: [...sheet.headers],
      rows: sheet.rows.map((row) => Object.fromEntries(Object.entries(row))),
    }))
    downloadWorkbook(normalized, filename)
    return true
  } catch (error) {
    console.error('Erro na exportação Excel:', error)
    return false
  }
}
