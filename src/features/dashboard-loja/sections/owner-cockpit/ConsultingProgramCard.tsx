import { Video } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { OwnerConsultingProgramSummary } from '../../hooks/useOwnerConsultingProgram'

function formatVisitDate(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ConsultingProgramCard({
  program,
  loading,
  error,
}: {
  program: OwnerConsultingProgramSummary | null
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <Card className="rounded-mx-2xl border border-border-subtle bg-white p-mx-lg">
        <Typography variant="p" tone="muted" className="font-bold">Carregando programa de consultoria…</Typography>
      </Card>
    )
  }

  if (error || !program) {
    return (
      <div className="owner-base44-exact__empty-state" role="status">
        <strong className="text-base font-black text-text-primary">Nenhum programa de consultoria ativo</strong>
        <p className="text-sm text-text-secondary">{error || 'Esta loja ainda não possui um programa de consultoria vinculado.'}</p>
      </div>
    )
  }

  const nextVisitDate = formatVisitDate(program.nextVisitScheduledAt)

  return (
    <Card className="rounded-mx-2xl border border-border-subtle bg-white p-mx-lg">
      <div className="flex flex-col gap-mx-md md:flex-row md:items-start md:justify-between">
        <div>
          <span className="inline-flex rounded-mx-md border border-status-success/30 bg-status-success-surface px-mx-sm py-mx-xs text-mx-tiny font-black uppercase text-status-success">
            Programa contratado
          </span>
          <Typography variant="h2" className="mt-mx-sm text-2xl font-black">{program.programName}</Typography>
          <Typography variant="tiny" tone="muted" className="mt-mx-xs block font-bold">
            {program.visitsCompleted} de {program.totalVisits} encontros realizados
            {program.clientModality ? ` · Modalidade: ${program.clientModality}` : ''}
          </Typography>
        </div>

        {program.nextVisitNumber ? (
          <div className="rounded-mx-lg border border-border-subtle bg-surface-alt p-mx-md md:w-[280px]">
            <Typography variant="tiny" tone="muted" className="font-black uppercase tracking-widest">Próximo encontro</Typography>
            <Typography variant="p" className="mt-mx-xs font-black">Encontro {program.nextVisitNumber}</Typography>
            {nextVisitDate && (
              <Typography variant="tiny" tone="muted" className="mt-mx-tiny block font-bold">{nextVisitDate}</Typography>
            )}
            {program.nextVisitObjective && (
              <Typography variant="tiny" tone="muted" className="mt-mx-tiny block font-bold">{program.nextVisitObjective}</Typography>
            )}
            {program.nextVisitMeetLink && (
              <Button
                type="button"
                className="mt-mx-sm w-full"
                onClick={() => window.open(program.nextVisitMeetLink!, '_blank', 'noopener,noreferrer')}
              >
                <Video size={16} /> Entrar na Reunião
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
