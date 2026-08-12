import type { ReactNode } from 'react'
import { CalendarDays, CircleHelp, Search } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { chartTokens } from '@/lib/charts/tokens'
import { cn } from '@/lib/utils'
import { toneClasses, toneHex, vividIconClasses, type KpiTone } from './types'
import { greeting, scoreStatus, scoreTone } from './format'

/**
 * Header dedicado do módulo Dono — não usa o PageHeading canônico do app
 * (subtítulo em caps + ações à direita) porque o Base44 de referência usa
 * título+subtítulo em case normal e o chip de período numa linha própria
 * abaixo, não ao lado do título.
 */
export function OwnerCockpitHeader({
  name,
  periodLabel,
}: {
  name: string
  periodLabel: string
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border pb-mx-md sm:pb-mx-lg">
      <div>
        <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-[2rem]">
          {greeting()}, <span className="text-status-success-text">{name.split(' ')[0]}</span>!
        </h1>
        <p className="mt-mx-tiny text-sm font-medium text-muted-foreground">Aqui está o panorama da sua loja hoje.</p>
      </div>
      <div className="flex shrink-0 items-center gap-mx-sm">
        <div className="inline-flex h-mx-11 items-center gap-mx-xs rounded-mx-full border border-border-subtle bg-white px-mx-md shadow-sm">
          <CalendarDays size={16} className="text-muted-foreground" />
          <Typography variant="tiny" className="">{periodLabel}</Typography>
        </div>
      </div>
    </header>
  )
}

const statusDotClasses: Record<KpiTone, string> = {
  success: 'bg-status-success',
  info: 'bg-status-info',
  warning: 'bg-status-warning',
  danger: 'bg-status-error',
  muted: 'bg-border-default',
  brand: 'bg-emerald-600',
  purple: 'bg-[var(--color-accent-purple)]',
}

const cardBorderClasses: Record<KpiTone, string> = {
  success: 'border-status-success/30',
  info: 'border-status-info/30',
  warning: 'border-amber-200',
  danger: 'border-red-200',
  muted: 'border-border',
  brand: 'border-emerald-200',
  purple: 'border-[var(--color-accent-purple)]/30',
}

const iconBgClasses: Record<KpiTone, string> = {
  success: 'bg-status-success/10 text-status-success',
  info: 'bg-status-info/10 text-status-info',
  warning: 'bg-amber-50 text-status-warning-text',
  danger: 'bg-red-50 text-status-error-text',
  muted: 'bg-gray-50 text-text-secondary',
  brand: 'bg-emerald-50 text-status-success-text',
  purple: 'bg-[var(--color-accent-purple-soft)] text-[var(--color-accent-purple)]',
}

export function OwnerKpiCard({
  title,
  value,
  detail,
  icon,
  tone,
  chart = 'line',
  seed,
  showStatusDot = true,
  statusTone,
  trend,
}: {
  title: string
  value: string
  detail: string
  icon: ReactNode
  tone: KpiTone
  chart?: 'line' | 'bars'
  seed?: number
  showStatusDot?: boolean
  statusTone?: KpiTone
  trend?: { label: string; tone: KpiTone } | null
}) {
  const effectiveStatusTone = statusTone ?? tone
  const borderClass = cardBorderClasses[effectiveStatusTone]
  const iconClass = iconBgClasses[tone]
  return (
    <article
      className={cn('rounded-xl border bg-white p-4 shadow-sm', borderClass)}
      aria-label={title}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconClass)} aria-hidden="true">
          {icon}
        </div>
        {showStatusDot && (
          <span
            className={cn('inline-flex h-2 w-2 rounded-full', statusDotClasses[effectiveStatusTone])}
            role="status"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="mt-2.5 text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground" aria-label={`${title}: ${value}`}>
        {value}
      </p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      <div className="mt-2 flex items-end justify-between gap-2">
        {trend ? (
          <p
            className={cn('text-xs font-medium', toneClasses[trend.tone].text)}
            aria-label={`Tendência: ${trend.label}`}
          >
            {trend.label}
          </p>
        ) : (
          <span />
        )}
        <div className="h-8 w-16 shrink-0" aria-hidden="true">
          <SimpleSparkline tone={effectiveStatusTone} variant={chart} seed={seed} />
        </div>
      </div>
    </article>
  )
}

