/**
 * Ponte entre a Carteira existente e o motor determinístico.
 *
 * OBJETIVO: substituir o MOTOR, não as telas. As oito telas da Carteira Base44
 * continuam exatamente como estão; o que muda é quem decide por trás delas.
 *
 * Antes:  UI → carteiraUtils (heurística Base44) → regras escondidas
 * Depois: UI → carteiraUtils (fachada) → esta ponte → CommercialMentorEngine
 *
 * As funções aqui recebem o `cliente` no formato Base44 que as telas já usam e
 * devolvem exatamente o mesmo formato de retorno da heurística antiga, para que
 * nenhum componente precise mudar.
 *
 * O que muda de verdade:
 * - Score deixa de ser dedução arbitrária a partir de 100 e passa a ser os cinco
 *   pilares oficiais (15/20/30/20/15) da aba `07 Score_Prioridade`.
 * - Prioridade deixa de ser um mapa improvisado e passa a ser a fórmula oficial
 *   `urgência*0.45 + potencial*0.35 + risco*0.20`, com os overrides do §32.
 */

import {
  classifyScore,
  computeScore,
  type CadenceQuality,
  type ExecutionQuality,
  type HistoryQuality,
  type NextStepQuality,
  type ScoreInput,
  type StatusQuality,
} from '../engine/score'
import {
  SCRIPT_IDS,
  scriptPorId,
  statusPorId,
} from '../catalog/statusCatalog.generated'
import {
  renderScript,
  resolveScriptRef,
  type ScriptVariables,
} from '../engine/script'
import {
  ehTerminalTecnico,
  resolverSituacaoLegada,
  statusOficialDaSituacao,
  type FatosLegados,
} from './situacaoLegadaMap'
import {
  computePriority,
  type PotentialLevel,
  type PriorityOverrides,
  type UrgencyLevel,
} from '../engine/priority'

/** Formato Base44 que as telas da Carteira já usam. Campos são opcionais por natureza. */
export type ClienteCarteira = {
  situacao_atual?: string | null
  momento?: string | null
  proxima_acao?: string | null
  proxima_acao_data?: string | null
  proximo_passo?: string | null
  responsavel?: string | null
  ultimo_contato?: string | null
  ultimo_resultado?: string | null
  temperatura?: string | null
  cadencia_tentativa?: number | null
  cadencia_total?: number | null
  cadencia_status?: string | null
  visita_agendada_em?: string | null
  financiamento_status?: string | null
}

/**
 * Situações em que a oportunidade já se encerrou.
 *
 * Preservado da heurística anterior de propósito: a tela usa o score para ranquear
 * "quem precisa de atenção". Dar nota real a um negócio encerrado faria vendas e
 * perdas reaparecerem como "Crítica" no topo da lista — uma regressão visível.
 * Encerrado sai do cálculo, exatamente como manda o §34.
 */
export const SITUACOES_ENCERRADAS = [
  'Venda realizada',
  'Venda perdida',
  'Cadência encerrada sem resposta',
  'Cliente não deseja contato',
  'Contato inválido',
]

const MS_DIA = 86_400_000

function diasEntre(dataIso: string | null | undefined, agora: Date): number | null {
  if (!dataIso) return null
  const d = new Date(dataIso)
  if (Number.isNaN(d.getTime())) return null
  const dia = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())
  return Math.round((dia(agora) - dia(d)) / MS_DIA)
}

const SITUACAO_AGUARDANDO_VENDEDOR = ['Aguardando ação do vendedor', 'Cliente respondeu']

/** Pilar 1 — Status definido e coerente (15/8/0). */
export function derivarQualidadeStatus(cliente: ClienteCarteira): StatusQuality {
  const situacao = (cliente.situacao_atual || cliente.momento || '').trim()
  if (!situacao) return 'undefined'
  // Situação preenchida mas sem próximo passo é "válida com informação pendente".
  if (!cliente.proximo_passo && !cliente.proxima_acao) return 'partial'
  return 'complete'
}

