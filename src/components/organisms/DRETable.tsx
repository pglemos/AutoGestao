import { FileText, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { formatValue, formatMonthLabel, type ValueFormat } from '@/lib/format'
import type { DREFinancial, DREComputed } from '@/features/consultoria/types'

export type DRETableRowFormat = ValueFormat

export interface DRETableRow {
  label: string
  getValue: (computed: DREComputed, financial: DREFinancial) => number | null
  bold?: boolean
  isHeader?: boolean
  color?: 'green' | 'red'
  format?: DRETableRowFormat
}

export interface DRETableEntry {
  fin: DREFinancial
  comp: DREComputed
}

export interface DRETableProps {
  rows: DRETableRow[]
  months: string[]
  data: Map<string, DRETableEntry>
  onEdit?: (financial: DREFinancial) => void
  className?: string
}

export function DRETable({
  rows,
  months,
  data,
  onEdit,
  className,
}: DRETableProps) {
  return (
    <Card className={cn('border-none shadow-sm bg-white overflow-hidden', className)}>
      <div className="p-mx-lg border-b border-gray-100 flex items-center justify-between">
        <Typography variant="h3">DRE ANUAL</Typography>
        <Button variant="outline" size="sm" className="">
          <FileText size={16} className="mr-2" /> EXPORTAR PDF
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="p-mx-md w-1/4">
                <Typography variant="tiny" tone="muted">DEMONSTRATIVO</Typography>
              </th>
              {months.map((m) => (
                <th key={m} className="p-mx-md text-center w-1/12">
                  <Typography variant="tiny" tone="muted">{formatMonthLabel(m)}</Typography>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rows.map((row, idx) => {
              if (row.isHeader) {
                return (
                  <tr key={idx} className="bg-mx-green-900">
                    <td className="p-mx-md text-white font-bold text-sm uppercase tracking-wider" colSpan={months.length + 1}>
                      {row.label}
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                  <td className={cn('p-mx-md text-sm', row.bold ? 'font-bold' : 'font-bold')}>
                    {row.label}
                  </td>
                  {months.map((m) => {
                    const entry = data.get(m)
                    const val = entry ? row.getValue(entry.comp, entry.fin) : null
                    const isNeg = val !== null && val < 0
                    return (
                      <td key={m} className={cn(
                        'p-mx-md text-sm text-right',
                        row.bold ? 'font-bold' : 'font-bold',
                        row.color === 'red' && val !== null && val < 0 ? 'text-status-error' : '',
                        row.color === 'green' && val !== null && val > 0 ? 'text-status-success' : '',
                        !row.color && isNeg ? 'text-status-error' : '',
                      )}>
                        {val !== null ? formatValue(val, row.format) : '—'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {onEdit && (
              <tr className="bg-gray-50/50 border-t-2 border-gray-200">
                <td className="p-mx-md font-bold text-sm">AÇÕES</td>
                {months.map((m) => {
                  const entry = data.get(m)
                  return (
                    <td key={m} className="p-mx-md text-center">
                      {entry ? (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry.fin)}>
                          <Pencil size={14} />
                        </Button>
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
