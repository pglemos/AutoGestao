import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}
function exists(rel: string): boolean {
  return existsSync(resolve(root, rel))
}

/**
 * FASE L/N — SKIPs justificados e atoms padronizados (12.005-010, 14.005/008/012).
 *
 * - 12.005/007/009: SearchField/Radio/DatePicker EXISTEM (padronizados).
 * - 12.010: upload N/A (inputs type=file nativos com aria-label, sem atom).
 * - 14.005/008/012: DataGrid NÃO implementa zebra/sort/action column (N/A).
 */
describe('FASE L — atoms de form (12.005/007/009/010)', () => {
  test('SearchField existe (12.005)', () => {
    expect(exists('src/components/molecules/SearchField.tsx')).toBe(true)
    expect(read('src/components/molecules/SearchField.tsx')).toContain('SearchField')
  })

  test('RadioGroup existe (12.007)', () => {
    expect(exists('src/components/atoms/Radio.tsx')).toBe(true)
    expect(read('src/components/atoms/Radio.tsx')).toContain('RadioGroupPrimitive')
  })

  test('DatePicker existe (12.009)', () => {
    expect(exists('src/components/atoms/DatePicker.tsx')).toBe(true)
    expect(read('src/components/atoms/DatePicker.tsx')).toContain('DatePicker')
  })

  test('upload sem atom canônico (12.010 N/A)', () => {
    // não existe atom Upload/FileUpload
    expect(exists('src/components/atoms/Upload.tsx')).toBe(false)
    expect(exists('src/components/molecules/FileUpload.tsx')).toBe(false)
  })
})

describe('FASE N — DataGrid sem zebra/sort/action (14.005/008/012 N/A)', () => {
  const grid = () => read('src/components/organisms/DataGrid.tsx')

  test('DataGrid API não tem zebra/striped (14.005 N/A)', () => {
    expect(grid()).not.toMatch(/zebra|striped/)
  })

  test('DataGrid API não tem sorting (14.012 N/A)', () => {
    expect(grid()).not.toMatch(/sortable|onSort|sorting/)
  })

  test('DataGrid API não tem action column (14.008 N/A)', () => {
    // Column é key/header/width/align/render/status — sem actionColumn
    expect(grid()).not.toMatch(/actionColumn|actionsColumn/)
    expect(grid()).toContain('interface Column')
  })
})