/** Pilar 2 — Próximo passo, responsável e data (20/10/0). */
export function derivarQualidadeProximoPasso(cliente: ClienteCarteira): NextStepQuality {
  const temPasso = Boolean(cliente.proximo_passo || cliente.proxima_acao)
  if (!temPasso) return 'missing'
  const temData = Boolean(cliente.proxima_acao_data)
  const temResponsavel = Boolean(cliente.responsavel)
  return temData && temResponsavel ? 'complete' : 'partial'
}

/** Pilar 3 — Execução dentro do prazo (30/25/10/0). */
export function derivarQualidadeExecucao(
  cliente: ClienteCarteira,
  agora: Date,
): ExecutionQuality {
  const situacao = (cliente.situacao_atual || cliente.momento || '').trim()
  // Cliente respondeu e o vendedor não retornou é o principal risco operacional.
  if (SITUACAO_AGUARDANDO_VENDEDOR.includes(situacao)) {
    const dias = diasEntre(cliente.ultimo_contato, agora)
    if (dias !== null && dias >= 1) return 'awaitingSellerResponse'
  }

  const atraso = diasEntre(cliente.proxima_acao_data, agora)
  if (atraso === null) return 'onTime'
  if (atraso < 0) return 'onTime'
  if (atraso === 0) return 'dueToday'
  if (atraso === 1) return 'lateUnder24h'
  return 'lateOver24h'
}

/** Pilar 4 — Cadência respeitada (20/10/0). */
export function derivarQualidadeCadencia(cliente: ClienteCarteira): CadenceQuality {
  const status = (cliente.cadencia_status || '').trim().toLowerCase()
  // Cadência cumprida até o fim sem resposta NÃO penaliza: o vendedor fez a parte dele.
  if (status.includes('encerrada') || status.includes('concluída') || status.includes('concluida')) {
    return 'completedWithoutResponse'
  }
  if (status.includes('interrompida') && !status.includes('cliente')) return 'broken'

  const tentativa = cliente.cadencia_tentativa
  const total = cliente.cadencia_total
  if (typeof tentativa === 'number' && typeof total === 'number' && total > 0) {
    return 'respected'
  }
  // Sem informação de cadência não se presume quebra: trata como parcial.
  return 'partial'
}

/** Pilar 5 — Histórico atualizado (15/8/0). */
export function derivarQualidadeHistorico(cliente: ClienteCarteira, agora: Date): HistoryQuality {
  const dias = diasEntre(cliente.ultimo_contato, agora)
  if (dias === null) return 'stale'
  if (dias >= 7) return 'stale'
  return cliente.ultimo_resultado ? 'complete' : 'partial'
}

export function derivarPilares(cliente: ClienteCarteira, agora: Date): ScoreInput {
  return {
    status: derivarQualidadeStatus(cliente),
    nextStep: derivarQualidadeProximoPasso(cliente),
    execution: derivarQualidadeExecucao(cliente, agora),
    cadence: derivarQualidadeCadencia(cliente),
    history: derivarQualidadeHistorico(cliente, agora),
  }
}

/** Explicações legíveis, derivadas dos pilares — nunca texto inventado. */
function motivosDosPilares(pilares: ScoreInput): string[] {
  const motivos: string[] = []
  if (pilares.status === 'undefined') motivos.push('Situação atual não definida.')
  else if (pilares.status === 'partial') motivos.push('Situação definida, mas sem próximo passo.')

  if (pilares.nextStep === 'missing') motivos.push('Sem próxima ação definida.')
  else if (pilares.nextStep === 'partial') motivos.push('Próximo passo sem data ou sem responsável.')

  if (pilares.execution === 'awaitingSellerResponse') {
    motivos.push('Cliente respondeu e ainda aguarda retorno do vendedor.')
  } else if (pilares.execution === 'lateOver24h') motivos.push('Próxima ação vencida há mais de 24h.')
  else if (pilares.execution === 'lateUnder24h') motivos.push('Próxima ação vencida.')
  else if (pilares.execution === 'dueToday') motivos.push('Ação vence hoje.')

  if (pilares.cadence === 'broken') motivos.push('Cadência interrompida sem justificativa.')
  else if (pilares.cadence === 'partial') motivos.push('Cadência sem registro de tentativa.')

  if (pilares.history === 'stale') motivos.push('Histórico não representa o atendimento atual.')
  else if (pilares.history === 'partial') motivos.push('Contato registrado sem resultado.')

  return motivos
}

