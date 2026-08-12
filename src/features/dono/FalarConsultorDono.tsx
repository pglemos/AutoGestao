import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Paperclip,
  Phone,
  RefreshCw,
  Send,
  UserRoundCheck,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { PageCanvas } from '@/design-system/page'
import {
  buildOwnerConsultantInitialMessage,
  buildOwnerConsultantInitialSubject,
  ownerConsultantContextSummary,
  parseOwnerConsultantContext,
} from './ownerConsultantContext'

type ConsultantContact = {
  client_id: string | null
  client_name: string | null
  consultant_user_id: string | null
  consultant_name: string | null
  consultant_email: string | null
  consultant_phone: string | null
  consultant_avatar_url: string | null
  assignment_role: string | null
}

type ConsultantRequest = {
  id: string
  subject: string
  request_type: string
  priority: string
  status: string
  created_at: string
  context_type: string
}

const requestTypes = [
  { value: 'duvida', label: 'Tirar uma dúvida' },
  { value: 'analise', label: 'Solicitar análise' },
  { value: 'decisao', label: 'Discutir uma decisão' },
  { value: 'revisao_acao', label: 'Revisar uma ação' },
  { value: 'agendamento', label: 'Agendar encontro' },
  { value: 'informacao', label: 'Enviar informação' },
  { value: 'urgente', label: 'Situação urgente' },
]

const priorities = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const statusLabels: Record<string, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  respondida: 'Respondida',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
}

const requestTypeLabels = Object.fromEntries(requestTypes.map(item => [item.value, item.label]))

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'MX'
}

function normalizePhone(phone: string | null) {
  return phone?.replace(/\D/g, '') || ''
}

function ConsultantAvatar({ avatarUrl, name, initialsFn }: { avatarUrl: string | null | undefined; name: string; initialsFn: (name: string) => string }) {
  const [erro, setErro] = useState(false)
  if (!avatarUrl || erro) return <div className="flex h-mx-20 w-mx-20 items-center justify-center rounded-mx-full bg-emerald-600 text-2xl font-bold text-white shadow-sm">{initialsFn(name)}</div>
  return <img src={avatarUrl} alt="" className="h-mx-20 w-mx-20 rounded-mx-full object-cover" onError={() => setErro(true)} />
}

