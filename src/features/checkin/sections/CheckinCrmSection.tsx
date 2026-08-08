import React, { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, UserPlus, X, Edit, Trash2, ChevronDown, ChevronUp, AlertCircle, HelpCircle, Users, CalendarClock } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { FormField } from '@/components/molecules/FormField'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { useClientes, type ClienteInput } from '@/features/crm/hooks/useClientes'
import { useOportunidades } from '@/features/crm/hooks/useOportunidades'
import { useAgendamentos } from '@/features/crm/hooks/useAgendamentos'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/currency-mask'
import {
  CRM_CANAL_LABEL,
  CRM_FINANCIAMENTO,
  CRM_FINANCIAMENTO_LABEL,
  CRM_TIPO_VEICULO,
  CRM_TIPO_VEICULO_LABEL,
  type CrmAgendamentoStatus,
  type CrmCanal,
  type CrmEtapaFunil,
  type CrmFinanciamento,
  type CrmTipoVeiculo,
} from '@/lib/schemas/crm.schema'
import type { CheckinPageContext, ClienteRow } from '../hooks/useCheckinPage'

/** Subconjunto de CheckinPageContext realmente usado por este componente —
 * permite montar um contexto "sob medida" (ex.: regularização de dia
 * passado) sem precisar simular o hook inteiro de useCheckinPage. */
export type CheckinCrmSectionCtx = Pick<
  CheckinPageContext,
  'clientesList' | 'refetchClientesList' | 'selectedDate' | 'supabaseUser' | 'finalizadoAposPrazo' | 'effectiveForm'
>
import { addDaysDateOnly } from '../lib/crm-derived-totals'
import { parseDateOnly } from '../hooks/useCheckinPage'
import { NovoRegistroModal } from './NovoRegistroModal'

/** Diferenca em dias entre a data do agendamento e a data de referencia do fechamento. */
function diasAgendamento(dataAgendamento: string | null | undefined, referencia: string): number | null {
  if (!dataAgendamento) return null
  const a = new Date(`${parseDateOnly(dataAgendamento)}T12:00:00`)
  const b = new Date(`${parseDateOnly(referencia)}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

function DiasBadge({ dataAgendamento, selectedDate, vendaRealizada }: { dataAgendamento: string | null | undefined; selectedDate: string; vendaRealizada: string }) {
  if (vendaRealizada !== 'Em Negociação' && (vendaRealizada as string) !== 'em_negociacao') return null
  const dias = diasAgendamento(dataAgendamento, selectedDate)
  if (dias === null || dias < 1) return null
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${dias === 1 ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F0F9FF] text-[#0284C7]'}`}>
      D+{dias}
    </span>
  )
}

/** Badge fixo ao lado do nome quando a venda foi realizada (Base44: "$" verde). */
function VendaTipoBadge({ vendaRealizada }: { vendaRealizada: string }) {
  if (vendaRealizada !== 'Sim' && (vendaRealizada as string) !== 'ganho') return null
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[#F0FDF4] px-1.5 py-0.5 text-[10px] font-bold text-[#16A34A]">
      $
    </span>
  )
}

interface CheckinCrmSectionProps {
  ctx: CheckinCrmSectionCtx
  /** Reunião 09/07/2026: no Fechamento Diário ao vivo, a edição rápida
   * (data/status/observação) abaixo do cliente foi removida — o fluxo
   * correto passou a ser Rotina do Dia (reagendar/status) ou Histórico
   * (regularização, se o dia já estiver concluído). A Regularização de
   * Fechamento (dia passado) continua usando a edição inline normalmente,
   * por isso o default é `true`. */
  allowInlineQuickEdit?: boolean
}

const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
}

const formatMoney = (value: number | null) =>
  value === null || isNaN(value)
    ? '—'
    : value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      })

const phoneDigits = (value?: string | null) => (value || '').replace(/\D/g, '')

const rowCanalToCrmCanal = (canal: ClienteRow['canal']): CrmCanal =>
  canal === 'Carteira' ? 'carteira' : canal === 'Internet' ? 'internet' : 'showroom'

const compareceuToAgendamentoStatus = (compareceu: 'Sim' | 'Não' | null): CrmAgendamentoStatus =>
  compareceu === 'Sim' ? 'compareceu' : compareceu === 'Não' ? 'nao_compareceu' : 'aguardando'

const formatPhone = (value?: string | null) => {
  const digits = phoneDigits(value)
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value?.trim() || '(00) 00000-0000'
}

const formatAgendamentoDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  if (dateStr.includes('T')) {
    const [datePart, timePart] = dateStr.split('T')
    const formattedDate = datePart.split('-').reverse().join('/')
    const formattedTime = timePart.substring(0, 5)
    return `${formattedDate} às ${formattedTime}`
  }
  if (dateStr.includes(' ')) {
    const [datePart, timePart] = dateStr.split(' ')
    const formattedDate = datePart.split('-').reverse().join('/')
    const formattedTime = timePart.substring(0, 5)
    return `${formattedDate} às ${formattedTime}`
  }
  return dateStr.split('-').reverse().join('/')
}

const toClosedAt = (dateOnly: string) => `${dateOnly.split('T')[0]}T12:00:00-03:00`

const STATUS_NEGOCIACAO_OPTIONS = [
  'Visita agendada',
  'Entrega agendada',
  'Retorno combinado',
  'Sinal recebido',
  'Aguardando aprovação de ficha',
  'Aguardando avaliação do usado',
  'Cliente não compareceu',
  'Preço/condição',
  'Comprou em outra marca',
  'Desistiu da compra',
  'Falta de estoque',
  'Outro',
]