export type ResultadoScore = { score: number; motivos: string[] }

/**
 * Score oficial de 5 pilares, com a assinatura que a Carteira já consome.
 *
 * Oportunidade encerrada devolve 100 e sai do ranking, preservando o
 * comportamento visível da tela.
 */
export function calcularScoreOficial(
  cliente: ClienteCarteira | null | undefined,
  agora: Date = new Date(),
): ResultadoScore {
  if (!cliente) return { score: 100, motivos: [] }

  const situacao = (cliente.situacao_atual || cliente.momento || '').trim()
  if (SITUACOES_ENCERRADAS.includes(situacao)) {
    return { score: 100, motivos: ['Oportunidade encerrada.'] }
  }

  const pilares = derivarPilares(cliente, agora)
  const resultado = computeScore(pilares)
  return { score: resultado.total, motivos: motivosDosPilares(pilares) }
}

export function classificacaoScoreOficial(score: number): string {
  return classifyScore(score)
}

/** Potencial derivado da situação, conforme os exemplos da aba `07`. */
const POTENCIAL_POR_SITUACAO: Record<string, PotentialLevel> = {
  'Visita hoje': 'Muito alto',
  'Pronto para fechamento': 'Muito alto',
  'Financiamento aprovado sem compra': 'Muito alto',
  'Financiamento aprovado': 'Muito alto',
  'Em negociação ativa': 'Muito alto',
  'Proposta enviada': 'Alto',
  'Proposta sem retorno': 'Alto',
  'Visita agendada': 'Alto',
  'Visita a confirmar': 'Alto',
  'Cliente quente sem visita': 'Alto',
  'Cliente respondeu': 'Médio',
  'Aguardando ação do vendedor': 'Médio',
  'Visita realizada': 'Médio',
  'Vai pensar': 'Médio',
  'Financiamento em análise': 'Médio',
  'Em qualificação': 'Médio',
}

export function derivarPotencial(cliente: ClienteCarteira): PotentialLevel {
  const situacao = (cliente.situacao_atual || cliente.momento || '').trim()
  return POTENCIAL_POR_SITUACAO[situacao] ?? 'Baixo'
}

export function derivarUrgencia(cliente: ClienteCarteira, agora: Date): UrgencyLevel {
  const situacao = (cliente.situacao_atual || cliente.momento || '').trim()
  if (SITUACAO_AGUARDANDO_VENDEDOR.includes(situacao)) return 'clientRespondedAwaitingSeller'

  const atraso = diasEntre(cliente.proxima_acao_data, agora)
  if (atraso === null) return 'actionFuture'
  if (atraso > 0) return 'actionOverdue'
  if (atraso === 0) return 'actionToday'
  if (atraso === -1) return 'actionTomorrow'
  if (atraso >= -3) return 'actionWithin3Days'
  return 'actionFuture'
}

/**
 * Prioridade oficial `urgência*0.45 + potencial*0.35 + risco*0.20`, com a
 * assinatura que a Carteira já consome (devolve o rótulo em português).
 */
export function calcularPrioridadeOficial(
  cliente: ClienteCarteira | null | undefined,
  agora: Date = new Date(),
): string {
  if (!cliente) return 'Baixa'

  const situacao = (cliente.situacao_atual || cliente.momento || '').trim()
  if (SITUACOES_ENCERRADAS.includes(situacao)) return 'Baixa'

  const { score } = calcularScoreOficial(cliente, agora)
  const overrides: PriorityOverrides = {}

  if (SITUACAO_AGUARDANDO_VENDEDOR.includes(situacao)) overrides.clientResponded = true

  const atraso = diasEntre(cliente.proxima_acao_data, agora)
  if (atraso !== null && atraso > 1) overrides.actionOverdueOver24h = true

  const diasVisita = diasEntre(cliente.visita_agendada_em, agora)
  if (diasVisita === 0) overrides.visitToday = true

  if ((cliente.financiamento_status || '').toLowerCase().includes('aprovad')) {
    overrides.financingApproved = true
  }
  if (situacao === 'Pronto para fechamento') overrides.readyToClose = true

  return computePriority({
    urgency: derivarUrgencia(cliente, agora),
    potential: derivarPotencial(cliente),
    score,
    overrides,
    // SLA por loja não chega até esta camada; ausente significa não configurado
    // e, por definição, não penaliza ninguém (§33).
    slaMinutes: null,
  }).classification
}

