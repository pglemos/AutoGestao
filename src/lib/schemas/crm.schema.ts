import { z } from 'zod'

// ============================================================================
// CRM do Vendedor — schemas (cliente, oportunidade, agendamento, atendimento)
// Espelha supabase/migrations/20260609120000_mx_crm_vendedor_foundation.sql
// ============================================================================

export const CRM_CANAIS = ['carteira', 'internet', 'showroom', 'porta'] as const
export const CRM_CLIENTE_STATUS = ['oportunidade', 'ativo', 'pos_venda', 'aguardando_contato', 'inativo'] as const
export const CRM_RELACIONAMENTO = ['excelente', 'bom', 'neutro', 'ruim', 'critico'] as const
// `cancelada` existe no enum `crm_etapa_funil` de produção desde o
// cancelamento de venda. Sem ela aqui, `z.enum(CRM_ETAPAS_FUNIL)` rejeitava
// qualquer oportunidade cancelada lida do banco.
export const CRM_ETAPAS_FUNIL = ['prospeccao', 'qualificacao', 'apresentacao', 'negociacao', 'fechamento', 'ganho', 'perdido', 'cancelada'] as const
export const CRM_FINANCIAMENTO = ['aprovado', 'reprovado', 'nao_aplica', 'pendente'] as const
export const CRM_TIPO_VEICULO = ['carro', 'moto', 'caminhao'] as const
export const CRM_CATEGORIAS_VEICULO = ['hatch', 'sedan', 'suv', 'picape', 'minivan', 'utilitario', 'moto', 'outro'] as const
export const CRM_AGENDAMENTO_TIPO = ['visita', 'retorno', 'test_drive', 'entrega', 'negociacao', 'garantia', 'pos_venda'] as const
export const CRM_AGENDAMENTO_STATUS = ['confirmado', 'aguardando', 'compareceu', 'nao_compareceu'] as const
export const CRM_EVENTO_TIPO = [
  'oportunidade_registrada',
  'cliente_qualificado',
  'agendamento_criado',
  'atendimento_comercial_realizado',
  'venda_realizada',
  'proposta_enviada',
  'retorno_realizado',
  'entrega_realizada',
  'garantia_registrada',
  'pos_venda_realizado',
] as const
export const CRM_EVENTO_MODALIDADE = ['visita_loja', 'atendimento_externo', 'videochamada'] as const

export type CrmCanal = (typeof CRM_CANAIS)[number]
export type CrmClienteStatus = (typeof CRM_CLIENTE_STATUS)[number]
export type CrmRelacionamento = (typeof CRM_RELACIONAMENTO)[number]
export type CrmEtapaFunil = (typeof CRM_ETAPAS_FUNIL)[number]
export type CrmFinanciamento = (typeof CRM_FINANCIAMENTO)[number]
export type CrmTipoVeiculo = (typeof CRM_TIPO_VEICULO)[number]
export type CrmCategoriaVeiculo = (typeof CRM_CATEGORIAS_VEICULO)[number]
export type CrmAgendamentoTipo = (typeof CRM_AGENDAMENTO_TIPO)[number]
export type CrmAgendamentoStatus = (typeof CRM_AGENDAMENTO_STATUS)[number]
export type CrmEventoTipo = (typeof CRM_EVENTO_TIPO)[number]
export type CrmEventoModalidade = (typeof CRM_EVENTO_MODALIDADE)[number]

export function somenteDigitos(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '')
}

export function isTelefoneBRValido(value: string | null | undefined): boolean {
  const digits = somenteDigitos(value)
  return digits.length === 10 || digits.length === 11
}

export function formatarTelefoneBR(value: string | null | undefined): string {
  const digits = somenteDigitos(value).slice(0, 11)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  const ddd = digits.slice(0, 2)
  const local = digits.slice(2)
  if (local.length <= 4) return `(${ddd}) ${local}`
  const splitAt = local.length > 8 ? 5 : 4
  return `(${ddd}) ${local.slice(0, splitAt)}-${local.slice(splitAt)}`
}

