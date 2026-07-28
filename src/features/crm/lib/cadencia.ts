import { isEtapaTerminal, toDateOnlyBR, type Cliente } from '@/lib/schemas/crm.schema'
import type { OportunidadeComCliente } from '@/features/crm/hooks/useOportunidades'
import type { AgendamentoComCliente } from '@/features/crm/hooks/useAgendamentos'

/**
 * Cadência comercial por canal (spec Módulo Vendedor §7).
 *
 * O CONTEÚDO de cada etapa (objetivo, o que fazer, script) é orientação de
 * processo configurada aqui. O PROGRESSO do cliente na cadência é derivado
 * exclusivamente de dados reais: oportunidades (etapa do funil) e
 * agendamentos (status de comparecimento).
 */

export type ScriptContext = { cliente: string; vendedor: string }

export type EtapaCadencia = {
  id: string
  label: string
  objetivo: string
  oQueFazer: string[]
  script: (ctx: ScriptContext) => string
}

const ETAPAS: Record<string, EtapaCadencia> = {
  lead: {
    id: 'lead',
    label: 'Lead',
    objetivo: 'Responder rápido e iniciar a conversa com o cliente.',
    oQueFazer: [
      'Responder o lead o quanto antes (idealmente em minutos).',
      'Se apresentar e agradecer o interesse.',
      'Entender qual veículo o cliente procura.',
    ],
    script: ({ cliente, vendedor }) =>
      `Olá ${cliente}, tudo bem? Aqui é o ${vendedor}. Vi seu interesse e quero te ajudar a encontrar a melhor opção. Qual veículo você está procurando?`,
  },
  contato: {
    id: 'contato',
    label: 'Contato',
    objetivo: 'Gerar conexão, qualificar a necessidade e preparar o agendamento.',
    oQueFazer: [
      'Confirmar o veículo de interesse e a forma de pagamento.',
      'Perguntar se há veículo na troca.',
      'Despertar o interesse pela visita.',
    ],
    script: ({ cliente, vendedor }) =>
      `${cliente}, aqui é o ${vendedor}. Para eu te atender bem: você pretende financiar ou pagar à vista? Tem algum veículo para colocar na troca?`,
  },
  agendamento: {
    id: 'agendamento',
    label: 'Agendamento',
    objetivo: 'Garantir o agendamento da visita e gerar compromisso.',
    oQueFazer: [
      'Confirmar interesse e disponibilidade.',
      'Definir data, horário e local da visita.',
      'Entender se há veículo na troca.',
    ],
    script: ({ cliente, vendedor }) =>
      `${cliente}, tudo bem? Aqui é o ${vendedor}. Estou confirmando nossa visita para conhecermos as opções que combinam com o que você procura. Podemos manter para [data] às [horário]?`,
  },
  visita: {
    id: 'visita',
    label: 'Visita',
    objetivo: 'Realizar um atendimento presencial impecável e avançar para a proposta.',
    oQueFazer: [
      'Confirmar a visita no dia, pela manhã.',
      'Preparar o veículo e as opções antes do cliente chegar.',
      'Conduzir test drive e apresentar o valor do veículo.',
    ],
    script: ({ cliente, vendedor }) =>
      `${cliente}, bom dia! Aqui é o ${vendedor}. Está confirmada nossa visita de hoje? Já deixei tudo preparado para você conhecer o veículo.`,
  },
  negociacao: {
    id: 'negociacao',
    label: 'Negociação',
    objetivo: 'Apresentar proposta, tratar objeções e conduzir ao fechamento.',
    oQueFazer: [
      'Apresentar proposta clara (valor, troca, financiamento).',
      'Tratar objeções com alternativas, não com desconto.',
      'Combinar próximo passo com data definida.',
    ],
    script: ({ cliente, vendedor }) =>
      `${cliente}, aqui é o ${vendedor}. Consegui condições especiais na proposta que montamos. Posso te apresentar hoje para fecharmos os detalhes?`,
  },
  venda: {
    id: 'venda',
    label: 'Venda',
    objetivo: 'Concluir a venda e encaminhar um pós-venda que gera indicação.',
    oQueFazer: [
      'Confirmar documentação e prazos de entrega.',
      'Combinar a entrega como um momento especial.',
      'Pedir indicação e manter contato no pós-venda.',
    ],
    script: ({ cliente, vendedor }) =>
      `${cliente}, parabéns pela conquista! Aqui é o ${vendedor}. Sua entrega está confirmada. Qualquer coisa que precisar, estou à disposição — e se conhecer alguém procurando carro, pode contar comigo.`,
  },
  atendimento: {
    id: 'atendimento',
    label: 'Atendimento',
    objetivo: 'Atender com qualidade e capturar o contato do cliente.',
    oQueFazer: [
      'Fazer um atendimento consultivo, sem pressa.',
      'Registrar nome e telefone do cliente.',
      'Combinar o próximo contato antes de o cliente sair.',
    ],
    script: ({ cliente, vendedor }) =>
      `${cliente}, foi um prazer te atender! Aqui é o ${vendedor}. Vou te mandar as opções que conversamos. Posso te ligar amanhã para continuarmos?`,
  },
}

