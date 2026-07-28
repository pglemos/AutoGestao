import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import type { ConsultingJourneyController } from '../useConsultingJourney'
import { LessonOverviewTab } from './LessonOverviewTab'
import { DeliveryTab } from './DeliveryTab'
import { EvidenceTab } from './EvidenceTab'
import { ProgressTab } from './ProgressTab'
import { AnticipationPanel } from './AnticipationPanel'

const tabs = [
  { key: 'lesson', label: 'Aula e Visão Geral' },
  { key: 'delivery', label: 'Entrega' },
  { key: 'evidence', label: 'Evidências' },
  { key: 'progress', label: 'Progresso' },
] as const

type TabKey = typeof tabs[number]['key']

export function ConsultingMeetingDialog({ controller }: { controller: ConsultingJourneyController }) {
  const visit = controller.selectedVisit
  const [tab, setTab] = useState<TabKey>('lesson')
  useEffect(() => { if (visit?.id) setTab('lesson') }, [visit?.id])
  if (!controller.dialogOpen || !visit) return null
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 p-3" role="presentation" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) controller.closeVisit() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="consulting-meeting-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Encontro {visit.visitNumber}</p><h2 id="consulting-meeting-title" className="mt-1 text-xl font-semibold text-foreground">{visit.objective || 'Jornada de Consultoria'}</h2></div>
          <div className="flex items-center gap-2">
            {visit.googleMeetLink ? <a href={visit.googleMeetLink} target="_blank" rel="noreferrer" className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Entrar na reunião</a> : null}
            <button type="button" aria-label="Fechar encontro" onClick={controller.closeVisit} className="rounded-lg border border-border px-3 py-2 text-sm">Fechar</button>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-muted/20 px-3 pt-2" aria-label="Áreas do encontro">
          {tabs.map(item => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${tab === item.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{item.label}</button>)}
        </nav>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === 'lesson' ? <LessonOverviewTab visit={visit} controller={controller} /> : null}
          {tab === 'delivery' ? <DeliveryTab visit={visit} controller={controller} /> : null}
          {tab === 'evidence' ? <EvidenceTab visit={visit} controller={controller} /> : null}
          {tab === 'progress' ? <ProgressTab visit={visit} controller={controller} /> : null}
          <div className="mt-5"><AnticipationPanel visit={visit} controller={controller} /></div>
        </div>
      </section>
    </div>
  )
}
