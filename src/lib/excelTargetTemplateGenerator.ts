import { strToU8, zipSync } from 'fflate'
import {
  BASE44_STANDARD_INDICATORS,
  officialCatalogCode,
  type CanonicalDepartment,
} from '@/features/admin-mx/indicadores/canonicalBase44Catalog'
import { isActualCalculated } from '@/features/admin-mx/indicadores/actualCalc'
import { MONTH_LABELS } from '@/features/admin-mx/indicadores/indicatorFormulas'
import { EXCEL_STYLES_XML } from './excelStylesXml'
import { EXCEL_THEME1_XML } from './excelTheme1Xml'
import { buildMxConfigRows, TARGET_WORKBOOK_DATA_SHEET } from '@/features/admin-mx/indicadores/metasRealizados'
import { BASE44_GLOBAL_ORDER } from '@/features/admin-mx/indicadores/canonicalBase44Catalog'

export const TEMPLATE_VERSION = '1.0.0'

export const DEPT_EXCEL_COLORS: Record<CanonicalDepartment | string, string> = {
  COMERCIAL: 'FFDBEAFE',
  MARKETING: 'FFE9D5FF',
  PRODUTO_ESTOQUE: 'FFFEF3C7',
  FINANCEIRO: 'FFD1FAE5',
  OPERACOES: 'FFFEE2E2',
  PESSOAS_RH: 'FFFCE7F3',
}

export const DEPT_DISPLAY_NAMES: Record<string, string> = {
  COMERCIAL: 'Comercial',
  MARKETING: 'Marketing',
  PRODUTO_ESTOQUE: 'Produto e Estoque',
  FINANCEIRO: 'Financeiro',
  OPERACOES: 'Operações',
  PESSOAS_RH: 'Pessoas - RH',
}

export const TARGET_INSTRUCTION_LINES = [
  'Não altere os códigos dos indicadores (coluna A).',
  'Não altere os nomes dos indicadores (coluna C).',
  'Não exclua linhas da tabela.',
  'Preencha somente as células brancas (indicadores digitáveis).',
  'Deixe a célula vazia quando não quiser atualizar aquele mês — o valor atual será preservado.',
  'Digite zero (0) somente quando a meta for realmente zero.',
  'Use "LIMPAR" para remover uma meta já cadastrada.',
  'Indicadores calculáveis (fundo cinza) serão recalculados pelo sistema — não os altere.',
  'A coluna Total é somente conferência — não será importada.',
  'Parâmetros devem ser ajustados no sistema em "Parâmetros do Cliente".',
  'A importação não altera Realizado nem Ano Anterior.',
] as const

export const ACTUAL_INSTRUCTION_LINES = [
  'Não altere os códigos dos indicadores (coluna A).',
  'Não altere os nomes dos indicadores (coluna C).',
  'Não exclua linhas da tabela.',
  'Preencha somente as células liberadas (fundo branco).',
  'Deixe vazio quando não houver atualização para aquele mês.',
  'Digite zero (0) somente quando o resultado for realmente zero.',
  'Use "LIMPAR" para remover um valor existente.',
  'A coluna Total não será importada — é somente para conferência.',
  'Indicadores calculados (fundo cinza) serão recalculados pelo sistema.',
  'Meses futuros não podem ser importados.',
] as const

export const PRIOR_YEAR_INSTRUCTION_LINES = [
  'Não altere os códigos dos indicadores (coluna A).',
  'Não altere os nomes dos indicadores (coluna C).',
  'Não exclua linhas da tabela.',
  'Preencha somente as células liberadas (fundo branco).',
  'Deixe vazio quando não houver atualização para aquele mês.',
  'Digite zero (0) somente quando o resultado for realmente zero.',
  'Use "LIMPAR" para remover um valor existente.',
  'A coluna Total não será importada — é somente para conferência.',
  'Indicadores calculados (fundo cinza) serão recalculados pelo sistema.',
] as const

export type ValueFormat = 'INTEGER' | 'DECIMAL' | 'CURRENCY_BRL' | 'PERCENTAGE' | 'SCORE_0_5' | 'RATIO' | 'INVENTORY_TURNOVER'

