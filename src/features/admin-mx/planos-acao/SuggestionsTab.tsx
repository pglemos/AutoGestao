import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Eye, Send, XCircle } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
  MxTextarea,
} from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import {
  dismissSuggestion,
  fetchActionPlanSuggestions,
  isSuggestionPromoted,
  nextSuggestionActions,
  publishSuggestionToOwner,
  SUGGESTION_STATUS_LABEL,
  validateSuggestion,
  type ActionPlanSuggestion,
} from './actionPlanSuggestions'
import { suggestionPriorityToPlanPriority } from './actionPlanSuggestions'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

/**
 * Sugestões ao Dono (Base44 `SuggestionsTab`): valida, publica, descarta e
 * visualiza como Dono cada sugestão gerada pelo motor ou manualmente.
 */
export function SuggestionsTab() {
  const { supabaseUser } = useAuth()
  const [rows, setRows] = useState<ActionPlanSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<ActionPlanSuggestion | null>(null)
  const [dismissReason, setDismissReason] = useState('')
  const [preview, setPreview] = useState<ActionPlanSuggestion | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchActionPlanSuggestions()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const statuses = useMemo(() => [...new Set(rows.map(item => item.status))], [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(item => {
      if (statusFilter && item.status !== statusFilter) return false
      if (!term) return true
      return [item.problem, item.recommendation, item.rule_code].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, statusFilter])

  const runAction = async (suggestionId: string, action: 'validar' | 'publicar' | 'descartar') => {
    if (busyId || !supabaseUser) return
    if (action === 'descartar') {
      const suggestion = rows.find(item => item.id === suggestionId)
      if (suggestion) {
        setDismissing(suggestion)
        setDismissReason('')
      }
      return
    }
    setBusyId(suggestionId)
    try {
      const result = action === 'validar'
        ? await validateSuggestion(suggestionId, supabaseUser.id)
        : await publishSuggestionToOwner(suggestionId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(action === 'validar' ? 'Sugestão validada.' : 'Sugestão publicada para o Dono.')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const submitDismiss = async () => {
    if (busyId || !dismissing) return
    setBusyId(dismissing.id)
    try {
      const result = await dismissSuggestion(dismissing.id, dismissReason)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Sugestão descartada.')
      setDismissing(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = rows.filter(item => !isSuggestionPromoted(item)).length

  return (
    <>
      <MxSectionCard>
        <MxSectionHeader title="Sugestões ao Dono" description={`${pendingCount} sugestão(ões) ainda não convertida(s) em plano.`} />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por problema ou regra..." aria-label="Buscar sugestão" />
            <MxSelect aria-label="Filtrar por status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="">Todos os status</option>
              {statuses.map(status => <option key={status} value={status}>{SUGGESTION_STATUS_LABEL[status as keyof typeof SUGGESTION_STATUS_LABEL] ?? status}</option>)}
            </MxSelect>
          </div>

          {loading ? <MxLoadingState label="Carregando sugestões" /> : error ? <MxErrorState description={error} retry={() => void load()} /> : filtered.length ? (
            <MxTableSurface>
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Problema</TableHead>
                    <TableHead>Recomendação</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => {
                    const actions = isSuggestionPromoted(item) ? [] : nextSuggestionActions(item.status)
                    const priority = suggestionPriorityToPlanPriority(item.priority)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-[260px]">{item.problem || '—'}</TableCell>
                        <TableCell className="max-w-[280px]">{item.recommendation || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.rule_code || '—'}</TableCell>
                        <TableCell className="text-xs">{priority}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {SUGGESTION_STATUS_LABEL[item.status] ?? item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="icon" aria-label="Visualizar como Dono" onClick={() => setPreview(item)}>
                              <Eye size={14} />
                            </Button>
                            {actions.includes('validar') ? (
                              <Button variant="outline" size="sm" disabled={busyId === item.id} onClick={() => void runAction(item.id, 'validar')}>
                                <CheckCircle2 size={14} />Validar
                              </Button>
                            ) : null}
                            {actions.includes('publicar') ? (
                              <Button size="sm" disabled={busyId === item.id} onClick={() => void runAction(item.id, 'publicar')}>
                                <Send size={14} />Publicar ao Dono
                              </Button>
                            ) : null}
                            {actions.includes('descartar') ? (
                              <Button variant="outline" size="sm" disabled={busyId === item.id} onClick={() => void runAction(item.id, 'descartar')}>
                                <XCircle size={14} />Descartar
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          ) : (
            <MxEmptyState title="Nenhuma sugestão encontrada" description="Sugestões enviadas ao Dono aparecerão aqui." />
          )}
        </div>
      </MxSectionCard>

      <Modal
        open={Boolean(dismissing)}
        onClose={() => setDismissing(null)}
        title="Descartar sugestão"
        size="md"
        closeOnEscape={!busyId}
        footer={(
          <>
            <Button variant="outline" onClick={() => setDismissing(null)} disabled={Boolean(busyId)}>Cancelar</Button>
            <Button onClick={() => void submitDismiss()} disabled={Boolean(busyId) || !dismissReason.trim()}>
              {busyId ? 'Descartando...' : 'Confirmar descarte'}
            </Button>
          </>
        )}
      >
        <div className="mt-5 space-y-4">
          {dismissing ? (
            <>
              <MxStatusBanner tone="neutral">
                <div className="font-medium text-foreground">{dismissing.problem || 'Sugestão'}</div>
                <div className="mt-1 text-sm text-muted-foreground">{dismissing.recommendation || ''}</div>
              </MxStatusBanner>
              <MxTextarea rows={2} value={dismissReason} onChange={event => setDismissReason(event.target.value)} placeholder="Informe o motivo do descarte..." />
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Visualizar como Dono"
        size="md"
        footer={<Button onClick={() => setPreview(null)}>Fechar</Button>}
      >
        <div className="mt-5 space-y-4">
          {preview ? (
            <>
              <MxStatusBanner tone="info">Prévia de como a sugestão aparece para o Dono.</MxStatusBanner>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-lg font-bold text-foreground">{preview.problem || 'Sugestão de melhoria'}</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{preview.rule_code || 'sugestão'}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{suggestionPriorityToPlanPriority(preview.priority)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{preview.recommendation || '—'}</p>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
