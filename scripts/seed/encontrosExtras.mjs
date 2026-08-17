/**
 * Regras puras de classificação de encontro e decisão de extras — fora do
 * script de escrita para poderem ser testadas sem tocar no banco.
 */
export function classificarEncontro(objective) {
  if (!objective || !objective.trim()) return 'sem_objetivo'
  // Precisa COMEÇAR com "Acompanhamento": encontros temáticos citam a palavra
  // no meio do texto — "Planejamento Estratégico, ..., Acompanhamento Diário de
  // Vendas" é o encontro 2 do PMR, não um acompanhamento avulso.
  return /^\s*acompanhamento\b/i.test(objective) ? 'acompanhamento' : 'tematico'
}

/**
 * Decide quais encontros do cliente são adicionais ao contrato.
 *
 * As vagas do contrato são preenchidas por prioridade, não por ordem de
 * chegada: encontro temático é o programa em si e nunca deve perder vaga para
 * um acompanhamento — foi o que aconteceu na Espíndola, onde "Análise das
 * Implementações" virou extra enquanto um acompanhamento anterior ficou como
 * contratual. Dentro de cada grupo, a ordem é cronológica.
 *
 *   1. temáticos;
 *   2. acompanhamentos, até o que o produto prevê;
 *   3. encontros sem objetivo (dado incompleto), para fechar as vagas.
 *
 * Sobra virou extra. Jornada dentro do contrato nunca gera extra.
 */
export function decidirExtras(encontros, totalContratado, acompanhamentosPrevistos) {
  const extras = new Set()
  if (encontros.length <= totalContratado) return extras

  const porTipo = { tematico: [], acompanhamento: [], sem_objetivo: [] }
  for (const encontro of encontros) porTipo[classificarEncontro(encontro.objective)].push(encontro)

  const contratuais = new Set()
  let vagas = totalContratado

  for (const encontro of porTipo.tematico) {
    if (vagas === 0) break
    contratuais.add(encontro.id)
    vagas -= 1
  }
  for (const encontro of porTipo.acompanhamento.slice(0, acompanhamentosPrevistos)) {
    if (vagas === 0) break
    contratuais.add(encontro.id)
    vagas -= 1
  }
  for (const encontro of porTipo.sem_objetivo) {
    if (vagas === 0) break
    contratuais.add(encontro.id)
    vagas -= 1
  }
  // Sobrou vaga e ainda há acompanhamento fora do previsto: ele entra antes de
  // ficar vaga ociosa com encontro marcado como extra.
  for (const encontro of porTipo.acompanhamento.slice(acompanhamentosPrevistos)) {
    if (vagas === 0) break
    contratuais.add(encontro.id)
    vagas -= 1
  }

  for (const encontro of encontros) {
    if (!contratuais.has(encontro.id)) extras.add(encontro.id)
  }
  return extras
}
