/**
 * Recorte por vendedor na carteira, para quem enxerga a loja inteira.
 *
 * O adapter já escopa a carteira por papel: vendedor vê a própria carteira,
 * gerente vê a da loja. Faltava ao gerente conseguir olhar um vendedor de cada
 * vez — sem isso, auditar a carteira de alguém da equipe só era possível
 * entrando na conta da pessoa.
 *
 * O valor mora em `sessionStorage` porque acompanha a navegação da aba e não
 * deve sobreviver ao fechamento do navegador, do mesmo jeito que o contexto de
 * simulação. A referência Base44 não é tocada: o seletor vive no wrapper MX e
 * o adapter lê daqui.
 */
const STORAGE_KEY = 'mx_carteira_seller_filter'
const EVENT = 'mx:carteira-seller-filter'

export function readCarteiraSellerFilter(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function writeCarteiraSellerFilter(sellerUserId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (sellerUserId) window.sessionStorage.setItem(STORAGE_KEY, sellerUserId)
    else window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage indisponível (aba anônima restrita): o filtro simplesmente
    // não persiste, e a carteira segue mostrando a loja inteira.
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

/** Avisa quando o recorte muda, para a carteira recarregar a lista. */
export function onCarteiraSellerFilterChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
