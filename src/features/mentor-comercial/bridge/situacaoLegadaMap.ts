/**
 * Resolução do vocabulário legado da Carteira para o modelo oficial da matriz v1.
 *
 * As telas falam 27 "situações" herdadas do Base44. Várias delas MISTURAM coisas que
 * o modelo oficial separa — status comercial, responsável, pendência, etapa e próximo
 * passo — então nem toda situação tem correspondência 1:1 com os 86 status.
 *
 * Por isso a resolução tem três formas, e não um `Record<string, statusId>`:
 *
 *   DIRECT_MAPPING       a situação corresponde a um status, com evidência declarada.
 *   CONTEXTUAL_MIGRATION a situação é genérica demais; o status sai dos FATOS.
 *   SYSTEM_TERMINAL      não é status comercial nenhum; é terminal técnico do ciclo.
 *
 * Regra que atravessa tudo: sem fato que prove o destino, o resultado é
 * `PRECISA_CLASSIFICACAO` e o valor legado é preservado para auditoria. Semelhança
 * textual nunca substitui evidência.
 */

export type EvidenciaMapeamento =
  /** A situação legada é literalmente o rótulo de um status oficial. */
  | 'label'
  /**
   * O rótulo oficial começa com a situação legada e acrescenta um qualificador, e
   * existe EXATAMENTE UM status assim. A unicidade é o que torna determinístico;
   * com dois candidatos isto não seria prova.
   */
  | 'labelPrefixoUnico'
  /**
   * A situação legada é um `Resultado informado` da aba 06 e existe EXATAMENTE UMA
   * regra com esse resultado, então o `Novo status sugerido` dela é o destino.
   */
  | 'transition'
  /** Decisão registrada do proprietário da metodologia. */
  | 'decisaoProprietario'

/** Fatos disponíveis sobre a oportunidade legada. Ausente é ausente — nunca presumido. */
export type FatosLegados = {
  /** Quantas tentativas de contato foram efetivamente executadas. */
  tentativasExecutadas?: number | null
  /** Estado da cadência: 'ativa', 'encerrada' ou outro texto legado. */
  cadenciaStatus?: string | null
  clienteRespondeu?: boolean | null
  /** Bloqueador da negociação: preco, entrada, parcela, comparacao, decisao, terceiro, loja. */
  bloqueadorNegociacao?: string | null
  /** Estágio real do financiamento, quando registrado. */
  financiamentoEstagio?: string | null
  propostaEnviada?: boolean | null
  simulacaoEnviada?: boolean | null
  /** Responsável atual pela próxima ação. */
  responsavel?: string | null
  /** Data oficial de retomada, quando registrada. */
  dataRetomada?: string | null
  /** Marco de pós-venda determinado pela loja (REL-01..REL-06). Sem configuração, nulo. */
  marcoPosVenda?: string | null
  /** Etapa técnica da oportunidade no banco. */
  etapa?: string | null
}

export type ResultadoResolucao =
  | { tipo: 'STATUS'; statusId: string; motivo: string }
  | { tipo: 'TERMINAL_TECNICO'; terminal: 'cancelada'; motivo: string }
  | { tipo: 'PRECISA_CLASSIFICACAO'; motivo: string }

export type ResolucaoSituacaoLegada =
  | {
      kind: 'DIRECT_MAPPING'
      situacaoLegada: string
      statusId: string
      evidencia: EvidenciaMapeamento
      prova: string
    }
  | {
      kind: 'CONTEXTUAL_MIGRATION'
      situacaoLegada: string
      /** Por que a situação não pode virar um status fixo. */
      motivoDaAposentadoria: string
      resolver: (fatos: FatosLegados) => ResultadoResolucao
    }
  | {
      kind: 'SYSTEM_TERMINAL'
      situacaoLegada: string
      terminal: 'cancelada'
      motivo: string
    }

const precisaClassificacao = (motivo: string): ResultadoResolucao => ({
  tipo: 'PRECISA_CLASSIFICACAO',
  motivo,
})

const comStatus = (statusId: string, motivo: string): ResultadoResolucao => ({
  tipo: 'STATUS',
  statusId,
  motivo,
})

function cadenciaEncerrada(f: FatosLegados): boolean {
  const s = (f.cadenciaStatus ?? '').toLowerCase()
  return s.includes('encerrada') || s.includes('conclu')
}

function cadenciaAtiva(f: FatosLegados): boolean {
  const s = (f.cadenciaStatus ?? '').toLowerCase()
  return s.includes('ativa') || s.includes('andamento')
}

