/**
 * Mapa do vocabulário legado da Carteira (`situacao_atual`) para os status oficiais
 * da matriz v1.
 *
 * As telas atuais falam 27 "situações" herdadas do Base44. A matriz oficial tem 86
 * status. Traduzir de um para o outro é o que permite o objetivo, o próximo passo e
 * a orientação virem do catálogo em vez de ficarem escritos no código da tela.
 *
 * REGRA: só entra aqui o que tem PROVA na fonte. Semelhança de texto não é prova.
 * Cada entrada declara a evidência que a sustenta.
 *
 * Três tipos de evidência aceitos:
 *   - `label`              → a situação legada é literalmente o rótulo de um status.
 *   - `labelPrefixoUnico`  → o rótulo oficial começa com a situação legada e acrescenta
 *                            um qualificador, e existe EXATAMENTE UM status assim. A
 *                            unicidade é o que torna a leitura determinística (§88);
 *                            com dois candidatos isto não seria prova.
 *   - `transition`         → a situação legada é literalmente um `Resultado informado`
 *                            da aba 06 e existe EXATAMENTE UMA regra com esse resultado,
 *                            então o `Novo status sugerido` dela é o destino.
 *   - `none`       → não há evidência. NÃO é mapeada. Fica registrada abaixo para
 *                    que a lacuna seja visível em vez de silenciosamente inventada.
 */

export type EvidenciaMapeamento = 'label' | 'labelPrefixoUnico' | 'transition'

export type MapeamentoSituacao = {
  /** Situação como as telas escrevem hoje. */
  situacaoLegada: string
  /** Status oficial correspondente. */
  statusId: string
  evidencia: EvidenciaMapeamento
  /** Texto exato da fonte que sustenta o mapeamento, para auditoria. */
  prova: string
}

/**
 * Mapeamentos com prova.
 *
 * Os de `evidencia: 'label'` são coincidência literal entre a situação legada e o
 * `Status atual` da aba 02. Os de `evidencia: 'transition'` vêm de a situação legada
 * ser um `Resultado informado` da aba 06; o status é o destino declarado da regra.
 */
export const MAPEAMENTOS_COM_PROVA: readonly MapeamentoSituacao[] = [
  // — coincidência literal de rótulo (aba 02 Status) —
  {
    situacaoLegada: 'Primeiro contato pendente',
    statusId: 'INT-C01',
    evidencia: 'label',
    prova: 'INT-C01.label === "Primeiro contato pendente"',
  },
  {
    situacaoLegada: 'Cliente quente sem visita',
    statusId: 'INT-Q08',
    evidencia: 'label',
    prova: 'INT-Q08.label === "Cliente quente sem visita"',
  },
  {
    situacaoLegada: 'Visita agendada',
    statusId: 'INT-V02',
    evidencia: 'label',
    prova: 'INT-V02.label === "Visita agendada"',
  },
  {
    situacaoLegada: 'Visita a confirmar',
    statusId: 'INT-V03',
    evidencia: 'label',
    prova: 'INT-V03.label === "Visita a confirmar"',
  },
  {
    situacaoLegada: 'Visita hoje',
    statusId: 'INT-V05',
    evidencia: 'label',
    prova: 'INT-V05.label === "Visita hoje"',
  },
  {
    situacaoLegada: 'Visita realizada',
    statusId: 'INT-V08',
    evidencia: 'labelPrefixoUnico',
    prova: 'Único status cujo rótulo começa com "Visita realizada": INT-V08 "Visita realizada — desfecho pendente"',
  },
  {
    situacaoLegada: 'Proposta enviada',
    statusId: 'INT-N02',
    evidencia: 'labelPrefixoUnico',
    prova: 'Único status cujo rótulo começa com "Proposta enviada": INT-N02 "Proposta enviada — prazo ativo"',
  },
  {
    situacaoLegada: 'Proposta sem retorno',
    statusId: 'INT-N03',
    evidencia: 'label',
    prova: 'INT-N03.label === "Proposta sem retorno"',
  },
  {
    situacaoLegada: 'Venda realizada',
    statusId: 'VEN-04',
    evidencia: 'label',
    prova: 'VEN-04.label === "Venda realizada"',
  },
  {
    situacaoLegada: 'Venda perdida',
    statusId: 'PER-02',
    evidencia: 'label',
    prova: 'PER-02.label === "Venda perdida". PER-01 é "Motivo da perda pendente", que é o status do fluxo de Fechamento (aba 10), não a situação legada.',
  },
  {
    situacaoLegada: 'Garantia em acompanhamento',
    statusId: 'REL-08',
    evidencia: 'label',
    prova: 'REL-08.label === "Garantia em acompanhamento"',
  },
  {
    situacaoLegada: 'Cadência encerrada',
    statusId: 'PER-03',
    evidencia: 'labelPrefixoUnico',
    prova: 'Único status cujo rótulo começa com "Cadência encerrada": PER-03 "Cadência encerrada sem resposta"',
  },

  // — resultado de transição declarado na aba 06 —
  {
    situacaoLegada: 'Cliente respondeu',
    statusId: 'INT-C03',
    evidencia: 'transition',
    prova: 'Aba 06: regra ÚNICA com resultado "Cliente respondeu" → "Resposta recebida — atendimento pendente" (INT-C03)',
  },
  {
    situacaoLegada: 'Não compareceu',
    statusId: 'INT-V07',
    evidencia: 'transition',
    prova: 'Aba 06: regra ÚNICA com resultado "Não compareceu" → "Cliente não compareceu" (INT-V07)',
  },
] as const

/**
 * Situações legadas SEM evidência na fonte.
 *
 * Não são mapeadas e não são adivinhadas. Enquanto estiverem aqui, a Carteira
 * continua usando o texto legado para elas — o comportamento visível não muda —
 * e o objetivo/próximo passo dessas situações não vem do catálogo oficial.
 *
 * Resolver exige decisão do proprietário da metodologia: dizer a qual dos 86 status
 * cada uma corresponde, ou aposentar a situação legada. Não é decisão do software.
 */
export const SITUACOES_LEGADAS_SEM_MAPEAMENTO: readonly string[] = [
  'Lead sem resposta',
  'Em cadência sem resposta',
  'Necessidade em qualificação',
  'Veículo definido',
  'Financiamento em análise',
  'Financiamento aprovado sem compra',
  'Em negociação ativa',
  'Vai pensar',
  'Aguardando resposta do cliente',
  'Aguardando ação do vendedor',
  'Venda cancelada',
  'Pós-venda ativo',
  'Oportunidade futura',
] as const

const INDICE_POR_SITUACAO: ReadonlyMap<string, MapeamentoSituacao> = new Map(
  MAPEAMENTOS_COM_PROVA.map((m) => [m.situacaoLegada, m]),
)

/** Traduz a situação legada para o status oficial, ou `null` quando não há prova. */
export function statusOficialDaSituacao(situacao: string | null | undefined): string | null {
  if (!situacao) return null
  return INDICE_POR_SITUACAO.get(situacao.trim())?.statusId ?? null
}

export function temMapeamento(situacao: string | null | undefined): boolean {
  return statusOficialDaSituacao(situacao) !== null
}

export function evidenciaDoMapeamento(
  situacao: string | null | undefined,
): MapeamentoSituacao | null {
  if (!situacao) return null
  return INDICE_POR_SITUACAO.get(situacao.trim()) ?? null
}
