import { describe, expect, test } from 'bun:test'
import { unzipSync, strFromU8 } from 'fflate'
import { buildXlsxWorkbook } from '@/lib/export'

describe('buildXlsxWorkbook', () => {
  test('gera um OOXML válido com tipos, relacionamentos e valores escapados', () => {
    const archive = unzipSync(buildXlsxWorkbook([{
      name: 'Dados/Equipe',
      headers: ['Nome', 'Meta', 'Ativo'],
      rows: [{ Nome: 'Ana & João', Meta: 12.5, Ativo: true }],
    }]))

    expect(Object.keys(archive).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ])
    expect(strFromU8(archive['xl/workbook.xml'])).toContain('name="Dados Equipe"')
    const worksheet = strFromU8(archive['xl/worksheets/sheet1.xml'])
    expect(worksheet).toContain('Ana &amp; João')
    expect(worksheet).toContain('<c r="B2"><v>12.5</v></c>')
    expect(worksheet).toContain('<c r="C2" t="b"><v>1</v></c>')
  })

  test('remove controles XML inválidos e aceita planilha sem colunas', () => {
    const archive = unzipSync(buildXlsxWorkbook([{
      name: 'Vazia',
      headers: [],
      rows: [{ Ignorado: `a\u0000b\u001fc` }],
    }]))
    const worksheet = strFromU8(archive['xl/worksheets/sheet1.xml'])
    expect(worksheet).not.toContain('<cols>')
    expect(worksheet).not.toContain('\u0000')
    expect(worksheet).not.toContain('\u001f')
  })

  test('desambigua nomes de abas após sanitização e truncamento', () => {
    const archive = unzipSync(buildXlsxWorkbook([
      { name: 'Equipe/Comercial', headers: [], rows: [] },
      { name: 'equipe:comercial', headers: [], rows: [] },
      { name: 'Equipe Comercial (2)', headers: [], rows: [] },
    ]))
    const workbook = strFromU8(archive['xl/workbook.xml'])
    expect(workbook).toContain('name="Equipe Comercial"')
    expect(workbook).toContain('name="equipe comercial (2)"')
    expect(workbook).toContain('name="Equipe Comercial (2) (2)"')
  })
})
