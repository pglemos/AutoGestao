import { describe, expect, it } from 'bun:test'
import { strToU8, zipSync } from 'fflate'
import { buildXlsxWorkbook } from '@/lib/export'
import { readXlsxRows } from '@/lib/xlsx-reader'

const toArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

describe('readXlsxRows', () => {
  it('lê de volta o que o escritor produz (ida e volta)', () => {
    const bytes = buildXlsxWorkbook([
      {
        name: 'METAS',
        headers: ['Código', 'Indicador', 'Janeiro', 'Fevereiro'],
        rows: [
          { 'Código': 'VND_TOTAL', Indicador: 'Vendas', Janeiro: 1200, Fevereiro: 1500.5 },
          { 'Código': 'TKT_MEDIO', Indicador: 'Ticket médio', Janeiro: 0, Fevereiro: null },
        ],
      },
    ])

    const rows = readXlsxRows(toArrayBuffer(bytes))

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ 'Código': 'VND_TOTAL', Indicador: 'Vendas', Janeiro: 1200, Fevereiro: 1500.5 })
    expect(rows[1]?.['Código']).toBe('TKT_MEDIO')
    expect(rows[1]?.Janeiro).toBe(0)
  })

  it('preserva acentos e caracteres que exigem escape XML', () => {
    const bytes = buildXlsxWorkbook([
      {
        name: 'Dados',
        headers: ['Nome', 'Observação'],
        rows: [{ Nome: 'Ação & Cia <Ltda>', 'Observação': 'aspas "duplas" e \'simples\'' }],
      },
    ])

    const [row] = readXlsxRows(toArrayBuffer(bytes))

    expect(row?.Nome).toBe('Ação & Cia <Ltda>')
    expect(row?.['Observação']).toBe('aspas "duplas" e \'simples\'')
  })

  it('lê apenas a primeira aba quando há várias', () => {
    const bytes = buildXlsxWorkbook([
      { name: 'METAS', headers: ['Código'], rows: [{ 'Código': 'A' }] },
      { name: 'MX_CONFIG', headers: ['Chave', 'Valor'], rows: [{ Chave: 'view_type', Valor: 'TARGET' }] },
    ])

    const rows = readXlsxRows(toArrayBuffer(bytes))

    expect(rows).toEqual([{ 'Código': 'A' }])
  })

  it('ignora linhas totalmente vazias', () => {
    const bytes = buildXlsxWorkbook([
      { name: 'Dados', headers: ['A', 'B'], rows: [{ A: '', B: '' }, { A: 'x', B: 1 }] },
    ])

    expect(readXlsxRows(toArrayBuffer(bytes))).toEqual([{ A: 'x', B: 1 }])
  })

  it('rejeita arquivo que não é xlsx', () => {
    const junk = new TextEncoder().encode('isto não é uma planilha')
    expect(() => readXlsxRows(toArrayBuffer(junk))).toThrow('Arquivo não é uma planilha .xlsx válida.')
  })
})

/**
 * O escritor interno emite `inlineStr`, mas Excel e Google Sheets salvam texto
 * na tabela de strings compartilhadas. Este bloco monta o XML no formato que
 * eles produzem — é o caminho que a importação real percorre.
 */
describe('readXlsxRows — formato do Excel/Sheets', () => {
  const buildRealWorldXlsx = (sharedStrings: string[], sheetXml: string) => {
    const files: Record<string, Uint8Array> = {
      '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types/>'),
      'xl/workbook.xml': strToU8(
        '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Planilha1" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
      'xl/_rels/workbook.xml.rels': strToU8(
        '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      ),
      'xl/sharedStrings.xml': strToU8(
        '<?xml version="1.0"?><sst count="' + sharedStrings.length + '">' +
        sharedStrings.map(value => `<si><t>${value}</t></si>`).join('') +
        '</sst>',
      ),
      'xl/worksheets/sheet1.xml': strToU8(sheetXml),
    }
    const zipped = zipSync(files)
    return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer
  }

  it('resolve strings compartilhadas (t="s")', () => {
    const buffer = buildRealWorldXlsx(
      ['C&#243;digo', 'Janeiro', 'VND_TOTAL'],
      '<?xml version="1.0"?><worksheet><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
      '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>1200</v></c></row>' +
      '</sheetData></worksheet>',
    )

    expect(readXlsxRows(buffer)).toEqual([{ 'Código': 'VND_TOTAL', Janeiro: 1200 }])
  })

  it('respeita células puladas pela referência (A, C sem B)', () => {
    const buffer = buildRealWorldXlsx(
      ['A', 'B', 'C', 'valor-a', 'valor-c'],
      '<?xml version="1.0"?><worksheet><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
      '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="C2" t="s"><v>4</v></c></row>' +
      '</sheetData></worksheet>',
    )

    expect(readXlsxRows(buffer)).toEqual([{ A: 'valor-a', B: '', C: 'valor-c' }])
  })

  it('lê resultado de fórmula (t="str") e booleano (t="b")', () => {
    const buffer = buildRealWorldXlsx(
      ['Texto', 'Flag'],
      '<?xml version="1.0"?><worksheet><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
      '<row r="2"><c r="A2" t="str"><f>CONCAT()</f><v>calculado</v></c><c r="B2" t="b"><v>1</v></c></row>' +
      '</sheetData></worksheet>',
    )

    expect(readXlsxRows(buffer)).toEqual([{ Texto: 'calculado', Flag: true }])
  })

  it('lida com célula vazia auto-fechada', () => {
    const buffer = buildRealWorldXlsx(
      ['A', 'B', 'x'],
      '<?xml version="1.0"?><worksheet><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
      '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"/></row>' +
      '</sheetData></worksheet>',
    )

    expect(readXlsxRows(buffer)).toEqual([{ A: 'x', B: '' }])
  })
})
