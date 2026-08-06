/**
 * Máscara de moeda dos formulários comerciais.
 *
 * Regra: **o que o vendedor digita é real, não centavo.** Digitar `69900`
 * resulta em `R$ 69.900,00`. Os centavos só entram quando ele digita a
 * vírgula: `69900,50` → `R$ 69.900,50`.
 *
 * Antes, os dígitos eram lidos como centavos (`69900` virava `R$ 699,00`) e
 * o vendedor precisava digitar `6990000` para lançar um carro de 69 mil — a
 * causa de valor lançado com duas casas de erro.
 *
 * Durante a digitação a máscara não força as duas casas decimais: escrever
 * `6` mostra `R$ 6`, não `R$ 6,00`. Forçar geraria uma vírgula no meio do
 * caminho e o dígito seguinte cairia depois dela.
 */

/** Ponto é separador de milhar em pt-BR; vírgula é o decimal. */
function partes(raw: string): { inteiro: string; decimal: string | null } {
  const limpo = (raw || '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
  const [inteiroBruto, ...resto] = limpo.split(',')
  const inteiro = inteiroBruto.replace(/\D/g, '')
  if (resto.length === 0) return { inteiro, decimal: null }
  return { inteiro, decimal: resto.join('').replace(/\D/g, '').slice(0, 2) }
}

/** Formata enquanto o usuário digita, preservando o que ele ainda não terminou. */
export function formatCurrencyInput(raw: string): string {
  const { inteiro, decimal } = partes(raw)
  if (!inteiro && decimal === null) return ''

  const inteiroFormatado = inteiro
    ? Number(inteiro).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
    : '0'

  if (decimal === null) return `R$ ${inteiroFormatado}`
  return `R$ ${inteiroFormatado},${decimal}`
}

/** Valor numérico do que está no campo. `R$ 69.900,50` → 69900.5 */
export function parseCurrencyInput(raw: string): number {
  if (!raw) return 0
  // Número já normalizado (ex.: valor vindo do banco em string).
  if (/^-?\d+(\.\d+)?$/.test(raw.trim())) return Number(raw)

  const { inteiro, decimal } = partes(raw)
  const numero = Number(`${inteiro || '0'}.${decimal || '0'}`)
  return Number.isFinite(numero) ? numero : 0
}

/** Exibição canônica de um valor já salvo. */
export function formatCurrencyValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  // toLocaleString usa espaço não-quebrável (U+00A0) entre o símbolo e o
  // número; normalizamos para espaço comum, que é o que a máscara produz.
  return value
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00a0/g, ' ')
}
