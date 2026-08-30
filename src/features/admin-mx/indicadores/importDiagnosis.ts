import { MONTH_LABELS } from './indicatorFormulas'
import { matchCanonicalIndicator } from './canonicalBase44Catalog'

/**
 * Explica por que uma planilha de metas não gerou nenhuma alteração.
 *
 * Sem isso a importação apenas informa "0 célula(s) detectada(s)", o que não
 * distingue "planilha correta e vazia" de "coluna renomeada no Excel" — o
 * usuário fica sem saber o que corrigir.
 *
 * A ordem das checagens vai do erro mais estrutural (arquivo/aba errados) ao
 * mais específico (conteúdo em branco), para que a primeira mensagem já seja
 * a acionável.
 */

export const CODE_COLUMN = 'Código'
export const CODE_COLUMN_ALIASES = [
  'Código',
  'Código do Indicador',
  'Codigo',
  'Codigo do Indicador',
  'code',
] as const

const list = (values: readonly string[], max = 6) => {
  const shown = values.slice(0, max).join(', ')
  return values.length > max ? `${shown} e mais ${values.length - max}` : shown
}

function normalizeHeader(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function headerLooksLikeIndicatorCode(header: string) {
  const normalized = normalizeHeader(header)
  return normalized === 'codigo' || normalized === 'codigodoindicador' || normalized === 'code'
}

export function findCodeColumn(headers: string[]) {
  return headers.find(header => headerLooksLikeIndicatorCode(header)) ?? null
}

export function readIndicatorCodeFromRow(row: Record<string, unknown>) {
  for (const key of Object.keys(row)) {
    if (!headerLooksLikeIndicatorCode(key)) continue
    const value = String(row[key] ?? '').trim()
    if (value) return value
  }
  for (const alias of CODE_COLUMN_ALIASES) {
    const value = String(row[alias] ?? '').trim()
    if (value) return value
  }
  return ''
}

export function diagnoseEmptyImport(input: {
  headers: string[]
  matrix: Array<Record<string, unknown>>
  codesInFile: string[]
  indicators: Array<{ code: string; calculado?: boolean }>
}): string {
  const { headers, matrix, codesInFile, indicators } = input

  if (headers.length === 0) {
    return 'A planilha está vazia: nenhuma linha de cabeçalho foi encontrada na primeira aba.'
  }

  if (!findCodeColumn(headers)) {
    return `A coluna “${CODE_COLUMN}” (ou “Código do Indicador”) não foi encontrada na primeira aba. Colunas lidas: ${list(headers)}. `
      + 'Use “Exportar planilha” para gerar o modelo e edite apenas os valores.'
  }

  const missingMonths = MONTH_LABELS.filter(label => !headers.includes(label))
  if (missingMonths.length === MONTH_LABELS.length) {
    return `Nenhuma coluna de mês foi encontrada. Esperado: ${MONTH_LABELS.join(', ')}. `
      + `A planilha tem: ${list(headers)}. Os meses precisam estar abreviados, como no modelo exportado.`
  }
  if (missingMonths.length > 0) {
    return `Estas colunas de mês estão faltando ou foram renomeadas: ${missingMonths.join(', ')}. `
      + 'Use “Exportar planilha” para gerar o modelo e edite apenas os valores.'
  }

  if (matrix.length === 0) {
    return 'A planilha tem cabeçalho, mas nenhuma linha de indicador preenchida.'
  }

  if (codesInFile.length === 0) {
    return `A coluna “${CODE_COLUMN}” está presente, mas vazia em todas as linhas.`
  }

  const known = new Map(indicators.flatMap(item => {
    const official = matchCanonicalIndicator(item.code)?.code
    return official && official !== item.code
      ? [[item.code, item] as const, [official, item] as const]
      : [[item.code, item] as const]
  }))
  const matched = codesInFile.filter(code => known.has(code) || known.has(matchCanonicalIndicator(code)?.code ?? ''))
  if (matched.length === 0) {
    const canonical = codesInFile.map(code => matchCanonicalIndicator(code)).filter(Boolean)
    if (canonical.length > 0 && canonical.every(item => item && item.target_calculation_mode !== 'MANUAL')) {
      return 'Todos os indicadores preenchidos são calculados, e por isso não aceitam meta digitada. '
        + 'Preencha os indicadores do tipo “Digitável”.'
    }
    return `Nenhum código da planilha corresponde ao catálogo desta loja. Códigos lidos: ${list(codesInFile)}. `
      + 'Confira se a planilha é do mesmo cliente e do mesmo ano.'
  }

  if (matched.every(code => known.get(code)?.calculado)) {
    return 'Todos os indicadores preenchidos são calculados, e por isso não aceitam meta digitada. '
      + 'Preencha os indicadores do tipo “Digitável”.'
  }

  return 'Nenhuma célula de meta preenchida: os indicadores foram reconhecidos, mas todos os meses estão em branco.'
}
