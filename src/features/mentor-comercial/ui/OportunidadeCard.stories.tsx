import type { Meta, StoryObj } from '@storybook/react'
import { OportunidadeCard, type CarteiraOportunidade } from './OportunidadeCard'

const opNormal: CarteiraOportunidade = {
  id: 'op-101',
  cliente_id: 'cli-101',
  cliente_nome: 'Carlos Eduardo Silva',
  cliente_telefone: '(11) 98765-4321',
  cliente_whatsapp: '(11) 98765-4321',
  canal: 'Internet',
  channel_entry: 'Internet',
  detailed_origin: 'Google Ads - SUV',
  origem_modulo: 'Landing Page',
  veiculo_interesse: 'Toyota Corolla Cross XRE 2.0 2024',
  placa_veiculo: 'ABC1D23',
  current_status_code: 'INT-Q04',
  status_label: 'Cliente qualificado sem visita',
  current_responsible: 'Vendedor Lucas',
  temperature: 'Quente',
  current_objective: 'Gerar visita na loja',
  current_next_step: 'Convidar para visita presencial',
  next_action_at: '2026-08-07T15:00:00.000Z',
  appointment_at: null,
  current_cadence_step: 1,
  mentor_score: 85,
  mentor_score_class: 'Excelente',
  priority_index: 78,
  priority_class: 'Alta',
  potential: 'Alto',
  needs_mentor_classification: false,
  etapa: 'Qualificação',
  explanation: ['Transforme a qualificação em compromisso presencial.'],
  mentor_guidance: 'Transforme a qualificação em compromisso presencial.',
}

const opNeedsClassification: CarteiraOportunidade = {
  id: 'op-102',
  cliente_id: 'cli-102',
  cliente_nome: 'Mariana Oliveira Santos',
  cliente_telefone: '(21) 99887-6655',
  cliente_whatsapp: '(21) 99887-6655',
  canal: 'Internet',
  channel_entry: 'Internet',
  detailed_origin: 'Instagram',
  origem_modulo: 'Meta Ads',
  veiculo_interesse: 'Jeep Compass Longitude 1.3 Turbo 2023',
  placa_veiculo: 'XYZ9K88',
  current_status_code: 'INT-C03',
  status_label: 'Resposta recebida — atendimento pendente',
  current_responsible: 'Vendedor Lucas',
  temperature: 'Morno',
  current_objective: 'Entender a situação',
  current_next_step: 'Responder e atualizar status',
  next_action_at: '2026-08-07T10:00:00.000Z',
  appointment_at: null,
  current_cadence_step: 2,
  mentor_score: null,
  mentor_score_class: null,
  priority_index: null,
  priority_class: null,
  potential: 'Médio',
  needs_mentor_classification: true,
  etapa: 'Contato',
  explanation: ['Cliente respondeu: a bola está com o vendedor.'],
  mentor_guidance: 'Cliente respondeu: a bola está com o vendedor.',
}

const opSemScoreSemPrioridade: CarteiraOportunidade = {
  id: 'op-103',
  cliente_id: 'cli-103',
  cliente_nome: 'Roberto Alves Prado',
  cliente_telefone: '(31) 97654-3210',
  cliente_whatsapp: '(31) 97654-3210',
  canal: 'Porta',
  channel_entry: 'Porta',
  detailed_origin: 'Showroom Direct',
  origem_modulo: 'Porta da Loja',
  veiculo_interesse: 'Hyundai Creta Ultimate 2.0 2024',
  placa_veiculo: 'KLM3T44',
  current_status_code: 'POR-A01',
  status_label: 'Atendimento espontâneo em andamento',
  current_responsible: 'Vendedora Ana',
  temperature: 'Quente',
  current_objective: 'Realizar atendimento',
  current_next_step: 'Diagnosticar e apresentar solução',
  next_action_at: '2026-08-07T16:30:00.000Z',
  appointment_at: null,
  current_cadence_step: null,
  mentor_score: null,
  mentor_score_class: null,
  priority_index: null,
  priority_class: null,
  potential: 'Muito alto',
  needs_mentor_classification: false,
  etapa: 'Visita',
  explanation: ['Atenda e registre apenas o que importa.'],
  mentor_guidance: 'Atenda e registre apenas o que importa.',
}