// ---------------------------------------------------------------------------
// Objetivo, próximo passo e orientação vindos do catálogo oficial
// ---------------------------------------------------------------------------



/**
 * Extrai do registro legado apenas os FATOS que existem de verdade.
 *
 * As situações genéricas aposentadas ("Lead sem resposta", "Financiamento em análise",
 * "Aguardando resposta do cliente", "Aguardando ação do vendedor", "Pós-venda ativo",
 * "Oportunidade futura") só resolvem para um status oficial se o fato correspondente
 * estiver registrado. Nada é preenchido para forçar uma resolução.
 */
export function fatosDoCliente(
  cliente: (ClienteCarteira & Record<string, unknown>) | null | undefined,
): FatosLegados {
  if (!cliente) return {}
  const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
  const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)

  return {
    tentativasExecutadas: num(cliente.cadencia_tentativa) ?? num(cliente.tentativas_executadas),
    cadenciaStatus: cliente.cadencia_status ?? null,
    clienteRespondeu: bool(cliente.cliente_respondeu),
    bloqueadorNegociacao: str(cliente.bloqueador) ?? str(cliente.bloqueador_negociacao),
    financiamentoEstagio: cliente.financiamento_status ?? str(cliente.financiamento_estagio),
    propostaEnviada: bool(cliente.proposta_enviada),
    simulacaoEnviada: bool(cliente.simulacao_enviada),
    responsavel: cliente.responsavel ?? null,
    dataRetomada: str(cliente.data_retomada) ?? str(cliente.contato_futuro_em),
    marcoPosVenda: str(cliente.marco_pos_venda),
    etapa: str(cliente.etapa),
  }
}

export type ObjetivoEProximoPasso = {
  objetivo: string
  proximoPasso: string
  /** Orientação do Mentor, quando o catálogo a define. */
  orientacao: string | null
  /** Status oficial que originou a decisão, para auditoria. */
  statusId: string
}

/**
 * Objetivo e próximo passo do catálogo, para as situações com mapeamento provado.
 *
 * Devolve `null` quando a situação legada não tem correspondência provada na matriz.
 * Nesse caso o chamador mantém o texto legado — nada é inventado e nada é presumido.
 */
export function objetivoEProximoPassoOficial(
  situacao: string | null | undefined,
  fatos: FatosLegados = {},
): ObjetivoEProximoPasso | null {
  const statusId = statusOficialDaSituacao(situacao, fatos)
  if (!statusId) return null

  const status = statusPorId(statusId)
  if (!status || !status.objective || !status.nextStep) return null

  return {
    objetivo: status.objective,
    proximoPasso: status.nextStep,
    orientacao: status.mentorGuidance,
    statusId,
  }
}

/** Orientação oficial ("por que está aqui"), ou `null` sem mapeamento provado. */
export function orientacaoOficial(situacao: string | null | undefined): string | null {
  return objetivoEProximoPassoOficial(situacao)?.orientacao ?? null
}

// ---------------------------------------------------------------------------
// Script oficial, com renderização estrita
// ---------------------------------------------------------------------------

export type ScriptOficial = {
  scriptId: string
  /** Texto pronto, ou `null` quando falta variável obrigatória. */
  texto: string | null
  scriptReady: boolean
  missingVariables: string[]
  allowWhatsApp: boolean
  isInternal: boolean
  /** Motivo quando não foi possível resolver. */
  motivo:
    | 'RESOLVED'
    | 'SEM_MAPEAMENTO'
    | 'SOURCE_BLOCKER'
    | 'NOT_FOUND'
    | 'ATTEMPT_OUT_OF_RANGE'
    | 'TERMINAL_TECNICO'
}

