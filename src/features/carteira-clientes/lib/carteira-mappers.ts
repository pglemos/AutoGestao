type OpportunityRow = {
  id: string
  etapa?: string | null
  updated_at?: string | null
  created_at?: string | null
  veiculo_interesse?: string | null
  valor_negociado?: number | string | null
  sinal?: number | string | null
  financiamento?: string | null
  carro_avaliado?: boolean | null
  veiculo_troca?: string | null
  valor_troca?: number | string | null
  motivo_perda?: string | null
  canal?: string | null
  closed_at?: string | null
}

type AppointmentRow = {
  id: string
  status?: string | null
  data_hora?: string | null
  tipo?: string | null
  proxima_acao?: string | null
  observacoes?: string | null
}

type ClientRow = {
  id: string
  loja_id?: string | null
  seller_user_id?: string | null
  nome?: string | null
  telefone?: string | null
  canal_origem?: string | null
  status?: string | null
  ultima_interacao?: string | null
  proxima_acao?: string | null
  proxima_acao_em?: string | null
  potencial_negocio?: number | string | null
  observacoes?: string | null
  created_at?: string | null
  updated_at?: string | null
  do_not_contact?: boolean | null
  do_not_contact_reason?: string | null
  reactivation_at?: string | null
  oportunidades?: OpportunityRow[] | null
  agendamentos?: AppointmentRow[] | null
}

const CLOSED_STAGES = new Set(['ganho', 'perdido'])
const OPEN_APPOINTMENT_STATUSES = new Set(['confirmado', 'aguardando'])

function timestamp(value?: string | null): number {
  const parsed = value ? new Date(value).getTime() : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function canalLabel(value?: string | null): string {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'internet') return 'Internet'
  if (normalized === 'showroom') return 'Showroom'
  if (normalized === 'porta') return 'Porta'
  return 'Carteira'
}

function financingLabel(value?: string | null): string {
  if (value === 'aprovado') return 'Aprovado'
  if (value === 'reprovado') return 'Reprovado'
  if (value === 'pendente') return 'Em análise'
  return 'Não se aplica'
}

export function selectActiveOpportunity(opportunities: OpportunityRow[] = []): OpportunityRow | null {
  const sorted = [...opportunities].sort((left, right) => {
    const leftActive = !CLOSED_STAGES.has(String(left.etapa || ''))
    const rightActive = !CLOSED_STAGES.has(String(right.etapa || ''))
    if (leftActive !== rightActive) return leftActive ? -1 : 1
    return timestamp(right.updated_at || right.created_at) - timestamp(left.updated_at || left.created_at)
  })

  return sorted[0] ?? null
}

export function selectRelevantAppointment(
  appointments: AppointmentRow[] = [],
  now = new Date(),
): AppointmentRow | null {
  const open = appointments.filter(item => OPEN_APPOINTMENT_STATUSES.has(String(item.status || '')))
  const future = open
    .filter(item => timestamp(item.data_hora) >= now.getTime())
    .sort((left, right) => timestamp(left.data_hora) - timestamp(right.data_hora))

  if (future.length > 0) return future[0]

  const openPast = open.sort((left, right) => timestamp(right.data_hora) - timestamp(left.data_hora))
  if (openPast.length > 0) return openPast[0]

  return [...appointments].sort((left, right) => timestamp(right.data_hora) - timestamp(left.data_hora))[0] ?? null
}

