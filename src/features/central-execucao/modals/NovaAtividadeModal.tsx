import { useEffect, useMemo, useState } from 'react'
import { Search, UserCheck, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/organisms/Modal'
import type {
  CentralActivityType,
  CentralPriority,
  CreateManualActionInput,
} from '@/features/central-execucao/types/central-execucao.types'

export interface ClientLookupItem {
  id: string
  name: string
  phone: string | null
  vehicle?: string | null
  opportunityId?: string | null
}

const TYPES: Array<{ label: string; value: CentralActivityType }> = [
  { label: 'Atendimento', value: 'atendimento' },
  { label: 'Retorno', value: 'retorno' },
  { label: 'Entrega', value: 'entrega' },
  { label: 'Pós-venda', value: 'pos_venda' },
  { label: 'Garantia', value: 'garantia' },
  { label: 'Outra atividade comercial', value: 'comercial' },
]

const PRIORITIES: Array<{ label: string; rank: number; priority: CentralPriority }> = [
  { label: 'Alta', rank: 1, priority: 'urgent' },
  { label: 'Média', rank: 5, priority: 'medium' },
  { label: 'Baixa', rank: 9, priority: 'low' },
]

function todaySP() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
}

function timeSP() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

export function NovaAtividadeModal({
  open,
  clients,
  onClose,
  onSubmit,
}: {
  open: boolean
  clients: ClientLookupItem[]
  onClose: () => void
  onSubmit: (input: CreateManualActionInput) => Promise<{ error: string | null }>
}) {
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [activityType, setActivityType] = useState<CentralActivityType | null>(null)
  const [search, setSearch] = useState('')
  const [client, setClient] = useState<ClientLookupItem | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [ambiguous, setAmbiguous] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState(todaySP())
  const [time, setTime] = useState(timeSP())
  const [vehicle, setVehicle] = useState('')
  const [priorityRank, setPriorityRank] = useState(5)
  const [objective, setObjective] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedType = useMemo(() => TYPES.find(type => type.value === activityType) ?? null, [activityType])

  useEffect(() => {
    if (!open) return
    setStep('type')
    setActivityType(null)
    setSearch('')
    setClient(null)
    setNotFound(false)
    setAmbiguous(false)
    setName('')
    setDate(todaySP())
    setTime(timeSP())
    setVehicle('')
    setPriorityRank(5)
    setObjective('')
    setDescription('')
    setSaving(false)
    setError(null)
  }, [open])

  function handleSearch() {
    const term = search.trim()
    if (!term) return

    const phone = normalizePhone(term)
    const byPhone = phone ? clients.filter(item => normalizePhone(item.phone) === phone) : []
    const byName = phone ? [] : clients.filter(item => normalizeText(item.name).includes(normalizeText(term)))
    const matches = byPhone.length ? byPhone : byName

    if (matches.length === 1) {
      setClient(matches[0])
      setVehicle(matches[0].vehicle ?? '')
      setName('')
      setNotFound(false)
      setAmbiguous(false)
      return
    }

    setClient(null)
    setNotFound(matches.length === 0)
    setAmbiguous(matches.length > 1)
    if (!phone) setName(term)
  }

  async function handleSave() {
    if (!activityType || !date || !time) return
    if (!client && search.trim() && !name.trim()) {
      setError('Informe o nome do cliente para salvar uma atividade avulsa.')
      return
    }

    const priority = PRIORITIES.find(item => item.rank === priorityRank) ?? PRIORITIES[1]
    const resolvedName = client?.name ?? (name.trim() || (search.trim() ? 'Cliente avulso' : 'Atividade interna'))
    const resolvedPhone = client?.phone ?? (search.trim() || null)

    setSaving(true)
    setError(null)

    const response = await onSubmit({
      activityType,
      title: selectedType?.label ?? 'Atividade comercial',
      description: description.trim() || selectedType?.label || null,
      dueAt: `${date}T${time}:00-03:00`,
      clientId: client?.id ?? null,
      opportunityId: client?.opportunityId ?? null,
      objective: objective.trim() || null,
      nameSnapshot: resolvedName,
      phoneSnapshot: resolvedPhone,
      vehicleSnapshot: vehicle.trim() || client?.vehicle || null,
      priority: priority.priority,
      priorityRank: priority.rank,
      idempotencyKey: `central:manual:${crypto.randomUUID()}`,
    })

    setSaving(false)
    if (response.error) {
      setError(response.error)
      return
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { if (!saving) onClose() }} title="Nova atividade" size="sm" referenceStyle closeOnEscape={!saving}>
      {step === 'type' ? (
        <div className="space-y-2">
          <p className="mb-3 text-body-sm text-slate-500">Selecione o tipo de atividade comercial:</p>
          {TYPES.map(type => (
            <button key={type.value} type="button" onClick={() => { setActivityType(type.value); setStep('form') }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-body-sm font-semibold text-gray-800 transition-colors hover:border-status-info hover:bg-blue-50">
              {type.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-bold text-status-info">{selectedType?.label}</span>
            <button type="button" onClick={() => setStep('type')} className="text-[12px] text-slate-400 underline hover:text-slate-600">Mudar tipo</button>
          </div>

          <div>
            <label htmlFor="central-client-search" className="text-caption font-bold uppercase tracking-wider text-slate-500">Cliente ou telefone</label>
            <div className="mt-1.5 flex gap-2">
              <input id="central-client-search" value={search} onChange={event => { setSearch(event.target.value); setClient(null); setNotFound(false); setAmbiguous(false) }} placeholder="Nome ou (11) 98765-4321" className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" />
              <button type="button" onClick={handleSearch} aria-label="Buscar cliente" className="rounded-xl bg-status-info px-3 py-2 text-white transition-colors hover:bg-blue-700"><Search className="h-4 w-4" aria-hidden="true" /></button>
            </div>

            {client && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                <UserCheck className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                <div className="min-w-0"><p className="truncate text-[12px] font-bold text-green-800">{client.name}</p><p className="truncate text-caption text-green-600">{client.vehicle || '—'}</p></div>
              </div>
            )}

            {(notFound || ambiguous) && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="flex items-center gap-2"><UserX className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" /><p className="text-[12px] font-semibold text-amber-800">{ambiguous ? 'Mais de um cliente encontrado. Refine a busca.' : 'Cliente não encontrado.'}</p></div>
                {!ambiguous && <Link to="/carteira-clientes" onClick={onClose} className="ml-6 text-caption text-status-info underline">Abrir Carteira de Clientes para cadastrar</Link>}
              </div>
            )}
          </div>

          {!client && search.trim() && !ambiguous && (
            <div><label htmlFor="central-client-name" className="text-caption font-bold uppercase tracking-wider text-slate-500">Nome do cliente</label><input id="central-client-name" value={name} onChange={event => setName(event.target.value)} placeholder="Nome completo" className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15" /></div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="central-activity-date" className="text-caption font-bold uppercase tracking-wider text-slate-500">Data</label><input id="central-activity-date" type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info" /></div>
            <div><label htmlFor="central-activity-time" className="text-caption font-bold uppercase tracking-wider text-slate-500">Hora</label><input id="central-activity-time" type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info" /></div>
          </div>

          <div><label htmlFor="central-activity-vehicle" className="text-caption font-bold uppercase tracking-wider text-slate-500">Veículo (opcional)</label><input id="central-activity-vehicle" value={vehicle} onChange={event => setVehicle(event.target.value)} placeholder="Ex: HB20 1.0 Comfort" className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info" /></div>

          <div><label htmlFor="central-activity-priority" className="text-caption font-bold uppercase tracking-wider text-slate-500">Prioridade</label><select id="central-activity-priority" value={priorityRank} onChange={event => setPriorityRank(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-body-sm outline-none focus:border-status-info">{PRIORITIES.map(priority => <option key={priority.rank} value={priority.rank}>{priority.label}</option>)}</select></div>

          <div><label htmlFor="central-activity-objective" className="text-caption font-bold uppercase tracking-wider text-slate-500">Objetivo</label><input id="central-activity-objective" value={objective} onChange={event => setObjective(event.target.value)} placeholder="O que você quer alcançar com esta atividade?" className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info" /></div>

          <div><label htmlFor="central-activity-description" className="text-caption font-bold uppercase tracking-wider text-slate-500">Observação (opcional)</label><input id="central-activity-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Detalhes adicionais..." className="mt-1.5 h-10 w-full rounded-md border border-slate-200 px-3 text-body-sm outline-none focus:border-status-info" /></div>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-2.5 text-body-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={() => void handleSave()} disabled={!activityType || !date || !time || saving} className="rounded-xl bg-status-info px-6 py-2.5 text-body-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar atividade'}</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