export type FluxoCanal = 'internet' | 'carteira' | 'porta'
export type CadenciaResultadoAcao = 'feito' | 'nao_feito' | 'aguardando'

export type CadenciaPassoConfiguravel = {
  key: string
  etapaId: string
  titulo: string
  proximaAcao: string
  prazoDias: number
  limiteTentativas: number
  aoFazer: string | null
  aoNaoFazer: string | null
  aoAguardar: string | null
}

export type CadenciaFluxoConfiguravel = {
  canal: FluxoCanal
  versao: number
  nome: string
  passos: CadenciaPassoConfiguravel[]
}

export const FLUXOS: Record<FluxoCanal, EtapaCadencia[]> = {
  internet: [ETAPAS.lead, ETAPAS.contato, ETAPAS.agendamento, ETAPAS.visita, ETAPAS.negociacao, ETAPAS.venda],
  carteira: [ETAPAS.agendamento, ETAPAS.visita, ETAPAS.negociacao, ETAPAS.venda],
  porta: [ETAPAS.atendimento, ETAPAS.negociacao, ETAPAS.venda],
}

/** @deprecated Usar useCadenciaFluxos() para carregar do banco. Mantido como fallback. */
export const CADENCIA_FLUXOS_PADRAO: Record<FluxoCanal, CadenciaFluxoConfiguravel> = {
  internet: {
    canal: 'internet',
    versao: 1,
    nome: 'Cadência padrão Internet',
    passos: [
      {
        key: 'internet_mensagem_1',
        etapaId: 'lead',
        titulo: 'Mensagem 1',
        proximaAcao: 'Enviar mensagem 1 de primeiro contato',
        prazoDias: 0,
        limiteTentativas: 1,
        aoFazer: 'internet_qualificacao',
        aoNaoFazer: 'internet_mensagem_2',
        aoAguardar: 'internet_mensagem_2',
      },
      {
        key: 'internet_mensagem_2',
        etapaId: 'lead',
        titulo: 'Mensagem 2',
        proximaAcao: 'Enviar mensagem 2 com opção de veículo e convite para conversa',
        prazoDias: 1,
        limiteTentativas: 1,
        aoFazer: 'internet_qualificacao',
        aoNaoFazer: 'internet_mensagem_3',
        aoAguardar: 'internet_mensagem_3',
      },
      {
        key: 'internet_qualificacao',
        etapaId: 'contato',
        titulo: 'Qualificação',
        proximaAcao: 'Confirmar veículo, forma de pagamento e carro na troca',
        prazoDias: 0,
        limiteTentativas: 3,
        aoFazer: 'internet_agendar_visita',
        aoNaoFazer: 'internet_mensagem_2',
        aoAguardar: 'internet_mensagem_2',
      },
      {
        key: 'internet_mensagem_3',
        etapaId: 'contato',
        titulo: 'Mensagem 3',
        proximaAcao: 'Enviar mensagem 3 com pergunta objetiva para destravar resposta',
        prazoDias: 1,
        limiteTentativas: 1,
        aoFazer: 'internet_agendar_visita',
        aoNaoFazer: 'internet_retorno_7d',
        aoAguardar: 'internet_retorno_7d',
      },
      {
        key: 'internet_retorno_7d',
        etapaId: 'contato',
        titulo: 'Retorno em 7 dias',
        proximaAcao: 'Retomar contato em 7 dias',
        prazoDias: 7,
        limiteTentativas: 1,
        aoFazer: 'internet_agendar_visita',
        aoNaoFazer: null,
        aoAguardar: null,
      },
      {
        key: 'internet_agendar_visita',
        etapaId: 'agendamento',
        titulo: 'Agendar visita',
        proximaAcao: 'Agendar visita ou chamada com compromisso definido',
        prazoDias: 0,
        limiteTentativas: 2,
        aoFazer: 'internet_confirmar_visita',
        aoNaoFazer: 'internet_retorno_7d',
        aoAguardar: 'internet_retorno_7d',
      },
      {
        key: 'internet_confirmar_visita',
        etapaId: 'visita',
        titulo: 'Confirmar visita',
        proximaAcao: 'Confirmar presença antes da visita',
        prazoDias: 0,
        limiteTentativas: 2,
        aoFazer: 'internet_negociar',
        aoNaoFazer: 'internet_retorno_7d',
        aoAguardar: 'internet_retorno_7d',
      },
      {
        key: 'internet_negociar',
        etapaId: 'negociacao',
        titulo: 'Negociação',
        proximaAcao: 'Apresentar proposta e combinar próximo compromisso',
        prazoDias: 0,
        limiteTentativas: 2,
        aoFazer: null,
        aoNaoFazer: 'internet_retorno_7d',
        aoAguardar: 'internet_retorno_7d',
      },
    ],
  },
  carteira: {
    canal: 'carteira',
    versao: 1,
    nome: 'Cadência padrão Carteira',
    passos: [
      {
        key: 'carteira_retorno_1',
        etapaId: 'agendamento',
        titulo: 'Retorno ativo',
        proximaAcao: 'Ligar para cliente da carteira e propor próximo compromisso',
        prazoDias: 0,
        limiteTentativas: 1,
        aoFazer: 'carteira_confirmar_visita',
        aoNaoFazer: 'carteira_retorno_2',
        aoAguardar: 'carteira_retorno_2',
      },
      {
        key: 'carteira_retorno_2',
        etapaId: 'agendamento',
        titulo: 'Segundo retorno',
        proximaAcao: 'Enviar mensagem de follow-up com oferta ou novidade relevante',
        prazoDias: 2,
        limiteTentativas: 1,
        aoFazer: 'carteira_confirmar_visita',
        aoNaoFazer: 'carteira_retorno_7d',
        aoAguardar: 'carteira_retorno_7d',
      },
      {
        key: 'carteira_retorno_7d',
        etapaId: 'agendamento',
        titulo: 'Retorno programado',
        proximaAcao: 'Retornar ao cliente da carteira em 7 dias',
        prazoDias: 7,
        limiteTentativas: 1,
        aoFazer: 'carteira_confirmar_visita',
        aoNaoFazer: null,
        aoAguardar: null,
      },
      {
        key: 'carteira_confirmar_visita',
        etapaId: 'visita',
        titulo: 'Confirmar visita',
        proximaAcao: 'Confirmar visita ou test drive com horário definido',
        prazoDias: 0,
        limiteTentativas: 2,
        aoFazer: 'carteira_negociar',
        aoNaoFazer: 'carteira_retorno_7d',
        aoAguardar: 'carteira_retorno_7d',
      },
      {
        key: 'carteira_negociar',
        etapaId: 'negociacao',
        titulo: 'Negociação',
        proximaAcao: 'Apresentar proposta e próximo passo da negociação',
        prazoDias: 0,
        limiteTentativas: 2,
        aoFazer: null,
        aoNaoFazer: 'carteira_retorno_7d',
        aoAguardar: 'carteira_retorno_7d',
      },
    ],
  },
  porta: {
    canal: 'porta',
    versao: 1,
    nome: 'Cadência padrão Porta/Showroom',
    passos: [
      {
        key: 'porta_pos_atendimento',
        etapaId: 'atendimento',
        titulo: 'Pós-atendimento',
        proximaAcao: 'Enviar mensagem de pós-atendimento e salvar interesse do cliente',
        prazoDias: 0,
        limiteTentativas: 1,
        aoFazer: 'porta_retorno_24h',
        aoNaoFazer: 'porta_retorno_24h',
        aoAguardar: 'porta_retorno_24h',
      },
      {
        key: 'porta_retorno_24h',
        etapaId: 'atendimento',
        titulo: 'Retorno 24h',
        proximaAcao: 'Retornar em até 24h com opções e convite para negociação',
        prazoDias: 1,
        limiteTentativas: 1,
        aoFazer: 'porta_negociar',
        aoNaoFazer: 'porta_retorno_7d',
        aoAguardar: 'porta_retorno_7d',
      },
      {
        key: 'porta_retorno_7d',
        etapaId: 'atendimento',
        titulo: 'Retorno em 7 dias',
        proximaAcao: 'Retomar contato em 7 dias com nova oferta ou condição',
        prazoDias: 7,
        limiteTentativas: 1,
        aoFazer: 'porta_negociar',
        aoNaoFazer: null,
        aoAguardar: null,
      },
      {
        key: 'porta_negociar',
        etapaId: 'negociacao',
        titulo: 'Negociação',
        proximaAcao: 'Apresentar proposta e combinar decisão com data definida',
        prazoDias: 0,
        limiteTentativas: 2,
        aoFazer: null,
        aoNaoFazer: 'porta_retorno_7d',
        aoAguardar: 'porta_retorno_7d',
      },
    ],
  },
}

