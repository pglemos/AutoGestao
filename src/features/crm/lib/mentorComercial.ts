// Motor de recomendação do "Mentor Comercial" — espelha a lógica do
// Base44 (carteiraUtils.jsx: calcularScore/calcularPrioridade/explicacaoCliente)
// adaptada aos campos reais do MX (cliente.status/relacionamento/proxima_acao_em
// + oportunidade.etapa), já que o MX não tem os campos situacao_atual/
// temperatura/momento que o Base44 usa (schema diferente, sem invenção de
// coluna nova).
import type { Cliente, CrmEtapaFunil } from '@/lib/schemas/crm.schema'
import type { OportunidadeComCliente } from '@/features/crm/hooks/useOportunidades'
import type { ProgressoCadencia } from '@/features/crm/lib/cadencia'
import { isEtapaTerminal, toDateOnlyBR } from '@/lib/schemas/crm.schema'

export type Temperatura = 'quente' | 'morno' | 'frio'
export type Prioridade = 'maxima' | 'alta' | 'media' | 'baixa'
export type PrioridadeDia = 'hoje' | 'amanha' | 'dia2' | 'dia3' | 'futuro'

export const TEMPERATURA_LABEL: Record<Temperatura, string> = { quente: 'Quente', morno: 'Morno', frio: 'Frio' }
export const PRIORIDADE_LABEL: Record<Prioridade, string> = { maxima: 'Máxima', alta: 'Alta', media: 'Média', baixa: 'Baixa' }

function diasEntre(dataIso: string | null | undefined, refDateOnly: string): number | null {
  if (!dataIso) return null
  const dataOnly = dataIso.length === 10 ? dataIso : toDateOnlyBR(new Date(dataIso))
  const ms = new Date(`${refDateOnly}T00:00:00`).getTime() - new Date(`${dataOnly}T00:00:00`).getTime()
  return Math.round(ms / 86400000)
}

/** Temperatura derivada da etapa do funil (Base44 guarda isso num campo próprio; MX deriva da etapa real). */
export function derivarTemperatura(oportunidade: OportunidadeComCliente | undefined): Temperatura {
  const etapa: CrmEtapaFunil | undefined = oportunidade?.etapa
  // Negócio encerrado (ganho, perdido ou cancelado) não tem mais "calor".
  if (isEtapaTerminal(etapa)) return 'frio'
  if (etapa === 'negociacao' || etapa === 'fechamento') return 'quente'
  if (etapa === 'apresentacao' || etapa === 'qualificacao') return 'morno'
  return 'frio'
}

/** Score 0-100 do cliente — mesmas categorias de dedução do Base44 calcularScore, com campos reais do MX. */
export function calcularScoreCliente(cliente: Cliente, hoje: string): { score: number; motivos: string[] } {
  let score = 100
  const motivos: string[] = []

  if (!cliente.proxima_acao) { score -= 20; motivos.push('Sem próxima ação definida.') }

  const diasVencido = diasEntre(cliente.proxima_acao_em, hoje)
  if (diasVencido !== null && diasVencido > 0) { score -= 25; motivos.push('Próxima ação vencida.') }

  const diasSemContato = diasEntre(cliente.ultima_interacao, hoje)
  if (cliente.relacionamento === 'critico') { score -= 20; motivos.push('Relacionamento crítico com o cliente.') }
  if (diasSemContato !== null && diasSemContato >= 5) { score -= 20; motivos.push(`Sem contato há ${diasSemContato} dias.`) }
  else if (diasSemContato === null) { score -= 10; motivos.push('Histórico sem registro de contato.') }

  return { score: Math.max(0, Math.min(100, score)), motivos }
}

export function classificacaoScore(score: number): { label: string; className: string } {
  if (score >= 90) return { label: 'Excelente', className: 'text-status-success' }
  if (score >= 75) return { label: 'Boa', className: 'text-status-info' }
  if (score >= 50) return { label: 'Atenção', className: 'text-status-warning' }
  return { label: 'Crítica', className: 'text-status-error' }
}

/** Prioridade comercial — combina temperatura (potencial) + score (urgência), mesma estrutura do Base44 calcularPrioridade. */
export function calcularPrioridadeCliente(cliente: Cliente, oportunidade: OportunidadeComCliente | undefined, hoje: string): Prioridade {
  const temperatura = derivarTemperatura(oportunidade)
  const { score } = calcularScoreCliente(cliente, hoje)
  if (temperatura === 'quente') return score < 50 ? 'maxima' : 'alta'
  if (temperatura === 'morno') return score < 75 ? 'alta' : 'media'
  return score >= 75 ? 'baixa' : 'media'
}

