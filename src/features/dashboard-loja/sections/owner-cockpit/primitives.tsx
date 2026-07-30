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
    <header className="border-b border-border-default pb-mx-md sm:pb-mx-lg">
      <h1 className="text-2xl font-black leading-tight text-text-primary sm:text-3xl md:text-[2rem]">
        {greeting()}, <span className="text-brand-primary">{name.split(' ')[0]}</span>! 👋
      </h1>
      <p className="mt-mx-tiny text-sm font-medium text-text-secondary">Aqui está o panorama da sua loja no período selecionado.</p>
      <div className="mt-mx-md inline-flex h-mx-11 items-center gap-mx-xs rounded-mx-full border border-border-subtle bg-white px-mx-md shadow-mx-sm">
        <CalendarDays size={16} className="text-text-tertiary" />
        <Typography variant="tiny" className="">{periodLabel}</Typography>
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
  brand: 'bg-brand-primary',
  purple: 'bg-[var(--color-accent-purple)]',
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
  /** Cor decorativa do label/ícone/sparkline */
  tone: KpiTone
  /** 'line' = sparkline curva com gradient | 'bars' = mini bar chart */
  chart?: 'line' | 'bars'
  /** Seed para variar o shape do sparkline entre cards do mesmo tone */
  seed?: number
  /** Dot de status no canto superior direito (verde/âmbar/vermelho) */
  showStatusDot?: boolean
  /** Tone do dot de status, quando diferente do tone decorativo (ex.: card com acento roxo mas status verde) */
  statusTone?: KpiTone
  /** Segunda linha colorida de tendência (ex.: "▲ 14% vs mês anterior"), quando houver comparativo real */
  trend?: { label: string; tone: KpiTone } | null
}) {
  const classes = toneClasses[tone]
  const vivid = vividIconClasses[tone]
  return (
    <Card className="relative min-h-[140px] border bg-white p-mx-md">
      {showStatusDot && (
        <span
          className={cn('absolute right-mx-sm top-mx-sm h-mx-6 w-mx-6 rounded-mx-full', statusDotClasses[statusTone ?? tone])}
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-mx-sm">
        <div className="min-w-0 flex-1">
          <Typography variant="p" className={cn('block text-sm font-black', classes.text)}>
            {title}
          </Typography>
          <Typography variant="h2" className="mt-mx-xs text-3xl md:text-4xl tabular-nums leading-none">
            {value}
          </Typography>
          <Typography variant="tiny" tone="muted" className="mt-mx-xs block">
            {detail}
          </Typography>
          {trend && (
            <Typography variant="tiny" className={cn('mt-mx-tiny block font-black', toneClasses[trend.tone].text)}>
              {trend.label}
            </Typography>
          )}
        </div>
        <div className={cn('h-mx-10 w-mx-10 rounded-mx-lg flex shrink-0 items-center justify-center shadow-mx-sm', vivid)}>
          {icon}
        </div>
      </div>
      <Sparkline tone={tone} variant={chart} seed={seed} />
    </Card>
  )
}

function Sparkline({ tone, variant = 'line', seed = 0 }: { tone: KpiTone; variant?: 'line' | 'bars'; seed?: number }) {
  const color = toneHex[tone]()
  const gradId = `mx-spark-${tone}-${seed}-${variant}`
  if (variant === 'bars') {
    const heights = [12, 18, 14, 22, 16, 24, 20, 28, 18, 30, 24, 32]
    const max = Math.max(...heights)
    return (
      <svg viewBox="0 0 120 36" width="100%" height="42" preserveAspectRatio="none" aria-hidden="true" className="mt-mx-md">
        {heights.map((h, i) => {
          const x = i * (120 / heights.length)
          const w = (120 / heights.length) - 2
          const barH = (h / max) * 32
          const y = 36 - barH
          return <rect key={i} x={x} y={y} width={w} height={barH} fill={color} rx={1.5} opacity={0.85} />
        })}
      </svg>
    )
  }
  // Line sparkline with gradient fill below
  // Simple pseudo-random varied curve seeded by `seed`
  const points = Array.from({ length: 12 }, (_, i) => {
    const base = 14 + Math.sin((i + seed) * 0.9) * 6 + Math.cos((i + seed) * 0.4) * 4
    return Math.max(4, Math.min(28, base + (seed % 2 ? i * 0.7 : -i * 0.3)))
  })
  const path = points.map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * 120} ${32 - y}`).join(' ')
  const area = `${path} L 120 36 L 0 36 Z`
  return (
    <svg viewBox="0 0 120 36" width="100%" height="42" preserveAspectRatio="none" aria-hidden="true" className="mt-mx-md">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={120} cy={32 - points[points.length - 1]} r={2.5} fill={color} />
    </svg>
  )
}

export function MXScoreCompact({ score }: { score: number | null }) {
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
    <Card className="min-h-[140px] border bg-white p-mx-md">
      <div className="flex items-center justify-between">
        <Typography variant="tiny" tone="muted" className="">
          MX Score da Loja
        </Typography>
        <CircleHelp size={14} className="text-text-tertiary" />
      </div>
      <div className="mt-mx-sm flex flex-col items-center">
        <div className="relative" style={{ width: 120, height: 120 }}>
          <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label={`MX Score ${safeScore}: ${status}`}>
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
            <div className="text-3xl font-black font-mono-numbers leading-none text-text-primary">{score ?? '--'}</div>
            <Typography variant="tiny" className={cn('mt-mx-tiny block font-black uppercase tracking-widest', statusColor)}>{status}</Typography>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function MetricPill({ label, value, tone }: { label: string; value: string; tone: KpiTone }) {
  const classes = toneClasses[tone]
  return (
    <div className={cn('rounded-mx-lg border border-border-subtle p-mx-sm text-center', classes.soft)}>
      <Typography variant="tiny" className="block leading-tight">{label}</Typography>
      <div className="mt-mx-xs truncate text-base font-black tabular-nums" title={value}>{value}</div>
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
    <Card className={cn('rounded-mx-lg border border-border-subtle bg-white p-mx-md shadow-mx-sm', className)}>
      <Typography variant="h3" className="text-lg">{title}</Typography>
      <div className="mt-mx-md space-y-mx-sm">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-mx-sm">
            <span className="flex h-mx-7 w-mx-7 shrink-0 items-center justify-center rounded-mx-lg bg-mx-indigo-50 text-xs font-black text-brand-primary">{index + 1}</span>
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
          <button key={label} type="button" className="h-mx-10 rounded-mx-lg border border-border-subtle bg-white px-mx-sm text-left text-xs font-black text-text-secondary">
            {label}
          </button>
        ))}
      </div>
      <label className="relative min-w-0 lg:w-[320px]">
        <span className="sr-only">{searchPlaceholder}</span>
        <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input className="h-mx-10 w-full rounded-mx-lg border border-border-subtle bg-white pl-mx-xl pr-mx-sm text-sm font-bold outline-none focus:border-brand-primary" placeholder={searchPlaceholder} />
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
        <span className={cn('h-mx-12 w-mx-12 rounded-mx-lg flex shrink-0 items-center justify-center', classes.bg)}>{icon}</span>
        <div>
          <Typography variant="p" className="">{title}</Typography>
          <div className={cn('mt-mx-xs text-3xl font-black tabular-nums', classes.text)}>{value}</div>
          <Typography variant="tiny" tone="muted" className="mt-mx-xs block font-bold">{detail}</Typography>
        </div>
      </div>
    </Card>
  )
}