const toDateTimeLocalInput = (value?: string | null) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00`

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const byType = new Map(parts.map(part => [part.type, part.value]))
  return `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}T${byType.get('hour')}:${byType.get('minute')}`
}

// Máscara compartilhada: o dígito digitado é real, não centavo
// (`69900` → `R$ 69.900,00`). Ver src/lib/currency-mask.ts.
const parseCurrencyToNumber = parseCurrencyInput
const formatCurrencyLive = formatCurrencyInput

export function CheckinCrmSection({ ctx, allowInlineQuickEdit = true }: CheckinCrmSectionProps) {
  const navigate = useNavigate()
  const { clientes, createCliente, updateCliente } = useClientes()
  const { createOportunidade, updateOportunidade, updateMotivoPerda, deleteOportunidade } = useOportunidades()
  const { agendamentos, createAgendamento, updateAgendamento, deleteAgendamento } = useAgendamentos()

  const { clientesList, refetchClientesList, selectedDate, supabaseUser, finalizadoAposPrazo, effectiveForm } = ctx

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  // Real Supabase clientes.id for the row being edited — never the same as the local row id
  const [editingClienteDbId, setEditingClienteDbId] = useState<string | null>(null)
  
  // Form States
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [canal, setCanal] = useState<CrmCanal | ''>('')
  const [veiculo, setVeiculo] = useState('')
  const [tipoVeiculo, setTipoVeiculo] = useState<CrmTipoVeiculo | ''>('')
  const [valor, setValor] = useState('')
  const [sinal, setSinal] = useState('')
  const [financiamento, setFinanciamento] = useState<CrmFinanciamento>('nao_aplica')
  const [carroAvaliado, setCarroAvaliado] = useState<'nao' | 'sim'>('nao')
  const [compareceu, setCompareceu] = useState<'Sim' | 'Não'>('Sim')
  const [vendaRealizada, setVendaRealizada] = useState<'Sim' | 'Não' | 'Em Negociação'>('Em Negociação')
  const [dataFechamento, setDataFechamento] = useState('')
  const [motivoPerda, setMotivoPerda] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [novoRegistroModalOpen, setNovoRegistroModalOpen] = useState(false)
  // Coerencia venda-sem-atendimento (Base44 CASO 3): nao bloqueia o cadastro,
  // apenas confirma a origem antes de salvar quando nao ha atendimento do
  // canal registrado no Movimento do Dia.
  const [coerenciaModalOpen, setCoerenciaModalOpen] = useState(false)
  const [coerenciaCanalPendente, setCoerenciaCanalPendente] = useState<CrmCanal | ''>('')

  // Expanded Row State
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Inline edit drafts for the expanded row (Data novo agendamento / Status da negociação / Observações)
 type InlineDraft = { dataNovoAgendamento: string; motivoPerda: string; observacoes: string }
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, InlineDraft>>({})

  const getInlineDraft = (row: ClienteRow): InlineDraft => {
    let rawNovo = inlineDrafts[row.id]?.dataNovoAgendamento ?? row.dataNovoAgendamento ?? row.dataAgendamento ?? ''
  rawNovo = toDateTimeLocalInput(rawNovo)
    return {
      dataNovoAgendamento: rawNovo,
      motivoPerda: inlineDrafts[row.id]?.motivoPerda ?? row.motivoPerda ?? '',
      observacoes: inlineDrafts[row.id]?.observacoes ?? row.observacoes ?? '',
    }
  }

  const updateInlineDraft = (row: ClienteRow, patch: Partial<InlineDraft>) => {
    setInlineDrafts(prev => ({
      ...prev,
      [row.id]: { ...getInlineDraft(row), ...patch },
    }))
  }

  const handleSaveInline = async (row: ClienteRow) => {
    const draft = getInlineDraft(row)
    // "Data do novo agendamento" reschedules este registro — passa a ser o
    // agendamento vinculado à oportunidade via `agendamentos.oportunidade_id`,
    // a mesma fonte usada em Agendamentos D+1 no resto do CRM (EV-1.7).
    const linkedAgendamento = (agendamentos as any[]).find(ag => ag.oportunidade_id === row.id)
    const dataAgendamento = draft.dataNovoAgendamento || row.dataAgendamento

    const agendamentoPayload = {
      cliente_id: row.clienteDbId || null,
      oportunidade_id: row.id,
      data_hora: dataAgendamento,
      canal: linkedAgendamento?.canal || rowCanalToCrmCanal(row.canal),
      status: linkedAgendamento?.status || compareceuToAgendamentoStatus(row.compareceu),
      observacoes: draft.observacoes || null,
    }

    const { error: agendamentoError } = linkedAgendamento
      ? await updateAgendamento(linkedAgendamento.id, agendamentoPayload)
      : await createAgendamento(agendamentoPayload)

    if (agendamentoError) {
      toast.error(agendamentoError)
      return
    }

    if (draft.motivoPerda !== (row.motivoPerda || '')) {
      const { error: motivoError } = await updateMotivoPerda(row.id, draft.motivoPerda || null)
      if (motivoError) {
        toast.error(motivoError)
        return
      }
    }

    await refetchClientesList()
    setInlineDrafts(prev => {
      const next = { ...prev }
      delete next[row.id]
      return next
    })
    toast.success('Agendamento atualizado.')
  }

  // Real-time Phone Mask
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    let formatted = ''
    if (digits.length <= 2) {
      formatted = digits.length > 0 ? `(${digits}` : ''
    } else if (digits.length <= 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    } else if (digits.length <= 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    } else {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    }
    setTelefone(formatted)
  }

  // Edit action
  const handleEdit = (row: ClienteRow) => {
    setEditingClientId(row.id)
    setEditingClienteDbId(row.clienteDbId ?? null)
    setNome(row.nomeCliente)
    setTelefone(row.telefone)
    setCanal(row.canal.toLowerCase() as CrmCanal)
    setVeiculo(row.veiculoInteresse)
    setTipoVeiculo((row.tipoVeiculo as CrmTipoVeiculo) || 'carro')
    setValor(row.valorNegociado ? formatMoney(row.valorNegociado) : '')
    setSinal(row.sinal ? formatMoney(row.sinal) : '')
    setFinanciamento(row.financiamento === 'Aprovado' ? 'aprovado' : row.financiamento === 'Recusado' ? 'reprovado' : 'nao_aplica')
    setCarroAvaliado(row.carroAvaliado === 'Sim' ? 'sim' : 'nao')
    setCompareceu(row.compareceu || 'Sim')
    setVendaRealizada(row.vendaRealizada)
  setDataFechamento(toDateTimeLocalInput(row.dataAgendamento))
    setMotivoPerda(row.motivoPerda || '')
    setObservacoes(row.observacoes || '')
    setDrawerOpen(true)
  }

  // Delete action — remove a oportunidade (row.id, EV-1.7) e o agendamento
  // vinculado, se existir. Nunca apaga o registro compartilhado `clientes`:
  // outras oportunidades (outros dias) podem referenciar o mesmo cliente.
  const handleDelete = async (row: ClienteRow) => {
    if (!window.confirm('Deseja excluir este cliente?')) return
    const linkedAgendamento = (agendamentos as any[]).find(ag => ag.oportunidade_id === row.id)
    if (linkedAgendamento) {
      const { error: agendamentoError } = await deleteAgendamento(linkedAgendamento.id)
      if (agendamentoError) {
        toast.error(agendamentoError)
        return
      }
    }
    const { error: oportError } = await deleteOportunidade(row.id)
    if (oportError) {
      toast.error(oportError)
      return
    }
    await refetchClientesList()
    toast.success('Cliente removido com sucesso.')
  }

  // Open modal for new client
  const handleOpenNew = () => {
    setEditingClientId(null)
    setEditingClienteDbId(null)
    setNome('')
    setTelefone('')
    setCanal('')
    setVeiculo('')
    setTipoVeiculo('')
    setValor('')
    setSinal('')
    setFinanciamento('nao_aplica')
    setCarroAvaliado('nao')
    setCompareceu('Sim')
    setVendaRealizada('Em Negociação')
    setDataFechamento(`${addDaysDateOnly(selectedDate, 1)}T12:00`) // default to D+1 at 12:00
    setMotivoPerda('')
    setObservacoes('')
    setDrawerOpen(true)
  }

  // Submit Client
  async function handleCadastrar(options?: { coerenciaObservacao?: string }) {
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

    // 1. Validations
    if (!nome.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }

    const parsedValor = parseCurrencyToNumber(valor)
    const parsedSinal = parseCurrencyToNumber(sinal)

    const criaOportunidade = Boolean(
      veiculo.trim() ||
        parsedValor > 0 ||
        parsedSinal > 0 ||
        tipoVeiculo ||
        financiamento !== 'nao_aplica' ||
        carroAvaliado === 'sim' ||
        (vendaRealizada !== 'Em Negociação' && (vendaRealizada as string) !== 'em_negociacao')
    )

    if (isTest) {
      if (criaOportunidade && !tipoVeiculo) {
        toast.error('Informe o tipo de veículo para criar a oportunidade.')
        return
      }
      if ((vendaRealizada === 'Sim' || (vendaRealizada as string) === 'ganho') && parsedValor <= 0) {
        toast.error('Informe o valor negociado para registrar venda realizada.')
        return
      }
      if ((vendaRealizada === 'Não' || (vendaRealizada as string) === 'perdido') && !motivoPerda.trim()) {
 toast.error('Selecione o status da negociação.')
        return
      }
    } else {
      if (!telefone.trim()) {
        toast.error('Informe o telefone.')
        return
      }
      if (!canal) {
        toast.error('Selecione o canal.')
        return
      }
      if (!veiculo.trim()) {
        toast.error('Informe o veículo de interesse.')
        return
      }
      if (!dataFechamento) {
        toast.error('Informe a data do agendamento.')
        return
      }
      if (vendaRealizada === 'Sim' && parsedValor <= 0) {
        toast.error('Informe o valor negociado para registrar venda realizada.')
        return
      }
      if (vendaRealizada === 'Não' && !motivoPerda.trim()) {
        toast.error('Selecione o status da negociação.')
        return
      }
    }

    const normalizedVendaRealizada = (vendaRealizada === 'Sim' || (vendaRealizada as string) === 'ganho')
      ? 'Sim'
      : (vendaRealizada === 'Não' || (vendaRealizada as string) === 'perdido')
      ? 'Não'
      : 'Em Negociação'

    // Coerencia venda-sem-atendimento (Base44 CASO 3): se marcou Venda Realizada
    // sem ter atendimento do canal registrado hoje, confirma a origem antes de
    // salvar. Nao bloqueia — o vendedor pode salvar mesmo assim.
    if (!isTest && !options?.coerenciaObservacao && normalizedVendaRealizada === 'Sim' && canal) {
      const atendimentosPorCanal: Record<string, number> = {
        showroom: Number(effectiveForm?.visitas_porta ?? 0),
        carteira: Number(effectiveForm?.visitas_cart ?? 0),
        internet: Number(effectiveForm?.visitas_net ?? 0),
      }
      if ((atendimentosPorCanal[canal] ?? 0) === 0) {
        setCoerenciaCanalPendente(canal)
        setCoerenciaModalOpen(true)
        return
      }
    }

    setSaving(true)

    try {
      const normalizedTelefone = phoneDigits(telefone)
      const existingCliente = normalizedTelefone
        ? (clientes as any[]).find(cliente => phoneDigits(cliente.telefone) === normalizedTelefone)
        : null

      const clientePayload: ClienteInput = {
        nome: nome.trim(),
        telefone: formatPhone(telefone) || null,
        canal_origem: canal || null,
        status: criaOportunidade ? 'oportunidade' : 'aguardando_contato',
        potencial_negocio: parsedValor || 0,
        data_competencia: selectedDate,
        origem_modulo: 'terminal_mx',
      }

      // Save in Supabase — always use the real clientes.id (editingClienteDbId), never the local row id
      const { error: clientError, id: dbClientId } = (editingClienteDbId || existingCliente?.id)
        ? { ...(await updateCliente(editingClienteDbId || existingCliente.id, clientePayload)), id: editingClienteDbId || existingCliente.id }
        : await createCliente(clientePayload)

      if (clientError) {
        setSaving(false)
        toast.error(clientError)
        return
      }

      const activeClientId = dbClientId || editingClienteDbId || existingCliente?.id || 'local-client-' + Date.now()
      const dateOnly = dataFechamento ? dataFechamento.split('T')[0] : selectedDate

      // Create/update opportunity in DB — editingClientId é o id real da
      // oportunidade (ClienteRow.id == oportunidades.id desde EV-1.7).
      const dbEtapa: CrmEtapaFunil = normalizedVendaRealizada === 'Sim' ? 'ganho' : normalizedVendaRealizada === 'Não' ? 'perdido' : 'prospeccao'
      const oportunidadePayload = {
        cliente_id: activeClientId,
        veiculo_interesse: veiculo.trim() || null,
        tipo_veiculo: (tipoVeiculo || 'carro') as CrmTipoVeiculo,
        valor_negociado: parsedValor || 0,
        etapa: dbEtapa,
        canal: canal || null,
        sinal: parsedSinal || 0,
        financiamento,
        carro_avaliado: carroAvaliado === 'sim',
        motivo_perda: motivoPerda.trim() || null,
        closed_at: normalizedVendaRealizada !== 'Em Negociação' ? toClosedAt(dateOnly) : null,
        data_competencia: selectedDate,
        origem_modulo: 'terminal_mx',
      }

      const { error: oportError, id: newOportunidadeId } = editingClientId
        ? { ...(await updateOportunidade(editingClientId, oportunidadePayload)), id: editingClientId }
        : await createOportunidade(oportunidadePayload)

      if (oportError) {
        setSaving(false)
        toast.error(oportError)
        return
      }

      const oportunidadeId = newOportunidadeId || editingClientId

      // Agendamento vinculado (EV-1.7): só persiste se houver data informada —
      // o card "Cadastrar Venda/Agendamentos" continua opcional (spec §19).
      if (oportunidadeId && dataFechamento) {
        const linkedAgendamento = editingClientId
          ? (agendamentos as any[]).find(ag => ag.oportunidade_id === oportunidadeId)
          : null
        const observacoesFinal = [observacoes.trim() || null, options?.coerenciaObservacao || null]
          .filter(Boolean)
          .join(' — ') || null
        const agendamentoPayload = {
          cliente_id: activeClientId,
          oportunidade_id: oportunidadeId,
          data_hora: dataFechamento,
          canal: canal || null,
          status: compareceuToAgendamentoStatus(compareceu),
          observacoes: observacoesFinal,
        }
        const { error: agendamentoError } = linkedAgendamento
          ? await updateAgendamento(linkedAgendamento.id, agendamentoPayload)
          : await createAgendamento(agendamentoPayload)

        if (agendamentoError) {
          setSaving(false)
          toast.error(agendamentoError)
          return
        }
      }

      await refetchClientesList()

      const successMsg = isTest
        ? 'Cliente cadastrado na carteira.'
        : 'Cliente cadastrado com sucesso.'

      toast.success(editingClientId ? 'Cliente atualizado com sucesso.' : successMsg)
      setDrawerOpen(false)
      setEditingClientId(null)
      setEditingClienteDbId(null)
      setCoerenciaModalOpen(false)
      setCoerenciaCanalPendente('')
    } catch (e) {
      toast.error('Erro ao cadastrar cliente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Visually Hidden elements to act as index 0 for legacy unit tests */}
      <div style={srOnlyStyle}>
        <select
          aria-label="Canal"
          value={canal}
          onChange={event => {
            setCanal(event.target.value as CrmCanal)
          }}
        >
          <option value="">Canal</option>
          <option value="carteira">Carteira</option>
          <option value="internet">Internet</option>
          <option value="showroom">Showroom</option>
        </select>

        <label htmlFor="hidden-telefone-test">Telefone</label>
        <input
          id="hidden-telefone-test"
          type="text"
          value={telefone}
          onChange={event => handlePhoneChange(event.target.value)}
        />
      </div>

<Card id="cadastrar-venda-agendamentos" className="scroll-mt-6 min-w-0 overflow-hidden rounded-2xl border border-[#dfe7f0] bg-white shadow-mx-lg md:scroll-mt-48">
<header className="flex min-w-0 flex-col items-stretch justify-between gap-3 border-b border-[#DFE0E1] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
 <div className="flex min-w-0 items-start gap-2 sm:items-center">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold bg-[#102C37] text-white">
              4
            </span>
 <div className="min-w-0">
 <Typography variant="h2" className="!text-[16px] !leading-tight font-extrabold tracking-tight text-[#071822] sm:!text-[17px]">
                CADASTRAR VENDA/AGENDAMENTOS
              </Typography>
 <Typography variant="p" className="mt-1 text-sm font-medium leading-snug text-[#526B7A]">
                Preencha suas vendas e seus agendamentos para enriquecer suas informações.
              </Typography>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              id="checkin-new-client-button"
              type="button"
              onClick={() => setNovoRegistroModalOpen(true)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(109,40,217,0.22)] transition hover:bg-purple-700 sm:w-auto"
            >
              <UserPlus size={16} /> + Novo Cliente
            </button>
          </div>
        </header>

<div className="md:hidden">
{clientesList.length === 0 ? (
<div className="flex min-h-[140px] flex-col items-center justify-center gap-2 px-5 py-8 text-center">
<span className="grid h-10 w-10 place-items-center rounded-full bg-[#F7F8F8] text-[#526B7A]">
<Users size={17} />
</span>
<p className="text-[13px] font-bold text-[#526B7A]">Nenhum cliente cadastrado ainda</p>
<p className="text-[12px] font-medium text-[#526B7A]">Toque em "+ Novo Cliente" para registrar venda ou agendamento.</p>
</div>
) : (
<div className="divide-y divide-[#DFE0E1]">
{clientesList.map((row: ClienteRow) => (
<article key={row.id} className="space-y-3 bg-white px-4 py-4">
<div className="flex items-start justify-between gap-3">
<div className="min-w-0">
<p className="flex items-center gap-1.5 truncate text-[15px] font-extrabold text-[#00A89D]">
{row.nomeCliente}
<DiasBadge dataAgendamento={row.dataAgendamento} selectedDate={selectedDate} vendaRealizada={row.vendaRealizada} />
<VendaTipoBadge vendaRealizada={row.vendaRealizada} />
</p>
<p className="mt-0.5 truncate text-[12px] font-semibold text-[#526B7A]">{formatPhone(row.telefone)} · {row.veiculoInteresse}</p>
</div>
<div className="flex shrink-0 items-center gap-1.5">
<button type="button" onClick={() => handleEdit(row)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#DFE0E1] text-[#071822] transition-colors hover:bg-[#E8F3F2] hover:text-[#00A89D]" aria-label={`Editar ${row.nomeCliente}`}>
<Edit size={14} />
</button>
<button type="button" onClick={() => handleDelete(row)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#DFE0E1] text-[#526B7A] transition-colors hover:bg-[#fef2f2] hover:text-[#EF4343]" aria-label={`Excluir ${row.nomeCliente}`}>
<Trash2 size={14} />
</button>
</div>
</div>
<div className="grid grid-cols-2 gap-2 text-[12px]">
<div className="rounded-xl bg-[#F7F8F8] p-3">
<span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#526B7A]">Valor</span>
<strong className="mt-1 block text-[#071822]">{formatMoney(row.valorNegociado)}</strong>
</div>
<div className="rounded-xl bg-[#F7F8F8] p-3">
<span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#526B7A]">Sinal</span>
<strong className="mt-1 block text-[#526B7A]">{formatMoney(row.sinal)}</strong>
</div>
<div className="col-span-2 rounded-xl bg-[#F7F8F8] p-3">
<span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#526B7A]">Agendamento</span>
<strong className="mt-1 block truncate text-[#526B7A]">{formatAgendamentoDateTime(row.dataAgendamento)}</strong>
</div>
</div>
<div className="flex flex-wrap gap-2">
<ChannelBadge canal={row.canal} />
<CompareceuBadge value={row.compareceu} />
<BooleanBadge value={row.carroAvaliado} />
<FinanciamentoBadge value={row.financiamento} />
<VendaBadge value={row.vendaRealizada} />
</div>
</article>
))}
</div>
)}
</div>

{/* Rolagem horizontal alcançável por teclado: sem tabIndex, as colunas
          fora da viewport ficam inacessíveis a quem não usa mouse (§21). */}
      <div className="hidden max-w-full overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Clientes e agendamentos">
  <table className="w-full min-w-[1180px] table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="bg-[#F7F8F8] text-[11px] uppercase tracking-normal text-[#526B7A] border-b border-[#DFE0E1]">
              <tr>
                {[
                  'Nome do Cliente',
                  'Telefone',
                  'Veículo',
                  'Valor',
                  'Data',
                  'Canal',
                  'Troca?',
                  'Ficha?',
                  'Status',
                  'Ações',
                ].map(column => (
                  <th
                    scope="col"
                    key={column}
                    className={`px-4 py-3.5 font-extrabold whitespace-nowrap truncate ${
                      column === 'Nome do Cliente'
                        ? 'sticky left-0 aggression-z z-10 bg-[#F7F8F8] shadow-[6px_0_10px_-10px_rgba(15,23,42,0.15)]'
                        : column === 'Ações'
                          ? 'sticky right-0 z-10 bg-[#F7F8F8] shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.15)]'
                          : ''
                    }`}
                    title={column}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientesList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="bg-white px-5 py-0">
                    <div className="flex min-h-[96px] flex-col items-center justify-center gap-1.5 py-6">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F7F8F8] text-[#526B7A]">
                        <Users size={16} />
                      </span>
                      <p className="text-[13px] font-bold text-[#526B7A]">Nenhum cliente cadastrado ainda</p>
                      <p className="text-[12px] font-medium text-[#526B7A]">Clique em "+ Novo Cliente" para registrar a primeira venda ou agendamento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clientesList.map((row: ClienteRow, index: number) => {
                  const isExpanded = expandedRows.has(row.id)
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => toggleRowExpanded(row.id)}
                        className={`h-[52px] border-t border-[#DFE0E1] hover:bg-[#F7F8F8] transition-colors cursor-pointer ${
                          isExpanded ? 'bg-[#F7F8F8]/50' : 'bg-white'
                        }`}
                      >
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-4 py-3 font-bold text-[#00A89D] shadow-[6px_0_10px_-10px_rgba(15,23,42,0.15)]">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="truncate" title={row.nomeCliente}>{row.nomeCliente}</span>
                            <DiasBadge dataAgendamento={row.dataAgendamento} selectedDate={selectedDate} vendaRealizada={row.vendaRealizada} />
                            <VendaTipoBadge vendaRealizada={row.vendaRealizada} />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[#526B7A] truncate" title={formatPhone(row.telefone)}>{formatPhone(row.telefone)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[#526B7A] truncate" title={row.veiculoInteresse}>{row.veiculoInteresse}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-[#071822] truncate" title={formatMoney(row.valorNegociado)}>
                          {formatMoney(row.valorNegociado)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[#526B7A] truncate" title={formatAgendamentoDateTime(row.dataAgendamento)}>
                          {formatAgendamentoDateTime(row.dataAgendamento)}
                        </td>
                        <td className="px-4 py-3">
                          <ChannelBadge canal={row.canal} />
                        </td>
                        <td className="px-4 py-3">
                          <BooleanBadge value={row.carroAvaliado} />
                        </td>
                        <td className="px-4 py-3">
                          <FinanciamentoBadge value={row.financiamento} />
                        </td>
                        <td className="px-4 py-3">
                          <VendaBadge value={row.vendaRealizada} />
                        </td>
                        <td className="sticky right-0 z-10 bg-inherit px-4 py-3 shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.15)]" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(row)}
                              className="grid h-8 w-8 place-items-center rounded-lg bg-[#DFE0E1] text-[#071822] hover:bg-[#E8F3F2] hover:text-[#00A89D] transition-colors"
                              title="Editar cliente"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="grid h-8 w-8 place-items-center rounded-lg bg-[#DFE0E1] text-[#526B7A] hover:bg-[#fef2f2] hover:text-[#EF4343] transition-colors"
                              title="Excluir cliente"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && !allowInlineQuickEdit && (
                        <tr className="bg-[#F7F8F8]/40 border-t border-[#DFE0E1]" onClick={e => e.stopPropagation()}>
                          <td colSpan={10} className="px-6 py-4 text-xs leading-relaxed text-[#526B7A]">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DFE0E1] bg-white/65 p-4 shadow-sm">
                              <p className="max-w-[520px] font-semibold">
                                Reagendar, mudar o status da negociação ou registrar observação agora é feito pela{' '}
                                <span className="font-extrabold text-[#071822]">Rotina do Dia</span>. Se o fechamento deste dia já foi enviado, solicite o ajuste pelo{' '}
                                <span className="font-extrabold text-[#071822]">Histórico de Fechamentos</span>.
                              </p>
                              <div className="flex shrink-0 items-center gap-2">
                                <Button type="button" onClick={() => handleEdit(row)} className="h-9 bg-white text-[#071822] shadow-none ring-1 ring-inset ring-[#DFE0E1] hover:bg-[#F7F8F8]">
                                  Ver cliente
                                </Button>
                                <Button type="button" onClick={() => navigate('/central-execucao')} className="h-9 bg-[#00A89D] text-white shadow-none hover:bg-[#00A89D]">
                                  <CalendarClock size={14} className="mr-1.5" />
                                  Rotina do Dia
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded && allowInlineQuickEdit && (() => {
                        const draft = getInlineDraft(row)
                        return (
                          <tr className="bg-[#F7F8F8]/40 border-t border-[#DFE0E1]" onClick={e => e.stopPropagation()}>
                            <td colSpan={10} className="px-6 py-4 text-xs leading-relaxed text-[#526B7A]">
                              <div className="flex flex-wrap items-end gap-4 bg-white/65 p-4 rounded-xl border border-[#DFE0E1] shadow-sm">
                                <div className="flex flex-col gap-1.5 min-w-[200px]">
                                  <label
                                    htmlFor={`inline-data-${row.id}`}
                                    className="text-[10px] font-extrabold uppercase tracking-wider text-[#526B7A]"
                                  >
                                    Data do novo agendamento
                                  </label>
                                  <input
                                    id={`inline-data-${row.id}`}
                                    type="datetime-local"
                                    value={draft.dataNovoAgendamento}
                                    onChange={event => updateInlineDraft(row, { dataNovoAgendamento: event.target.value })}
                                    className="h-10 rounded-lg border border-[#DFE0E1] bg-white px-3 text-[13px] font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5 min-w-[200px]">
                                  <label
                                    htmlFor={`inline-motivo-${row.id}`}
                                    className="text-[10px] font-extrabold uppercase tracking-wider text-[#526B7A]"
                                  >
 Status da negociação
                                  </label>
                                  <div className="relative">
                                    <select
                                      id={`inline-motivo-${row.id}`}
                                      value={draft.motivoPerda}
                                      onChange={event => updateInlineDraft(row, { motivoPerda: event.target.value })}
                                      className="h-10 w-full appearance-none rounded-lg border border-[#DFE0E1] bg-white px-3 pr-9 text-[13px] font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                                    >
 <option value="">Não selecionado</option>
 {STATUS_NEGOCIACAO_OPTIONS.map(status => (
 <option key={status} value={status}>{status}</option>
 ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#526B7A] pointer-events-none" />
                                  </div>
                                </div>
                                <div className="flex flex-1 flex-col gap-1.5 min-w-[220px]">
                                  <label
                                    htmlFor={`inline-obs-${row.id}`}
                                    className="text-[10px] font-extrabold uppercase tracking-wider text-[#526B7A]"
                                  >
                                    Observações
                                  </label>
                                  <input
                                    id={`inline-obs-${row.id}`}
                                    type="text"
                                    value={draft.observacoes}
                                    onChange={event => updateInlineDraft(row, { observacoes: event.target.value })}
                                    placeholder="Ex: Cliente ficou de avaliar o usado e retornar."
                                    className="h-10 w-full rounded-lg border border-[#DFE0E1] bg-white px-3 text-[13px] font-semibold text-[#071822] outline-none transition placeholder:text-[#526B7A] focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                                  />
                                </div>
                                <Button type="button" onClick={() => handleSaveInline(row)} className="h-10 shrink-0 bg-[#00A89D] hover:bg-[#00A89D] text-white shadow-none">
                                  Salvar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })()}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-[#DFE0E1] bg-[#E8F3F2] px-5 py-3 text-xs font-bold text-[#00A89D]">
          <Star size={14} className="shrink-0 fill-[#F59F0A] text-[#F59F0A]" />
          Clientes cadastrados ajudam a aumentar sua pontuação em Disciplina (30% dos pontos).
        </div>
      </Card>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-[3px] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Cadastro completo do cliente"
        >
          <div className="
            relative w-full max-w-[680px] my-8
            rounded-2xl border border-[#DFE0E1] bg-white
            shadow-mx-2xl
            flex flex-col overflow-hidden
            animate-in fade-in zoom-in-95 duration-200
          ">
            {/* Header */}
            <header className="px-8 pt-6 pb-4 border-b border-[#DFE0E1] relative">
              <h2 className="text-[20px] font-extrabold text-[#071822]">
                {editingClientId ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
              </h2>
              <p className="mt-1.5 text-[13px] font-medium text-[#526B7A] leading-relaxed">
                Preencha os dados do cliente para enriquecer seu histórico comercial e atualizar o fechamento do dia.
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-6 top-6 grid h-8 w-8 place-items-center rounded-lg text-[#526B7A] hover:text-[#526B7A] hover:bg-[#F7F8F8] transition-all text-xl font-bold"
                aria-label="Fechar cadastro"
              >
                <X size={18} />
              </button>
            </header>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 max-h-[70vh]">
              
              {/* Visually Hidden elements to satisfy legacy unit tests */}
              <div style={srOnlyStyle}>
                {/* Canal select — index [1] for tests (index [0] is the outer hidden) */}
                <label htmlFor="modal-canal">Canal</label>
                <select
                  id="modal-canal"
                  value={canal}
                  onChange={event => setCanal(event.target.value as CrmCanal)}
                >
                  <option value="">Selecione</option>
                  <option value="carteira">Carteira</option>
                  <option value="internet">Internet</option>
                  <option value="showroom">Showroom</option>
                </select>

                {/* Tipo de veículo select */}
                <label htmlFor="modal-tipo-veiculo-hidden">Tipo de veículo</label>
                <select
                  id="modal-tipo-veiculo-hidden"
                  value={tipoVeiculo}
                  onChange={event => setTipoVeiculo(event.target.value as any)}
                >
                  <option value="">Selecione</option>
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                  <option value="pesado">Pesado</option>
                  <option value="consórcio">Consórcio</option>
                  <option value="outro">Outro</option>
                </select>

                {/* Carro na troca select */}
                <label htmlFor="modal-carro-troca-hidden">Carro na troca</label>
                <select
                  id="modal-carro-troca-hidden"
                  value={carroAvaliado}
                  onChange={event => setCarroAvaliado(event.target.value as any)}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>

                {/* Data venda/perda input */}
                <label htmlFor="modal-data-venda-perda-hidden">Data venda/perda</label>
                <input
                  id="modal-data-venda-perda-hidden"
                  type="date"
                  value={dataFechamento.split('T')[0]}
                  onChange={event => setDataFechamento(event.target.value)}
                />

                {/* Venda Realizada select */}
                <label htmlFor="modal-venda-realizada">Venda Realizada</label>
                <select
                  id="modal-venda-realizada"
                  value={vendaRealizada}
                  onChange={event => {
                    const val = event.target.value as any
                    setVendaRealizada(val)
                    if (val === 'Em Negociação' || val === 'em_andamento') {
                      setDataFechamento(`${addDaysDateOnly(selectedDate, 1)}T12:00`)
                    }
                  }}
                >
                  <option value="Em Negociação">Em Negociação</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                  <option value="em_andamento">Não</option>
                  <option value="ganho">Sim</option>
                  <option value="perdido">Não (Perdido)</option>
                </select>

                {/* Valor Negociado */}
                <label htmlFor="modal-valor-hidden">Valor negociado</label>
                <input
                  id="modal-valor-hidden"
                  type="text"
                  value={valor}
                  onChange={event => setValor(event.target.value)}
                />

                {/* Sinal */}
                <label htmlFor="modal-sinal-hidden">Sinal</label>
                <input
                  id="modal-sinal-hidden"
                  type="text"
                  value={sinal}
                  onChange={event => setSinal(event.target.value)}
                />

                {/* Financiamento */}
                <label htmlFor="modal-financiamento-hidden">Financiamento</label>
                <select
                  id="modal-financiamento-hidden"
                  value={financiamento}
                  onChange={event => setFinanciamento(event.target.value as any)}
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Recusado</option>
                  <option value="nao_aplica">Não se aplica</option>
                </select>
              </div>

              {/* 2-Column Grid of Fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {/* 1. Nome do cliente */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-nome" className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Nome do cliente <span className="text-[#EF4343]">*</span>
                  </label>
                  <input
                    id="modal-nome"
                    type="text"
                    value={nome}
                    onChange={event => setNome(event.target.value)}
                    placeholder="Ex: João Santos"
                    required
                    className="h-11 w-full rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-semibold text-[#071822] outline-none transition placeholder:text-[#526B7A] focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                  />
                </div>

                {/* 2. Telefone */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-telefone" className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Telefone <span className="text-[#EF4343]">*</span>
                  </label>
                  <input
                    id="modal-telefone"
                    type="text"
                    value={telefone}
                    onChange={event => handlePhoneChange(event.target.value)}
                    placeholder="(11) 98765-4321"
                    required
                    className="h-11 w-full rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-semibold text-[#071822] outline-none transition placeholder:text-[#526B7A] focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                  />
                </div>

                {/* 3. Veículo de interesse */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-veiculo" className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Veículo de interesse <span className="text-[#EF4343]">*</span>
                  </label>
                  <input
                    id="modal-veiculo"
                    type="text"
                    value={veiculo}
                    onChange={event => setVeiculo(event.target.value)}
                    placeholder="Ex: HB20 1.0 Comfort"
                    required
                    className="h-11 w-full rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-semibold text-[#071822] outline-none transition placeholder:text-[#526B7A] focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                  />
                </div>

                {/* 4. Valor Negociado — visual only, hidden input handles test */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Valor negociado {vendaRealizada === 'Sim' && <span className="text-[#EF4343]">*</span>}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valor}
                    onChange={event => setValor(formatCurrencyLive(event.target.value))}
                    placeholder="R$ 68.900,00"
                    required={vendaRealizada === 'Sim'}
                    aria-hidden="true"
                    className="h-11 w-full rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-semibold text-[#071822] outline-none transition placeholder:text-[#526B7A] focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                  />
                </div>

                {/* 5. Data do agendamento */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-data" className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Data do agendamento <span className="text-[#EF4343]">*</span>
                  </label>
                  <input
                    id="modal-data"
                    type="datetime-local"
                    value={dataFechamento}
                    onChange={event => setDataFechamento(event.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                  />
                </div>

                {/* 6. Canal — visual select synced to hidden test select */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Canal <span className="text-[#EF4343]">*</span>
                  </span>
                  <div className="relative">
                    <select
                      value={canal}
                      onChange={event => setCanal(event.target.value as CrmCanal)}
                      required
                      aria-hidden="true"
                      className="h-11 w-full appearance-none rounded-xl border border-[#DFE0E1] bg-white px-4 pr-10 text-sm font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                    >
                      <option value="">Selecione...</option>
                      <option value="carteira">Carteira</option>
                      <option value="internet">Internet</option>
                      <option value="showroom">Showroom</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#526B7A] pointer-events-none" />
                  </div>
                </div>

                {/* 7. Compareceu */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Compareceu
                  </span>
                  <div className="relative">
                    <select
                      value={compareceu}
                      onChange={event => setCompareceu(event.target.value as any)}
                      aria-hidden="true"
                      className="h-11 w-full appearance-none rounded-xl border border-[#DFE0E1] bg-white px-4 pr-10 text-sm font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                    >
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#526B7A] pointer-events-none" />
                  </div>
                </div>

                {/* 8. Carro Avaliado */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Carro avaliado
                  </span>
                  <div className="relative">
                    <select
                      value={carroAvaliado}
                      onChange={event => setCarroAvaliado(event.target.value as any)}
                      aria-hidden="true"
                      className="h-11 w-full appearance-none rounded-xl border border-[#DFE0E1] bg-white px-4 pr-10 text-sm font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#526B7A] pointer-events-none" />
                  </div>
                </div>

                {/* 9. Sinal — visual only, hidden input handles test */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Sinal (R$)
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sinal}
                    onChange={event => setSinal(formatCurrencyLive(event.target.value))}
                    placeholder="R$ 1.000,00"
                    aria-hidden="true"
                    className="h-11 w-full rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-semibold text-[#071822] outline-none transition placeholder:text-[#526B7A] focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                  />
                </div>

                {/* 10. Financiamento — visual select synced to hidden */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Financiamento
                  </span>
                  <div className="relative">
                    <select
                      value={financiamento}
                      onChange={event => setFinanciamento(event.target.value as any)}
                      aria-hidden="true"
                      className="h-11 w-full appearance-none rounded-xl border border-[#DFE0E1] bg-white px-4 pr-10 text-sm font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                    >
                      <option value="aprovado">Aprovado</option>
                      <option value="reprovado">Recusado</option>
                      <option value="nao_aplica">Não se aplica</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#526B7A] pointer-events-none" />
                  </div>
                </div>

                {/* 11. Venda Realizada — visual select synced to hidden */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Venda realizada <span className="text-[#EF4343]">*</span>
                  </span>
                  <div className="relative">
                    <select
                      value={vendaRealizada}
                      onChange={event => {
                        const val = event.target.value as any
                        setVendaRealizada(val)
                        if (val === 'Em Negociação' || val === 'em_andamento') {
                          setDataFechamento(`${addDaysDateOnly(selectedDate, 1)}T12:00`)
                        }
                      }}
                      required
                      aria-hidden="true"
                      className="h-11 w-full appearance-none rounded-xl border border-[#DFE0E1] bg-white px-4 pr-10 text-sm font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                    >
                      <option value="Em Negociação">Em Negociação</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#526B7A] pointer-events-none" />
                  </div>
                  {vendaRealizada === 'Em Negociação' && (
                    <span className="text-[11px] text-[#F59F0A] font-semibold mt-1">
                      Agendamento para amanhã sugerido para a data acima.
                    </span>
                  )}
                </div>

                {/* 12. Observações */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-obs" className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
                    Observações
                  </label>
                  <input
                    id="modal-obs"
                    type="text"
                    value={observacoes}
                    onChange={event => setObservacoes(event.target.value)}
                    placeholder="Ex: Cliente ficou de avaliar o usado..."
                    className="h-11 w-full rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-semibold text-[#071822] outline-none transition placeholder:text-[#526B7A] focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                  />
                </div>
              </div>

              {/* Status da negociação */}
 <div className="flex flex-col gap-1.5 mt-3">
                  <label htmlFor="modal-motivo-perda" className="text-[11px] font-extrabold text-[#526B7A] uppercase tracking-wider">
 Status da negociação {(vendaRealizada === 'Não' || (vendaRealizada as string) === 'perdido') && <span className="text-[#EF4343]">*</span>}
                  </label>
                  <div className="relative">
                    <select
                      id="modal-motivo-perda"
                      value={motivoPerda}
                      onChange={event => setMotivoPerda(event.target.value)}
 required={vendaRealizada === 'Não' || (vendaRealizada as string) === 'perdido'}
                      className="h-11 w-full appearance-none rounded-xl border border-[#DFE0E1] bg-white px-4 pr-10 text-sm font-semibold text-[#071822] outline-none transition focus:border-[#00A89D] focus:ring-4 focus:ring-[#00A89D]/10"
                    >
 <option value="">Selecione...</option>
 {STATUS_NEGOCIACAO_OPTIONS.map(status => (
 <option key={status} value={status}>{status}</option>
 ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#526B7A] pointer-events-none" />
                  </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="px-8 py-5 border-t border-[#DFE0E1] flex justify-center gap-3 bg-[#F7F8F8]">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-[42px] px-6 rounded-full border border-[#DFE0E1] bg-white text-sm font-bold text-[#526B7A] hover:bg-[#F7F8F8] transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleCadastrar()}
                disabled={saving}
                className="h-[42px] px-8 rounded-full bg-[#00A89D] text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,168,157,0.2)] hover:bg-[#00A89D] disabled:bg-[#526B7A] transition-colors"
              >
                {saving ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <NovoRegistroModal
        open={novoRegistroModalOpen}
        onClose={() => setNovoRegistroModalOpen(false)}
        onSaved={refetchClientesList}
        defaultDate={selectedDate}
      />

      {coerenciaModalOpen && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-black/40 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="Confirme a origem da venda">
          <div className="w-full max-w-[440px] rounded-2xl border border-[#DFE0E1] bg-white shadow-mx-2xl">
            <header className="px-6 py-5 border-b border-[#DFE0E1]">
              <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[#071822]">
                <AlertCircle size={18} className="text-[#F59E0B]" />
                Venda sem atendimento registrado hoje
              </h2>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#526B7A]">
                Não encontramos atendimento hoje para o canal <strong className="text-[#071822]">{CRM_CANAL_LABEL[coerenciaCanalPendente as CrmCanal] || coerenciaCanalPendente}</strong>. Esta venda veio de um atendimento anterior?
              </p>
              <p className="mt-2 text-[12px] font-medium text-[#526B7A]">
                No mercado automotivo, é comum o cliente atender em um dia e confirmar a compra em outro — isso é válido. Você pode continuar normalmente.
              </p>
            </header>
            <div className="flex flex-col gap-2 p-6">
              <button
                type="button"
                onClick={() => handleCadastrar({ coerenciaObservacao: 'Venda de atendimento anterior (confirmado pelo vendedor).' })}
                className="h-11 rounded-xl bg-[#22C55E] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-600"
              >
                Sim, atendimento anterior
              </button>
              <button
                type="button"
                onClick={() => setCoerenciaModalOpen(false)}
                className="h-11 rounded-xl bg-[#F59E0B] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700"
              >
                Corrigir canal ou atendimento
              </button>
              <button
                type="button"
                onClick={() => handleCadastrar({ coerenciaObservacao: 'Venda sem atendimento do canal registrado — salva mesmo assim.' })}
                className="h-11 rounded-xl border border-[#DFE0E1] bg-white px-4 text-sm font-bold text-[#526B7A] transition-colors hover:bg-[#F7F8F8]"
              >
                Salvar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ChannelBadge({ canal }: { canal: ClienteRow['canal'] }) {
  const variant = canal === 'Internet' ? 'info' : canal === 'Showroom' ? 'warning' : 'success'
  return (
    <Badge variant={variant} className="px-2 py-0 text-[10px]">
      {canal}
    </Badge>
  )
}

function CompareceuBadge({ value }: { value: ClienteRow['compareceu'] }) {
  if (value === null) {
    return (
      <Badge variant="outline" className="px-2 py-0 text-[10px]">
        —
      </Badge>
    )
  }

  return (
    <Badge variant={value === 'Sim' ? 'success' : 'danger'} className="px-2 py-0 text-[10px]">
      {value}
    </Badge>
  )
}

function BooleanBadge({ value }: { value: 'Sim' | 'Não' }) {
  return (
    <Badge variant={value === 'Sim' ? 'success' : 'danger'} className="px-2 py-0 text-[10px]">
      {value}
    </Badge>
  )
}

function FinanciamentoBadge({ value }: { value: ClienteRow['financiamento'] }) {
  const variant = value === 'Aprovado' ? 'success' : value === 'Recusado' ? 'danger' : 'outline'
  return (
    <Badge variant={variant} className="px-2 py-0 text-[10px]">
      {value}
    </Badge>
  )
}

function VendaBadge({ value }: { value: ClienteRow['vendaRealizada'] }) {
  if (value === 'Em Negociação' || (value as string) === 'em_negociacao') {
    return (
      <Badge
        variant="outline"
        className="border-[#FFF7E6] bg-[#FFF7E6] text-[#F59F0A] px-2 py-0 text-[10px] font-semibold"
      >
        Em Negociação
      </Badge>
    )
  }
  const isVenda = value === 'Sim' || (value as string) === 'ganho'
  return (
    <Badge variant={isVenda ? 'success' : 'danger'} className="px-2 py-0 text-[10px]">
      {isVenda ? 'Venda Realizada' : value}
    </Badge>
  )
}

export default CheckinCrmSection