/** Bucket de dia para as abas "Prioridade Hoje/Amanhã/.../Ver Todos" — sem data ou vencido conta como Hoje. */
export function calcularPrioridadeDia(cliente: Cliente, hoje: string): PrioridadeDia {
  if (!cliente.proxima_acao_em) return 'hoje'
  const dataOnly = cliente.proxima_acao_em.length === 10 ? cliente.proxima_acao_em : toDateOnlyBR(new Date(cliente.proxima_acao_em))
  const diff = Math.round((new Date(`${dataOnly}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86400000)
  if (diff <= 0) return 'hoje'
  if (diff === 1) return 'amanha'
  if (diff === 2) return 'dia2'
  if (diff === 3) return 'dia3'
  return 'futuro'
}

const ETAPA_CADENCIA_LABEL: Record<string, string> = {
  Lead: 'Lead sem resposta',
  Contato: 'Em contato inicial',
  Agendamento: 'Agendamento em andamento',
  Visita: 'Visita agendada',
  Negociação: 'Em negociação ativa',
  Venda: 'Fechamento em andamento',
  Atendimento: 'Atendimento em andamento',
}

/**
 * "Situação" legível — prioriza a etapa da cadência (progresso.etapaAtual.label, que já
 * combina oportunidades + agendamentos reais) e cai para o status do cliente só quando
 * não há progresso calculado. Negócio encerrado (ganho/perdido) sempre tem prioridade,
 * pois é o desfecho real e não deve ser sobrescrito pela etapa de cadência.
 */
export function derivarSituacao(cliente: Cliente, oportunidade: OportunidadeComCliente | undefined, etapaCadenciaLabel?: string): string {
  if (oportunidade?.etapa === 'ganho') return 'Venda realizada'
  if (oportunidade?.etapa === 'perdido') return 'Venda perdida'
  if (oportunidade?.etapa === 'cancelada') return 'Venda cancelada'
  if (etapaCadenciaLabel && ETAPA_CADENCIA_LABEL[etapaCadenciaLabel]) return ETAPA_CADENCIA_LABEL[etapaCadenciaLabel]
  if (cliente.status === 'pos_venda') return 'Pós-venda ativo'
  if (cliente.status === 'aguardando_contato') return 'Aguardando resposta do cliente'
  if (cliente.status === 'inativo') return 'Lead sem resposta'
  return 'Primeiro contato pendente'
}

/** Explicação "por que está aqui" — equivalente ao explicacaoCliente do Base44. */
export function explicacaoCliente(cliente: Cliente, oportunidade: OportunidadeComCliente | undefined, hoje: string, etapaCadenciaLabel?: string): string {
  const situacao = derivarSituacao(cliente, oportunidade, etapaCadenciaLabel)
  const dias = diasEntre(cliente.ultima_interacao, hoje)
  const diasStr = dias !== null && dias > 0 ? ` há ${dias} dia${dias > 1 ? 's' : ''}` : ''
  const temperatura = derivarTemperatura(oportunidade)

  if (situacao === 'Venda realizada') return 'Este cliente já comprou. Mantenha o relacionamento e peça indicação.'
  if (situacao === 'Venda perdida') return 'Esta oportunidade foi perdida. Avalie reativar o contato futuramente.'
  if (situacao === 'Venda cancelada') return 'A venda foi cancelada. Registre a estratégia de recuperação antes de retomar o contato.'
  if (situacao === 'Aguardando resposta do cliente') return 'Este cliente aguarda retorno e precisa da sua ação agora.'
  if (situacao === 'Em negociação ativa') return 'Este cliente está em negociação ativa e aguarda follow-up.'
  if (situacao === 'Fechamento em andamento') return 'Este cliente está perto de fechar — não deixe esfriar.'
  if (temperatura === 'quente' && diasStr) return `Este cliente está quente e sem contato${diasStr}. Risco de perda.`
  if (situacao === 'Lead sem resposta') return `Lead sem resposta${diasStr}. Vale uma nova tentativa de contato.`
  return 'Este cliente precisa de atenção e desenvolvimento comercial.'
}

/** Objetivo + recomendação do mentor — para negócio encerrado (ganho/perdido) não usa o
 * próximo passo genérico de pré-venda (que pode estar desatualizado), e sim uma ação
 * de pós-venda/recuperação coerente com o desfecho real da oportunidade. */
export function derivarObjetivoEMentor(
  cliente: Cliente,
  oportunidade: OportunidadeComCliente | undefined,
  objetivoEtapaAtual: string,
): { objetivo: string; mentorRecomenda: string } {
  if (oportunidade?.etapa === 'ganho') {
    return { objetivo: 'Pedir indicação', mentorRecomenda: 'Agradecer a compra e pedir indicação de novos clientes' }
  }
  if (oportunidade?.etapa === 'perdido') {
    return {
      objetivo: 'Recuperar oportunidade',
      mentorRecomenda: oportunidade.motivo_perda ? `Reativar contato — motivo da perda: ${oportunidade.motivo_perda}` : 'Reativar contato futuramente',
    }
  }
  return { objetivo: objetivoEtapaAtual, mentorRecomenda: cliente.proxima_acao || objetivoEtapaAtual }
}
