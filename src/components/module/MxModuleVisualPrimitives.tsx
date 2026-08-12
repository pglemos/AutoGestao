import type { ElementType, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input, type InputProps } from '@/components/atoms/Input'
import { Select, type SelectProps } from '@/components/atoms/Select'
import { Skeleton, type SkeletonProps } from '@/components/atoms/Skeleton'
import { Textarea, type TextareaProps } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { PageCanvas, type PageBottomClearance, type PageWidth } from '@/design-system/page'
import { cn } from '@/lib/utils'
import {
  InternalMxTemplateHeader,
  InternalMxTemplatePage,
  InternalMxTemplateSection,
  InternalMxTemplateTable,
  InternalMxTemplateToolbar,
} from './InternalMxTemplateSlots'

export type MxTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral'
export type MxAccessMode = 'manage' | 'read-only'

type ToneStyle = { icon: string; surface: string; value: string; banner: string; progress: string }
const toneStyles: Record<MxTone, ToneStyle> = {
  brand: { icon: 'bg-status-success-surface text-status-success-text', surface: 'border-border-subtle', value: 'text-status-success-text', banner: 'border-status-success/20 bg-status-success-surface text-status-success-text', progress: 'bg-brand-primary' },
  success: { icon: 'bg-status-success-surface text-status-success-text', surface: 'border-border-subtle', value: 'text-status-success-text', banner: 'border-status-success/20 bg-status-success-surface text-status-success-text', progress: 'bg-brand-primary' },
  warning: { icon: 'bg-status-warning-surface text-status-warning-text', surface: 'border-status-warning/30', value: 'text-status-warning-text', banner: 'border-status-warning/30 bg-status-warning-surface text-status-warning-text', progress: 'bg-status-warning' },
  danger: { icon: 'bg-status-error-surface text-status-error-text', surface: 'border-status-error/30', value: 'text-status-error-text', banner: 'border-status-error/30 bg-status-error-surface text-status-error-text', progress: 'bg-status-error' },
  info: { icon: 'bg-status-info-surface text-status-info-text', surface: 'border-status-info/30', value: 'text-status-info-text', banner: 'border-status-info/30 bg-status-info-surface text-status-info-text', progress: 'bg-status-info' },
  violet: { icon: 'bg-status-info-surface text-status-info-text', surface: 'border-status-info/30', value: 'text-status-info-text', banner: 'border-status-info/30 bg-status-info-surface text-status-info-text', progress: 'bg-status-info' },
  neutral: { icon: 'bg-surface-alt text-muted-foreground', surface: 'border-border-subtle', value: 'text-foreground', banner: 'border-border bg-surface-alt text-foreground', progress: 'bg-gray-400' },
}

export interface MxModulePageProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Compatibilidade com consumidores antigos; novas páginas devem usar `width`. */
  maxWidth?: 'full' | '7xl'
  width?: PageWidth
  bottomClearance?: PageBottomClearance
  id?: string
  accessMode?: MxAccessMode
}

export function MxModulePage({
  children,
  className,
  contentClassName,
  maxWidth = '7xl',
  width,
  bottomClearance = 'navigation',
  id,
  accessMode,
}: MxModulePageProps) {
  const pageWidth = width ?? (maxWidth === 'full' ? 'fluid' : 'dashboard')

  return (
    <InternalMxTemplatePage
      data-mx-visual-system="manager"
      className={cn('min-h-full w-full text-foreground', className)}
    >
      <PageCanvas
        as="div"
        id={id}
        width={pageWidth}
        bottomClearance={bottomClearance}
        data-mx-module-page=""
        data-mx-visual-system="manager"
        data-mx-access-mode={accessMode}
        className="min-h-full"
      >
        <div className={cn('w-full space-y-5', contentClassName)}>{children}</div>
      </PageCanvas>
    </InternalMxTemplatePage>
  )
}

export function MxModuleHeader({ title, description, eyebrow, actions, className }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <InternalMxTemplateHeader data-mx-module-header="" className={cn('rounded-2xl border border-border-subtle bg-white p-5 shadow-sm', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? <Typography variant="caption" className="mb-1 block font-semibold text-status-success-text">{eyebrow}</Typography> : null}
          <Typography as="h1" variant="h2" className="text-xl font-bold text-foreground md:text-2xl">{title}</Typography>
          {description ? <Typography variant="p" className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</Typography> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </InternalMxTemplateHeader>
  )
}

export function MxMetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <section data-mx-metric-grid="" className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</section>
}

