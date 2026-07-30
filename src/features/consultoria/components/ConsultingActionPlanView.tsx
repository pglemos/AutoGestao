import type React from 'react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { useConsultingActionPlan } from '@/hooks/useConsultingActionPlan'
import { useConsultingMetrics } from '@/hooks/useConsultingMetrics'
import type { ConsultingActionItem } from '@/lib/schemas/consulting-client.schema'

type Props = {
  clientId: string
}

const statusLabel: Record<ConsultingActionItem['status'], string> = {
  nao_iniciado: 'Nao iniciado',
  em_andamento: 'Em andamento',
  atrasado: 'Atrasado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
}

const statusVariant: Record<ConsultingActionItem['status'], 'outline' | 'warning' | 'success' | 'danger'> = {
  nao_iniciado: 'outline',
  em_andamento: 'warning',
  atrasado: 'danger',
  realizado: 'success',
  cancelado: 'danger',
}

export function ConsultingActionPlanView({ clientId }: Props) {
  const { items, loading, error, createItem, updateItem } = useConsultingActionPlan(clientId)
  const metrics = useConsultingMetrics(clientId)
  const [form, setForm] = useState({
    action: '',
    how: '',
    owner_name: '',
    due_date: '',
    metric_key: '',
    priority: '2',
    efficacy: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.action.trim()) {
      toast.error('Descreva a acao do plano.')
      return
    }

    setSubmitting(true)
    const { error: createError } = await createItem({
      action: form.action,
      how: form.how,
      owner_name: form.owner_name,
      due_date: form.due_date,
      metric_key: form.metric_key || null,
      priority: Number(form.priority) as 1 | 2 | 3,
      efficacy: form.efficacy,
    })
    setSubmitting(false)

    if (createError) {
      toast.error(createError)
      return
    }

    toast.success('Plano de acao criado.')
    setForm({ action: '', how: '', owner_name: '', due_date: '', metric_key: '', priority: '2', efficacy: '' })
  }

  const handleStatusChange = async (item: ConsultingActionItem, status: ConsultingActionItem['status']) => {
    const { error: updateError } = await updateItem(item.id, {
      status,
      completed_at: status === 'realizado' ? new Date().toISOString().slice(0, 10) : null,
    })
    if (updateError) {
      toast.error(updateError)
      return
    }
    toast.success('Status atualizado.')
  }

  if (loading || metrics.loading) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="p">Carregando plano de acao...</Typography>
      </Card>
    )
  }

  if (error || metrics.error) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="h3" tone="error">Plano indisponivel</Typography>
        <Typography variant="p" tone="muted">{error || metrics.error}</Typography>
      </Card>
    )
  }

  return (
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-mx-lg">
      <Card className="p-mx-lg border-none bg-white xl:col-span-2">
        <div className="flex items-start justify-between gap-mx-md mb-mx-md">
          <div>
            <Typography variant="h3">PLANO DE AÇÃO</Typography>
            <Typography variant="caption" tone="muted">
              Acoes com responsavel, prazo, prioridade, status, eficacia e indicador vinculado.
            </Typography>
          </div>
          <Badge variant="outline" className="rounded-mx-full px-3 py-1">
            {items.length} ACOES
          </Badge>
        </div>

        <div className="space-y-mx-sm">
          {items.length === 0 && (
            <Typography variant="p" tone="muted">Nenhuma acao cadastrada ainda.</Typography>
          )}
          {items.map((item) => (
            <div key={item.id} className="p-mx-md rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-mx-md">
                <div className="space-y-mx-xs">
                  <div className="flex items-center gap-mx-sm">
                    <Badge variant={item.priority === 1 ? 'danger' : item.priority === 2 ? 'warning' : 'outline'} className="rounded-mx-full px-3 py-1">
                      P{item.priority}
                    </Badge>
                    <Typography variant="p" className="">{item.action}</Typography>
                  </div>
                  {item.how && <Typography variant="p" className="text-sm">{item.how}</Typography>}
                  <Typography variant="tiny" tone="muted">
                    {item.metric?.label || item.metric_key || 'Sem indicador'} • {item.owner_name || 'Sem responsavel'} • {item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                  </Typography>
                  {item.efficacy && (
                    <Typography variant="tiny" tone="muted">Eficacia esperada: {item.efficacy}</Typography>
                  )}
                </div>
                <div className="flex items-center gap-mx-sm shrink-0">
                  <Badge variant={statusVariant[item.status]} className="rounded-mx-full px-3 py-1">
                    {statusLabel[item.status]}
                  </Badge>
                  <Select
                    aria-label="Atualizar status"
                    value={item.status}
                    onChange={(event) => handleStatusChange(item, event.target.value as ConsultingActionItem['status'])}
                    className="w-mx-48"
                  >
                    <option value="nao_iniciado">Nao iniciado</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="realizado">Realizado</option>
                    <option value="cancelado">Cancelado</option>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="h3" className="mb-mx-md">NOVA AÇÃO</Typography>
        <form onSubmit={handleCreate} className="space-y-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="pmr-action" variant="caption">Acao *</Typography>
            <Textarea aria-label="Acao *"
              id="pmr-action"
              value={form.action}
              onChange={(event) => setForm((current) => ({ ...current, action: event.target.value }))}
              className="min-h-mx-24"
            />
          </div>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="pmr-action-how" variant="caption">Como sera executado</Typography>
            <Textarea aria-label="Como sera executado"
              id="pmr-action-how"
              value={form.how}
              onChange={(event) => setForm((current) => ({ ...current, how: event.target.value }))}
              className="min-h-mx-20"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="pmr-action-owner" variant="caption">Responsavel</Typography>
              <Input aria-label="Responsavel" id="pmr-action-owner" value={form.owner_name} onChange={(event) => setForm((current) => ({ ...current, owner_name: event.target.value }))} />
            </div>
            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="pmr-action-due" variant="caption">Prazo</Typography>
              <Input aria-label="Prazo" id="pmr-action-due" type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} />
            </div>
          </div>
          <Select
            label="Indicador vinculado"
            value={form.metric_key}
            onChange={(event) => setForm((current) => ({ ...current, metric_key: event.target.value }))}
          >
            <option value="">Sem indicador...</option>
            {metrics.catalog.map((metric) => (
              <option key={metric.metric_key} value={metric.metric_key}>{metric.label}</option>
            ))}
          </Select>
          <Select
            label="Prioridade"
            value={form.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
          >
            <option value="1">1 - Alta</option>
            <option value="2">2 - Media</option>
            <option value="3">3 - Baixa</option>
          </Select>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="pmr-action-efficacy" variant="caption">Eficacia esperada</Typography>
            <Input aria-label="Eficacia esperada" id="pmr-action-efficacy" value={form.efficacy} onChange={(event) => setForm((current) => ({ ...current, efficacy: event.target.value }))} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'SALVANDO...' : 'CRIAR ACAO'}
          </Button>
        </form>
      </Card>
    </section>
  )
}
