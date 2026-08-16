/**
 * Decisão pura do remapeamento de produto legado — separada do script que fala
 * com o banco justamente para poder ser testada sem tocar em produção.
 */
export function escolherProduto(maiorEncontro, regra = 'por-jornada') {
  if (regra === 'plus') return { key: 'pmr_plus', nome: 'PMR Plus' }
  if (regra === 'hibrido') return { key: 'pmr_hibrido', nome: 'PMR Híbrido' }
  // por-jornada: menor produto do catálogo que comporta o que já foi executado.
  if ((maiorEncontro ?? 0) <= 9) return { key: 'pmr_plus', nome: 'PMR Plus' }
  return { key: 'pmr_hibrido', nome: 'PMR Híbrido' }
}