/**
 * Variáveis do script a partir do cliente da Carteira.
 *
 * Só entra o que o registro realmente tem. Nada é preenchido com valor plausível:
 * a heurística anterior chegava a mandar `{opcao1}` como "10h" e `{opcao2}` como
 * "14h", oferecendo ao cliente horários que ninguém combinou. Faltando variável, o
 * renderer bloqueia o envio (§30).
 */
export function variaveisDoCliente(
  cliente: (ClienteCarteira & Record<string, unknown>) | null | undefined,
): ScriptVariables {
  if (!cliente) return {}
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
  return {
    nome: str(cliente.nome) ?? str(cliente.cliente_nome),
    veiculo: str(cliente.veiculo_interesse) ?? str(cliente.veiculo),
    vendedor: str(cliente.vendedor_nome) ?? str(cliente.responsavel),
    loja: str(cliente.loja_nome),
    data: str(cliente.visita_data) ?? str(cliente.data_visita),
    hora: str(cliente.visita_hora) ?? str(cliente.hora_visita),
    valorAvaliacao: str(cliente.valor_avaliacao),
    nomeIndicador: str(cliente.nome_indicador),
    motivoRealDoContato: str(cliente.motivo_contato),
    resumoNecessidade: str(cliente.resumo_necessidade),
    opcao1: str(cliente.opcao_horario_1),
    opcao2: str(cliente.opcao_horario_2),
    listaPendencias: str(cliente.lista_pendencias),
    tipoDecisor: str(cliente.tipo_decisor),
    dataRetorno: str(cliente.data_retorno),
  }
}

/**
 * Resolve e renderiza o script oficial da situação do cliente.
 *
 * Sem mapeamento provado da situação legada, devolve `SEM_MAPEAMENTO` — o chamador
 * decide o que fazer. O que NUNCA acontece é devolver o script de outro momento:
 * a heurística anterior caía para "Enviar primeira abordagem" sempre que não achava,
 * mandando abordagem inicial para cliente em negociação.
 */
export function scriptOficialParaCliente(
  cliente: (ClienteCarteira & Record<string, unknown>) | null | undefined,
  tentativa = 1,
): ScriptOficial | null {
  const situacao = cliente?.situacao_atual || cliente?.momento || null
  // Terminal técnico não tem script comercial nenhum, por definição.
  if (ehTerminalTecnico(situacao)) {
    return {
      scriptId: '',
      texto: null,
      scriptReady: false,
      missingVariables: [],
      allowWhatsApp: false,
      isInternal: false,
      motivo: 'TERMINAL_TECNICO',
    }
  }
  const statusId = statusOficialDaSituacao(situacao, fatosDoCliente(cliente))
  if (!statusId) {
    return {
      scriptId: '',
      texto: null,
      scriptReady: false,
      missingVariables: [],
      allowWhatsApp: false,
      isInternal: false,
      motivo: 'SEM_MAPEAMENTO',
    }
  }

  const status = statusPorId(statusId)
  const resolucao = resolveScriptRef(status?.scriptId, {
    catalog: SCRIPT_IDS,
    attempt: tentativa,
    statusId,
  })

  if (!resolucao.resolved || !resolucao.scriptId) {
    return {
      scriptId: '',
      texto: null,
      scriptReady: false,
      missingVariables: [],
      allowWhatsApp: false,
      isInternal: false,
      motivo: resolucao.reason as ScriptOficial['motivo'],
    }
  }

  const script = scriptPorId(resolucao.scriptId)
  if (!script) {
    return {
      scriptId: resolucao.scriptId,
      texto: null,
      scriptReady: false,
      missingVariables: [],
      allowWhatsApp: false,
      isInternal: false,
      motivo: 'NOT_FOUND',
    }
  }

  const render = renderScript(script.body, variaveisDoCliente(cliente), {
    scriptId: resolucao.scriptId,
  })

  return {
    scriptId: resolucao.scriptId,
    texto: render.text,
    scriptReady: render.scriptReady,
    missingVariables: render.missingVariables,
    allowWhatsApp: render.allowWhatsApp,
    isInternal: render.isInternal,
    motivo: 'RESOLVED',
  }
}
