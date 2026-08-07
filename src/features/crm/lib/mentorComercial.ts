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

/**
 * MOTOR SUBSTITUÍDO. As funções de score, prioridade e recomendação que viviam aqui
 * eram uma SEGUNDA heurística, paralela à do carteiraUtils e sem nenhum consumidor.
 * Duas fontes de regra concorrentes é exatamente o risco que esta entrega existe para
 * eliminar, então elas foram removidas em vez de mantidas como código morto.
 *
 * Score e prioridade oficiais vivem em src/features/mentor-comercial/engine/ e são
 * consumidos pela Carteira através de bridge/carteiraMentorBridge.ts.
 *
 * O que permanece aqui é apenas o vocabulário de situação e temperatura que a tela
 * do Plano de Ataque renderiza hoje.
 */
export type Temperatura = 'quente' | 'morno' | 'frio'

export function derivarTemperatura(oportunidade: OportunidadeComCliente | undefined): Temperatura {
  const etapa: CrmEtapaFunil | undefined = oportunidade?.etapa
  // Negócio encerrado (ganho, perdido ou cancelado) não tem mais "calor".
  if (isEtapaTerminal(etapa)) return 'frio'
  if (etapa === 'negociacao' || etapa === 'fechamento') return 'quente'
  if (etapa === 'apresentacao' || etapa === 'qualificacao') return 'morno'
  return 'frio'
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
