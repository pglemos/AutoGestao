import type { ConsultingJourneyController } from '../useConsultingJourney'
import type { ConsultingJourneyVisit } from '../consultingJourney.types'
import { ConsultingVideoPlayer } from './ConsultingVideoPlayer'

export function LessonOverviewTab({ visit, controller }: { visit: ConsultingJourneyVisit; controller: ConsultingJourneyController }) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visão geral</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{visit.objective || `Encontro ${visit.visitNumber}`}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Assistir à aula prepara a Entrega, mas não conclui o encontro.</p>
      </section>
      {visit.lesson ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aula</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{visit.lesson.title}</h3>
          </div>
          {visit.lesson.videoUrl ? (
            <ConsultingVideoPlayer
              url={visit.lesson.videoUrl}
              initialProgress={visit.lessonProgress}
              onSave={payload => controller.saveLessonProgress({
                visitId: visit.id,
                lessonId: visit.lesson!.id,
                ...payload,
              })}
            />
          ) : <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">A aula ainda não possui vídeo configurado.</p>}
          {visit.lesson.content ? <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{visit.lesson.content}</div> : null}
        </section>
      ) : <section className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhuma aula vinculada a este encontro.</section>}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Arquivos e materiais</h3>
        <div className="mt-3 space-y-2">
          {visit.materials.map((material, index) => (
            <div key={material.id || `${material.title}-${index}`} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-foreground">{material.title}</span>
              {material.url ? <a href={material.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Abrir</a> : null}
            </div>
          ))}
          {!visit.materials.length ? <p className="text-sm text-muted-foreground">Nenhum material complementar.</p> : null}
        </div>
      </section>
    </div>
  )
}
