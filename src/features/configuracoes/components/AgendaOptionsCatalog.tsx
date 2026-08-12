import { useMemo, useState, type FormEvent } from 'react'
import { toast } from '@/lib/toast'
import { Archive, Edit3, ListChecks, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { Modal } from '@/components/organisms/Modal'
import { cn } from '@/lib/utils'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import {
  useAgendaOptions,
  type AgendaOption,
  type AgendaOptionKind,
  type AgendaOptionStatus,
} from '@/hooks/useAgendaOptions'

type AgendaOptionForm = {
  kind: AgendaOptionKind
  label: string
  status: AgendaOptionStatus
  sort_order: string
}

const defaultForm: AgendaOptionForm = {
  kind: 'visit_reason',
  label: '',
  status: 'ativo',
  sort_order: '0',
}

const KIND_META: Record<AgendaOptionKind, { label: string; description: string }> = {
  visit_reason: {
    label: 'Assuntos',
    description: 'Motivos, temas e pautas exibidos nos formulários da agenda.',
  },
  target_audience: {
    label: 'Alvos',
    description: 'Públicos ou grupos usados na agenda e nas visitas.',
  },
}

function toForm(option: AgendaOption): AgendaOptionForm {
  return {
    kind: option.kind,
    label: option.label,
    status: option.status,
    sort_order: String(option.sort_order ?? 0),
  }
}

function getStatusVariant(status: AgendaOptionStatus) {
  return status === 'ativo' ? 'success' as const : 'ghost' as const
}

export function AgendaOptionsCatalog({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const {
    options,
    loading,
    error,
    canManage,
    refetch,
    createOption,
    updateOption,
    archiveOption,
    deleteOption,
  } = useAgendaOptions()
  const mayManage = canManage && !isReadOnly
  const [activeKind, setActiveKind] = useState<AgendaOptionKind>('visit_reason')
  const [statusFilter, setStatusFilter] = useState<AgendaOptionStatus | 'todos'>('ativo')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOption, setEditingOption] = useState<AgendaOption | null>(null)
  const [form, setForm] = useState<AgendaOptionForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return options
      .filter((option) => option.kind === activeKind)
      .filter((option) => statusFilter === 'todos' || option.status === statusFilter)
      .filter((option) => !term || option.label.toLowerCase().includes(term))
  }, [activeKind, options, searchTerm, statusFilter])

  const metrics = useMemo(() => {
    const visible = options.filter((option) => option.kind === activeKind)
    return {
      total: visible.length,
      ativos: visible.filter((option) => option.status === 'ativo').length,
      arquivados: visible.filter((option) => option.status === 'arquivado').length,
    }
  }, [activeKind, options])

  const openCreateForm = () => {
    setEditingOption(null)
    setForm({ ...defaultForm, kind: activeKind })
    setShowForm(true)
  }

  const openEditForm = (option: AgendaOption) => {
    setEditingOption(option)
    setForm(toForm(option))
    setShowForm(true)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!mayManage) {
      toast.error('Apenas Administrador MX e Admin Master podem gerenciar assuntos da agenda.')
      return
    }

    const payload = {
      kind: form.kind,
      label: form.label.trim(),
      status: form.status,
      sort_order: Number(form.sort_order) || 0,
    }
    if (!payload.label) {
      toast.error('Informe o nome da opção.')
      return
    }

    setSaving(true)
    const { error: saveError } = editingOption
      ? await updateOption(editingOption.id, payload)
      : await createOption(payload)
    setSaving(false)

    if (saveError) {
      toast.error(saveError)
      return
    }

    toast.success(editingOption ? 'Opção atualizada.' : 'Opção criada.')
    setShowForm(false)
    setEditingOption(null)
    setForm(defaultForm)
  }

  const handleArchive = (option: AgendaOption) => {
    requestToastConfirmation({
      key: `archive-agenda-option:${option.id}`,
      title: `Arquivar "${option.label}"?`,
      description: 'A opção sai dos selects novos, mas os agendamentos antigos continuam com o texto salvo.',
      label: 'Arquivar',
      onConfirm: async () => {
        const { error: archiveError } = await archiveOption(option.id)
        if (archiveError) toast.error(archiveError)
        else toast.success('Opção arquivada.')
      },
    })
  }

  const handleDelete = (option: AgendaOption) => {
    requestToastConfirmation({
      key: `delete-agenda-option:${option.id}`,
      title: `Excluir "${option.label}"?`,
      description: 'Isso remove a opção do catálogo. O histórico já salvo não é alterado.',
      label: 'Excluir',
      onConfirm: async () => {
        const { error: deleteError } = await deleteOption(option.id)
        if (deleteError) toast.error(deleteError)
        else toast.success('Opção excluída.')
      },
    })
  }

  return (
    <div className="space-y-mx-lg">
      <Card className="border-none bg-white p-mx-sm">
        <div className="grid grid-cols-1 gap-mx-sm lg:flex lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-mx-xs">
            {(Object.keys(KIND_META) as AgendaOptionKind[]).map((kind) => {
              const active = kind === activeKind
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveKind(kind)}
                  className={cn(
                    'min-h-mx-14 rounded-2xl px-4 text-left transition-all',
                    active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-50 text-muted-foreground hover:bg-border-default',
                  )}
                >
                  <span className="block text-xs font-bold uppercase tracking-widest">{KIND_META[kind].label}</span>
                  <span className="mt-1 block text-mx-micro font-bold uppercase tracking-widest opacity-70">{KIND_META[kind].description}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-mx-xs sm:flex sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setRefreshing(true)
                refetch().finally(() => setRefreshing(false))
              }}
              aria-label="Atualizar assuntos da agenda"
              className="rounded-2xl bg-white"
            >
              <RefreshCw size={18} className={cn(refreshing && 'animate-spin')} />
            </Button>
            {mayManage && (
              <Button onClick={openCreateForm} className="">
                <Plus size={18} className="mr-2" /> NOVA OPÇÃO
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-mx-sm sm:grid-cols-3">
        {[
          ['Total', metrics.total],
          ['Ativos', metrics.ativos],
          ['Arquivados', metrics.arquivados],
        ].map(([label, value]) => (
          <Card key={label} className="border-none bg-white p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="block text-mx-micro">
              {label}
            </Typography>
            <Typography variant="h2" className="mt-1 text-2xl">{value}</Typography>
          </Card>
        ))}
      </div>

      <Card className="border-none bg-white p-mx-sm sm:p-mx-md">
        <div className="grid grid-cols-1 gap-mx-xs sm:grid-cols-3">
          <Select
            id="agenda-options-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AgendaOptionStatus | 'todos')}
            aria-label="Filtrar status"
            className="!h-mx-10 !py-1.5 text-xs uppercase tracking-widest"
          >
            <option value="ativo">Ativos</option>
            <option value="arquivado">Arquivados</option>
            <option value="todos">Todos</option>
          </Select>
          <div className="relative min-w-0 sm:col-span-2">
            <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="BUSCAR OPÇÃO..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="!h-mx-10 !pl-11 !text-mx-tiny uppercase tracking-widest"
            />
          </div>
        </div>
      </Card>

      {error && (
        <Card className="border-none bg-status-warning/10 p-mx-md">
          <Typography variant="tiny" tone="muted" className="">
            Não foi possível carregar o catálogo oficial: {error}
          </Typography>
        </Card>
      )}

      {!mayManage && (
        <Card className="border-none /5 p-mx-md">
          <Typography variant="tiny" tone="muted" className="">
            Somente Administrador MX e Admin Master podem editar, arquivar ou excluir opções.
          </Typography>
        </Card>
      )}

      <section aria-live="polite">
        {loading ? (
          <Card className="border-none bg-white p-mx-lg">
            <div className="flex items-center gap-mx-sm text-emerald-600">
              <RefreshCw size={18} className="animate-spin" />
              <Typography variant="caption" className="">Carregando catálogo...</Typography>
            </div>
          </Card>
        ) : filteredOptions.length === 0 ? (
          <Card className="border-none bg-white">
            <EmptyState
              size="lg"
              icon={<ListChecks />}
              title="Nenhuma opção encontrada"
              description="Crie uma opção ou ajuste os filtros do catálogo."
              nextStep="Use o formulário acima para cadastrar a primeira opção ou revise o termo pesquisado."
            />
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-mx-sm">
            {filteredOptions.map((option) => (
              <li key={option.id}>
                <Card className="border-none bg-white p-mx-md">
                  <div className="grid grid-cols-1 gap-mx-md lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="mb-mx-xs flex flex-wrap items-center gap-mx-xs">
                        <Badge variant={getStatusVariant(option.status)} className="text-mx-micro">{option.status}</Badge>
                        <Badge variant="outline" className="text-mx-micro">Ordem {option.sort_order ?? 0}</Badge>
                      </div>
                      <Typography variant="p" className="leading-snug">{option.label}</Typography>
                    </div>
                    {mayManage && (
                      <div className="grid grid-cols-3 gap-mx-xs sm:flex">
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(option)} className="text-emerald-600">
                          <Edit3 size={14} className="mr-2" /> EDITAR
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(option)} className="text-muted-foreground" disabled={option.status === 'arquivado'}>
                          <Archive size={14} className="mr-2" /> ARQUIVAR
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(option)} className="text-status-error">
                          <Trash2 size={14} className="mr-2" /> EXCLUIR
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingOption(null)
        }}
        title={editingOption ? 'Editar Opção da Agenda' : 'Nova Opção da Agenda'}
        description="Estas opções alimentam os campos de assunto/motivo e alvo da Agenda MX"
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => {
              setShowForm(false)
              setEditingOption(null)
            }}>
              CANCELAR
            </Button>
            <Button type="submit" form="agenda-option-form" disabled={saving} className="">
              {saving ? 'SALVANDO...' : editingOption ? 'SALVAR ALTERAÇÕES' : 'CRIAR OPÇÃO'}
            </Button>
          </>
        }
      >
        <form id="agenda-option-form" onSubmit={handleSubmit} className="space-y-mx-lg">
          <div className="grid grid-cols-1 gap-mx-md sm:grid-cols-3">
            <Select
              id="agenda-option-kind"
              label="Tipo"
              value={form.kind}
              onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as AgendaOptionKind }))}
            >
              <option value="visit_reason">Assunto</option>
              <option value="target_audience">Alvo</option>
            </Select>
            <Select
              id="agenda-option-status"
              label="Status"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AgendaOptionStatus }))}
            >
              <option value="ativo">Ativo</option>
              <option value="arquivado">Arquivado</option>
            </Select>
            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="agenda-option-order" variant="caption" className="">
                Ordem
              </Typography>
              <Input
                id="agenda-option-order"
                type="number"
                min="0"
                max="999"
                value={form.sort_order}
                onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-option-label" variant="caption" className="">
              Nome da opção *
            </Typography>
            <Input
              id="agenda-option-label"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Ex: Reunião de acompanhamento"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
