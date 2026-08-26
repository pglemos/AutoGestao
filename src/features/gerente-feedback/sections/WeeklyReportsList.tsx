import { motion } from 'motion/react'
import { Calendar } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { WeeklyFeedbackReport } from '@/types/database'
import { formatSafeDate, getWeeklyAverageSales } from '../lib/helpers'

type Props = {
  reports: WeeklyFeedbackReport[]
  variant?: 'admin' | 'store'
}

export function WeeklyReportsList({ reports, variant = 'admin' }: Props) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-mx-lg">
      {reports.map((report) => (
        <motion.li
          key={report.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            className={
              variant === 'admin'
                ? 'h-full hover:shadow-sm transition-all shadow-sm relative overflow-hidden flex flex-col'
                : 'h-full hover:shadow-sm transition-all shadow-sm flex flex-col'
            }
          >
            {variant === 'admin' ? (
              <article className="flex flex-col h-full">
                <ReportHeader report={report} />
                <ReportMetrics report={report} />
              </article>
            ) : (
              <>
                <ReportHeader report={report} />
                <ReportMetrics report={report} dense />
              </>
            )}
          </Card>
        </motion.li>
      ))}
    </ul>
  )
}

function ReportHeader({ report }: { report: WeeklyFeedbackReport }) {
  return (
    <div className="flex items-center justify-between mb-10 relative z-[var(--mx-z-sticky)]">
      <div className="flex items-center gap-mx-sm">
        <div className="w-mx-14 h-mx-14 rounded-[var(--mx-radius-xl)] bg-brand-primary text-white flex items-center justify-center shadow-sm">
          <Calendar size={24} />
        </div>
        <div>
          <Typography
            variant="tiny"
            tone="muted"
            className="text-mx-micro"
          >
            FECHAMENTO SEMANAL
          </Typography>
          <Typography variant="h3" className="text-lg tracking-tight">
            {formatSafeDate(report.week_start, 'dd/MM')} -{' '}
            {formatSafeDate(report.week_end, 'dd/MM')}
          </Typography>
        </div>
      </div>
      <Badge
        variant={emailStatusBadge(report.email_status).variant}
        className="px-4 py-1 text-mx-micro shadow-sm border-none"
      >
        {emailStatusBadge(report.email_status).label}
      </Badge>
    </div>
  )
}

/**
 * `email_status` tem três estados, não dois. Tratar tudo que não é `sent` como
 * "FALHA" pintava de vermelho os 30 relatórios da rede — todos `not_sent`, ou
 * seja, apenas ainda não enviados, sem falha nenhuma no envio.
 */
function emailStatusBadge(status: string | null | undefined): {
  variant: 'success' | 'secondary' | 'danger'
  label: string
} {
  if (status === 'sent') return { variant: 'success', label: 'ENVIADO' }
  if (status === 'not_sent' || !status) return { variant: 'secondary', label: 'NÃO ENVIADO' }
  return { variant: 'danger', label: 'FALHA' }
}

function ReportMetrics({
  report,
  dense = false,
}: {
  report: WeeklyFeedbackReport
  dense?: boolean
}) {
  return (
    <div
      className={
        dense
          ? 'grid grid-cols-2 gap-mx-md py-8 border-y border-border-subtle'
          : 'grid grid-cols-1 sm:grid-cols-2 gap-mx-md py-8 border-y border-border-subtle relative z-[var(--mx-z-sticky)]'
      }
    >
      <div className="bg-surface-alt rounded-[var(--mx-radius-xl)] p-mx-md shadow-mx-inner text-center">
        <Typography
          variant="tiny"
          tone="muted"
          className="text-mx-micro mb-2 block"
        >
          META
        </Typography>
        <Typography
          variant="h2"
          className={
            dense
              ? 'text-2xl font-mono-numbers font-bold'
              : 'text-2xl font-mono-numbers tabular-nums font-bold'
          }
        >
          {report.weekly_goal}v
        </Typography>
      </div>
      <div className="bg-surface-alt rounded-[var(--mx-radius-xl)] p-mx-md shadow-mx-inner text-center">
        <Typography
          variant="tiny"
          tone="muted"
          className="text-mx-micro mb-2 block"
        >
          MÉDIA
        </Typography>
        <Typography
          variant="h2"
          tone="brand"
          className={
            dense
              ? 'text-2xl font-mono-numbers font-bold'
              : 'text-2xl font-mono-numbers tabular-nums font-bold'
          }
        >
          {getWeeklyAverageSales(report)}v
        </Typography>
      </div>
    </div>
  )
}

export default WeeklyReportsList