function SimpleSparkline({
  tone,
  variant = 'line',
  seed = 0,
}: {
  tone: KpiTone
  variant?: 'line' | 'bars'
  seed?: number
}) {
  const colorClass = {
    success: 'text-status-success',
    info: 'text-status-info',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    muted: 'text-muted-foreground',
    brand: 'text-status-success-text',
    purple: 'text-[var(--color-accent-purple)]',
  }[tone]

  const raw = Array.from({ length: 8 }, (_, i) => {
    const v = 12 + Math.sin((i + seed) * 1.1) * 5 + Math.cos((i + seed) * 0.7) * 4
    return Math.max(4, Math.min(26, v + (seed % 3) * i * 0.4))
  })

  if (variant === 'bars') {
    const max = Math.max(...raw)
    return (
      <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
        {raw.map((h, i) => {
          const barW = 10
          const barH = (h / max) * 26
          const x = i * 13 + 1
          const y = 30 - barH
          return <rect key={i} x={x} y={y} width={barW} height={barH} rx={1.5} className={colorClass} fill="currentColor" opacity={0.85} />
        })}
      </svg>
    )
  }

  const min = Math.min(...raw)
  const dataRange = Math.max(Math.max(...raw) - min, 1)
  const points = raw
    .map((v, i) => {
      const x = (i / (raw.length - 1)) * 100
      const y = 28 - ((v - min) / dataRange) * 24 - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={colorClass}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Card do MX Score. Espelha `components/owner/home/MxScoreCard` do Base44:
 * moldura de 100px, número em text-2xl, classificação em case normal e linha
 * de tendência abaixo do medidor.
 */
export function MXScoreCompact({ score, trend }: { score: number | null; trend?: string | null }) {
  const safeScore = Math.min(Math.max(Math.round(score ?? 0), 0), 100)
  const status = scoreStatus(score)
  const tone = scoreTone(score)
  const statusColor = toneClasses[tone].text
  const cx = 60
  const cy = 60
  const radius = 50
  const strokeWidth = 11
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - safeScore / 100)
  return (
    <div className={cn('rounded-xl border bg-white p-4 shadow-sm', cardBorderClasses[tone])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">MX Score da Loja</p>
        <CircleHelp size={16} className="text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="relative mx-auto mt-2 h-[100px] w-[100px]">
        <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`MX Score ${safeScore}: ${status}`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-border-subtle)" strokeWidth={strokeWidth} />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={score === null ? 'var(--color-border-subtle)' : toneHex[tone]()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">{score ?? '--'}</span>
          <span className={cn('text-xs font-medium', statusColor)}>{status}</span>
        </div>
      </div>
      {trend && <p className="mt-2 text-center text-xs font-medium text-status-success-text">{trend}</p>}
    </div>
  )
}

export function MetricPill({ label, value, tone }: { label: string; value: string; tone: KpiTone }) {
  const classes = toneClasses[tone]
  return (
    <div className={cn('rounded-xl border border-border-subtle p-mx-sm text-center', classes.soft)}>
      <Typography variant="tiny" className="block leading-tight">{label}</Typography>
      <div className="mt-mx-xs truncate text-base font-bold tabular-nums" title={value}>{value}</div>
    </div>
  )
}

export function OwnerSemiGauge({ value, muted = false }: { value: number; muted?: boolean }) {
  const clamped = Math.min(Math.max(Math.round(value), 0), 100)
  const cx = 50
  const cy = 50
  const radius = 40
  const strokeWidth = 9
  const pointerAngleDeg = 180 - (clamped / 100) * 180
  const pointerRad = (pointerAngleDeg * Math.PI) / 180
  const pointerX = cx + (radius - strokeWidth / 2) * Math.cos(pointerRad)
  const pointerY = cy - (radius - strokeWidth / 2) * Math.sin(pointerRad)
  return (
    <svg viewBox="0 0 100 60" width="100" height="60" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="owner-dept-gauge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={chartTokens.danger()} />
          <stop offset="50%" stopColor={chartTokens.warning()} />
          <stop offset="100%" stopColor={chartTokens.success()} />
        </linearGradient>
      </defs>
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        fill="none"
        stroke={muted ? 'var(--color-border-subtle)' : 'url(#owner-dept-gauge)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {!muted && (
        <>
          <circle cx={pointerX} cy={pointerY} r={4} fill="var(--color-mx-black)" />
          <circle cx={pointerX} cy={pointerY} r={2} fill="var(--color-pure-white)" />
        </>
      )}
    </svg>
  )
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <Typography variant="h2" className="text-2xl md:text-3xl">{title}</Typography>
      <Typography variant="p" tone="muted" className="mt-1 font-bold">{subtitle}</Typography>
    </div>
  )
}

export function SideList({ title, items, className }: { title: string; items: string[]; className?: string }) {
  return (
    <Card className={cn('rounded-xl border border-border-subtle bg-white p-mx-md shadow-sm', className)}>
      <Typography variant="h3" className="text-lg">{title}</Typography>
      <div className="mt-mx-md space-y-mx-sm">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-mx-sm">
            <span className="flex h-mx-7 w-mx-7 shrink-0 items-center justify-center rounded-xl bg-mx-indigo-50 text-xs font-bold text-brand-primary">{index + 1}</span>
            <Typography variant="p" className="text-sm font-bold">{item}</Typography>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ToolbarPlaceholder({ searchPlaceholder }: { searchPlaceholder: string }) {
  return (
    <div className="flex flex-col gap-mx-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="grid grid-cols-1 gap-mx-sm sm:grid-cols-4">
        {['Todos os departamentos', 'Todas as origens', 'Todos os status', 'Todas as prioridades'].map(label => (
          <button key={label} type="button" className="h-mx-10 rounded-xl border border-border-subtle bg-white px-mx-sm text-left text-xs font-bold text-muted-foreground">
            {label}
          </button>
        ))}
      </div>
      <label className="relative min-w-0 lg:w-[320px]">
        <span className="sr-only">{searchPlaceholder}</span>
        <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="h-mx-10 w-full rounded-xl border border-border-subtle bg-white pl-mx-xl pr-mx-sm text-sm font-bold outline-none focus:border-brand-primary" placeholder={searchPlaceholder} />
      </label>
    </div>
  )
}

export function SummaryCard({
  title,
  value,
  detail,
  icon,
  tone,
}: {
  title: string
  value: string | number
  detail: string
  icon: ReactNode
  tone: KpiTone
}) {
  const classes = toneClasses[tone]
  return (
    <Card className="border bg-white p-mx-md">
      <div className="flex items-start gap-mx-sm">
        <span className={cn('h-mx-12 w-mx-12 rounded-xl flex shrink-0 items-center justify-center', classes.bg)}>{icon}</span>
        <div>
          <Typography variant="p" className="">{title}</Typography>
          <div className={cn('mt-mx-xs text-3xl font-bold tabular-nums', classes.text)}>{value}</div>
          <Typography variant="tiny" tone="muted" className="mt-mx-xs block font-bold">{detail}</Typography>
        </div>
      </div>
    </Card>
  )
}