export const RESOLUCOES: readonly ResolucaoSituacaoLegada[] = [
  // ── DIRECT_MAPPING — coincidência literal de rótulo ──────────────────────────
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Primeiro contato pendente',
    statusId: 'INT-C01',
    evidencia: 'label',
    prova: 'INT-C01.label === "Primeiro contato pendente"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Cliente quente sem visita',
    statusId: 'INT-Q08',
    evidencia: 'label',
    prova: 'INT-Q08.label === "Cliente quente sem visita"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Visita agendada',
    statusId: 'INT-V02',
    evidencia: 'label',
    prova: 'INT-V02.label === "Visita agendada"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Visita a confirmar',
    statusId: 'INT-V03',
    evidencia: 'label',
    prova: 'INT-V03.label === "Visita a confirmar"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Visita hoje',
    statusId: 'INT-V05',
    evidencia: 'label',
    prova: 'INT-V05.label === "Visita hoje"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Proposta sem retorno',
    statusId: 'INT-N03',
    evidencia: 'label',
    prova: 'INT-N03.label === "Proposta sem retorno"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Venda realizada',
    statusId: 'VEN-04',
    evidencia: 'label',
    prova: 'VEN-04.label === "Venda realizada"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Venda perdida',
    statusId: 'PER-02',
    evidencia: 'label',
    prova:
      'PER-02.label === "Venda perdida". PER-01 é "Motivo da perda pendente", status do fluxo de Fechamento (aba 10).',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Garantia em acompanhamento',
    statusId: 'REL-08',
    evidencia: 'label',
    prova: 'REL-08.label === "Garantia em acompanhamento"',
  },

  // ── DIRECT_MAPPING — prefixo único ──────────────────────────────────────────
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Visita realizada',
    statusId: 'INT-V08',
    evidencia: 'labelPrefixoUnico',
    prova:
      'Único rótulo começando com "Visita realizada": INT-V08 "Visita realizada — desfecho pendente"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Proposta enviada',
    statusId: 'INT-N02',
    evidencia: 'labelPrefixoUnico',
    prova: 'Único rótulo começando com "Proposta enviada": INT-N02 "Proposta enviada — prazo ativo"',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Cadência encerrada',
    statusId: 'PER-03',
    evidencia: 'labelPrefixoUnico',
    prova:
      'Único rótulo começando com "Cadência encerrada": PER-03 "Cadência encerrada sem resposta"',
  },

  // ── DIRECT_MAPPING — resultado de transição único ───────────────────────────
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Cliente respondeu',
    statusId: 'INT-C03',
    evidencia: 'transition',
    prova: 'Aba 06: regra única com resultado "Cliente respondeu" → INT-C03',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Não compareceu',
    statusId: 'INT-V07',
    evidencia: 'transition',
    prova: 'Aba 06: regra única com resultado "Não compareceu" → INT-V07',
  },

  // ── DIRECT_MAPPING — decisão do proprietário da metodologia ─────────────────
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Em cadência sem resposta',
    statusId: 'INT-C02',
    evidencia: 'decisaoProprietario',
    prova: 'Decisão do proprietário, item 2: "Em cadência sem resposta → INT-C02".',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Necessidade em qualificação',
    statusId: 'INT-Q01',
    evidencia: 'decisaoProprietario',
    prova:
      'Decisão do proprietário, item 3: cliente respondeu, mas faltam informações para determinar necessidade e viabilidade.',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Veículo definido',
    statusId: 'INT-Q03',
    evidencia: 'decisaoProprietario',
    prova:
      'Decisão do proprietário, item 4: veículo definido não implica prazo, orçamento, troca ou financiamento qualificados.',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Financiamento aprovado sem compra',
    statusId: 'FIN-06',
    evidencia: 'decisaoProprietario',
    prova:
      'Decisão do proprietário, item 6: "sem compra" (legado) e "sem fechamento" (oficial) são a mesma situação.',
  },
  {
    kind: 'DIRECT_MAPPING',
    situacaoLegada: 'Vai pensar',
    statusId: 'INT-N09',
    evidencia: 'decisaoProprietario',
    prova: 'Decisão do proprietário, item 8: "Vai pensar" é expressão de UI; o canônico é INT-N09.',
  },

  // ── CONTEXTUAL_MIGRATION ────────────────────────────────────────────────────
  {
    kind: 'CONTEXTUAL_MIGRATION',
    situacaoLegada: 'Lead sem resposta',
    motivoDaAposentadoria:
      'Agrupa três estados diferentes: nenhuma tentativa, cadência ativa sem resposta e cadência encerrada.',
    resolver: (f) => {
      if (cadenciaEncerrada(f)) return comStatus('PER-03', 'Cadência concluída sem resposta.')
      if (f.tentativasExecutadas === 0) {
        return comStatus('INT-C01', 'Nenhuma tentativa efetiva realizada.')
      }
      if (typeof f.tentativasExecutadas === 'number' && f.tentativasExecutadas > 0 && !f.clienteRespondeu) {
        return comStatus('INT-C02', 'Tentativas executadas e cliente ainda sem responder.')
      }
      if (cadenciaAtiva(f) && !f.clienteRespondeu) {
        return comStatus('INT-C02', 'Cadência ativa e cliente ainda sem responder.')
      }
      return precisaClassificacao('Não há registro de quantas tentativas foram executadas.')
    },
  },
  {
    kind: 'CONTEXTUAL_MIGRATION',
    situacaoLegada: 'Financiamento em análise',
    motivoDaAposentadoria:
      'O legado agrupava sob o mesmo texto todos os estágios do financiamento, de FIN-01 a FIN-05.',
    resolver: (f) => {
      const e = (f.financiamentoEstagio ?? '').toLowerCase()
      if (e.includes('complemento') || e.includes('financeira')) {
        return comStatus('FIN-05', 'Financeira solicitou complemento.')
      }
      if (e.includes('ficha') && (e.includes('análise') || e.includes('analise'))) {
        return comStatus('FIN-04', 'Ficha efetivamente enviada e em análise.')
      }
      if (e.includes('documento')) return comStatus('FIN-03', 'Documentos necessários faltando.')
      if (f.simulacaoEnviada) return comStatus('FIN-02', 'Simulação enviada.')
      if (e.includes('pediu financiamento') || e.includes('simula')) {
        return comStatus('FIN-01', 'Pediu financiamento e ainda precisa receber simulação.')
      }
      // "financiamento = pendente" sozinho não diz o estágio. Não presumir FIN-04.
      return precisaClassificacao('Estágio real do financiamento não registrado no legado.')
    },
  },
  {
    kind: 'CONTEXTUAL_MIGRATION',
    situacaoLegada: 'Aguardando resposta do cliente',
    motivoDaAposentadoria:
      'Representa responsible = Cliente, não uma situação comercial completa. O contexto original define o status.',
    resolver: (f) => {
      if (f.simulacaoEnviada) return comStatus('FIN-02', 'Simulação enviada, aguardando cliente.')
      if (f.propostaEnviada) return comStatus('INT-N03', 'Proposta enviada sem retorno.')
      if ((f.bloqueadorNegociacao ?? '').toLowerCase().includes('decis')) {
        return comStatus('INT-N09', 'Aguardando decisão do cliente.')
      }
      if (cadenciaAtiva(f) || (f.tentativasExecutadas ?? 0) > 0) {
        return comStatus('INT-C02', 'Contato inicial sem resposta.')
      }
      return precisaClassificacao('Contexto original insuficiente para determinar o status.')
    },
  },
  {
    kind: 'CONTEXTUAL_MIGRATION',
    situacaoLegada: 'Aguardando ação do vendedor',
    motivoDaAposentadoria:
      'Representa responsible = Vendedor. A pendência do vendedor acontece em contato, negociação, financiamento, troca e entrega.',
    resolver: (f) => {
      if (f.propostaEnviada) return comStatus('INT-N03', 'Proposta enviada aguardando tratativa.')
      if (f.simulacaoEnviada) return comStatus('FIN-02', 'Simulação enviada aguardando tratativa.')
      if (f.clienteRespondeu) {
        return comStatus('INT-C03', 'Cliente respondeu ao primeiro contato e aguarda atendimento.')
      }
      return precisaClassificacao(
        'Pendência do vendedor sem contexto comercial registrado; representar por responsible mais pending flag.',
      )
    },
  },
  {
    kind: 'CONTEXTUAL_MIGRATION',
    situacaoLegada: 'Em negociação ativa',
    motivoDaAposentadoria:
      'É negociação genérica. Havendo bloqueador registrado, o status específico vale mais que o fallback.',
    resolver: (f) => {
      const b = (f.bloqueadorNegociacao ?? '').toLowerCase()
      if (b.includes('preco') || b.includes('preço')) return comStatus('INT-N05', 'Objeção de preço.')
      if (b.includes('entrada')) return comStatus('INT-N06', 'Objeção de entrada.')
      if (b.includes('parcela')) return comStatus('INT-N07', 'Objeção de parcela.')
      if (b.includes('compara')) return comStatus('INT-N08', 'Comparando veículos ou concorrentes.')
      if (b.includes('terceiro')) return comStatus('INT-N10', 'Aguardando decisão de terceiro.')
      if (b.includes('loja') || b.includes('interna')) {
        return comStatus('INT-N11', 'Aguardando condição da loja.')
      }
      if (b.includes('decis')) return comStatus('INT-N09', 'Aguardando decisão do cliente.')
      // Fallback oficial para negociação genérica (decisão do proprietário, item 7).
      return comStatus('INT-N04', 'Negociação ativa sem bloqueador específico registrado.')
    },
  },
  {
    kind: 'CONTEXTUAL_MIGRATION',
    situacaoLegada: 'Pós-venda ativo',
    motivoDaAposentadoria:
      'Não existe um único REL-* para todos: o marco depende da data da venda e da configuração da loja.',
    resolver: (f) => {
      const marco = f.marcoPosVenda
      if (marco && /^REL-0[1-6]$/.test(marco)) {
        return comStatus(marco, `Marco de pós-venda determinado pela configuração da loja: ${marco}.`)
      }
      // Não inventar D+7, D+30 ou D+180 que a loja não configurou.
      return precisaClassificacao(
        'Marco de pós-venda não determinável: falta configuração da loja ou a data da venda.',
      )
    },
  },
  {
    kind: 'CONTEXTUAL_MIGRATION',
    situacaoLegada: 'Oportunidade futura',
    motivoDaAposentadoria:
      'Mistura dois momentos: intenção futura declarada e retomada já programada com data.',
    resolver: (f) => {
      const data = (f.dataRetomada ?? '').trim()
      if (data && !Number.isNaN(new Date(data).getTime())) {
        return comStatus('PER-05', 'Data oficial de retomada registrada.')
      }
      return comStatus('INT-Q05', 'Compra futura declarada, sem data oficial de retomada.')
    },
  },

  // ── SYSTEM_TERMINAL ─────────────────────────────────────────────────────────
  {
    kind: 'SYSTEM_TERMINAL',
    situacaoLegada: 'Venda cancelada',
    terminal: 'cancelada',
    motivo:
      'Venda perdida é negócio que nunca concluiu; venda cancelada é negócio concluído e depois revertido. ' +
      'São fatos diferentes, e cancelada não é nenhum dos 86 status comerciais. O terminal técnico ' +
      'oportunidades.etapa = cancelada é preservado, junto de cancelada_em, cancelada_por e motivo_cancelamento.',
  },
] as const