export function formatarMoedaBRInput(value: string | number | null | undefined): string {
  const digits = somenteDigitos(String(value ?? ''))
  const centavos = Number(digits || '0')
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

export function moedaBRParaNumero(value: string | number | null | undefined): number {
  return Number(somenteDigitos(String(value ?? '')) || '0') / 100
}

// Etapas que compõem o funil "vivo" (exclui terminais ganho/perdido)
export const CRM_ETAPAS_ATIVAS: CrmEtapaFunil[] = ['prospeccao', 'qualificacao', 'apresentacao', 'negociacao', 'fechamento']

/**
 * Etapas terminais: a oportunidade acabou e não pode ser tratada como viva.
 * `cancelada` é terminal próprio — a venda existiu e foi revertida, o que é
 * diferente de `perdido` (nunca fechou) e governa comissão, performance e
 * estratégia de recuperação.
 *
 * Fonte única de verdade: cada lugar que decidia "esta oportunidade ainda está
 * viva?" com uma lista literal de duas etapas ficava para trás quando o enum
 * de produção crescia.
 */
export const CRM_ETAPAS_TERMINAIS: CrmEtapaFunil[] = ['ganho', 'perdido', 'cancelada']

export function isEtapaTerminal(etapa?: string | null): boolean {
  return CRM_ETAPAS_TERMINAIS.includes(etapa as CrmEtapaFunil)
}

export const CRM_ETAPA_LABEL: Record<CrmEtapaFunil, string> = {
  prospeccao: 'Prospecção',
  qualificacao: 'Qualificação',
  apresentacao: 'Apresentação',
  negociacao: 'Negociação',
  fechamento: 'Fechamento',
  ganho: 'Vendas Realizadas',
  perdido: 'Perdido',
  cancelada: 'Cancelada',
}

export const CRM_CANAL_LABEL: Record<CrmCanal, string> = {
  carteira: 'Carteira',
  internet: 'Internet',
  showroom: 'Showroom',
  porta: 'Porta',
}

export const CRM_CLIENTE_STATUS_LABEL: Record<CrmClienteStatus, string> = {
  oportunidade: 'Oportunidade',
  ativo: 'Ativo',
  pos_venda: 'Pós-venda',
  aguardando_contato: 'Aguardando contato',
  inativo: 'Inativo',
}

export const CRM_RELACIONAMENTO_LABEL: Record<CrmRelacionamento, string> = {
  excelente: 'Excelente',
  bom: 'Bom',
  neutro: 'Neutro',
  ruim: 'Ruim',
  critico: 'Crítico',
}

export const CRM_TIPO_VEICULO_LABEL: Record<CrmTipoVeiculo, string> = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhão',
}

export const CRM_FINANCIAMENTO_LABEL: Record<CrmFinanciamento, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  nao_aplica: 'Não se aplica',
  pendente: 'Pendente',
}

export const CRM_AGENDAMENTO_TIPO_LABEL: Record<CrmAgendamentoTipo, string> = {
  visita: 'Visita',
  retorno: 'Retorno',
  test_drive: 'Test-drive',
  entrega: 'Entrega',
  negociacao: 'Negociação',
  garantia: 'Garantia',
  pos_venda: 'Pós-venda',
}

