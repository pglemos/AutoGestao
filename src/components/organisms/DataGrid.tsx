import { ReactNode, memo } from 'react'
import { AnimatePresence } from 'motion/react'
import { SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { Skeleton } from '@/components/atoms/Skeleton'
import { ErrorState } from '@/components/molecules/ErrorState'
import { Pagination, type PaginationProps } from '@/components/molecules/Pagination'
import { StatusBadge, type StatusBadgeProps } from '@/components/molecules/StatusBadge'
import { MotionList, MotionRow, duration, rowVariants } from '@/design/motion'
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (item: T, index: number) => ReactNode
  /** Célula de status canônica (StatusBadge). Substitui `render` quando presente. */
  status?: (item: T) => Pick<StatusBadgeProps, 'status' | 'label'> & Partial<Pick<StatusBadgeProps, 'description'>>
  mobileOnly?: boolean
  desktopOnly?: boolean
}

export interface DataGridProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  /** Mensagem de erro da consulta. Quando presente, renderiza ErrorState no lugar da tabela. */
  error?: string
  /** Nova tentativa do estado de erro. */
  onRetry?: () => void
  emptyMessage?: string
  emptyDescription?: string
  rowClassName?: string
  onRowClick?: (item: T) => void
  minWidth?: string
  stickyHeader?: boolean
  /** Paginação canônica. Quando presente, renderiza Pagination abaixo da tabela. */
  pagination?: PaginationProps
  /**
   * Nome acessível da tabela. Como a região é rolável e focável, ela precisa
   * de nome — sem ele vira uma parada de tab anônima (WCAG 2.4.6).
   */
  label?: string
}

function getCellValue<T>(item: T, key: string): ReactNode {
  if (!item || typeof item !== 'object' || !(key in item)) return null
  return (item as Record<string, ReactNode>)[key]
}

function DataGridInner<T extends { id: string | number }>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyMessage = 'Nenhum registro localizado.',
  emptyDescription,
  rowClassName,
  onRowClick,
  minWidth = 'min-w-mx-table',
  stickyHeader = true,
  pagination,
  label = 'Tabela de dados',
}: DataGridProps<T>) {
  const effectiveMinWidth = minWidth === 'min-w-mx-table' ? 'min-w-[760px]' : minWidth

  if (loading) {
    return (
      <div
        className={'space-y-3'}
        aria-busy="true"
        aria-live="polite"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="table-row" className="w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        kind="server"
        description={error}
        onRetry={onRetry}
        data-mx-datagrid-error=""
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center text-center',
        'gap-3 px-5 py-16 text-muted-foreground',
      )}>
        <span className={'grid h-14 w-14 place-items-center rounded-2xl bg-surface-alt text-muted-foreground'}>
          <SearchX size={24} className={''} aria-hidden="true" />
        </span>
        <Typography
          variant={'h3'}
          className={'text-foreground'}
        >
          {emptyMessage}
        </Typography>
        {emptyDescription && (
          <Typography variant="p" tone="muted" className="max-w-md">
            {emptyDescription}
          </Typography>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <ScrollableRegion label={label} className="hidden md:block">
        <Typography variant="tiny" tone="muted" className="sr-only">
          Se houver colunas fora da área visível, role a tabela horizontalmente.
        </Typography>
        <table className={cn('w-full border-collapse text-left', effectiveMinWidth)}>
        <thead className={cn(stickyHeader && 'sticky top-0 z-[var(--mx-z-sticky)]')}>
            <tr className={'border-b border-border-subtle bg-surface-alt'}>
              {columns.filter((col) => !col.mobileOnly).map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-caption font-semibold text-muted-foreground',
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                    col.width,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <MotionList as="tbody" className={'divide-y divide-border-subtle bg-white'}>
            <AnimatePresence mode="popLayout">
              {data.map((item, idx) => (
                <MotionRow
                  as="tr"
                  key={item.id}
                  layout
                  variants={rowVariants}
                  exit={{ opacity: 0, transition: { duration: duration.fast } }}
                  onClick={() => onRowClick?.(item)}
                  onKeyDown={
                    onRowClick
                      ? (event: React.KeyboardEvent) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick?.(item)
                          }
                        }
                      : undefined
                  }
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    'group h-16 transition-colors hover:bg-surface-alt',
                    onRowClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mx-action/40 focus-visible:ring-inset',
                    rowClassName,
                  )}
                >
                  {columns.filter((col) => !col.mobileOnly).map((col) => (
                    <td
                      key={`${item.id}-${col.key}`}
                      className={cn(
                        'px-4 py-3 text-body-sm font-medium text-foreground',
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {col.status ? (
                        <StatusBadge {...col.status(item)} data-mx-status-cell="" />
                      ) : col.render ? (
                        col.render(item, idx)
                      ) : getCellValue(item, col.key)}
                    </td>
                  ))}
                </MotionRow>
              ))}
            </AnimatePresence>
          </MotionList>
        </table>
      </ScrollableRegion>

      <MotionList className={'space-y-4 pb-24 md:hidden'}>
        <AnimatePresence mode="popLayout">
          {data.map((item, idx) => (
            <MotionRow
              key={item.id}
              layout
              variants={rowVariants}
              exit={{ opacity: 0, y: 6, transition: { duration: duration.fast } }}
              onClick={() => onRowClick?.(item)}
              onKeyDown={
                onRowClick
                  ? (event: React.KeyboardEvent) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick?.(item)
                      }
                    }
                  : undefined
              }
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              <Card className={cn(
                'border border-border-subtle p-4 shadow-sm',
                onRowClick && 'active:scale-[0.98] transition-all',
              )}>
                <div className={'space-y-3'}>
                  {columns.filter((col) => !col.desktopOnly).map((col, cIdx) => (
                    <div
                      key={`${item.id}-mob-${col.key}`}
                      className={cn(
                        'flex flex-col gap-1',
                        cIdx === 0 && ('mb-3 border-b border-border-subtle pb-3'),
                      )}
                    >
                      {cIdx > 0 && (
                        <Typography
                          variant="tiny"
                          tone="muted"
                          className={'text-xs font-medium text-muted-foreground'}
                        >
                          {col.header}
                        </Typography>
                      )}
                      <div className={cn(
                        'text-sm font-medium text-foreground',
                        cIdx === 0 && ('text-base font-semibold text-foreground'),
                      )}>
                        {col.status ? (
                          <StatusBadge {...col.status(item)} data-mx-status-cell="" />
                        ) : col.render ? (
                          col.render(item, idx)
                        ) : getCellValue(item, col.key)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </MotionRow>
          ))}
        </AnimatePresence>
      </MotionList>

      {pagination && <Pagination {...pagination} className={'mt-[var(--mx-space-2)]'} />}
    </div>
  )
}

export const DataGrid = memo(DataGridInner) as typeof DataGridInner