export function getIndicatorValueFormat(indicatorCode: string, valueType?: string | null, decimals?: number | null): ValueFormat {
  const code = officialCatalogCode(indicatorCode)
  if (['TRADE_SALES_PERCENTAGE', 'FINANCED_SALES_PERCENTAGE', 'LEAD_TO_APPOINTMENT_CONVERSION', 'APPOINTMENT_TO_VISIT_CONVERSION', 'VISIT_TO_SALE_CONVERSION', 'INVENTORY_OVER_90_PERCENTAGE', 'AFTER_SALES_PERCENTAGE'].includes(code)) {
    return 'PERCENTAGE'
  }
  if (['INTERNET_INVESTMENT', 'INTERNET_COST_PER_SALE', 'INVENTORY_AVERAGE_TICKET', 'INVENTORY_AVERAGE_MARGIN', 'CONTRIBUTION_MARGIN', 'ADDITIONAL_REVENUE', 'TOTAL_EXPENSE', 'NET_PROFIT', 'AVERAGE_SALES_MARGIN', 'AVERAGE_PREPARATION_COST', 'AVERAGE_AFTER_SALES_COST'].includes(code)) {
    return 'CURRENCY_BRL'
  }
  if (['GOOGLE_BUSINESS_RATING', 'CONTENT_QUALITY'].includes(code)) {
    return 'SCORE_0_5'
  }
  if (['APPOINTMENTS_PER_INTERNET_SALE'].includes(code)) {
    return 'RATIO'
  }
  if (['INVENTORY_TURNOVER'].includes(code)) {
    return 'INVENTORY_TURNOVER'
  }
  if (['SALES_TOTAL', 'SALES_WALKIN', 'SALES_REFERRAL', 'SALES_COMPANY_PORTFOLIO', 'SALES_SELLER_PORTFOLIO', 'SALES_INTERNET', 'SALES_OTHER', 'SELLER_COUNT', 'LEADS_RECEIVED', 'INSTAGRAM_FOLLOWERS', 'EMPLOYEE_COUNT'].includes(code)) {
    return 'INTEGER'
  }
  if (valueType === 'percent' || valueType === 'PERCENTAGE') return 'PERCENTAGE'
  if (valueType === 'currency' || valueType === 'CURRENCY_BRL') return 'CURRENCY_BRL'
  if ((decimals ?? 0) > 0) return 'DECIMAL'
  return 'DECIMAL'
}

export function getFormatLabel(format: ValueFormat): string {
  switch (format) {
    case 'INTEGER': return 'Inteiro'
    case 'DECIMAL': return 'Decimal'
    case 'CURRENCY_BRL': return 'Moeda'
    case 'PERCENTAGE': return 'Percentual'
    case 'SCORE_0_5': return 'Nota 0-5'
    case 'RATIO': return 'Razão'
    case 'INVENTORY_TURNOVER': return 'Giro'
    default: return 'Decimal'
  }
}