/** Canal CRM → fluxo de cadência (showroom segue o fluxo de porta/atendimento). */
export function fluxoDoCanal(canal: string | null | undefined): FluxoCanal {
  if (canal === 'internet') return 'internet'
  if (canal === 'carteira') return 'carteira'
  return 'porta'
}

export function adicionarDiasCadencia(base: Date, prazoDias: number): string {
  const date = new Date(base)
  date.setDate(date.getDate() + Math.max(0, prazoDias))
  return toDateOnlyBR(date)
}

export function sugerirHorarioAcaoCadencia(acao: string | null | undefined, canal: FluxoCanal | string | null | undefined): string {
  const explicitTime = acao?.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)?.[0]
  if (explicitTime) return explicitTime.padStart(5, '0')

  const normalized = (acao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalized.includes('mensagem') || normalized.includes('lead')) return '08:55'
  if (normalized.includes('ligar') || normalized.includes('retornar') || canal === 'carteira') return '11:00'
  if (normalized.includes('confirmar') || normalized.includes('agendar') || normalized.includes('visita')) return '13:00'
  if (normalized.includes('proposta') || normalized.includes('negoci')) return '16:00'
  return '09:00'
}

export function montarDataHoraAcaoCadencia(
  data: string,
  acao: string | null | undefined,
  canal: FluxoCanal | string | null | undefined,
): string {
  return `${data}T${sugerirHorarioAcaoCadencia(acao, canal)}:00`
}

