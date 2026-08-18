import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, RefreshCw, UserPlus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxSectionCard, MxSectionHeader, MxStatusBanner, MxSelect } from '@/components/module/MxModuleVisualPrimitives'
import { Modal } from '@/components/organisms/Modal'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import {
  APROVACAO_PAPEIS,
  INSCRICAO_VISOES_PADRAO,
  INSCRICAO_STATUS_LABELS,
  emptyAprovacaoDraft,
  validateAprovacaoDraft,
  type AprovacaoDraft,
  type InscricaoRow,
} from './inscricaoAutocadastro'
import {
  approveInscricao,
  devolverInscricao,
  fetchInscricoesPendentes,
  rejeitarInscricao,
} from './inscricaoAutocadastroMutations'
import { supabase } from '@/lib/supabase'

type LojaOption = { id: string; name: string }

async function fetchLojasDoCliente(clientId: string): Promise<LojaOption[]> {
  const { data } = await supabase
    .from('unidades_cliente_consultoria')
    .select('id, name')
    .eq('client_id', clientId)
    .order('name', { ascending: true })
  return (data ?? []).map((row: { id: string; name: string }) => ({ id: row.id, name: row.name }))
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

export function InscricoesPendentesPanel() {
  const { supabaseUser } = useAuth()
  const [rows, setRows] = useState<InscricaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, AprovacaoDraft>>({})
  const [lojas, setLojas] = useState<Record<string, LojaOption[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [devolveTarget, setDevolveTarget] = useState<InscricaoRow | null>(null)
  const [rejectTarget, setRejectTarget] = useState<InscricaoRow | null>(null)
  const [devolveMotivo, setDevolveMotivo] = useState('')
  const [rejectMotivo, setRejectMotivo] = useState('')

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchInscricoesPendentes()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const toggleRow = async (inscricao: InscricaoRow) => {
    if (expandedId === inscricao.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(inscricao.id)
    if (!drafts[inscricao.id]) {
      setDrafts(current => ({ ...current, [inscricao.id]: emptyAprovacaoDraft() }))
    }
    if (!lojas[inscricao.client_id]) {
      const options = await fetchLojasDoCliente(inscricao.client_id)
      setLojas(current => ({ ...current, [inscricao.client_id]: options }))
    }
  }

  const updateDraft = (id: string, values: Partial<AprovacaoDraft>) => {
    setDrafts(current => ({ ...current, [id]: { ...(current[id] ?? emptyAprovacaoDraft()), ...values } }))
  }

  const togglePapel = (id: string, value: string) => {
    setDrafts(current => {
      const draft = current[id] ?? emptyAprovacaoDraft()
      const set = new Set(draft.papeis_aprovados)
      if (set.has(value)) set.delete(value)
      else set.add(value)
      return { ...current, [id]: { ...draft, papeis_aprovados: [...set].sort() } }
    })
  }

  const doApprove = async (inscricao: InscricaoRow) => {
    if (!supabaseUser) return
    const draft = drafts[inscricao.id] ?? emptyAprovacaoDraft()
    const invalid = validateAprovacaoDraft(draft)
    if (invalid) {
      toast.error(invalid)
      return
    }
    setSubmitting(true)
    const result = await approveInscricao({ inscricao, draft, reviewedBy: supabaseUser.id })
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Inscrição aprovada e pessoa criada.')
    setExpandedId(null)
    await refetch()
  }

  const doDevolver = async () => {
    if (!devolveTarget || !supabaseUser) return
    setSubmitting(true)
    const result = await devolverInscricao(devolveTarget.id, devolveMotivo, supabaseUser.id)
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Inscrição devolvida.')
    setDevolveTarget(null)
    setDevolveMotivo('')
    await refetch()
  }

  const doRejeitar = async () => {
    if (!rejectTarget || !supabaseUser) return
    setSubmitting(true)
    const result = await rejeitarInscricao(rejectTarget.id, rejectMotivo, supabaseUser.id)
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Inscrição rejeitada.')
    setRejectTarget(null)
    setRejectMotivo('')
    await refetch()
  }

  return (
    <MxSectionCard>
      <MxSectionHeader
        title="Inscrições de autocadastro aguardando validação"
        description="Pessoas que se cadastraram via link público e precisam de aprovação MX antes de acessar."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} aria-label="Atualizar inscrições">
            <RefreshCw size={14} />Atualizar
          </Button>
        }
      />

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Clock3 size={16} className="mr-2 animate-pulse" />Carregando inscrições…
          </div>
        ) : error ? (
          <MxEmptyState title="Não foi possível carregar as inscrições" description={error} icon={UserPlus} />
        ) : rows.length === 0 ? (
          <MxEmptyState
            title="Nenhuma inscrição pendente"
            description="Novas inscrições via link de autocadastro aparecem aqui automaticamente."
            icon={CheckCircle2}
          />
        ) : (
          <div className="space-y-2">
            {rows.map(inscricao => {
              const isExpanded = expandedId === inscricao.id
              const draft = drafts[inscricao.id] ?? emptyAprovacaoDraft()
              const options = lojas[inscricao.client_id] ?? []
              return (
                <div key={inscricao.id} className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => void toggleRow(inscricao)}
                      className="flex items-center gap-3 text-left flex-1"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Recolher inscrição' : 'Expandir inscrição'}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-alt text-xs font-bold text-muted-foreground">
                        {(inscricao.nome.trim().charAt(0) || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{inscricao.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {inscricao.email} · {inscricao.funcao_declarada ?? 'Sem função declarada'} · {formatRelativeDate(inscricao.created_at)}
                        </div>
                      </div>
                    </button>
                    <MxStatusBanner tone={isExpanded ? 'info' : 'neutral'}>
                      {INSCRICAO_STATUS_LABELS[inscricao.status as keyof typeof INSCRICAO_STATUS_LABELS] ?? inscricao.status}
                    </MxStatusBanner>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-surface-alt/40 p-4 space-y-3">
                      <div className="text-xs text-muted-foreground">
                        Cliente: <span className="font-medium text-foreground">{inscricao.client_id}</span>
                        {inscricao.telefone ? ` · Telefone: ${inscricao.telefone}` : ''}
                      </div>

                      <div>
                        <label htmlFor={`inscricao-loja-${inscricao.id}`} className="block text-caption font-medium text-foreground mb-1">Loja de destino *</label>
                        <MxSelect
                          id={`inscricao-loja-${inscricao.id}`}
                          aria-label="Selecionar loja para a inscrição"
                          value={draft.loja_aprovada_id}
                          onChange={event => updateDraft(inscricao.id, { loja_aprovada_id: event.target.value })}
                        >
                          <option value="">Selecione a loja…</option>
                          {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                        </MxSelect>
                      </div>

                      <div>
                        <span id={`inscricao-papeis-${inscricao.id}`} className="block text-caption font-medium text-foreground mb-1">Papéis atribuídos *</span>
                        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`inscricao-papeis-${inscricao.id}`}>
                          {APROVACAO_PAPEIS.map(papel => {
                            const active = draft.papeis_aprovados.includes(papel.value)
                            return (
                              <button
                                key={papel.value}
                                type="button"
                                onClick={() => togglePapel(inscricao.id, papel.value)}
                                className={
                                  active
                                    ? 'rounded-lg border border-brand-primary bg-brand-primary/10 px-3 py-1.5 text-caption font-medium text-brand-primary focus-visible:ring-4 focus-visible:ring-mx-action/20'
                                    : 'rounded-lg border border-border bg-surface px-3 py-1.5 text-caption font-medium text-muted-foreground hover:border-mx-action focus-visible:ring-4 focus-visible:ring-mx-action/20'
                                }
                                aria-pressed={active}
                              >
                                {papel.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`inscricao-visao-${inscricao.id}`} className="block text-caption font-medium text-foreground mb-1">Visão padrão</label>
                        <MxSelect
                          id={`inscricao-visao-${inscricao.id}`}
                          aria-label="Selecionar visão padrão"
                          value={draft.visao_padrao}
                          onChange={event => updateDraft(inscricao.id, { visao_padrao: event.target.value })}
                        >
                          <option value="">Sem visão padrão</option>
                          {INSCRICAO_VISOES_PADRAO.map(visao => <option key={visao} value={visao}>{visao}</option>)}
                        </MxSelect>
                      </div>

                      <div>
                        <label htmlFor={`inscricao-equipe-${inscricao.id}`} className="block text-caption font-medium text-foreground mb-1">Rótulo da equipe</label>
                        <input
                          id={`inscricao-equipe-${inscricao.id}`}
                          type="text"
                          value={draft.equipe_aprovada}
                          onChange={event => updateDraft(inscricao.id, { equipe_aprovada: event.target.value })}
                          placeholder="Ex.: Diretoria / Gestão / Comercial"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-caption text-foreground outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                        <Button variant="outline" size="sm" onClick={() => setDevolveTarget(inscricao)} disabled={submitting}>
                          Devolver
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setRejectTarget(inscricao)} disabled={submitting}>
                          Rejeitar
                        </Button>
                        <Button size="sm" onClick={() => void doApprove(inscricao)} disabled={submitting}>
                          <CheckCircle2 size={14} />Aprovar cadastro
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={devolveTarget !== null}
        onClose={() => { setDevolveTarget(null); setDevolveMotivo('') }}
        title="Devolver inscrição"
        description={devolveTarget ? `Devolver cadastro de ${devolveTarget.nome} para revisão.` : 'Devolver cadastro para revisão.'}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-mx-sm">
            <Button variant="outline" size="sm" onClick={() => { setDevolveTarget(null); setDevolveMotivo('') }} disabled={submitting}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void doDevolver()} loading={submitting}>
              Devolver
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <label htmlFor="inscricao-devolve-motivo" className="block text-caption font-medium text-foreground mb-1">Motivo da devolução *</label>
          <textarea
            id="inscricao-devolve-motivo"
            value={devolveMotivo}
            onChange={event => setDevolveMotivo(event.target.value)}
            rows={3}
            placeholder="Explique o que o cadastrado precisa corrigir."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20"
          />
        </div>
      </Modal>

      <Modal
        open={rejectTarget !== null}
        onClose={() => { setRejectTarget(null); setRejectMotivo('') }}
        title="Rejeitar inscrição"
        description={rejectTarget ? `Rejeitar definitivamente o cadastro de ${rejectTarget.nome}.` : 'Rejeitar cadastro.'}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-mx-sm">
            <Button variant="outline" size="sm" onClick={() => { setRejectTarget(null); setRejectMotivo('') }} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={() => void doRejeitar()} loading={submitting}>
              Rejeitar
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <label htmlFor="inscricao-reject-motivo" className="block text-caption font-medium text-foreground mb-1">Motivo da rejeição *</label>
          <textarea
            id="inscricao-reject-motivo"
            value={rejectMotivo}
            onChange={event => setRejectMotivo(event.target.value)}
            rows={3}
            placeholder="Justifique a rejeição definitiva."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20"
          />
        </div>
      </Modal>
    </MxSectionCard>
  )
}

export default InscricoesPendentesPanel
