import { useEffect, useState } from 'react'
import DetailDrawer from '@/components/owner/DetailDrawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/atoms/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/atoms/Textarea'
import { MONTHS, MONTHS_FULL, SELECTED_MONTH_INDEX, formatCellValue, consolidateValues, getConsolidatedLabel, AREA_STYLES } from './strategicUtils'
import { DIRECTION_LABELS, AGGREGATION_LABELS, FORMAT_LABELS } from './strategicIndicatorCatalog'
import { toast } from '@/lib/toast'
import { useAuth } from '@/features/owner/lib/ownerAuth'
import { ShoppingCart, Megaphone, Package, Wallet, Settings } from 'lucide-react'

const AREA_ICONS = { Vendas: ShoppingCart, Marketing: Megaphone, Estoque: Package, Financeiro: Wallet, Operacional: Settings }

export default function EditTargetsDrawer({ repository, open, onOpenChange, indicator, year, onSaved }) {
  const { user } = useAuth()
  const [values, setValues] = useState(Array(12).fill(''))
  const [errors, setErrors] = useState({})
  const [note, setNote] = useState('')
  const [originalValues, setOriginalValues] = useState([])

  useEffect(() => {
    if (!open || !indicator) return
    const series = repository.getIndicatorSeries(indicator.id, year)
    const original = (series?.targetValues || Array(12).fill(null)).map(value => value == null ? '' : String(value))
    setValues(original)
    setOriginalValues(original)
    setErrors({})
    setNote('')
  }, [open, indicator, year, repository])

  if (!indicator) return null
  const areaStyle = AREA_STYLES[indicator.area] || {}
  const AreaIcon = AREA_ICONS[indicator.area]

  const parseValue = raw => {
    if (raw === '' || raw === null || raw === undefined) return null
    const normalized = String(raw).replace(/\./g, '').replace(',', '.')
    const value = Number.parseFloat(normalized)
    return Number.isFinite(value) ? value : null
  }
  const validate = raw => {
    const value = parseValue(raw)
    if (raw === '' || raw === null) return 'Campo obrigatório'
    if (value === null) return 'Valor inválido'
    if (value < 0 && indicator.displayFormat !== 'currency') return 'Não pode ser negativo'
    if (indicator.displayFormat === 'percentage' && (value < 0 || value > 100)) return 'Deve estar entre 0 e 100'
    if (indicator.displayFormat === 'rating' && (value < 0 || value > 5)) return 'Deve estar entre 0 e 5'
    return null
  }
  const change = (index, raw) => {
    setValues(current => current.map((value, position) => position === index ? raw : value))
    setErrors(current => ({ ...current, [index]: validate(raw) }))
  }
  const applyJanuary = () => {
    const error = validate(values[0])
    if (error) {
      toast.error('Corrija Janeiro antes de replicar.')
      return
    }
    setValues(Array(12).fill(values[0]))
    setErrors({})
  }
  const save = async () => {
    const nextErrors = Object.fromEntries(values.map((raw, index) => [index, validate(raw)]).filter(([, error]) => error))
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      toast.error('Corrija os campos destacados.')
      return
    }
    try {
      await repository.updateTargets(indicator.id, year, values.map(parseValue), user, note)
      toast.info('Metas atualizadas com sucesso.')
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível atualizar as metas.', { description: error instanceof Error ? error.message : 'Erro desconhecido' })
    }
  }

  const consolidated = consolidateValues(values.map(value => parseValue(value) || 0), indicator.aggregationMode, SELECTED_MONTH_INDEX)
  const changedCount = values.filter((value, index) => value !== originalValues[index]).length

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Metas"
      description={`${indicator.name} (${indicator.code}) · ${indicator.area} · ${DIRECTION_LABELS[indicator.direction]} · ${year}`}
      footer={<div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save}>Salvar alterações</Button></div>}
    >
      <div className="space-y-4">
        <div className={`-mx-5 -mt-5 border-b px-5 py-3 ${areaStyle.lightBg || 'bg-muted/30'} ${areaStyle.border || 'border-border'}`}>
          <div className="flex items-center gap-3">
            {AreaIcon ? <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${areaStyle.iconBg}`}><AreaIcon className="h-5 w-5" /></div> : null}
            <div><p className="text-sm font-semibold">{indicator.name}</p><div className="mt-0.5 flex gap-1.5"><span className={`rounded px-1.5 py-0.5 text-xs ${areaStyle.bg} ${areaStyle.text}`}>{indicator.area}</span><span className="rounded border px-1.5 py-0.5 text-xs">{AGGREGATION_LABELS[indicator.aggregationMode]}</span></div></div>
          </div>
        </div>
        <div className="rounded-lg border bg-surface-alt p-3"><div className="flex justify-between"><div><p className="text-xs text-muted-foreground">{getConsolidatedLabel(indicator.aggregationMode, SELECTED_MONTH_INDEX)}</p><p className="text-lg font-bold">{formatCellValue(consolidated, indicator.displayFormat, indicator.decimalPlaces)}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Formato</p><p className="text-sm font-medium">{FORMAT_LABELS[indicator.displayFormat]}</p></div></div>{changedCount ? <p className="mt-2 text-xs font-medium text-status-warning-text">{changedCount} mês(es) alterado(s)</p> : null}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MONTHS.map((month, index) => <div key={month}><Label className="mb-1 block text-xs">{MONTHS_FULL[index]}</Label><Input value={values[index]} onChange={event => change(index, event.target.value)} className={`h-9 ${errors[index] ? 'border-status-error' : values[index] !== originalValues[index] ? 'border-amber-400 bg-status-warning-surface' : ''}`} />{errors[index] ? <p className="mt-0.5 text-xs text-status-error-text">{errors[index]}</p> : null}</div>)}
        </div>
        <Button variant="outline" size="sm" onClick={applyJanuary}>Aplicar valor de Janeiro a todos os meses</Button>
        <div><Label className="mb-1 block text-sm">Justificativa da alteração</Label><Textarea value={note} onChange={event => setNote(event.target.value)} rows={2} /></div>
        <p className="text-xs text-muted-foreground">Alterado por: {user?.full_name || user?.email || 'Usuário'}</p>
      </div>
    </DetailDrawer>
  )
}