export default function FalarConsultorDono() {
  const { membership, profile, vinculos_loja } = useAuth()
  const [searchParams] = useSearchParams()
  const search = searchParams.toString()
  const context = useMemo(() => parseOwnerConsultantContext(search ? `?${search}` : ''), [search])
  const contextSummary = useMemo(() => ownerConsultantContextSummary(context), [context])
  const requestedStoreId = searchParams.get('storeId')
  const requestedMembership = vinculos_loja.find(item => item.store_id === requestedStoreId)
  const storeId = requestedMembership?.store_id || membership?.store?.id || null
  const storeName = requestedMembership?.store?.name || membership?.store?.name || 'Loja atual'

  const [contact, setContact] = useState<ConsultantContact | null>(null)
  const [requests, setRequests] = useState<ConsultantRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [subject, setSubject] = useState(() => buildOwnerConsultantInitialSubject(context))
  const [message, setMessage] = useState(() => buildOwnerConsultantInitialMessage(context))
  const [requestType, setRequestType] = useState(context.origin === 'central-decisoes' ? 'decisao' : 'duvida')
  const [priority, setPriority] = useState(context.status === 'Crítico' ? 'alta' : 'media')

  useEffect(() => {
    setSubject(buildOwnerConsultantInitialSubject(context))
    setMessage(buildOwnerConsultantInitialMessage(context))
    setRequestType(context.origin === 'central-decisoes' ? 'decisao' : 'duvida')
    setPriority(context.status === 'Crítico' ? 'alta' : 'media')
  }, [context])

  const loadConsultingData = useCallback(async () => {
    if (!storeId) {
      setContact(null)
      setRequests([])
      setLoadError('Nenhuma loja está vinculada ao contexto atual.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    const [contactResult, requestsResult] = await Promise.all([
      supabase.rpc('get_owner_consultant_contact', { p_store_id: storeId }),
      supabase
        .from('solicitacoes_consultoria')
        .select('id,subject,request_type,priority,status,created_at,context_type')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    if (contactResult.error && contactResult.error.code !== 'PGRST116') {
      setLoadError('Não foi possível carregar o consultor vinculado à loja.')
    }

    const contactRows = Array.isArray(contactResult.data) ? contactResult.data : []
    setContact((contactRows[0] || null) as ConsultantContact | null)

    if (requestsResult.error) {
      setLoadError(current => current || 'Não foi possível carregar o histórico de solicitações.')
      setRequests([])
    } else {
      setRequests((requestsResult.data || []) as ConsultantRequest[])
    }

    setLoading(false)
  }, [storeId])

  useEffect(() => {
    void loadConsultingData()
  }, [loadConsultingData])

  const contactName = contact?.consultant_name || 'Equipe de Consultoria MX'
  const contactRole = contact?.assignment_role === 'responsavel'
    ? 'Consultor responsável'
    : contact?.assignment_role === 'auxiliar'
      ? 'Consultor auxiliar'
      : 'Atendimento consultivo'
  const phoneDigits = normalizePhone(contact?.consultant_phone || null)
  const whatsappMessage = encodeURIComponent(
    [subject.trim(), message.trim(), contextSummary.length ? `Contexto:\n${contextSummary.join('\n')}` : '']
      .filter(Boolean)
      .join('\n\n'),
  )
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${whatsappMessage}` : null
  const mailtoUrl = contact?.consultant_email
    ? `mailto:${contact.consultant_email}?subject=${encodeURIComponent(subject || 'Solicitação MX')}&body=${whatsappMessage}`
    : null
  const scheduleUrl = contact?.consultant_email
    ? `mailto:${contact.consultant_email}?subject=${encodeURIComponent(`Agendamento — ${storeName}`)}&body=${encodeURIComponent(`Olá, ${contactName}. Gostaria de agendar um encontro sobre: ${subject}.\n\n${message}`)}`
    : null

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!storeId || !profile?.id) {
      toast.error('Não foi possível identificar a loja e o usuário atuais.')
      return
    }
    if (subject.trim().length < 3 || message.trim().length < 3) {
      toast.error('Preencha assunto e mensagem com informações suficientes.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('solicitacoes_consultoria').insert({
      store_id: storeId,
      client_id: contact?.client_id || null,
      consultant_user_id: contact?.consultant_user_id || null,
      created_by: profile.id,
      request_type: requestType,
      subject: subject.trim(),
      message: message.trim(),
      priority,
      context_type: context.contextType,
      context_id: context.contextId,
      context_snapshot: {
        ...context.snapshot,
        loja: storeName,
        consultor: contactName,
      },
      status: 'aberta',
    })
    setSubmitting(false)

    if (error) {
      toast.error('Não foi possível enviar a solicitação. Revise os dados e tente novamente.')
      return
    }

    toast.success('Solicitação enviada e registrada na Consultoria.')
    setSubject('Solicitação ao Consultor MX')
    setMessage('')
    setRequestType('duvida')
    setPriority('media')
    await loadConsultingData()
  }

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-mx-lg">
      <header className="flex flex-col gap-mx-sm border-b border-gray-100 pb-mx-lg">
        <div className="flex flex-wrap items-center justify-between gap-mx-md">
          <div className="min-w-0">
            <Typography variant="h1" className="text-3xl md:text-4xl">Falar com Consultor</Typography>
            <Typography variant="p" tone="muted" className="mt-mx-xs">
              Envie uma solicitação contextual, acompanhe o histórico e acione o consultor responsável pela loja.
            </Typography>
          </div>
          <Button type="button" variant="outline" className="bg-white" onClick={() => void loadConsultingData()} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Atualizar
          </Button>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="rounded-2xl border border-status-warning/20 bg-status-warning-surface p-mx-md text-sm font-bold text-status-warning">
          {loadError}
        </div>
      )}

      <section className="grid grid-cols-1 gap-mx-md xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="border bg-white p-mx-lg">
          {loading ? (
            <div className="space-y-mx-md animate-pulse">
              <div className="h-mx-20 w-mx-20 rounded-mx-full bg-gray-50" />
              <div className="h-mx-5 w-40 rounded bg-gray-50" />
              <div className="h-mx-4 w-28 rounded bg-gray-50" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-mx-md">
                <ConsultantAvatar avatarUrl={contact?.consultant_avatar_url} name={contactName} initialsFn={initials} />
                <div className="min-w-0">
                  <Typography variant="h3" className="truncate text-xl">{contactName}</Typography>
                  <Typography variant="p" tone="muted" className="text-sm font-bold">{contactRole}</Typography>
                  <div className="mt-mx-tiny flex items-center gap-mx-xs text-mx-tiny text-muted-foreground">
                    <MapPin size={12} aria-hidden="true" />
                    <span>{storeName}</span>
                  </div>
                </div>
              </div>

              <div className="mt-mx-lg space-y-mx-sm">
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex h-mx-12 w-full items-center justify-center gap-mx-sm rounded-2xl bg-status-success text-sm font-bold text-white transition-colors hover:bg-status-success/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-status-success/30">
                    <MessageCircle size={18} /> Abrir WhatsApp
                  </a>
                )}
                {phoneDigits && (
                  <a href={`tel:${phoneDigits}`} className="flex h-mx-12 w-full items-center justify-center gap-mx-sm rounded-2xl border border-gray-200 bg-white text-sm font-bold text-foreground transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20">
                    <Phone size={18} /> Ligar
                  </a>
                )}
                {scheduleUrl && (
                  <a href={scheduleUrl} className="flex h-mx-12 w-full items-center justify-center gap-mx-sm rounded-2xl bg-status-info text-sm font-bold text-white transition-colors hover:bg-status-info/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-status-info/30">
                    <CalendarPlus size={18} /> Solicitar agendamento
                  </a>
                )}
              </div>

              <div className="mt-mx-lg space-y-mx-xs border-t border-gray-100 pt-mx-md">
                {contact?.consultant_email && (
                  <a href={mailtoUrl || undefined} className="flex items-center gap-mx-xs break-all text-sm font-bold text-muted-foreground hover:text-emerald-600">
                    <Mail size={14} className="shrink-0 text-muted-foreground" /> {contact.consultant_email}
                  </a>
                )}
                {contact?.consultant_phone && (
                  <div className="flex items-center gap-mx-xs text-sm font-bold text-muted-foreground">
                    <Phone size={14} className="text-muted-foreground" /> {contact.consultant_phone}
                  </div>
                )}
                {!contact?.consultant_user_id && (
                  <p className="rounded-xl bg-gray-50 p-mx-sm text-xs font-bold text-muted-foreground">
                    Nenhum consultor individual está vinculado. A solicitação será registrada na fila da equipe MX.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>

        <Card className="border bg-white p-mx-lg">
          <div className="flex items-center gap-mx-sm">
            <Send size={22} className="text-emerald-600" />
            <div>
              <Typography variant="h3" className="text-xl">Nova solicitação</Typography>
              <Typography variant="tiny" tone="muted" className="mt-mx-tiny block font-bold normal-case">
                O registro permanece no histórico e recebe o contexto da tela de origem.
              </Typography>
            </div>
          </div>

          {contextSummary.length > 0 && (
            <div className="mt-mx-md rounded-2xl border border-brand-primary/15 bg-mx-indigo-50 p-mx-md">
              <div className="flex items-center gap-mx-xs text-xs font-bold uppercase tracking-mx-wide text-emerald-600">
                <Paperclip size={15} /> Contexto anexado automaticamente
              </div>
              <div className="mt-mx-sm flex flex-wrap gap-mx-xs">
                {contextSummary.map(item => (
                  <span key={item} className="rounded-xl bg-white px-mx-sm py-mx-xs text-xs font-bold text-muted-foreground shadow-mx-xs">{item}</span>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submitRequest} className="mt-mx-md space-y-mx-md">
            <div className="grid grid-cols-1 gap-mx-md md:grid-cols-2">
              <label className="space-y-mx-xs text-sm font-bold text-muted-foreground">
                Assunto
                <Input value={subject} onChange={event => setSubject(event.target.value)} maxLength={180} required />
              </label>
              <label className="space-y-mx-xs text-sm font-bold text-muted-foreground">
                Tipo da solicitação
                <select value={requestType} onChange={event => setRequestType(event.target.value)} className="h-12 w-full rounded-xl border border-gray-200 bg-white px-mx-md text-sm font-bold text-foreground focus-visible:border-mx-action focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20">
                  {requestTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>

            <label className="block space-y-mx-xs text-sm font-bold text-muted-foreground">
              Mensagem
              <textarea value={message} onChange={event => setMessage(event.target.value)} rows={6} maxLength={5000} required className="w-full resize-y rounded-xl border border-gray-200 bg-white px-mx-md py-mx-sm text-sm font-bold text-foreground shadow-none placeholder:text-mx-subtle focus-visible:border-mx-action focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20" placeholder="Descreva a decisão, dúvida ou análise necessária." />
            </label>

            <div className="grid grid-cols-1 gap-mx-md sm:grid-cols-[180px_minmax(0,1fr)]">
              <label className="space-y-mx-xs text-sm font-bold text-muted-foreground">
                Prioridade
                <select value={priority} onChange={event => setPriority(event.target.value)} className="h-12 w-full rounded-xl border border-gray-200 bg-white px-mx-md text-sm font-bold text-foreground focus-visible:border-mx-action focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20">
                  {priorities.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <div className="rounded-2xl bg-gray-50 p-mx-md text-sm font-bold text-muted-foreground">
                <strong className="text-foreground">Empresa:</strong> {contact?.client_name || storeName}<br />
                <strong className="text-foreground">Consultor:</strong> {contactName}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="min-w-[188px]" disabled={submitting || !storeId}>
                {submitting ? <><RefreshCw size={17} className="animate-spin" /> Enviando...</> : <><Send size={17} /> Enviar solicitação</>}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <Card className="border bg-white p-mx-lg">
        <div className="flex items-center gap-mx-sm">
          <Clock3 size={21} className="text-emerald-600" />
          <div>
            <Typography variant="h3" className="text-xl">Histórico de solicitações</Typography>
            <Typography variant="tiny" tone="muted" className="mt-mx-tiny block font-bold normal-case">Últimos registros persistidos para esta loja.</Typography>
          </div>
        </div>

        <div className="mt-mx-md space-y-mx-sm">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-gray-50" />
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-mx-lg text-center">
              <UserRoundCheck size={26} className="mx-auto text-muted-foreground" />
              <p className="mt-mx-sm text-sm font-bold text-foreground">Nenhuma solicitação registrada</p>
              <p className="mt-mx-xs text-xs font-bold text-muted-foreground">O primeiro envio aparecerá aqui com status e data.</p>
            </div>
          ) : requests.map(request => (
            <div key={request.id} className="flex flex-col gap-mx-sm rounded-2xl border border-gray-200 p-mx-md md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{request.subject}</p>
                <p className="mt-mx-tiny text-xs font-bold text-muted-foreground">
                  {requestTypeLabels[request.request_type] || request.request_type} · {new Date(request.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-mx-xs">
                <span className="rounded-xl bg-gray-50 px-mx-sm py-mx-xs text-xs font-bold text-muted-foreground">{request.priority}</span>
                <span className={request.status === 'respondida' || request.status === 'encerrada' ? 'rounded-xl bg-status-success-surface px-mx-sm py-mx-xs text-xs font-bold text-status-success' : 'rounded-xl bg-status-info-surface px-mx-sm py-mx-xs text-xs font-bold text-status-info'}>
                  {request.status === 'respondida' || request.status === 'encerrada' ? <CheckCircle2 size={13} className="mr-1 inline" /> : <Clock3 size={13} className="mr-1 inline" />}
                  {statusLabels[request.status] || request.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageCanvas>
  )
}
