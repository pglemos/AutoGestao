import { ReactNode, memo } from 'react'
import { AnimatePresence } from 'motion/react'
import { SearchX } from 'lucide-react'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { Skeleton } from '@/components/atoms/Skeleton'
import { MotionList, MotionRow, rowVariants } from '@/design/motion'

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (item: T, index: number) => ReactNode
  mobileOnly?: boolean
  desktopOnly?: boolean
}

export interface DataGridProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  rowClassName?: string
  onRowClick?: (item: T) => void
  minWidth?: string
  stickyHeader?: boolean
}

function getCellValue<T>(item: T, key: string): ReactNode {
  if (!item || typeof item !== 'object' || !(key in item)) return null
  return (item as Record<string, ReactNode>)[key]
}

function DataGridInner<T extends { id: string | number }>({
  columns,
  data,
  loading,
  emptyMessage = 'Nenhum registro localizado.',
  emptyDescription,
  rowClassName,
  onRowClick,
  minWidth = 'min-w-mx-table',
  stickyHeader = true,
}: DataGridProps<T>) {
  const manager = useMxSurfaceVisualMode() === 'manager'
  const effectiveMinWidth = manager && minWidth === 'min-w-mx-table' ? 'min-w-[760px]' : minWidth

  if (loading) {
    return (
      <div
        className={manager ? 'space-y-3' : 'space-y-mx-sm animate-in fade-in duration-500'}
        aria-busy="true"
        aria-live="polite"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="table-row" className="w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center text-center',
        manager ? 'gap-3 px-5 py-16 text-gray-500' : 'space-y-mx-md py-20 text-text-label',
      )}>
        <span className={manager ? 'grid h-14 w-14 place-items-center rounded-2xl bg-gray-50 text-gray-400' : ''}>
          <SearchX size={manager ? 24 : 48} className={manager ? '' : 'text-text-tertiary'} aria-hidden="true" />
        </span>
        <Typography
          variant={manager ? 'h3' : 'caption'}
          className={manager ? 'text-base font-semibold text-gray-800' : 'max-w-xs font-black uppercase tracking-widest'}
        >
          {emptyMessage}
        </Typography>
        {emptyDescription && (
          <Typography variant="p" tone="muted" className="max-w-md text-sm">
            {emptyDescription}
          </Typography>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="hidden overflow-x-auto md:block">
        <Typography variant="tiny" tone="muted" className="sr-only">
          Se houver colunas fora da área visível, role a tabela horizontalmente.
        </Typography>
        <table className={cn('w-full border-collapse text-left', effectiveMinWidth)}>
          <thead className={cn(stickyHeader && 'sticky top-0 z-20')}>
            <tr className={manager ? 'border-b border-gray-100 bg-gray-50' : 'border-b border-border-default bg-surface-alt/50'}>
              {columns.filter((col) => !col.mobileOnly).map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    manager
                      ? 'px-4 py-3 text-xs font-semibold tracking-normal text-gray-500'
                      : 'px-4 py-6 text-mx-micro font-black uppercase tracking-mx-wider text-text-tertiary',
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                    col.width,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <MotionList as="tbody" className={manager ? 'divide-y divide-gray-100 bg-white' : 'divide-y divide-border-default bg-white'}>
            <AnimatePresence mode="popLayout">
              {data.map((item, idx) => (
                <MotionRow
                  as="tr"
                  key={item.id}
                  layout
                  variants={rowVariants}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    manager
                      ? 'group h-16 transition-colors hover:bg-gray-50'
                      : 'group h-mx-20 transition-colors hover:bg-surface-alt/30',
                    onRowClick && 'cursor-pointer',
                    rowClassName,
                  )}
                >
                  {columns.filter((col) => !col.mobileOnly).map((col) => (
                    <td
                      key={`${item.id}-${col.key}`}
                      className={cn(
                        manager
                          ? 'px-4 py-3 text-sm font-medium text-gray-700'
                          : 'px-4 py-2 text-sm font-bold text-text-primary transition-all',
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {col.render ? col.render(item, idx) : getCellValue(item, col.key)}
                    </td>
                  ))}
                </MotionRow>
              ))}
            </AnimatePresence>
          </MotionList>
        </table>
      </div>

      <MotionList className={manager ? 'space-y-4 pb-24 md:hidden' : 'space-y-mx-md pb-mx-24 md:hidden'}>
        <AnimatePresence mode="popLayout">
          {data.map((item, idx) => (
            <MotionRow
              key={item.id}
              layout
              variants={rowVariants}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
              onClick={() => onRowClick?.(item)}
            >
              <Card className={cn(
                manager ? 'border border-gray-100 p-4 shadow-sm' : 'border-none p-mx-lg shadow-mx-lg',
                onRowClick && 'active:scale-[0.98] transition-all',
              )}>
                <div className={manager ? 'space-y-3' : 'space-y-mx-md'}>
                  {columns.filter((col) => !col.desktopOnly).map((col, cIdx) => (
                    <div
                      key={`${item.id}-mob-${col.key}`}
                      className={cn(
                        'flex flex-col gap-1',
                        cIdx === 0 && (manager ? 'mb-3 border-b border-gray-100 pb-3' : 'mb-4 border-b border-border-default pb-4'),
                      )}
                    >
                      {cIdx > 0 && (
                        <Typography
                          variant="tiny"
                          tone="muted"
                          className={manager ? 'text-xs font-medium text-gray-500' : 'font-black uppercase'}
                        >
                          {col.header}
                        </Typography>
                      )}
                      <div className={cn(
                        manager ? 'text-sm font-medium text-gray-700' : 'text-sm font-bold',
                        cIdx === 0 && (manager ? 'text-base font-semibold text-gray-800' : 'text-lg font-black uppercase tracking-tight'),
                      )}>
                        {col.render ? col.render(item, idx) : getCellValue(item, col.key)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </MotionRow>
          ))}
        </AnimatePresence>
      </MotionList>
    </div>
  )
}

export const DataGrid = memo(DataGridInner) as typeof DataGridInner