export function MxMetricCard({ title, value, detail, icon: Icon, tone = 'brand', actionLabel, onAction, children, className }: { title: string; value: string | number; detail: string; icon: LucideIcon; tone?: MxTone; actionLabel?: string; onAction?: () => void; children?: ReactNode; className?: string }) {
  const styles = toneStyles[tone]
  return (
    <Card className={cn('group flex min-h-40 flex-col border bg-white p-4', styles.surface, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography variant="h3" className="text-sm font-semibold text-foreground">{title}</Typography>
          <Typography variant="p" className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</Typography>
        </div>
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', styles.icon)}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
      </div>
      <div className="mt-4 flex flex-1 items-end justify-between gap-3">
        <Typography variant="h2" className={cn('text-3xl font-bold leading-none', styles.value)}>{value}</Typography>
        {children}
      </div>
      {actionLabel && onAction ? <Button variant="ghost" size="sm" className="mt-3 min-h-10 w-full justify-between px-0 text-status-success-text" onClick={onAction}>{actionLabel}<span aria-hidden="true">→</span></Button> : null}
    </Card>
  )
}

export function MxStatusGauge({ value, label, ariaLabel, showLabel = true }: { value: number; label: string; ariaLabel: string; showLabel?: boolean }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div role="progressbar" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized} className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-muted" style={{ background: `conic-gradient(var(--color-brand-primary) ${normalized * 3.6}deg, var(--color-surface-alt) 0deg)` }}>
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center">
        <strong className="text-base leading-none text-foreground">{normalized}%</strong>
        {showLabel ? <span className="max-w-12 text-caption font-medium leading-tight text-muted-foreground">{label}</span> : null}
      </div>
    </div>
  )
}

export function MxSectionCard({ as: Component = 'section', children, className, ...props }: { as?: ElementType; children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <InternalMxTemplateSection as={Component} data-mx-section-card="" className={cn('overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm', className)} {...props}>{children}</InternalMxTemplateSection>
}

export function MxSectionHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header data-mx-section-header="" data-mx-template-slot="section-header" className={cn('flex flex-col gap-3 border-b border-border-subtle p-5 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <Typography as="h2" variant="h3" className="text-lg font-semibold text-foreground">{title}</Typography>
        {description ? <Typography variant="p" className="mt-1 text-sm text-muted-foreground">{description}</Typography> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function MxToolbar({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <InternalMxTemplateToolbar data-mx-toolbar="" className={cn('flex flex-col gap-3 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center', className)} {...props}>{children}</InternalMxTemplateToolbar>
}

export function MxField({ label, hint, error, children, className, ...props }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-2', className)} {...props}>
      <Typography as="span" variant="caption" className="font-medium text-muted-foreground">{label}</Typography>
      {children}
      {error ? <Typography variant="tiny" className="text-status-error-text">{error}</Typography> : hint ? <Typography variant="tiny" className="text-muted-foreground">{hint}</Typography> : null}
    </label>
  )
}

export function MxInput(props: InputProps) { return <Input {...props} /> }
export function MxSelect(props: SelectProps) { return <Select {...props} /> }
export function MxTextarea(props: TextareaProps) { return <Textarea {...props} /> }
export function MxTableSurface({ children, className, role, tabIndex, 'aria-label': ariaLabel, ...props }: HTMLAttributes<HTMLDivElement>) { return <InternalMxTemplateTable data-mx-table-surface="" role={role ?? 'region'} tabIndex={tabIndex ?? 0} aria-label={ariaLabel ?? 'Tabela com rolagem horizontal'} className={cn('w-full overflow-x-auto rounded-2xl border border-border-subtle bg-white', className)} {...props}>{children}</InternalMxTemplateTable> }

export function MxEmptyState({ title, description, icon: Icon = Inbox, action, className }: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-alt text-muted-foreground"><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
      <Typography variant="h3" className="mt-4 text-base text-foreground">{title}</Typography>
      {description ? <Typography variant="p" className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</Typography> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function MxLoadingState({ label = 'Carregando', className }: { label?: string; className?: string }) {
  return <div role="status" className={cn('flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground', className)} aria-busy="true" aria-live="polite" aria-label={label}><LoaderCircle className="animate-spin text-status-success-text motion-reduce:animate-none" size={28} aria-hidden="true" /><Typography variant="caption" className="font-medium text-muted-foreground">{label}</Typography></div>
}

export function MxErrorState({ title = 'Não foi possível carregar', description, retry, className }: { title?: string; description: string; retry?: () => void; className?: string }) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center', className)} role="alert">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-status-error-surface text-status-error-text"><AlertTriangle size={24} aria-hidden="true" /></span>
      <Typography variant="h3" className="mt-4 text-base text-foreground">{title}</Typography>
      <Typography variant="p" className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</Typography>
      {retry ? <Button variant="outline" className="mt-4" onClick={retry}>Tentar novamente</Button> : null}
    </div>
  )
}

export function MxStatusBanner({ tone = 'neutral', children, className, ...props }: { tone?: MxTone; children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border px-4 py-3 text-sm font-medium', toneStyles[tone].banner, className)} role={tone === 'danger' ? 'alert' : 'status'} {...props}>{children}</div>
}

export function MxChartCard({ title, description, actions, children, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <MxSectionCard className={className}><MxSectionHeader title={title} description={description} actions={actions} /><div className="p-5">{children}</div></MxSectionCard>
}

export function MxSkeleton(props: SkeletonProps) { return <Skeleton {...props} /> }
export function MxProgress({ value, tone = 'brand', label }: { value: number; tone?: MxTone; label?: string }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)))
  return <div className="space-y-2">{label ? <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><span>{normalized}%</span></div> : null}<div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized}><div className={cn('h-full rounded-full transition-[width] motion-reduce:transition-none', toneStyles[tone].progress)} style={{ width: `${normalized}%` }} /></div></div>
}
export function MxActionGroup({ children, className }: { children: ReactNode; className?: string }) { return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div> }
