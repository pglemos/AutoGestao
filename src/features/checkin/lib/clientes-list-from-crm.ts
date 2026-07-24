// Deriva a tabela "Cadastrar Venda/Agendamentos" do Fechamento a partir das
// fontes reais do CRM (oportunidades + agendamentos), em vez de localStorage
// (EV-1.7). Uma oportunidade pertence ao fechamento do dia quando foi criada
// naquele dia de competência — mesmo critério já usado em
// crm-derived-totals.ts (deriveCrmDerivedTotals) para leads/vendas/visitas,
// já que oportunidades/agendamentos não têm uma coluna própria de
// "fechamento_id"/data de competência.
import { toDateOnlyBR } from '@/lib/schemas/crm.schema'
import { calcularTipoRegistro } from '../hooks/useCheckinPage'
import type { ClienteRow } from '../hooks/useCheckinPage'
import { addDaysDateOnly } from './crm-derived-totals'

export interface OportunidadeForClienteRow {
  id: string
  cliente_id: string
  seller_user_id: string
  veiculo_interesse: string | null
  tipo_veiculo?: string | null
  valor_negociado: number
  etapa: string
  canal: string | null
  sinal: number
  financiamento: string
  carro_avaliado: boolean
  motivo_perda: string | null
  created_at: string
  data_competencia?: string | null
  cliente?: { nome: string; telefone: string | null } | null
}

export interface AgendamentoForClienteRow {
  id: string
  oportunidade_id: string | null
  data_hora: string
  canal: string | null
  status: string
  observacoes: string | null
}

export interface DeriveClientesListOptions {
  /**
   * Fechamentos pendentes não têm uma data de competência persistida. Nessa
   * situação, a Agenda D+1 é a fonte da data que está sendo regularizada.
   */
  fechamentoPendente?: boolean
}

export interface RegularizacaoCrmMetrics {
  vendas: {
    porta: number
    carteira: number
    internet: number
    total: number
  }
  agendamentosD1: {
    carteira: number
    internet: number
    total: number
  }
  creditosValidos: number
}

export const CANAL_LABEL: Record<string, ClienteRow['canal']> = {
  carteira: 'Carteira',
  internet: 'Internet',
  showroom: 'Showroom',
  porta: 'Showroom',
}

export const FINANCIAMENTO_LABEL: Record<string, ClienteRow['financiamento']> = {
  aprovado: 'Aprovado',
  reprovado: 'Recusado',
  nao_aplica: 'Não se aplica',
}

export function timestampMatchesDateOnly(value: string | null | undefined, dateOnly: string) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return toDateOnlyBR(date) === dateOnly
}

export function vendaRealizadaFromEtapa(etapa: string): ClienteRow['vendaRealizada'] {
  if (etapa === 'ganho') return 'Sim'
  if (etapa === 'perdido') return 'Não'
  return 'Em Negociação'
}

export function compareceuFromStatus(status: string | undefined): ClienteRow['compareceu'] {
  if (status === 'compareceu') return 'Sim'
  if (status === 'nao_compareceu') return 'Não'
  return null
}

export function deriveClientesListFromCrm(
  oportunidades: readonly OportunidadeForClienteRow[],
  agendamentos: readonly AgendamentoForClienteRow[],
  selectedDate: string,
  options: DeriveClientesListOptions = {},
): ClienteRow[] {
  const agendamentoPorOportunidade = new Map<string, AgendamentoForClienteRow>()
  for (const ag of agendamentos) {
    if (!ag.oportunidade_id) continue
    const existing = agendamentoPorOportunidade.get(ag.oportunidade_id)
    if (!existing || new Date(ag.data_hora) > new Date(existing.data_hora)) {
      agendamentoPorOportunidade.set(ag.oportunidade_id, ag)
    }
  }

  const dataD1 = addDaysDateOnly(selectedDate, 1)
  return oportunidades
    .filter(op => {
      const pertenceAoFechamento = op.data_competencia === selectedDate
        || (!op.data_competencia && timestampMatchesDateOnly(op.created_at, selectedDate))
      const agendamentoD1DoFechamento = options.fechamentoPendente
        && agendamentoPorOportunidade.has(op.id)
        && timestampMatchesDateOnly(agendamentoPorOportunidade.get(op.id)?.data_hora, dataD1)
      return pertenceAoFechamento || agendamentoD1DoFechamento
    })
    .map(op => {
      const agendamento = agendamentoPorOportunidade.get(op.id)
      const vendaRealizada = vendaRealizadaFromEtapa(op.etapa)
      const dataAgendamento = agendamento?.data_hora ?? op.created_at
      const { tipo } = calcularTipoRegistro(vendaRealizada, CANAL_LABEL[op.canal ?? ''] ?? 'Showroom', dataAgendamento, selectedDate)

      const row: ClienteRow = {
        id: op.id,
        clienteDbId: op.cliente_id,
        fechamentoId: `fechamento-${selectedDate}`,
        vendedorId: op.seller_user_id,
        dataCompetenciaFechamento: selectedDate,
        nomeCliente: op.cliente?.nome ?? '',
        telefone: op.cliente?.telefone ?? '',
        veiculoInteresse: op.veiculo_interesse ?? '',
        tipoVeiculo: op.tipo_veiculo ?? null,
        valorNegociado: op.valor_negociado || null,
        dataAgendamento,
        canal: CANAL_LABEL[op.canal ?? ''] ?? 'Showroom',
        compareceu: compareceuFromStatus(agendamento?.status),
        carroAvaliado: op.carro_avaliado ? 'Sim' : 'Não',
        sinal: op.sinal,
        financiamento: FINANCIAMENTO_LABEL[op.financiamento] ?? 'Não se aplica',
        vendaRealizada,
        dataNovoAgendamento: agendamento?.data_hora,
        motivoPerda: op.motivo_perda ?? undefined,
        observacoes: agendamento?.observacoes ?? undefined,
        tipoRegistroCalculado: tipo,
      }
      return row
    })
}

export function deriveRegularizacaoCrmMetrics(
  oportunidades: readonly OportunidadeForClienteRow[],
  agendamentos: readonly AgendamentoForClienteRow[],
  selectedDate: string,
  options: DeriveClientesListOptions = {},
): RegularizacaoCrmMetrics {
  const clientes = deriveClientesListFromCrm(oportunidades, agendamentos, selectedDate, options)
  const vendas = clientes.filter(cliente => cliente.vendaRealizada === 'Sim')
  const vendasPorCanal = {
    porta: vendas.filter(cliente => cliente.canal === 'Showroom').length,
    carteira: vendas.filter(cliente => cliente.canal === 'Carteira').length,
    internet: vendas.filter(cliente => cliente.canal === 'Internet').length,
  }
  const agendamentosD1 = clientes.filter(cliente => cliente.tipoRegistroCalculado === 'Agendamento D+1')
  const agendamentosD1PorCanal = {
    carteira: agendamentosD1.filter(cliente => cliente.canal === 'Carteira').length,
    internet: agendamentosD1.filter(cliente => cliente.canal === 'Internet').length,
  }

  return {
    vendas: { ...vendasPorCanal, total: vendas.length },
    agendamentosD1: { ...agendamentosD1PorCanal, total: agendamentosD1.length },
    creditosValidos: agendamentosD1.length,
  }
}