export function resolverPrimeiraAcaoCadencia(
  canal: string | null | undefined,
  baseDateOrFluxos: Date | Record<FluxoCanal, CadenciaFluxoConfiguravel> = new Date(),
  legacyBaseDate?: Date,
) {
  // Suporte a ambas as assinaturas:
  //   resolverPrimeiraAcaoCadencia(canal)
  //   resolverPrimeiraAcaoCadencia(canal, baseDate)           — legado
  //   resolverPrimeiraAcaoCadencia(canal, fluxos, baseDate)   — novo
  let fluxosMap: Record<FluxoCanal, CadenciaFluxoConfiguravel>
  let baseDate: Date
  if (baseDateOrFluxos instanceof Date) {
    fluxosMap = CADENCIA_FLUXOS_PADRAO
    baseDate = baseDateOrFluxos
  } else {
    fluxosMap = baseDateOrFluxos
    baseDate = legacyBaseDate ?? new Date()
  }
  const fluxo = fluxosMap[fluxoDoCanal(canal)]
  const passo = fluxo.passos[0]
  return {
    fluxo,
    passo,
    proximaAcao: passo.proximaAcao,
    proximaAcaoEm: adicionarDiasCadencia(baseDate, passo.prazoDias),
  }
}

export type ProximoCicloCadencia = {
  passo: CadenciaPassoConfiguravel
  proximaAcao: string
  proximaAcaoEm: string
  status: 'ativo' | 'concluido' | 'cancelado'
  tentativasPasso: number
  tentativaRegistrada: number | null
  limiteTentativas: number
  reagendamentoAutomatico: boolean
  limiteEstourado: boolean
}

