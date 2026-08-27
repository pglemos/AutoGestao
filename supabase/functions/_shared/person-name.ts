/**
 * Chave de identidade aproximada de uma pessoa, para detectar o mesmo vendedor
 * cadastrado duas vezes na mesma loja.
 *
 * Usa as duas primeiras palavras porque foi assim que as duplicatas reais
 * apareceram em produção: "GUSTAVO OLIVEIRA" e "GUSTAVO OLIVEIRA GOMES" são a
 * mesma pessoa, com e-mails diferentes e vendas divididas entre os dois logins.
 * Comparar o nome inteiro não pegaria esse caso.
 *
 * É uma heurística de aviso, nunca de bloqueio definitivo: homônimo de verdade
 * existe, e quem cadastra confirma.
 */
export function personNameKey(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLocaleUpperCase('pt-BR')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
}

export function isSamePerson(a: string, b: string): boolean {
  const keyA = personNameKey(a)
  const keyB = personNameKey(b)
  return keyA.length > 0 && keyA === keyB
}
