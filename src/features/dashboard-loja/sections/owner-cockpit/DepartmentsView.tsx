import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { MxDepartmentCode } from '@/lib/mx-executive-foundation'
import { cn } from '@/lib/utils'
import { toneClasses, type DepartmentScore } from './types'
import { formatPlanningValue } from './format'
import { SectionTitle, SideList } from './primitives'
import { OwnerDepartmentScoreGrid } from './OwnerHomeWidgets'

export function DepartmentsView({
  departments,
  selectedDepartmentCode,
}: {
  departments: DepartmentScore[]
  selectedDepartmentCode: MxDepartmentCode | null
}) {
  if (departments.length === 0) {
    return (
      <div className="space-y-mx-md">
        <SectionTitle title="Departamentos" subtitle="Marketing, produto, financeiro, RH, operações e comercial com indicators, rotina e playbook." />
        <div className="owner-base44-exact__empty-state" role="status">
          <strong className="text-base font-black text-text-primary">Nenhum departamento disponível</strong>
          <p className="text-sm text-text-secondary">Os dados de departamentos para esta unidade não estão configurados.</p>
        </div>
      </div>
    )
  }

  const selectedDepartment = departments.find(department => department.code === selectedDepartmentCode) || departments[0]
  return (
    <div className="space-y-mx-md">
      <SectionTitle title="Departamentos" subtitle="Marketing, produto, financeiro, RH, operações e comercial com indicadores, rotina e playbook." />
      <OwnerDepartmentScoreGrid departments={departments} />
      {selectedDepartment && (
        <div className="grid grid-cols-1 gap-mx-md xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-mx-2xl p-mx-lg">
            <div className="flex flex-col gap-mx-sm md:flex-row md:items-start md:justify-between">
              <div>
                <Typography variant="h3" className="text-xl font-black">{selectedDepartment.name}</Typography>
                <Typography variant="p" tone="muted" className="mt-1 font-bold">{selectedDepartment.detail}</Typography>
              </div>
              <span className={cn('w-fit rounded-mx-md border px-mx-sm py-mx-xs text-mx-tiny font-black', toneClasses[selectedDepartment.tone].soft)}>
                Score {selectedDepartment.score ?? '--'} · {selectedDepartment.status}
              </span>
            </div>
            <div className="mt-mx-md grid grid-cols-1 gap-mx-sm md:grid-cols-2 xl:grid-cols-4">
              {selectedDepartment.dashboardCards.map(card => (
                <div key={card.label} className="rounded-mx-xl border border-border-default bg-white p-mx-md">
                  <Typography variant="tiny" tone="muted" className="block font-black uppercase">{card.label}</Typography>
                  <Typography variant="h3" className="mt-mx-xs font-black tabular-nums">{formatPlanningValue(card.value, card.unit)}</Typography>
                  <Typography variant="tiny" tone="muted" className="mt-mx-xs block font-bold">
                    {card.status === 'completo' ? 'Completo' : card.status === 'parcial' ? 'Parcial' : 'Pendente'}
                  </Typography>
                </div>
              ))}
            </div>
            <div className="mt-mx-lg overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-surface-alt text-left text-mx-tiny font-black uppercase text-text-secondary">
                  <tr>
                    <th className="px-mx-sm py-mx-sm">Indicador</th>
                    <th className="px-mx-sm py-mx-sm">Meta</th>
                    <th className="px-mx-sm py-mx-sm">Realizado</th>
                    <th className="px-mx-sm py-mx-sm">Ano anterior</th>
                    <th className="px-mx-sm py-mx-sm">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {selectedDepartment.indicators.map(indicator => (
                    <tr key={indicator.code}>
                      <td className="px-mx-sm py-mx-sm font-black">{indicator.label}</td>
                      <td className="px-mx-sm py-mx-sm font-bold tabular-nums">{formatPlanningValue(indicator.meta, indicator.unit)}</td>
                      <td className="px-mx-sm py-mx-sm font-bold tabular-nums">{formatPlanningValue(indicator.realizado, indicator.unit)}</td>
                      <td className="px-mx-sm py-mx-sm font-bold tabular-nums">{formatPlanningValue(indicator.anoAnterior, indicator.unit)}</td>
                      <td className="px-mx-sm py-mx-sm font-black tabular-nums">{indicator.score ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="space-y-mx-md">
            <SideList title="Checklist do Departamento" items={selectedDepartment.checklist} />
            <SideList title="Playbook Operacional" items={selectedDepartment.playbook} />
            <SideList title="Agenda Estratégica" items={selectedDepartment.strategicAgenda} />
          </div>
        </div>
      )}
    </div>
  )
}
