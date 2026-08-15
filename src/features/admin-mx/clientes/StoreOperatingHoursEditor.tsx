import { useCallback, useEffect, useState } from 'react'
import { Check, Clock, Copy, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import {
  buildDefaultOperatingHours,
  mapHoursToEditor,
  OPERATING_HOUR_DAYS,
  summarizeOperatingHours,
  validateOperatingHours,
  type OperatingHoursMap,
} from './storeOperatingHours'
import { fetchUnitOperatingHours, saveStoreOperatingHours } from './storeMutations'

export function StoreOperatingHoursEditor(props: {
  unitId: string
  unitName: string
  origin?: string
  onSaved?: () => void
}) {
  const [hours, setHours] = useState<OperatingHoursMap>(buildDefaultOperatingHours)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showRestore, setShowRestore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { rows, error: fetchError } = await fetchUnitOperatingHours(props.unitId)
    setError(fetchError ?? '')
    setHours(mapHoursToEditor(rows))
    setLoading(false)
  }, [props.unitId])

  useEffect(() => { void load() }, [load])

  const patchDay = (day: keyof OperatingHoursMap, values: Partial<OperatingHoursMap[keyof OperatingHoursMap]>) => {
    setHours(current => ({ ...current, [day]: { ...current[day], ...values } }))
  }

  const copyMondayToWeekdays = () => {
    setHours(current => {
      const monday = current.monday
      const next = { ...current }
      for (const day of ['tuesday', 'wednesday', 'thursday', 'friday'] as const) {
        next[day] = { ...monday, day_of_week: day }
      }
      return next
    })
  }

  const copyToAll = () => {
    setHours(current => {
      const monday = current.monday
      const next = { ...current }
      for (const day of OPERATING_HOUR_DAYS) {
        next[day.key] = { ...monday, day_of_week: day.key }
      }
      return next
    })
  }

  const closeWeekend = () => {
    setHours(current => ({
      ...current,
      saturday: { ...current.saturday, is_open: false },
      sunday: { ...current.sunday, is_open: false },
    }))
  }

  const save = async () => {
    const invalid = validateOperatingHours(hours)
    if (invalid) {
      setError(invalid)
      return
    }
    setError('')
    setSaving(true)
    try {
      const { error: saveError } = await saveStoreOperatingHours(props.unitId, hours, props.origin ?? 'Visão 360 — Empresa e Lojas')
      if (saveError) {
        setError(saveError)
        return
      }
      toast.success('Horário de funcionamento salvo.')
      props.onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const restore = async () => {
    setSaving(true)
    try {
      const { error: saveError } = await saveStoreOperatingHours(props.unitId, buildDefaultOperatingHours(), 'Restaurar padrão MX')
      if (saveError) {
        setError(saveError)
        return
      }
      await load()
      toast.success('Horário padrão MX restaurado.')
      props.onSaved?.()
    } finally {
      setSaving(false)
      setShowRestore(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{summarizeOperatingHours(hours)}</span>
        <Button type="button" variant="outline" size="sm" onClick={copyMondayToWeekdays}><Copy size={14} />Copiar seg. p/ úteis</Button>
        <Button type="button" variant="outline" size="sm" onClick={copyToAll}><Copy size={14} />Copiar p/ todos</Button>
        <Button type="button" variant="outline" size="sm" onClick={closeWeekend}><X size={14} />Sáb/Dom fechado</Button>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando horários...</div>
      ) : (
        <div className="space-y-1.5">
          {OPERATING_HOUR_DAYS.map(day => {
            const entry = hours[day.key]
            return (
              <div key={day.key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <span className="w-28 shrink-0 text-xs font-medium text-foreground">{day.label}</span>
                <button
                  type="button"
                  onClick={() => patchDay(day.key, { is_open: !entry.is_open })}
                  className={`shrink-0 rounded-full px-2 py-1 text-caption font-medium ${entry.is_open ? 'bg-status-success-bg text-status-success-text' : 'bg-surface-alt text-muted-foreground'}`}
                >
                  {entry.is_open ? 'Aberto' : 'Fechado'}
                </button>
                {entry.is_open ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <input
                      type="time"
                      aria-label={`Abertura ${day.label}`}
                      value={entry.opening_time}
                      onChange={event => patchDay(day.key, { opening_time: event.target.value })}
                      className="rounded-lg border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">às</span>
                    <input
                      type="time"
                      aria-label={`Fechamento ${day.label}`}
                      value={entry.closing_time}
                      onChange={event => patchDay(day.key, { closing_time: event.target.value })}
                      className="rounded-lg border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-xs text-muted-foreground">—</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={saving || loading} onClick={() => void save()}>
          <Clock size={14} />{saving ? 'Salvando...' : 'Salvar horários'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={saving || loading} onClick={() => setShowRestore(true)}>
          <RotateCcw size={14} />Restaurar padrão MX
        </Button>
      </div>

      {showRestore ? (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-foreground">Restaurar horário padrão MX?</p>
          <p className="mt-1 text-xs text-muted-foreground">O horário atual será arquivado e o padrão MX aplicado (Seg a Sex 08h-18h, Sáb 08h-14h, Dom fechado).</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void restore()}><Check size={14} />Confirmar</Button>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setShowRestore(false)}>Cancelar</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