export function resolverProximoCicloCadencia(input: {
  fluxo: CadenciaFluxoConfiguravel
  passoAtualKey: string
  resultado: CadenciaResultadoAcao
  tentativasPasso?: number
  baseDate?: Date
}): ProximoCicloCadencia {
  const baseDate = input.baseDate ?? new Date()
  const passoAtual = input.fluxo.passos.find(passo => passo.key === input.passoAtualKey)

  if (!passoAtual) {
    throw new Error(`Passo atual ${input.passoAtualKey} nao encontrado no fluxo ${input.fluxo.nome}.`)
  }

  const statusSemSucesso = input.resultado === 'nao_feito' || input.resultado === 'aguardando'
  const limiteAtual = Math.max(1, passoAtual.limiteTentativas || 1)
  const tentativaRegistrada = statusSemSucesso ? Math.max(0, input.tentativasPasso ?? 0) + 1 : null

  if (statusSemSucesso && tentativaRegistrada !== null && tentativaRegistrada < limiteAtual) {
    return {
      passo: passoAtual,
      proximaAcao: passoAtual.proximaAcao,
      proximaAcaoEm: adicionarDiasCadencia(baseDate, 1),
      status: 'ativo',
      tentativasPasso: tentativaRegistrada,
      tentativaRegistrada,
      limiteTentativas: limiteAtual,
      reagendamentoAutomatico: true,
      limiteEstourado: false,
    }
  }

  const proximoKey = input.resultado === 'feito'
    ? passoAtual.aoFazer
    : input.resultado === 'nao_feito'
      ? passoAtual.aoNaoFazer
      : passoAtual.aoAguardar

  if (proximoKey) {
    const proximoPasso = input.fluxo.passos.find(passo => passo.key === proximoKey)
    if (!proximoPasso) {
      throw new Error(`Proximo passo ${proximoKey} nao encontrado no fluxo ${input.fluxo.nome}.`)
    }

    const prazoDias = Math.max(proximoPasso.prazoDias, statusSemSucesso ? 1 : 0)
    return {
      passo: proximoPasso,
      proximaAcao: proximoPasso.proximaAcao,
      proximaAcaoEm: adicionarDiasCadencia(baseDate, prazoDias),
      status: 'ativo',
      tentativasPasso: 0,
      tentativaRegistrada,
      limiteTentativas: Math.max(1, proximoPasso.limiteTentativas || 1),
      reagendamentoAutomatico: false,
      limiteEstourado: statusSemSucesso,
    }
  }

  return {
    passo: passoAtual,
    proximaAcao: statusSemSucesso ? 'Cadencia encerrada por limite de tentativas' : 'Cadencia concluida',
    proximaAcaoEm: adicionarDiasCadencia(baseDate, statusSemSucesso ? 1 : 0),
    status: statusSemSucesso ? 'cancelado' : 'concluido',
    tentativasPasso: 0,
    tentativaRegistrada,
    limiteTentativas: limiteAtual,
    reagendamentoAutomatico: false,
    limiteEstourado: statusSemSucesso,
  }
}