export function sanitizeFileName(name: string | null | undefined): string {
  return String(name || 'CLIENTE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
}

/** Monta METAS_<CLIENTE>_<ANO>_<ESCOPO>.xlsx sem repetir slug quando cliente = unidade. */
export function buildWorkbookNameStem(params: {
  clientName?: string
  storeName?: string
  scopeType?: 'CONSOLIDATED' | 'STORE'
  referenceYear: number
}): string {
  const client = sanitizeFileName(params.clientName)
  const scopeSlug = params.scopeType === 'CONSOLIDATED' || !params.storeName
    ? 'CONSOLIDADO'
    : sanitizeFileName(params.storeName)
  const parts = [client, String(params.referenceYear)]
  if (scopeSlug !== client) parts.push(scopeSlug)
  return parts.join('_')
}

export function getTemplateFileName(params: {
  clientName?: string
  storeName?: string
  scopeType?: 'CONSOLIDATED' | 'STORE'
  viewType: 'TARGET' | 'ACTUAL' | 'PRIOR_YEAR'
  referenceYear: number
  isBlankModel?: boolean
}): string {
  const { viewType } = params
  const stem = buildWorkbookNameStem(params)
  if (viewType === 'TARGET') {
    return `METAS_${stem}.xlsx`
  }
  if (viewType === 'ACTUAL') {
    return `REALIZADO_${stem}.xlsx`
  }
  return `ANO_ANTERIOR_${stem}.xlsx`
}

export function generateTemplateHash(config: Record<string, unknown>): string {
  const str = JSON.stringify(config)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return String(Math.abs(hash))
}

const xmlEscape = (value: string) => value
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

export const ACTUAL_REFERENCE_ROW_STYLES: Record<number, number[]> = {
  2: [10, 11, 12, 13, 12, 14, 14, 14, 14, 14, 14, 15, 16, 16, 16, 16, 16, 17, 18, 18],
  3: [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  4: [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  5: [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  6: [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  7: [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  8: [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  9: [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  10: [10, 11, 12, 13, 12, 23, 23, 23, 23, 23, 23, 24, 25, 25, 25, 25, 25, 26, 18, 18],
  11: [10, 11, 12, 13, 12, 23, 23, 23, 23, 23, 23, 24, 25, 25, 25, 25, 25, 26, 18, 18],
  12: [10, 11, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  13: [10, 11, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  14: [10, 11, 12, 13, 12, 30, 30, 30, 30, 30, 30, 31, 32, 32, 32, 32, 32, 33, 18, 18],
  15: [10, 11, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  16: [10, 11, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  17: [10, 11, 12, 13, 12, 30, 30, 30, 30, 30, 30, 31, 32, 32, 32, 32, 32, 33, 18, 18],
  18: [10, 11, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  19: [10, 11, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  20: [10, 11, 12, 13, 12, 34, 34, 34, 34, 34, 34, 35, 36, 36, 36, 36, 36, 37, 18, 18],
  21: [10, 11, 12, 13, 12, 30, 30, 30, 30, 30, 30, 31, 32, 32, 32, 32, 32, 33, 18, 18],
  22: [10, 11, 12, 13, 12, 30, 30, 30, 30, 30, 30, 31, 32, 32, 32, 32, 32, 33, 18, 18],
  23: [10, 11, 12, 13, 12, 30, 30, 30, 30, 30, 30, 31, 32, 32, 32, 32, 32, 33, 18, 18],
  24: [38, 39, 40, 41, 40, 42, 42, 42, 42, 42, 42, 43, 44, 44, 44, 44, 44, 45, 46, 46],
  25: [10, 47, 12, 19, 12, 48, 48, 48, 48, 48, 48, 49, 50, 50, 50, 50, 50, 51, 18, 18],
  26: [10, 47, 12, 13, 12, 52, 52, 52, 52, 52, 52, 53, 54, 54, 54, 54, 54, 51, 18, 18],
  27: [10, 47, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  28: [10, 47, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18],
  29: [10, 47, 12, 19, 12, 55, 55, 55, 55, 55, 55, 56, 57, 57, 57, 57, 57, 58, 18, 18],
  30: [10, 47, 12, 19, 12, 55, 55, 55, 55, 55, 55, 56, 57, 57, 57, 57, 57, 58, 18, 18],
  31: [38, 59, 40, 60, 40, 61, 61, 61, 61, 61, 61, 62, 63, 63, 63, 63, 63, 64, 46, 46],
  32: [10, 65, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  33: [10, 65, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  34: [10, 65, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  35: [10, 65, 12, 13, 12, 30, 30, 30, 30, 30, 30, 31, 32, 32, 32, 32, 32, 33, 18, 18],
  36: [10, 65, 12, 19, 12, 48, 48, 48, 48, 48, 48, 49, 50, 50, 50, 50, 50, 51, 18, 18],
  37: [10, 65, 12, 19, 12, 48, 48, 48, 48, 48, 48, 49, 50, 50, 50, 50, 50, 51, 18, 18],
  38: [38, 66, 40, 41, 40, 67, 67, 67, 67, 67, 67, 68, 69, 69, 69, 69, 69, 70, 46, 46],
  39: [10, 71, 12, 19, 12, 48, 48, 48, 48, 48, 48, 49, 50, 50, 50, 50, 50, 51, 18, 18],
  40: [10, 71, 12, 19, 12, 48, 48, 48, 48, 48, 48, 49, 50, 50, 50, 50, 50, 51, 18, 18],
  41: [10, 71, 12, 13, 12, 52, 52, 52, 52, 52, 52, 53, 54, 54, 54, 54, 54, 51, 18, 18],
  42: [10, 71, 12, 13, 12, 52, 52, 52, 52, 52, 52, 53, 54, 54, 54, 54, 54, 51, 18, 18],
  43: [38, 72, 40, 41, 40, 67, 67, 67, 67, 67, 67, 68, 69, 69, 69, 69, 69, 70, 46, 46],
  44: [10, 73, 12, 19, 12, 48, 48, 48, 48, 48, 48, 49, 50, 50, 50, 50, 50, 51, 18, 18],
  45: [10, 73, 12, 19, 12, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 26, 18, 18],
  46: [10, 73, 12, 13, 12, 30, 30, 30, 30, 30, 30, 31, 32, 32, 32, 32, 32, 33, 18, 18],
  47: [38, 74, 40, 41, 40, 42, 42, 42, 42, 42, 42, 43, 44, 44, 44, 44, 44, 45, 46, 46],
}

export type StoreTargetTemplateParams = {
  clientName?: string
  clientId?: string
  cycleId?: string | null
  cycleVersionId?: string | null
  referenceYear: number
  storeId: string
  storeName?: string
  scopeType?: 'CONSOLIDATED' | 'STORE'
  viewType?: 'TARGET' | 'ACTUAL' | 'PRIOR_YEAR'
  isBlankModel?: boolean
  indicators?: Array<{
    code: string
    name?: string
    department?: string
    calculado?: boolean
    value_type?: string | null
    casas_decimais?: number | null
  }>
  values?: Record<string, Array<number | null>>
  currentClosedMonth?: number
  generatedBy?: string
}

export function buildStoreTargetTemplateWorkbook(params: StoreTargetTemplateParams): Uint8Array {
  const viewType = params.viewType ?? 'TARGET'
  const referenceYear = params.referenceYear
  const clientName = params.clientName ?? 'CLIENTE'
  const storeName = params.storeName ?? 'Matriz'
  const clientId = params.clientId ?? ''
  const cycleId = params.cycleId ?? ''
  const isBlankModel = params.isBlankModel ?? false
  const generatedBy = params.generatedBy ?? 'Administrador MX'
  const nowIso = new Date().toISOString()

  // 1. Shared Strings Table Builder
  const sharedStrings: string[] = []
  const sharedIndexMap = new Map<string, number>()

  function getSharedIndex(str: string): number {
    const existing = sharedIndexMap.get(str)
    if (existing !== undefined) return existing
    const idx = sharedStrings.length
    sharedStrings.push(str)
    sharedIndexMap.set(str, idx)
    return idx
  }

  // Pre-seed known strings in exact reference order
  getSharedIndex('Instruções para Preenchimento')
  getSharedIndex(viewType === 'TARGET' ? 'Visão: Metas' : viewType === 'ACTUAL' ? 'Visão: Realizado' : 'Visão: Ano Anterior')
  getSharedIndex('Regras:')

  const instructionLines = viewType === 'TARGET'
    ? TARGET_INSTRUCTION_LINES
    : viewType === 'ACTUAL'
      ? ACTUAL_INSTRUCTION_LINES
      : PRIOR_YEAR_INSTRUCTION_LINES

  for (const line of instructionLines) {
    getSharedIndex(`• ${line}`)
  }

  getSharedIndex('Legenda:')
  getSharedIndex('Branco: campo editável')
  getSharedIndex('Cinza: calculado pelo sistema')
  if (viewType === 'ACTUAL') {
    getSharedIndex('Azul-claro: competência padrão M-1')
    getSharedIndex('Cinza-escuro: mês futuro bloqueado')
  }

  // Header strings
  const METAS_HEADERS = [
    'Ordem Oficial',
    'Código do Indicador',
    'Departamento',
    'Indicador',
    'Tipo',
    'Formato',
    ...MONTH_LABELS,
    'Total',
    'Observação',
  ]
  for (const h of METAS_HEADERS) {
    getSharedIndex(h)
  }

  // Build Indicator Roster (All 46 Standard Indicators in canonical order)
  const roster = BASE44_STANDARD_INDICATORS.map((canonical, index) => {
    const custom = params.indicators?.find(ind => officialCatalogCode(ind.code) === canonical.code)
    const isCalc = viewType === 'TARGET'
      ? (custom?.calculado !== undefined ? custom.calculado : canonical.target_calculation_mode !== 'MANUAL')
      : isActualCalculated(canonical.code)

    const name = custom?.name || canonical.name
    const deptKey = canonical.department
    const deptName = DEPT_DISPLAY_NAMES[deptKey] || canonical.area || 'Comercial'
    const valFormat = getIndicatorValueFormat(canonical.code, custom?.value_type, custom?.casas_decimais)
    const formatLabel = getFormatLabel(valFormat)

    return {
      code: canonical.code,
      officialOrder: BASE44_GLOBAL_ORDER[canonical.code] ?? index + 1,
      name,
      deptKey,
      deptName,
      isCalc,
      valFormat,
      formatLabel,
    }
  })

  for (const item of roster) {
    getSharedIndex(item.code)
    getSharedIndex(item.deptName)
    getSharedIndex(item.name)
    getSharedIndex(item.isCalc ? 'Calculado' : 'Digitável')
    getSharedIndex(item.formatLabel)
  }
  getSharedIndex('Calculado')

  // Config strings
  getSharedIndex('Chave')
  getSharedIndex('Valor')

  // ── Sheet 1: INSTRUÇÕES XML ───────────────────────────────────────────
  let s1RowsXml = ''
  s1RowsXml += `<row r="1" spans="1:1" x14ac:dyDescent="0.25"><c r="A1" s="1" t="s"><v>${getSharedIndex('Instruções para Preenchimento')}</v></c></row>`
  s1RowsXml += `<row r="3" spans="1:1" x14ac:dyDescent="0.25"><c r="A3" s="2" t="s"><v>${getSharedIndex(viewType === 'TARGET' ? 'Visão: Metas' : viewType === 'ACTUAL' ? 'Visão: Realizado' : 'Visão: Ano Anterior')}</v></c></row>`
  s1RowsXml += `<row r="5" spans="1:1" x14ac:dyDescent="0.25"><c r="A5" s="2" t="s"><v>${getSharedIndex('Regras:')}</v></c></row>`

  let curRow = 6
  for (const line of instructionLines) {
    s1RowsXml += `<row r="${curRow}" spans="1:1" x14ac:dyDescent="0.25"><c r="A${curRow}" s="3" t="s"><v>${getSharedIndex(`• ${line}`)}</v></c></row>`
    curRow++
  }
  // Two blank lines before Legenda
  curRow += 2
  s1RowsXml += `<row r="${curRow}" spans="1:1" x14ac:dyDescent="0.25"><c r="A${curRow}" s="2" t="s"><v>${getSharedIndex('Legenda:')}</v></c></row>`
  curRow++
  s1RowsXml += `<row r="${curRow}" spans="1:1" x14ac:dyDescent="0.25"><c r="A${curRow}" s="4" t="s"><v>${getSharedIndex('Branco: campo editável')}</v></c></row>`
  curRow++
  s1RowsXml += `<row r="${curRow}" spans="1:1" x14ac:dyDescent="0.25"><c r="A${curRow}" s="5" t="s"><v>${getSharedIndex('Cinza: calculado pelo sistema')}</v></c></row>`
  if (viewType === 'ACTUAL') {
    curRow++
    s1RowsXml += `<row r="${curRow}" spans="1:1" x14ac:dyDescent="0.25"><c r="A${curRow}" s="6" t="s"><v>${getSharedIndex('Azul-claro: competência padrão M-1')}</v></c></row>`
    curRow++
    s1RowsXml += `<row r="${curRow}" spans="1:1" x14ac:dyDescent="0.25"><c r="A${curRow}" s="7" t="s"><v>${getSharedIndex('Cinza-escuro: mês futuro bloqueado')}</v></c></row>`
  }

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><sheetPr><tabColor rgb="FF198653"/></sheetPr><dimension ref="A1:A${curRow}"/><sheetFormatPr defaultRowHeight="15" outlineLevelRow="0" outlineLevelCol="0" x14ac:dyDescent="55"/><cols><col min="1" max="1" width="90" customWidth="1"/></cols><sheetData>${s1RowsXml}</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="portrait" horizontalDpi="4294967295" verticalDpi="4294967295" scale="100" fitToWidth="1" fitToHeight="1"/></worksheet>`

  // ── Sheet 2: METAS XML ────────────────────────────────────────────────
  const STYLE_HEADER_LEFT = 8
  const STYLE_HEADER_RIGHT = 9
  const STYLE_ORDER_LOCKED = 75

  let s2RowsXml = ''
  let headerCellsXml = ''
  METAS_HEADERS.forEach((h, colIdx) => {
    const colLetter = String.fromCharCode(65 + colIdx)
    const isRight = colIdx >= 6 && colIdx <= 18
    const s = isRight ? STYLE_HEADER_RIGHT : STYLE_HEADER_LEFT
    headerCellsXml += `<c r="${colLetter}1" s="${s}" t="s"><v>${getSharedIndex(h)}</v></c>`
  })
  s2RowsXml += `<row r="1" ht="24" customHeight="1" spans="1:20" x14ac:dyDescent="0.25">${headerCellsXml}</row>`

  roster.forEach((item, rIdx) => {
    const rowNum = rIdx + 2
    const legacyStyles = ACTUAL_REFERENCE_ROW_STYLES[rowNum] || [10, 11, 12, 19, 12, 20, 20, 20, 20, 20, 20, 21, 22, 22, 22, 22, 22, 17, 18, 18]
    const baseRowStyles = [STYLE_ORDER_LOCKED, ...legacyStyles.slice(0, 18), legacyStyles[19]]

    // In TARGET, all month columns use the base Jan month style (index 6)
    const rowStyles = viewType === 'ACTUAL'
      ? baseRowStyles
      : [
          baseRowStyles[0],
          baseRowStyles[1],
          baseRowStyles[2],
          item.isCalc ? 13 : baseRowStyles[3],
          baseRowStyles[4],
          baseRowStyles[5],
          ...Array(12).fill(item.isCalc && baseRowStyles[6] === 20 ? 14 : item.isCalc && baseRowStyles[6] === 27 ? 23 : item.isCalc && baseRowStyles[6] === 48 ? 52 : baseRowStyles[6]),
          baseRowStyles[18],
          baseRowStyles[19],
        ]

    let rowCellsXml = ''
    // Col A (1): Ordem Oficial
    rowCellsXml += `<c r="A${rowNum}" s="${rowStyles[0]}"><v>${item.officialOrder}</v></c>`
    // Col B (2): Código
    rowCellsXml += `<c r="B${rowNum}" s="${rowStyles[1]}" t="s"><v>${getSharedIndex(item.code)}</v></c>`
    // Col C (3): Departamento
    rowCellsXml += `<c r="C${rowNum}" s="${rowStyles[2]}" t="s"><v>${getSharedIndex(item.deptName)}</v></c>`
    // Col D (4): Indicador
    rowCellsXml += `<c r="D${rowNum}" s="${rowStyles[3]}" t="s"><v>${getSharedIndex(item.name)}</v></c>`
    // Col E (5): Tipo
    rowCellsXml += `<c r="E${rowNum}" s="${rowStyles[4]}" t="s"><v>${getSharedIndex(item.isCalc ? 'Calculado' : 'Digitável')}</v></c>`
    // Col F (6): Formato
    rowCellsXml += `<c r="F${rowNum}" s="${rowStyles[5]}" t="s"><v>${getSharedIndex(item.formatLabel)}</v></c>`

    // Col G..R (7..18): Months (Jan..Dez)
    let rowSum = 0
    let hasNumericValue = false

    for (let m = 1; m <= 12; m++) {
      const colLetter = String.fromCharCode(65 + 5 + m)
      const monthStyle = rowStyles[5 + m]
      const monthVal = params.values?.[item.code]?.[m - 1] ?? null

      if (item.isCalc) {
        if (isBlankModel || monthVal == null) {
          rowCellsXml += `<c r="${colLetter}${rowNum}" s="${monthStyle}" t="s"><v>${getSharedIndex('Calculado')}</v></c>`
        } else {
          const num = typeof monthVal === 'number' ? monthVal : parseFloat(String(monthVal))
          rowCellsXml += `<c r="${colLetter}${rowNum}" s="${monthStyle}"><v>${num}</v></c>`
          rowSum += num
          hasNumericValue = true
        }
      } else {
        if (monthVal != null && !Number.isNaN(Number(monthVal))) {
          const num = typeof monthVal === 'number' ? monthVal : parseFloat(String(monthVal))
          rowCellsXml += `<c r="${colLetter}${rowNum}" s="${monthStyle}"><v>${num}</v></c>`
          rowSum += num
          hasNumericValue = true
        } else {
          rowCellsXml += `<c r="${colLetter}${rowNum}" s="${monthStyle}"/>`
        }
      }
    }

    // Col S (19): Total
    const totalStyle = rowStyles[18]
    if (hasNumericValue) {
      rowCellsXml += `<c r="S${rowNum}" s="${totalStyle}"><v>${rowSum}</v></c>`
    } else {
      rowCellsXml += `<c r="S${rowNum}" s="${totalStyle}"/>`
    }

    // Col T (20): Observação
    rowCellsXml += `<c r="T${rowNum}" s="${rowStyles[19]}"/>`

    s2RowsXml += `<row r="${rowNum}" spans="1:20" x14ac:dyDescent="0.25">${rowCellsXml}</row>`
  })

  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><dimension ref="A1:T47"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="3" ySplit="1" topLeftCell="D2" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15" outlineLevelRow="0" outlineLevelCol="0" x14ac:dyDescent="55"/><cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="36" customWidth="1"/><col min="4" max="5" width="14" customWidth="1"/><col min="6" max="17" width="12" customWidth="1"/><col min="18" max="18" width="16" customWidth="1"/><col min="19" max="19" width="18" customWidth="1"/><col min="20" max="20" width="30" customWidth="1"/></cols><sheetData>${s2RowsXml}</sheetData><sheetProtection sheet="1" algorithmName="SHA-512" hashValue="CegfAmJRsFl/aSUReqPyyByK6w6sR37qQ3XFUrdkP7ikBVK1EAWZGAZcPTQoDmDhEoSPuC5NmJV7Gtl/HfwuNw==" saltValue="hhyyCru0ANiekrQyEWhBVQ==" spinCount="100000"/><dataValidations count="2"><dataValidation type="list" allowBlank="1" sqref="S10:S47"><formula1>&quot;Loja,Equipe MX,Sistema MX,Planilha da Loja,CRM,ERP,DRE,Estoque,Financeiro,Outro&quot;</formula1></dataValidation><dataValidation type="list" allowBlank="1" sqref="S2:S47"><formula1>&quot;Loja,Equipe MX,Sistema MX,Planilha da Loja,CRM,ERP,DRE,Estoque,Financeiro,Outro&quot;</formula1></dataValidation></dataValidations><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="portrait" horizontalDpi="4294967295" verticalDpi="4294967295" scale="100" fitToWidth="1" fitToHeight="1"/></worksheet>`

  const manualCount = roster.filter(item => !item.isCalc).length
  const configRows = buildMxConfigRows({
    clientId,
    clientName,
    cycleId,
    cycleVersionId: params.cycleVersionId ?? null,
    year: referenceYear,
    storeId: params.storeId,
    storeName,
    scopeType: params.scopeType,
    viewType,
    indicatorCount: roster.length,
    manualCount,
    calculatedCount: roster.length - manualCount,
    templateHash: generateTemplateHash({
      template_version: TEMPLATE_VERSION,
      client_account_id: clientId,
      reference_year: referenceYear,
      store_id: params.storeId,
      indicator_count: roster.length,
    }),
  })

  for (const row of configRows) {
    getSharedIndex(row.Chave)
    getSharedIndex(row.Valor)
  }

  let s3RowsXml = `<row r="1" spans="1:2" x14ac:dyDescent="0.25"><c r="A1" s="75" t="s"><v>${getSharedIndex('Chave')}</v></c><c r="B1" s="75" t="s"><v>${getSharedIndex('Valor')}</v></c></row>`
  configRows.forEach((row, idx) => {
    const rowNum = idx + 2
    s3RowsXml += `<row r="${rowNum}" spans="1:2" x14ac:dyDescent="0.25"><c r="A${rowNum}" t="s"><v>${getSharedIndex(row.Chave)}</v></c><c r="B${rowNum}" t="s"><v>${getSharedIndex(row.Valor)}</v></c></row>`
  })

  const sheet3Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><dimension ref="A1:B${configRows.length + 1}"/><sheetFormatPr defaultRowHeight="15" outlineLevelRow="0" outlineLevelCol="0" x14ac:dyDescent="55"/><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="50" customWidth="1"/></cols><sheetData>${s3RowsXml}</sheetData><sheetProtection sheet="1" algorithmName="SHA-512" hashValue="Tacz1WIG7/ey5jtoDfp+3LL+GRaKJJaIkeimkN9Am3p4WPVCjfK57xlrgedh8ETgxRrbk9mlxub1wn8MGgsl9g==" saltValue="E1t697Lqk8B2uU51XcsyVQ==" spinCount="100000"/><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="portrait" horizontalDpi="4294967295" verticalDpi="4294967295" scale="100" fitToWidth="1" fitToHeight="1"/></worksheet>`

  // ── Shared Strings Table XML ──────────────────────────────────────────
  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length * 2}" uniqueCount="${sharedStrings.length}">${sharedStrings.map(s => `<si><t>${xmlEscape(s)}</t></si>`).join('')}</sst>`

  // ── Styles XML (Full Reference) ───────────────────────────────────────
  const stylesXml = EXCEL_STYLES_XML

  // ── Theme XML (Full Reference) ────────────────────────────────────────
  const themeXml = EXCEL_THEME1_XML

  // ── Workbook XML ──────────────────────────────────────────────────────
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x15" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main"><fileVersion appName="xl" lastEdited="5" lowestEdited="5" rupBuild="9303"/><workbookPr defaultThemeVersion="164011" filterPrivacy="1"/><sheets><sheet sheetId="1" name="INSTRUÇÕES" state="visible" r:id="rId4"/><sheet sheetId="2" name="${TARGET_WORKBOOK_DATA_SHEET}" state="visible" r:id="rId5"/><sheet sheetId="3" name="MX_CONFIG" state="hidden" r:id="rId6"/></sheets><calcPr calcId="171027"/></workbook>`

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/></Relationships>`

  const corePropsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>MX Performance Admin</dc:creator><dc:title></dc:title><dc:subject></dc:subject><dc:description></dc:description><cp:keywords></cp:keywords><cp:category></cp:category><cp:lastModifiedBy>Unknown</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified></cp:coreProperties>`

  const appPropsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>3</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="3" baseType="lpstr"><vt:lpstr>INSTRUÇÕES</vt:lpstr><vt:lpstr>${TARGET_WORKBOOK_DATA_SHEET}</vt:lpstr><vt:lpstr>MX_CONFIG</vt:lpstr></vt:vector></TitlesOfParts><Company></Company><Manager></Manager><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>`

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(relsXml),
    'docProps/core.xml': strToU8(corePropsXml),
    'docProps/app.xml': strToU8(appPropsXml),
    'xl/workbook.xml': strToU8(workbookXml),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelsXml),
    'xl/theme/theme1.xml': strToU8(themeXml),
    'xl/styles.xml': strToU8(stylesXml),
    'xl/sharedStrings.xml': strToU8(sharedStringsXml),
    'xl/worksheets/sheet1.xml': strToU8(sheet1Xml),
    'xl/worksheets/sheet2.xml': strToU8(sheet2Xml),
    'xl/worksheets/sheet3.xml': strToU8(sheet3Xml),
  }

  return zipSync(files, { level: 6 })
}

export function generateStoreTargetTemplateBuffer(params: StoreTargetTemplateParams): { buffer: Uint8Array; fileName: string } {
  const fileName = getTemplateFileName({
    clientName: params.clientName,
    storeName: params.storeName,
    scopeType: params.scopeType,
    viewType: params.viewType ?? 'TARGET',
    referenceYear: params.referenceYear,
    isBlankModel: params.isBlankModel,
  })
  const buffer = buildStoreTargetTemplateWorkbook(params)
  return { buffer, fileName }
}

export function downloadExcelBuffer(buffer: Uint8Array, fileName: string): void {
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
