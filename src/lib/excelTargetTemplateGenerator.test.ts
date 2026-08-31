import { describe, expect, test } from 'bun:test'
import {
  buildStoreTargetTemplateWorkbook,
  generateStoreTargetTemplateBuffer,
  getIndicatorValueFormat,
  getFormatLabel,
  getTemplateFileName,
  generateTemplateHash,
  TEMPLATE_VERSION,
} from './excelTargetTemplateGenerator'
import { BASE44_STANDARD_INDICATORS } from '@/features/admin-mx/indicadores/canonicalBase44Catalog'
import { unzipSync } from 'fflate'

describe('excelTargetTemplateGenerator', () => {
  test('getIndicatorValueFormat resolves canonical indicators correctly', () => {
    expect(getIndicatorValueFormat('TRADE_SALES_PERCENTAGE')).toBe('PERCENTAGE')
    expect(getIndicatorValueFormat('INTERNET_INVESTMENT')).toBe('CURRENCY_BRL')
    expect(getIndicatorValueFormat('GOOGLE_BUSINESS_RATING')).toBe('SCORE_0_5')
    expect(getIndicatorValueFormat('APPOINTMENTS_PER_INTERNET_SALE')).toBe('RATIO')
    expect(getIndicatorValueFormat('INVENTORY_TURNOVER')).toBe('INVENTORY_TURNOVER')
    expect(getIndicatorValueFormat('SALES_TOTAL')).toBe('INTEGER')
    expect(getIndicatorValueFormat('CUSTOM_METRIC', 'percent')).toBe('PERCENTAGE')
    expect(getIndicatorValueFormat('CUSTOM_METRIC', 'currency')).toBe('CURRENCY_BRL')
  })

  test('getFormatLabel maps formats to Portuguese labels', () => {
    expect(getFormatLabel('INTEGER')).toBe('Inteiro')
    expect(getFormatLabel('DECIMAL')).toBe('Decimal')
    expect(getFormatLabel('CURRENCY_BRL')).toBe('Moeda')
    expect(getFormatLabel('PERCENTAGE')).toBe('Percentual')
    expect(getFormatLabel('SCORE_0_5')).toBe('Nota 0-5')
    expect(getFormatLabel('RATIO')).toBe('Razão')
    expect(getFormatLabel('INVENTORY_TURNOVER')).toBe('Giro')
  })

  test('getTemplateFileName generates expected filenames', () => {
    expect(getTemplateFileName({
      clientName: 'MX Veículos & Teste',
      storeName: 'Matriz Principal',
      viewType: 'TARGET',
      referenceYear: 2026,
      isBlankModel: true,
    })).toBe('METAS_MX_VEICULOS_TESTE_2026_MATRIZ_PRINCIPAL.xlsx')

    expect(getTemplateFileName({
      clientName: 'Auto Up',
      storeName: 'Auto Up',
      viewType: 'TARGET',
      referenceYear: 2026,
      isBlankModel: true,
    })).toBe('METAS_AUTO_UP_2026.xlsx')

    expect(getTemplateFileName({
      clientName: 'Auto Up',
      scopeType: 'CONSOLIDATED',
      viewType: 'TARGET',
      referenceYear: 2026,
      isBlankModel: true,
    })).toBe('METAS_AUTO_UP_2026_CONSOLIDADO.xlsx')

    expect(getTemplateFileName({
      clientName: 'ACERTT',
      storeName: 'ACERTT',
      viewType: 'TARGET',
      referenceYear: 2026,
      isBlankModel: false,
    })).toBe('METAS_ACERTT_2026.xlsx')

    expect(getTemplateFileName({
      clientName: 'ACERTT',
      storeName: 'ACERTT',
      viewType: 'ACTUAL',
      referenceYear: 2026,
    })).toBe('REALIZADO_ACERTT_2026.xlsx')

    expect(getTemplateFileName({
      clientName: 'ACERTT',
      storeName: 'ACERTT',
      viewType: 'PRIOR_YEAR',
      referenceYear: 2026,
    })).toBe('ANO_ANTERIOR_ACERTT_2026.xlsx')
  })

  test('generates valid OpenXML zip archive for TARGET model', () => {
    const { buffer, fileName } = generateStoreTargetTemplateBuffer({
      clientName: 'ACERTT',
      clientId: 'd744dc4f-e1cb-4fbc-84ae-950aa262af03',
      cycleId: null,
      referenceYear: 2026,
      storeId: '2bff56ad-fbd1-46b2-959a-bcf66b1638cb',
      storeName: 'ACERTT',
      viewType: 'TARGET',
      isBlankModel: true,
    })

    expect(fileName).toBe('METAS_ACERTT_2026.xlsx')
    expect(buffer.byteLength).toBeGreaterThan(5000)

    const unzipped = unzipSync(buffer)
    expect(unzipped['[Content_Types].xml']).toBeDefined()
    expect(unzipped['_rels/.rels']).toBeDefined()
    expect(unzipped['xl/workbook.xml']).toBeDefined()
    expect(unzipped['xl/styles.xml']).toBeDefined()
    expect(unzipped['xl/sharedStrings.xml']).toBeDefined()
    expect(unzipped['xl/worksheets/sheet1.xml']).toBeDefined()
    expect(unzipped['xl/worksheets/sheet2.xml']).toBeDefined()
    expect(unzipped['xl/worksheets/sheet3.xml']).toBeDefined()

    const workbookXml = new TextDecoder().decode(unzipped['xl/workbook.xml'])
    expect(workbookXml).toContain('name="INSTRUÇÕES"')
    expect(workbookXml).toContain('name="METAS"')
    expect(workbookXml).toContain('name="MX_CONFIG"')
    expect(workbookXml).toContain('state="hidden"')

    const sheet2Xml = new TextDecoder().decode(unzipped['xl/worksheets/sheet2.xml'])
    expect(sheet2Xml).toContain('ref="A1:T47"')
    expect(sheet2Xml).toContain('xSplit="3" ySplit="1"')
  })

  test('generates valid OpenXML zip archive for ACTUAL model with filled values', () => {
    const values: Record<string, Array<number | null>> = {
      SALES_WALKIN: [10, 12, 15, 8, 14, 16, 18, null, null, null, null, null],
      SALES_INTERNET: [5, 6, 7, 8, 9, 10, 11, null, null, null, null, null],
    }

    const { buffer, fileName } = generateStoreTargetTemplateBuffer({
      clientName: 'MX VEÍCULOS TESTE 4',
      clientId: '6a7c6ed460bcb69b98075a74',
      cycleId: '6a7c706526c846217ff207e9',
      referenceYear: 2026,
      storeId: '6a7c6ed6e40f45320c02e91e',
      storeName: 'Matriz',
      viewType: 'ACTUAL',
      currentClosedMonth: 7,
      values,
      isBlankModel: false,
    })

    expect(fileName).toBe('REALIZADO_MX_VEICULOS_TESTE_4_2026_MATRIZ.xlsx')
    expect(buffer.byteLength).toBeGreaterThan(5000)

    const unzipped = unzipSync(buffer)
    const sheet2Xml = new TextDecoder().decode(unzipped['xl/worksheets/sheet2.xml'])
    expect(sheet2Xml).toContain('ref="A1:T47"')
  })

  test('config sheet contains all required keys and valid hash', () => {
    const buffer = buildStoreTargetTemplateWorkbook({
      clientName: 'TESTE CLIENTE',
      clientId: 'cli-123',
      cycleId: 'cyc-456',
      referenceYear: 2026,
      storeId: 'sto-789',
      storeName: 'Loja 1',
      scopeType: 'STORE',
      viewType: 'TARGET',
      isBlankModel: true,
    })

    const unzipped = unzipSync(buffer)
    const sheet3Xml = new TextDecoder().decode(unzipped['xl/worksheets/sheet3.xml'])
    expect(sheet3Xml).toContain('ref="A1:B19"')

    const sharedXml = new TextDecoder().decode(unzipped['xl/sharedStrings.xml'])
    expect(sharedXml).toContain('template_version')
    expect(sharedXml).toContain(TEMPLATE_VERSION)
    expect(sharedXml).toContain('client_account_id')
    expect(sharedXml).toContain('cli-123')
    expect(sharedXml).toContain('store_id')
    expect(sharedXml).toContain('sto-789')
    expect(sharedXml).toContain('reference_year')
    expect(sharedXml).toContain('2026')
    expect(sharedXml).toContain('view_type')
    expect(sharedXml).toContain('TARGET')
    expect(sharedXml).toContain('indicator_count')
    expect(sharedXml).toContain('manual_indicator_count')
    expect(sharedXml).toContain('calculated_indicator_count')
    expect(sharedXml).toContain('catalog_order_version')
    expect(sharedXml).toContain('strategic_plan_version_id')
    expect(sharedXml).toContain('46')
  })
})