export type ProgressoCadencia = {
  fluxo: FluxoCanal
  etapas: EtapaCadencia[]
  concluidas: number
  etapaAtual: EtapaCadencia
  etapaAtualIndex: number
  cadencia: number
  encerramento: 'ganho' | 'perdido' | 'cancelada' | null
}

const ETAPA_FUNIL_ORDEM: Record<string, number> = {
  prospeccao: 0,
  qualificacao: 1,
  apresentacao: 2,
  negociacao: 3,
  fechamento: 4,
  ganho: 5,
  perdido: -1,
  // Encerradas sem venda não representam avanço de funil. Sem esta entrada,
  // o `?? 0` colocava a oportunidade cancelada no nível de prospecção e o
  // cliente parecia estar avançando na cadência.
  cancelada: -1,
}

/** Deriva o progresso real do cliente na cadência do seu canal de origem. */
export function derivarProgresso(
  cliente: Pick<Cliente, 'id' | 'canal_origem' | 'ultima_interacao'>,
  oportunidades: OportunidadeComCliente[],
  agendamentos: AgendamentoComCliente[],
): ProgressoCadencia {
  const fluxo = fluxoDoCanal(cliente.canal_origem)
  const etapas = FLUXOS[fluxo]

  const opps = oportunidades.filter(o => o.cliente_id === cliente.id)
  const agds = agendamentos.filter(a => a.cliente_id === cliente.id)

  const maxFunil = opps.reduce((acc, o) => Math.max(acc, ETAPA_FUNIL_ORDEM[o.etapa] ?? 0), opps.length > 0 ? 0 : -Infinity)
  const temGanho = opps.some(o => o.etapa === 'ganho')
  const soPerdido = opps.length > 0 && opps.every(o => o.etapa === 'perdido')
  const soCancelada = opps.length > 0 && opps.every(o => isEtapaTerminal(o.etapa)) && opps.some(o => o.etapa === 'cancelada')

  const atingiu: Record<string, boolean> = {
    lead: true,
    atendimento: true,
    contato: Boolean(cliente.ultima_interacao) || maxFunil >= 1 || agds.length > 0,
    agendamento: agds.length > 0,
    visita: agds.some(a => a.status === 'compareceu') || maxFunil >= 3,
    negociacao: maxFunil >= 3,
    venda: temGanho,
  }

  // Cadência é sequencial: conta etapas concluídas até a primeira pendente.
  let concluidas = 0
  for (const etapa of etapas) {
    if (atingiu[etapa.id]) concluidas += 1
    else break
  }

  const etapaAtualIndex = Math.min(concluidas, etapas.length - 1)
  return {
    fluxo,
    etapas,
    concluidas,
    etapaAtual: etapas[etapaAtualIndex],
    etapaAtualIndex,
    cadencia: Math.round((concluidas / etapas.length) * 100),
    encerramento: temGanho ? 'ganho' : soCancelada ? 'cancelada' : soPerdido ? 'perdido' : null,
  }
}

/**
 * Persistência Comercial (spec): % de clientes que percorreram toda a
 * cadência, medida sobre os clientes com negociação encerrada (ganho ou
 * perdido). Sem encerrados, não há base de cálculo (retorna null).
 */
export function calcularPersistencia(progressos: ProgressoCadencia[]): number | null {
  const encerrados = progressos.filter(p => p.encerramento !== null)
  if (encerrados.length === 0) return null
  const completos = encerrados.filter(p => p.encerramento === 'ganho').length
  return Math.round((completos / encerrados.length) * 100)
}