const opPrioridadeMaxima: CarteiraOportunidade = {
  id: 'op-104',
  cliente_id: 'cli-104',
  cliente_nome: 'Fernanda Lima Souza',
  cliente_telefone: '(41) 99123-4567',
  cliente_whatsapp: '(41) 99123-4567',
  canal: 'Internet',
  channel_entry: 'Internet',
  detailed_origin: 'Website Direct',
  origem_modulo: 'Portal MX',
  veiculo_interesse: 'Volkswagen Taos Highline 250 TSI 2024',
  placa_veiculo: 'MAX9999',
  current_status_code: 'INT-N12',
  status_label: 'Pronto para fechamento',
  current_responsible: 'Vendedor Lucas',
  temperature: 'Quente',
  current_objective: 'Formalizar venda',
  current_next_step: 'Confirmar aceite e próximos dados',
  next_action_at: '2026-08-07T11:00:00.000Z',
  appointment_at: null,
  current_cadence_step: 1,
  mentor_score: 95,
  mentor_score_class: 'Excelente',
  priority_index: 98,
  priority_class: 'Máxima',
  potential: 'Muito alto',
  needs_mentor_classification: false,
  etapa: 'Negociação',
  explanation: ['Não deixe fechamento esfriar; formalize o compromisso.'],
  mentor_guidance: 'Não deixe fechamento esfriar; formalize o compromisso.',
}

const opPrioridadeBaixa: CarteiraOportunidade = {
  id: 'op-105',
  cliente_id: 'cli-105',
  cliente_nome: 'Gabriel Pereira Castro',
  cliente_telefone: '(51) 98811-2233',
  cliente_whatsapp: '(51) 98811-2233',
  canal: 'Carteira',
  channel_entry: 'Carteira',
  detailed_origin: 'Base Antiga',
  origem_modulo: 'Prospecção',
  veiculo_interesse: 'Chevrolet Tracker LTZ 1.0 Turbo 2022',
  placa_veiculo: 'BAX1234',
  current_status_code: 'CAR-C01',
  status_label: 'Indicação recebida — contato pendente',
  current_responsible: 'Vendedor Pedro',
  temperature: 'Frio',
  current_objective: 'Iniciar conversa',
  current_next_step: 'Abordar mencionando a indicação',
  next_action_at: '2026-08-10T14:00:00.000Z',
  appointment_at: null,
  current_cadence_step: 1,
  mentor_score: 45,
  mentor_score_class: 'Atenção',
  priority_index: 15,
  priority_class: 'Baixa',
  potential: 'Baixo',
  needs_mentor_classification: false,
  etapa: 'Contato',
  explanation: ['Use a indicação como ponte de confiança.'],
  mentor_guidance: 'Use a indicação como ponte de confiança.',
}

const meta: Meta<typeof OportunidadeCard> = {
  title: 'Mentor Comercial/OportunidadeCard',
  component: OportunidadeCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onExecutar: { action: 'onExecutar' },
    onAtualizarSituacao: { action: 'onAtualizarSituacao' },
    onAbrirFicha: { action: 'onAbrirFicha' },
  },
}

export default meta
type Story = StoryObj<typeof OportunidadeCard>

export const EstadoNormal: Story = {
  args: {
    oportunidade: opNormal,
  },
}

export const NecessitaClassificacao: Story = {
  args: {
    oportunidade: opNeedsClassification,
  },
}

export const SemScoreSemPrioridade: Story = {
  args: {
    oportunidade: opSemScoreSemPrioridade,
  },
}

export const PrioridadeMaxima: Story = {
  args: {
    oportunidade: opPrioridadeMaxima,
  },
}

export const PrioridadeBaixa: Story = {
  args: {
    oportunidade: opPrioridadeBaixa,
  },
}