function deriveSituation(client: ClientRow, opportunity: OpportunityRow | null, appointment: AppointmentRow | null, now: Date): string {
  if (client.do_not_contact) return 'Cadência encerrada'
  if (client.reactivation_at && timestamp(client.reactivation_at) > now.getTime()) return 'Oportunidade futura'
  if (opportunity?.etapa === 'ganho') return 'Venda realizada'
  if (opportunity?.etapa === 'perdido') return 'Venda perdida'
  if (appointment?.status === 'nao_compareceu') return 'Não compareceu'

  if (appointment && OPEN_APPOINTMENT_STATUSES.has(String(appointment.status || ''))) {
    const appointmentDate = new Date(String(appointment.data_hora))
    if (
      appointmentDate.getFullYear() === now.getFullYear()
      && appointmentDate.getMonth() === now.getMonth()
      && appointmentDate.getDate() === now.getDate()
    ) return 'Visita hoje'
    return 'Visita agendada'
  }

  if (opportunity?.financiamento === 'pendente') return 'Financiamento em análise'
  if (opportunity?.financiamento === 'aprovado') return 'Financiamento aprovado sem compra'
  if (opportunity?.etapa === 'fechamento' || opportunity?.etapa === 'negociacao') return 'Em negociação ativa'
  if (opportunity?.etapa === 'apresentacao') return 'Proposta enviada'
  if (opportunity?.etapa === 'qualificacao') return opportunity.veiculo_interesse ? 'Veículo definido' : 'Necessidade em qualificação'
  if (appointment?.status === 'compareceu') return 'Visita realizada'
  if (opportunity?.veiculo_interesse) return 'Veículo definido'
  return 'Primeiro contato pendente'
}

function deriveTemperature(situation: string): 'Frio' | 'Morno' | 'Quente' {
  if ([
    'Visita agendada',
    'Visita hoje',
    'Proposta enviada',
    'Financiamento em análise',
    'Financiamento aprovado sem compra',
    'Em negociação ativa',
    'Venda realizada',
  ].includes(situation)) return 'Quente'

  if ([
    'Necessidade em qualificação',
    'Veículo definido',
    'Não compareceu',
    'Visita realizada',
  ].includes(situation)) return 'Morno'

  return 'Frio'
}

function deriveCommercialStatus(situation: string): string {
  if (situation === 'Venda realizada') return 'Vendido'
  if (situation === 'Venda perdida' || situation === 'Cadência encerrada') return 'Perdido'
  if (situation === 'Oportunidade futura') return 'Futuro'
  if (situation === 'Visita realizada') return 'Em negociação'
  if (situation.startsWith('Visita')) return 'Agendado'
  return 'Em negociação'
}

export function mapMxClientToCarteiraVisual(client: ClientRow, now = new Date()) {
  const opportunity = selectActiveOpportunity(client.oportunidades || [])
  const appointment = selectRelevantAppointment(client.agendamentos || [], now)
  const situation = deriveSituation(client, opportunity, appointment, now)
  const phone = client.telefone || ''
  const nextActionDate = appointment?.data_hora || client.proxima_acao_em || client.reactivation_at || null

  return {
    id: client.id,
    cliente_id: client.id,
    oportunidade_id: opportunity?.id || null,
    agendamento_id: appointment?.id || null,
    vendedor_id: client.seller_user_id || null,
    etapa: opportunity?.etapa || null,
    closed_at: opportunity?.closed_at || null,
    loja_id: client.loja_id || null,
    nome: client.nome || 'Cliente sem nome',
    telefone: phone,
    whatsapp: phone,
    email: '',
    canal_comercial: canalLabel(client.canal_origem),
    canal_entrada: canalLabel(client.canal_origem),
    canal_origem: canalLabel(client.canal_origem),
    canal_venda: canalLabel(opportunity?.canal || client.canal_origem),
    origem_detalhada: client.observacoes || '',
    status_comercial: deriveCommercialStatus(situation),
    situacao_atual: situation,
    momento: situation,
    temperatura: deriveTemperature(situation),
    veiculo_interesse: opportunity?.veiculo_interesse || '',
    valor_negociado: Number(opportunity?.valor_negociado || client.potencial_negocio || 0),
    sinal: Number(opportunity?.sinal || 0),
    financiamento: financingLabel(opportunity?.financiamento),
    interesse_financiamento: Boolean(opportunity?.financiamento && opportunity.financiamento !== 'nao_aplica'),
    interesse_troca: Boolean(opportunity?.carro_avaliado),
    carro_avaliado: opportunity?.carro_avaliado ? 'Sim' : 'Não',
    veiculo_troca: opportunity?.veiculo_troca || '',
    valor_troca: Number(opportunity?.valor_troca || 0),
    proposta_enviada: opportunity?.etapa === 'apresentacao',
    motivo_perda: opportunity?.motivo_perda || '',
    visita_agendada_em: appointment?.data_hora || null,
    proxima_acao: client.proxima_acao || appointment?.proxima_acao || '',
    proximo_passo: client.proxima_acao || appointment?.proxima_acao || '',
    proxima_acao_data: nextActionDate,
    objetivo_atual: '',
    ultimo_contato: client.ultima_interacao || null,
    observacoes: client.observacoes || appointment?.observacoes || '',
    ativo: client.status !== 'inativo' && !client.do_not_contact,
    do_not_contact: Boolean(client.do_not_contact),
    do_not_contact_reason: client.do_not_contact_reason || '',
    reactivation_at: client.reactivation_at || null,
    created_date: client.created_at || null,
    updated_date: client.updated_at || null,
    created_at: client.created_at || null,
    updated_at: client.updated_at || null,
  }
}

