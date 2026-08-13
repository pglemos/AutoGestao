import * as React from 'react'
import { cn } from '@/lib/utils'
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'

/**
 * Table family canônica (§14.002).
 *
 * `DataGrid` continua sendo a abstração de dados (loading, empty, mobile
 * fallback e motion). Estes primitives cobrem as tabelas declarativas que
 * precisam de controle sobre as células sem criar uma geometria por feature.
 */
export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table
      ref={ref}
      data-mx-table=""
      className={cn('w-full border-collapse text-left text-body-sm', className)}
      {...props}
    />
  ),
)
Table.displayName = 'Table'

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} data-mx-table-header="" className={cn('border-b border-border-subtle bg-surface-alt', className)} {...props} />
  ),
)
TableHeader.displayName = 'TableHeader'

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} data-mx-table-body="" className={cn('divide-y divide-border-subtle bg-background', className)} {...props} />
  ),
)
TableBody.displayName = 'TableBody'

export const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} data-mx-table-footer="" className={cn('border-t border-border-subtle bg-surface-alt font-medium', className)} {...props} />
  ),
)
TableFooter.displayName = 'TableFooter'

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} data-mx-table-row="" className={cn('h-16 transition-colors hover:bg-surface-alt', className)} {...props} />
  ),
)
TableRow.displayName = 'TableRow'

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} data-mx-table-head="" scope="col" className={cn('px-4 py-3 text-caption font-semibold text-muted-foreground', className)} {...props} />
  ),
)
TableHead.displayName = 'TableHead'

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} data-mx-table-cell="" className={cn('px-4 py-3 text-body-sm font-medium text-foreground', className)} {...props} />
  ),
)
TableCell.displayName = 'TableCell'

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} data-mx-table-caption="" className={cn('mt-4 text-caption text-muted-foreground', className)} {...props} />
  ),
)
TableCaption.displayName = 'TableCaption'

export interface TableSurfaceProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-label'> {
  label: string
}

/** Scroll horizontal local e focável para teclado; nunca é o scroll da página. */
export const TableSurface = React.forwardRef<HTMLDivElement, TableSurfaceProps>(
  ({ className, label, children, ...props }, ref) => (
    <ScrollableRegion
      ref={ref}
      axis="horizontal"
      label={label}
      data-mx-table-surface=""
      className={cn('w-full max-w-full rounded-2xl border border-border-subtle bg-white', className)}
      {...props}
    >
      {children}
    </ScrollableRegion>
  ),
)
TableSurface.displayName = 'TableSurface'

export type DataTableProps<T> = import('./DataGrid').DataGridProps<T>
export type DataTableColumn<T> = import('./DataGrid').Column<T>
export { DataGrid as DataTable } from './DataGrid'