/** Situações aposentadas: novas gravações não devem mais produzir estas strings. */
export const SITUACOES_APOSENTADAS: readonly string[] = [
  'Lead sem resposta',
  'Financiamento em análise',
  'Aguardando resposta do cliente',
  'Aguardando ação do vendedor',
  'Pós-venda ativo',
  'Oportunidade futura',
] as const

const INDICE = new Map(RESOLUCOES.map((r) => [r.situacaoLegada, r]))

export function resolucaoDaSituacao(
  situacao: string | null | undefined,
): ResolucaoSituacaoLegada | null {
  if (!situacao) return null
  return INDICE.get(situacao.trim()) ?? null
}

/**
 * Resolve a situação legada para o modelo oficial.
 *
 * Mapeamento direto devolve o status. Situação genérica resolve pelos fatos.
 * `Venda cancelada` devolve o terminal técnico, nunca um status comercial.
 * Sem fato que prove o destino, devolve `PRECISA_CLASSIFICACAO`.
 */
export function resolverSituacaoLegada(
  situacao: string | null | undefined,
  fatos: FatosLegados = {},
): ResultadoResolucao {
  const r = resolucaoDaSituacao(situacao)
  if (!r) {
    return precisaClassificacao(
      `Situação legada desconhecida: ${JSON.stringify(situacao ?? null)}`,
    )
  }
  if (r.kind === 'DIRECT_MAPPING') return comStatus(r.statusId, r.prova)
  if (r.kind === 'SYSTEM_TERMINAL') {
    return { tipo: 'TERMINAL_TECNICO', terminal: r.terminal, motivo: r.motivo }
  }
  return r.resolver(fatos)
}

/** Status oficial da situação, ou `null` quando depende de fato indisponível. */
export function statusOficialDaSituacao(
  situacao: string | null | undefined,
  fatos: FatosLegados = {},
): string | null {
  const r = resolverSituacaoLegada(situacao, fatos)
  return r.tipo === 'STATUS' ? r.statusId : null
}

export function temMapeamento(situacao: string | null | undefined): boolean {
  return resolucaoDaSituacao(situacao) !== null
}

export function ehTerminalTecnico(situacao: string | null | undefined): boolean {
  return resolucaoDaSituacao(situacao)?.kind === 'SYSTEM_TERMINAL'
}

export function ehSituacaoAposentada(situacao: string | null | undefined): boolean {
  if (!situacao) return false
  return SITUACOES_APOSENTADAS.includes(situacao.trim())
}

/** Mantido para compatibilidade com quem só precisa dos mapeamentos diretos. */
export const MAPEAMENTOS_COM_PROVA = RESOLUCOES.filter(
  (r): r is Extract<ResolucaoSituacaoLegada, { kind: 'DIRECT_MAPPING' }> =>
    r.kind === 'DIRECT_MAPPING',
)