export const CRM_AGENDAMENTO_STATUS_LABEL: Record<CrmAgendamentoStatus, string> = {
  confirmado: 'Confirmado',
  aguardando: 'Aguardando',
  compareceu: 'Compareceu',
  nao_compareceu: 'Não compareceu',
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
export const ClienteSchema = z.object({
  id: z.string().uuid(),
  loja_id: z.string().uuid(),
  seller_user_id: z.string().uuid(),
  nome: z.string(),
  telefone: z.string().nullable(),
  data_competencia: z.string().nullable().optional(),
  empresa: z.string().nullable(),
  canal_origem: z.enum(CRM_CANAIS).nullable(),
  status: z.enum(CRM_CLIENTE_STATUS),
  relacionamento: z.enum(CRM_RELACIONAMENTO),
  ultima_interacao: z.string().nullable(),
  proxima_acao: z.string().nullable(),
  proxima_acao_em: z.string().nullable(),
  potencial_negocio: z.coerce.number().default(0),
  observacoes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Cliente = z.infer<typeof ClienteSchema>

export const OportunidadeSchema = z.object({
  id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  loja_id: z.string().uuid(),
  seller_user_id: z.string().uuid(),
  veiculo_interesse: z.string().nullable(),
  tipo_veiculo: z.enum(CRM_TIPO_VEICULO).nullable().default(null),
  categoria_veiculo: z.enum(CRM_CATEGORIAS_VEICULO).nullable().default(null),
  preco_interesse_min: z.coerce.number().nullable().default(null),
  preco_interesse_max: z.coerce.number().nullable().default(null),
  catalog_model_id: z.string().uuid().nullable().default(null),
  classification_source: z.enum(['catalog', 'manual', 'migration']).nullable().default(null),
  valor_negociado: z.coerce.number().default(0),
  etapa: z.enum(CRM_ETAPAS_FUNIL),
  canal: z.enum(CRM_CANAIS).nullable(),
  sinal: z.coerce.number().default(0),
  financiamento: z.enum(CRM_FINANCIAMENTO),
  carro_avaliado: z.boolean(),
  motivo_perda: z.string().nullable(),
  placa_veiculo: z.string().nullable().default(null),
  data_entrega_prevista: z.string().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  data_competencia: z.string().nullable().optional(),
  origem_modulo: z.string().optional(),
  fechamento_id: z.string().uuid().nullable().optional(),
})
export type Oportunidade = z.infer<typeof OportunidadeSchema>

export const AgendamentoSchema = z.object({
  id: z.string().uuid(),
  cliente_id: z.string().uuid().nullable(),
  oportunidade_id: z.string().uuid().nullable(),
  loja_id: z.string().uuid(),
  seller_user_id: z.string().uuid(),
  data_hora: z.string(),
  canal: z.enum(CRM_CANAIS).nullable(),
  tipo: z.enum(CRM_AGENDAMENTO_TIPO),
  status: z.enum(CRM_AGENDAMENTO_STATUS),
  proxima_acao: z.string().nullable(),
  observacoes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Agendamento = z.infer<typeof AgendamentoSchema>

export const AtendimentoSchema = z.object({
  id: z.string().uuid(),
  cliente_id: z.string().uuid().nullable(),
  loja_id: z.string().uuid(),
  seller_user_id: z.string().uuid(),
  data: z.string(),
  canal: z.enum(CRM_CANAIS),
  observacoes: z.string().nullable(),
  created_at: z.string(),
})
export type Atendimento = z.infer<typeof AtendimentoSchema>

export const EventoComercialSchema = z.object({
  id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  oportunidade_id: z.string().uuid().nullable(),
  agendamento_id: z.string().uuid().nullable(),
  loja_id: z.string().uuid(),
  seller_user_id: z.string().uuid(),
  tipo_evento: z.enum(CRM_EVENTO_TIPO),
  canal: z.enum(CRM_CANAIS).nullable(),
  modalidade: z.enum(CRM_EVENTO_MODALIDADE).nullable(),
  data_evento: z.string(),
  origem_modulo: z.string(),
  observacao: z.string().nullable(),
  created_at: z.string(),
})
export type EventoComercial = z.infer<typeof EventoComercialSchema>

// ---------------------------------------------------------------------------
// Parse helpers (tolerantes — descartam linhas fora do contrato sem quebrar UI)
// ---------------------------------------------------------------------------
function parseArray<T>(schema: z.ZodType<T>, data: unknown): T[] {
  if (!Array.isArray(data)) return []
  const out: T[] = []
  for (const row of data) {
    const parsed = schema.safeParse(row)
    if (parsed.success) out.push(parsed.data)
  }
  return out
}

/**
 * Formata datas para pt-BR sem o deslocamento de fuso típico de strings
 * date-only (`YYYY-MM-DD`), que `new Date('YYYY-MM-DD')` interpreta como UTC
 * meia-noite e exibe -1 dia em fusos negativos (ex.: America/Sao_Paulo).
 */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—'
  const dateOnly = value.length === 10 ? `${value}T12:00:00` : value
  const d = new Date(dateOnly)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

/**
 * Data (date-only `YYYY-MM-DD`) no fuso de São Paulo, para escrita em colunas
 * DATE. `toISOString().slice(0, 10)` usa UTC e, após 21h locais, registra o
 * dia seguinte (UTC-3).
 */
export function toDateOnlyBR(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
}

export const parseClientes = (d: unknown) => parseArray(ClienteSchema, d)
export const parseOportunidades = (d: unknown) => parseArray(OportunidadeSchema, d)
export const parseAgendamentos = (d: unknown) => parseArray(AgendamentoSchema, d)
export const parseAtendimentos = (d: unknown) => parseArray(AtendimentoSchema, d)
export const parseEventosComerciais = (d: unknown) => parseArray(EventoComercialSchema, d)

/**
 * Normaliza telefone para apenas dígitos — espelha a coluna gerada
 * `clientes.telefone_normalizado` (ver migration 20260630180000).
 */
export function normalizarTelefone(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  return digitos.length > 0 ? digitos : null
}
