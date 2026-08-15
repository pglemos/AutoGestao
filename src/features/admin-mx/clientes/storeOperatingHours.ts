export const OPERATING_HOUR_DAYS = [
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
] as const

export type OperatingHourDay = (typeof OPERATING_HOUR_DAYS)[number]['key']

export type OperatingHourEntry = {
  day_of_week: OperatingHourDay
  is_open: boolean
  opening_time: string
  closing_time: string
}

/** Horário padrão MX da Matriz (fonte: Base44 storeHoursUtils). */
export const DEFAULT_MX_HOURS: OperatingHourEntry[] = [
  { day_of_week: 'monday', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'tuesday', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'wednesday', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'thursday', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'friday', is_open: true, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 'saturday', is_open: true, opening_time: '08:00', closing_time: '14:00' },
  { day_of_week: 'sunday', is_open: false, opening_time: '', closing_time: '' },
]

export type OperatingHoursMap = Record<OperatingHourDay, OperatingHourEntry>

/** Preenche a semana inteira com o padrão MX — base para o editor. */
export function buildDefaultOperatingHours(): OperatingHoursMap {
  return Object.fromEntries(
    OPERATING_HOUR_DAYS.map(day => {
      const entry = DEFAULT_MX_HOURS.find(item => item.day_of_week === day.key)
      return [day.key, entry ?? { day_of_week: day.key, is_open: false, opening_time: '', closing_time: '' }]
    }),
  ) as OperatingHoursMap
}

/** Linha de horário vinda do banco, com tipos soltos para tolerar nulos. */
export type StoredOperatingHourRow = {
  day_of_week?: string | null
  is_open?: boolean | null
  opening_time?: string | null
  closing_time?: string | null
}

/** Normaliza uma lista vinda do banco para o mapa do editor. */
export function mapHoursToEditor(rows: StoredOperatingHourRow[]): OperatingHoursMap {
  const base = buildDefaultOperatingHours()
  for (const row of rows ?? []) {
    const day = (row.day_of_week ?? '') as OperatingHourDay
    if (!(day in base)) continue
    base[day] = {
      day_of_week: day,
      is_open: row.is_open ?? false,
      opening_time: row.is_open ? (row.opening_time ?? '') : '',
      closing_time: row.is_open ? (row.closing_time ?? '') : '',
    }
  }
  return base
}

/** Horário resumido para exibição (ex.: "Seg a Sáb · 08:00 às 18:00"). */
export function summarizeOperatingHours(map: OperatingHoursMap): string {
  const openDays = OPERATING_HOUR_DAYS.filter(day => map[day.key].is_open)
  if (openDays.length === 0) return 'Sem dias abertos'
  const first = openDays[0]
  const last = openDays[openDays.length - 1]
  const range = first === last ? first.short : `${first.short} a ${last.short}`
  const hours = map[first.key]
  const window = hours.is_open && hours.opening_time && hours.closing_time
    ? ` · ${hours.opening_time} às ${hours.closing_time}`
    : ''
  return `${range}${window}`
}

/** Erro de validação do horário, ou vazio se ok. */
export function validateOperatingHours(map: OperatingHoursMap): string {
  for (const day of OPERATING_HOUR_DAYS) {
    const entry = map[day.key]
    if (!entry.is_open) continue
    if (!entry.opening_time || !entry.closing_time) {
      return `Defina abertura e fechamento para ${day.label}.`
    }
    if (entry.closing_time <= entry.opening_time) {
      return `Fechamento de ${day.label} deve ser posterior à abertura.`
    }
  }
  if (!OPERATING_HOUR_DAYS.some(day => map[day.key].is_open)) {
    return 'Defina pelo menos um dia aberto.'
  }
  return ''
}