export function canalToDb(value?: string | null): 'carteira' | 'internet' | 'showroom' | 'porta' {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'internet') return 'internet'
  if (normalized === 'showroom') return 'showroom'
  if (normalized === 'porta') return 'porta'
  return 'carteira'
}

export function financingToDb(value?: string | null): 'aprovado' | 'reprovado' | 'pendente' | 'nao_aplica' {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized.includes('aprov')) return 'aprovado'
  if (normalized.includes('reprov') || normalized.includes('recus')) return 'reprovado'
  if (normalized.includes('análise') || normalized.includes('analise') || normalized.includes('pend')) return 'pendente'
  return 'nao_aplica'
}

// Rótulos exatos de `regra.sit` em src/components/carteira/proximoPassoLib.js
// (TRANSICAO) que não contêm nenhum dos substrings do heurístico abaixo — sem
// essa tabela, toda transição "Cliente respondeu", "Vai pensar", "Não
// compareceu" etc. caía no default 'prospeccao', a mesma etapa em que a
// oportunidade já estava, e a esteira do funil parecia travada mesmo depois
// de registrar um resultado.
const KNOWN_SITUATION_STAGE: Record<string, string> = {
  'Cliente respondeu': 'qualificacao',
  'Em cadência sem resposta': 'prospeccao',
  'Necessidade em qualificação': 'qualificacao',
  'Veículo definido': 'qualificacao',
  'Cliente quente sem visita': 'apresentacao',
  'Proposta enviada': 'apresentacao',
  'Proposta sem retorno': 'apresentacao',
  'Visita agendada': 'apresentacao',
  'Visita a confirmar': 'apresentacao',
  'Visita realizada': 'apresentacao',
  'Não compareceu': 'apresentacao',
  'Financiamento aprovado sem compra': 'negociacao',
  'Em negociação ativa': 'negociacao',
  'Vai pensar': 'negociacao',
  'Aguardando ação do vendedor': 'negociacao',
}

export function situationToStage(data: Record<string, unknown>): string {
  const situation = String(data.situacao_atual || data.momento || '')
  const status = String(data.status_comercial || '')
  if (status === 'Vendido' || situation === 'Venda realizada') return 'ganho'
  if (status === 'Perdido' || situation === 'Venda perdida' || situation === 'Cadência encerrada') return 'perdido'
  if (KNOWN_SITUATION_STAGE[situation]) return KNOWN_SITUATION_STAGE[situation]
  if (situation.includes('Proposta')) return 'apresentacao'
  if (situation.includes('negociação') || situation.includes('Financiamento') || situation.includes('Visita')) return 'negociacao'
  if (situation.includes('Veículo') || situation.includes('qualificação')) return 'qualificacao'
  return 'prospeccao'
}
