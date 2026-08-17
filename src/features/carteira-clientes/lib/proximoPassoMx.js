import moment from 'moment'
import {
  PASSOS as BASE_PASSOS,
  aplicarTransicao as aplicarTransicaoBase,
  detectarCodigo as detectarCodigoBase,
  getInstrucaoScript as getInstrucaoScriptBase,
  getResultados as getResultadosBase,
} from '@/components/carteira/proximoPassoLib'

const PP18 = {
  codigo: 'PP18',
  label: 'Converter financiamento aprovado',
  objetivo: 'Transformar a aprovação do financiamento em decisão de compra.',
}

const PASSO_ALIASES = {
  'enviar segunda abordagem': 'PP15',
  'fazer pergunta consultiva': 'PP02',
  'definir veiculo de interesse': 'PP04',
  'convidar para visita': 'PP07',
  'confirmar visita': 'PP08',
  'confirmar visita hoje': 'PP08',
  'confirmar visita amanha': 'PP08',
  'reagendar visita': 'PP07',
  'enviar resumo do atendimento': 'PP10',
  'retomar proposta': 'PP12',
  'converter financiamento aprovado': 'PP18',
  'conduzir para fechamento': 'PP18',
  'conduzir para o fechamento': 'PP18',
  'conduzir fechamento': 'PP18',
  'fechar negociacao': 'PP14',
  'fechar venda': 'PP14',
  'confirmar venda': 'PP14',
  'reativar cliente antigo': 'PP16',
  'pedir indicacao': 'PP14',
  'acompanhar garantia': 'PP14',
  'enviar proposta': 'PP10',
  'acompanhar financiamento': 'PP05',
  'registrar motivo de perda': 'PP17',
  'programar troca futura': 'PP16',
}

const RESULTADOS_PP18 = [
  { label: 'Venda realizada', emoji: '🏆', cor: 'yellow' },
  { label: 'Proposta enviada', emoji: '📋', cor: 'orange' },
  { label: 'Pediu ajuste nas condições', emoji: '💬', cor: 'orange' },
  { label: 'Vai pensar', emoji: '🔄', cor: 'teal' },
  { label: 'Não respondeu', emoji: '🔕', cor: 'slate' },
  { label: 'Desistiu', emoji: '❌', cor: 'red' },
]

const TRANSICAO_PP18 = {
  'Venda realizada': { proximo: null, dias: 0, sit: 'Venda realizada', temp: 'Quente', status: 'Vendido' },
  'Proposta enviada': { proximo: 'PP10', dias: 0, sit: 'Proposta enviada', temp: 'Quente' },
  'Pediu ajuste nas condições': { proximo: 'PP11', dias: 0, sit: 'Em negociação ativa', temp: 'Quente' },
  'Vai pensar': { proximo: 'PP12', dias: 2, sit: 'Vai pensar', temp: 'Morno' },
  'Não respondeu': { proximo: 'PP15', dias: 1, sit: 'Em cadência sem resposta', temp: 'Morno' },
  'Desistiu': { proximo: 'PP17', dias: 0, sit: 'Venda perdida', temp: 'Frio', status: 'Perdido' },
}

function normalizarRotulo(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export const PASSOS = { ...BASE_PASSOS, PP18 }
// Mantém o DOM Base44 inicial imutável; PP18 é aceito quando já vem dos dados reais.
export const TODOS_PASSOS = Object.values(BASE_PASSOS)

export function detectarCodigo(proximoPasso) {
  if (!proximoPasso) return null
  return PASSO_ALIASES[normalizarRotulo(proximoPasso)] || detectarCodigoBase(proximoPasso)
}

export function getResultados(proximoPasso) {
  return detectarCodigo(proximoPasso) === 'PP18' ? RESULTADOS_PP18 : getResultadosBase(proximoPasso)
}

export function aplicarTransicao(proximoPassoAtual, resultado) {
  const isVenda = resultado === 'Venda realizada' || resultado === 'Comprou' || resultado === 'Venda concluída'
  if (isVenda) {
    const agora = new Date().toISOString()
    return {
      patch: {
        ultima_acao_em: agora,
        ultimo_contato: agora,
        ultimo_resultado_contato: resultado,
        situacao_atual: 'Venda realizada',
        temperatura: 'Quente',
        proximo_passo: null,
        objetivo_atual: null,
        proxima_acao_data: null,
        status_oportunidade: 'Vendida',
        status_comercial: 'Vendido',
        vendido: true,
        situacao_oportunidade: 'Decisão',
        ativo: false,
      },
      novoPassoLabel: null,
      criarAgendamento: false,
    }
  }

  if (detectarCodigo(proximoPassoAtual) !== 'PP18') {
    const transition = aplicarTransicaoBase(proximoPassoAtual, resultado)
    if (transition.patch?.ativo !== false) return transition
    return {
      ...transition,
      patch: {
        ...transition.patch,
        proximo_passo: null,
        proxima_acao_data: null,
      },
    }
  }

  const regra = TRANSICAO_PP18[resultado]
  if (!regra) return aplicarTransicaoBase(proximoPassoAtual, resultado)
  const agora = new Date().toISOString()
  const novoPasso = regra.proximo ? PASSOS[regra.proximo] : null
  const patch = {
    ultima_acao_em: agora,
    ultimo_contato: agora,
    ultimo_resultado_contato: resultado,
    situacao_atual: regra.sit,
    temperatura: regra.temp,
    proximo_passo: novoPasso?.label || null,
    objetivo_atual: novoPasso?.objetivo || null,
    proxima_acao_data: regra.proximo === null
      ? null
      : moment().add(regra.dias, 'days').format('YYYY-MM-DD') + 'T09:00:00',
    status_oportunidade: regra.status === 'Vendido' ? 'Vendida' : regra.status === 'Perdido' ? 'Encerrada' : 'Ativa',
  }
  if (regra.status) {
    patch.status_comercial = regra.status
    patch.ativo = false
  }
  if (regra.status === 'Vendido') {
    patch.vendido = true
    patch.situacao_oportunidade = 'Decisão'
  }
  return { patch, novoPassoLabel: novoPasso?.label || null, criarAgendamento: false }
}

export function getInstrucaoScript(proximoPasso) {
  if (detectarCodigo(proximoPasso) === 'PP18') {
    return 'Tom objetivo e acolhedor. O financiamento foi aprovado; confirme a condição que falta para o cliente decidir e conduza para o fechamento sem pressionar.'
  }
  return getInstrucaoScriptBase(proximoPasso)
}
