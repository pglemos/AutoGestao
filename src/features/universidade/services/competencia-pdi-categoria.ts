/**
 * De-para entre as competências do PDI e as categorias da Universidade MX.
 *
 * A recomendação de treinamento antigamente lia dez chaves legadas
 * (`comp_prospeccao`, `comp_abordagem`, …) de uma tabela que está vazia em
 * produção — na prática, lacuna de PDI nunca pesava na recomendação. As
 * competências reais são as 18 de `pdi_competencias`, e é delas que a
 * recomendação passa a partir.
 *
 * O vínculo é por `ordem` (1–10 técnicas, 11–18 comportamentais), que é a chave
 * estável da tabela: renomear o rótulo de uma competência não desalinha o mapa.
 *
 * Onde o catálogo já declarava a correspondência, ela foi seguida — ver
 * `CATEGORY_BY_TYPE` em `universidade-service.ts`: agendamento→WhatsApp,
 * carro_de_troca→Negociação, financiamento→Financiamento, crm→Carteira,
 * rotina_diaria/funil/institucional→Mentalidade. As comportamentais caem em
 * Mentalidade, que é onde vivem os treinamentos de rotina e disciplina.
 */
export const CATEGORIA_POR_COMPETENCIA: Record<number, string> = {
  1: 'Mentalidade',   // Planejamento
  2: 'Atendimento',   // Atendimento ao Cliente
  3: 'WhatsApp',      // Agendamento de Visitas   (catálogo: agendamento -> WhatsApp)
  4: 'Fechamento',    // Fechamento de Venda
  5: 'Carteira',      // Carteira de Clientes     (catálogo: crm -> Carteira)
  6: 'Prospecção',    // Mídias Sociais — gera lead novo
  7: 'Prospecção',    // Prospecção
  8: 'Negociação',    // Avaliação de Carro       (catálogo: carro_de_troca -> Negociação)
  9: 'Financiamento', // Financiamentos           (catálogo: financiamento -> Financiamento)
  10: 'Mentalidade',  // Processos                (catálogo: rotina_diaria -> Mentalidade)
  11: 'Mentalidade',  // Pontualidade
  12: 'Mentalidade',  // Senso de Urgência
  13: 'Mentalidade',  // Iniciativa
  14: 'Mentalidade',  // Organização
  15: 'Mentalidade',  // Liderança
  16: 'Atendimento',  // Relacionamento Interpessoal
  17: 'Mentalidade',  // Persistência
  18: 'Mentalidade',  // Resiliência
}

export type CompetenciaAvaliada = {
  ordem: number
  nome: string
  nota: number
  /** Nota esperada para o cargo. Lacuna é `nota < alvo`. */
  alvo: number
}

export function categoriaDaCompetencia(ordem: number): string | null {
  return CATEGORIA_POR_COMPETENCIA[ordem] ?? null
}
