import { cn } from '@/lib/utils'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import type { ReportTableColumn } from './types'

const alignmentClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

export function ReportDataTable<Row extends { id?: string }>(props: {
  title: string
  description?: string
  rows: Row[]
  columns: ReportTableColumn<Row>[]
  loading?: boolean
  error?: string | null
  retry?: () => void
  emptyTitle?: string
}) {
  return (
    <MxSectionCard>
      <MxSectionHeader title={props.title} description={props.description} />
      <div className="p-5">
        {props.loading ? (
          <MxLoadingState label="Carregando tabela" />
        ) : props.error ? (
          <MxErrorState description={props.error} retry={props.retry} />
        ) : props.rows.length === 0 ? (
          <MxEmptyState title={props.emptyTitle || 'Nenhum registro'} />
        ) : (
          <MxTableSurface>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-alt text-muted-foreground">
                  {props.columns.map(column => (
                    <th key={column.key} className={cn('px-4 py-3 font-semibold', alignmentClasses[column.align || 'left'])}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.rows.map((row, index) => (
                  <tr key={row.id || index} className="border-b border-border-subtle last:border-0">
                    {props.columns.map(column => (
                      <td key={column.key} className={cn('px-4 py-4', alignmentClasses[column.align || 'left'])}>
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </MxTableSurface>
        )}
      </div>
    </MxSectionCard>
  )
}
