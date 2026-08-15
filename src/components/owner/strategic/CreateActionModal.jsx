import { useEffect, useState } from 'react'
import { AlertTriangle, Gauge, Target, TrendingUp } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/atoms/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/atoms/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCellValue, calculatePercentageOfTarget, getStatusFromPercentage, STATUS_STYLES, SELECTED_MONTH_INDEX } from './strategicUtils'
import { toast } from '@/lib/toast'
import { useAuth } from '@/features/owner/lib/ownerAuth'

export default function CreateActionModal({ repository, open, onOpenChange, indicator, year, onCreated }) {
  const { user } = useAuth()
  const [form, setForm] = useState({})

  useEffect(() => {
    if (!open || !indicator) return
    const series = repository.getIndicatorSeries(indicator.id, year)
    if (!series) return
    const index = SELECTED_MONTH_INDEX
    const current = series.currentValues[index]
    const target = series.targetValues[index]
    const percentage = calculatePercentageOfTarget(current, target)
    const status = percentage !== null ? getStatusFromPercentage(percentage, series.direction) : 'neutral'
    const distance = current !== null && target ? target - current : null
    setForm({
      title: `Corrigir desvio em ${indicator.name}`,
      indicatorId: indicator.id,
      indicatorName: indicator.name,
      area: indicator.area,
      status,
      problem: `O indicador está em ${STATUS_STYLES[status]?.label || 'Sem dados'}, com resultado de ${formatCellValue(current, series.displayFormat, series.decimalPlaces)} diante da meta de ${formatCellValue(target, series.displayFormat, series.decimalPlaces)}.`,
      resultado: formatCellValue(current, series.displayFormat, series.decimalPlaces),
      meta: formatCellValue(target, series.displayFormat, series.decimalPlaces),
      distance: distance !== null ? formatCellValue(Math.abs(distance), series.displayFormat, series.decimalPlaces) : '—',
      action: '', responsible: user?.full_name || '', deadline: '',
      priority: status === 'critical' ? 'high' : status === 'attention' ? 'medium' : 'low', note: '',
    })
  }, [open, indicator, year, user, repository])

  if (!indicator) return null
  const statusStyle = STATUS_STYLES[form.status] || STATUS_STYLES.neutral
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = async () => {
    if (!form.title || !form.action) {
      toast.error('Preencha o título e a ação proposta.')
      return
    }
    const existing = repository.getActionItems(indicator.id)?.[0]
    if (existing) {
      toast.info('Já existe um Plano de Ação ativo para este indicador.')
      onCreated?.(existing)
      onOpenChange(false)
      return
    }
    try {
      const created = await repository.createActionItem({ ...form, year, createdBy: user?.full_name || user?.email || 'Usuário' })
      toast.info('Plano de Ação criado com sucesso.')
      onCreated?.(created)
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível criar o Plano de Ação.', { description: error instanceof Error ? error.message : 'Erro desconhecido' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" scrollable>
        <DialogHeader><DialogTitle>Criar Plano de Ação</DialogTitle><DialogDescription>Vincule uma única ação ativa ao indicador selecionado.</DialogDescription></DialogHeader>
        <div className={`rounded-lg border p-3 ${statusStyle.border} ${statusStyle.bg}`}>
          <div className="flex items-center gap-2"><AlertTriangle className={`h-4 w-4 ${statusStyle.text}`} /><span className={`text-sm font-semibold ${statusStyle.text}`}>{statusStyle.label}</span><span className="text-xs text-muted-foreground">· {form.indicatorName}</span></div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[['Meta', form.meta, Target], ['Resultado', form.resultado, TrendingUp], ['Distância', form.distance, Gauge]].map(([label, value, Icon]) => <div key={label} className="rounded-md bg-card/60 p-2"><div className="flex items-center gap-1"><Icon className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">{label}</p></div><p className="mt-0.5 text-sm font-bold">{value || '—'}</p></div>)}
          </div>
        </div>
        <div className="space-y-3">
          <div><Label className="mb-1 block text-sm">Título</Label><Input value={form.title || ''} onChange={event => set('title', event.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label className="mb-1 block text-sm">Indicador</Label><Input value={form.indicatorName || ''} disabled /></div><div><Label className="mb-1 block text-sm">Área</Label><Input value={form.area || ''} disabled /></div></div>
          <div><Label className="mb-1 block text-sm">Problema identificado</Label><Textarea value={form.problem || ''} onChange={event => set('problem', event.target.value)} rows={2} /></div>
          <div><Label className="mb-1 block text-sm">Ação proposta *</Label><Textarea value={form.action || ''} onChange={event => set('action', event.target.value)} rows={3} /></div>
          <div className="grid grid-cols-3 gap-3"><div><Label className="mb-1 block text-sm">Responsável</Label><Input value={form.responsible || ''} onChange={event => set('responsible', event.target.value)} /></div><div><Label className="mb-1 block text-sm">Prazo</Label><Input type="date" value={form.deadline || ''} onChange={event => set('deadline', event.target.value)} /></div><div><Label className="mb-1 block text-sm">Prioridade</Label><Select value={form.priority || 'medium'} onValueChange={value => set('priority', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critical">Crítica</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="low">Baixa</SelectItem></SelectContent></Select></div></div>
          <div><Label className="mb-1 block text-sm">Observação</Label><Textarea value={form.note || ''} onChange={event => set('note', event.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save}>Criar Plano de Ação</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
