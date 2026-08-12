import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import {
  Award,
  BookOpen,
  CheckCircle,
  GraduationCap,
  Send,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import {
  useContentSuggestions,
  useDevelopmentTracks,
  useTeamTrainings,
  useTrainings,
} from '@/hooks/useData'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { ContentSuggestionDialog } from '@/features/universidade/components/ContentSuggestionDialog'
import { PageCanvas } from '@/design-system/page'

type Trainings = ReturnType<typeof useTrainings>['treinamentos']
type TeamProgress = ReturnType<typeof useTeamTrainings>['teamProgress']
type Assignments = ReturnType<typeof useDevelopmentTracks>['assignments']
type Suggestions = ReturnType<typeof useContentSuggestions>['suggestions']
type TeamRow = TeamProgress[number] & { progress: number }

type InstitutionalForm = {
  title: string
  description: string
  video_url: string
}

export type ManagerUniversityReferenceProps = {
  tab: 'manager' | 'team'
  onTabChange: (tab: 'manager' | 'team') => void
  storeName: string
  trainings: Trainings
  allTrainings: Trainings
  teamProgress: TeamProgress
  allTeamProgress: TeamProgress
  loading: boolean
  progress: number
  watched: number
  searchTerm: string
  onSearchChange: (value: string) => void
  onRefresh: () => Promise<void>
  isRefetching: boolean
  onMarkWatched: (id: string) => Promise<unknown>
  onRemindSeller: (sellerId: string, trainingTitle: string) => Promise<void>
  isAssigning: boolean
  assigningTo: string | null
  setAssigningTo: (sellerId: string | null) => void
  onAssignTraining: (trainingId: string) => Promise<void>
  onAssignOnboarding: (sellerId: string) => Promise<void>
  assignments: Assignments
  suggestions: Suggestions
  institutionalForm: InstitutionalForm
  setInstitutionalForm: Dispatch<SetStateAction<InstitutionalForm>>
  onCreateInstitutionalContent: (event: FormEvent) => Promise<void>
  savingInstitutional: boolean
}

type ManagerCatalogTrack = {
  id: string
  title: string
  description: string
  lessons: number
  comingSoon?: boolean
}

const MANAGER_CATALOG_TRACKS: ManagerCatalogTrack[] = [
  { id: 'lideranca-comercial', title: 'Liderança Comercial', description: 'Desenvolva habilidades de liderança e influência positiva.', lessons: 8 },
  { id: 'gestao-indicadores', title: 'Gestão por Indicadores', description: 'Aprenda a ler e agir sobre KPIs comerciais.', lessons: 6 },
  { id: 'feedbacks-pdis', title: 'Feedbacks e PDIs', description: 'Técnicas para feedback eficaz e planos de desenvolvimento.', lessons: 5 },
  { id: 'reunioes-alta-performance', title: 'Reuniões de Alta Performance', description: 'Como conduzir reuniões produtivas e motivadoras.', lessons: 4 },
  { id: 'gestao-rotina-comercial', title: 'Gestão da Rotina Comercial', description: 'Estruture e acompanhe a rotina da equipe.', lessons: 7 },
  { id: 'motivacao-cultura', title: 'Motivação e Cultura', description: 'Crie um ambiente de alta performance e engajamento.', lessons: 6 },
  { id: 'formacao-vendedores', title: 'Formação de Vendedores', description: 'Como treinar e desenvolver vendedores do zero.', lessons: 9 },
  { id: 'gestao-conflitos', title: 'Gestão de Conflitos', description: 'Técnicas para resolver conflitos de forma construtiva.', lessons: 4 },
  { id: 'negociacao-gerencial', title: 'Negociação Gerencial', description: 'Negocie recursos, metas e expectativas.', lessons: 5 },
  { id: 'ia-lideranca', title: 'IA aplicada à liderança', description: 'Uso de inteligência artificial na gestão comercial.', lessons: 0, comingSoon: true },
]

export function getSafeTrainingMaterialUrl(videoUrl: string | null | undefined): string | null {
  const candidate = videoUrl?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function ManagerUniversityReference({
  tab,
  onTabChange,
  storeName,
  trainings,
  allTrainings,
  teamProgress,
  allTeamProgress,
  loading,
  progress,
  watched,
  searchTerm,
  onMarkWatched,
  onRemindSeller,
  isAssigning,
  assigningTo,
  setAssigningTo,
  onAssignTraining,
  onAssignOnboarding,
  assignments,
  suggestions,
  institutionalForm,
  setInstitutionalForm,
  onCreateInstitutionalContent,
  savingInstitutional,
}: ManagerUniversityReferenceProps) {
  const [selectedCatalogTrack, setSelectedCatalogTrack] = useState<ManagerCatalogTrack | null>(null)
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamRow | null>(null)
  const catalogTracks = useMemo(
    () => MANAGER_CATALOG_TRACKS.filter(track =>
      `${track.title} ${track.description}`
        .toLocaleLowerCase('pt-BR')
        .includes(searchTerm.trim().toLocaleLowerCase('pt-BR')),
    ),
    [searchTerm],
  )
  const visibleTeamRows = useMemo(
    () => buildTeamRows(teamProgress, allTrainings.length),
    [allTrainings.length, teamProgress],
  )
  const allTeamRows = useMemo(
    () => buildTeamRows(allTeamProgress, allTrainings.length),
    [allTeamProgress, allTrainings.length],
  )
  const completed = watched
  const pending = Math.max(allTrainings.length - completed, 0)
  const average = allTeamRows.length > 0
    ? Math.round(allTeamRows.reduce((sum, member) => sum + member.progress, 0) / allTeamRows.length)
    : 0
  const inDay = allTeamRows.filter(member => member.progress >= 75).length
  const attention = allTrainings.length > 0 ? allTeamRows.length - inDay : 0

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-5">
        <UniversityHeader />

        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm">
          <UniversityTabs tab={tab} onTabChange={onTabChange} />
          {loading ? (
            <LoadingState />
          ) : tab === 'manager' ? (
            <ManagerDevelopmentPanel
              progress={progress}
              pending={pending}
              completed={completed}
              catalogTracks={catalogTracks}
              trainings={trainings}
              onSelectCatalogTrack={setSelectedCatalogTrack}
              onMarkWatched={onMarkWatched}
            />
          ) : (
            <TeamDevelopmentPanel
              average={average}
              inDay={inDay}
              attention={attention}
              teamRows={visibleTeamRows}
              allTrainings={allTrainings}
              storeName={storeName}
              isAssigning={isAssigning}
              onRemindSeller={onRemindSeller}
              onOpenDetails={setSelectedTeamMember}
              setAssigningTo={setAssigningTo}
              onAssignOnboarding={onAssignOnboarding}
              assignments={assignments}
              suggestions={suggestions}
              institutionalForm={institutionalForm}
              setInstitutionalForm={setInstitutionalForm}
              onCreateInstitutionalContent={onCreateInstitutionalContent}
              savingInstitutional={savingInstitutional}
            />
          )}
        </section>

        <AssignTrainingDialog
          assigningTo={assigningTo}
          allTrainings={allTrainings}
          isAssigning={isAssigning}
          onClose={() => setAssigningTo(null)}
          onAssignTraining={onAssignTraining}
        />
        <CatalogTrackDialog
          track={selectedCatalogTrack}
          onClose={() => setSelectedCatalogTrack(null)}
        />
        <TeamTrainingDetailDialog
          member={selectedTeamMember}
          allTrainings={allTrainings}
          storeName={storeName}
          onClose={() => setSelectedTeamMember(null)}
        />
    </PageCanvas>
  )
}

export function buildTeamRows(teamProgress: TeamProgress, trainingCount: number): TeamRow[] {
  return teamProgress.map(member => ({
    ...member,
    progress: trainingCount > 0
      ? Math.min(100, Math.round((member.watched.length / trainingCount) * 100))
      : 0,
  }))
}

function UniversityHeader() {
  return (
    <header className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <GraduationCap size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Universidade MX</h1>
          <p className="text-sm text-muted-foreground">
            Desenvolva suas habilidades de liderança e acompanhe a evolução da sua equipe.
          </p>
        </div>
        <div className="w-full shrink-0 md:ml-auto md:w-auto">
          <ContentSuggestionDialog />
        </div>
      </div>
    </header>
  )
}

function UniversityTabs({
  tab,
  onTabChange,
}: Pick<ManagerUniversityReferenceProps, 'tab' | 'onTabChange'>) {
  const tabs = [
    { key: 'manager' as const, label: 'Desenvolvimento do Gerente' },
    { key: 'team' as const, label: 'Acompanhamento da Equipe' },
  ]

  return (
    <nav className="flex border-b border-border-subtle" role="tablist" aria-label="Universidade MX">
      {tabs.map(item => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={tab === item.key}
          onClick={() => onTabChange(item.key)}
          className={`px-5 py-3.5 text-sm font-medium transition-colors ${
            tab === item.key
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function LoadingState() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
    </div>
  )
}

type ManagerDevelopmentPanelProps = {
  progress: number
  pending: number
  completed: number
  catalogTracks: ManagerCatalogTrack[]
  trainings: Trainings
  onSelectCatalogTrack: (track: ManagerCatalogTrack) => void
  onMarkWatched: (id: string) => Promise<unknown>
}

export function ManagerDevelopmentPanel({
  progress,
  pending,
  completed,
  catalogTracks,
  trainings,
  onSelectCatalogTrack,
  onMarkWatched,
}: ManagerDevelopmentPanelProps) {
  return (
    <div className="space-y-5 p-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <UniversityStat label="Progresso Geral" value={`${Math.round(progress)}%`} icon={TrendingUp} tone="emerald" />
        <UniversityStat label="Treinamentos Pendentes" value={pending} icon={BookOpen} tone="blue" />
        <UniversityStat label="Treinamentos Concluídos" value={completed} icon={CheckCircle} tone="green" />
        <UniversityStat label="Certificados não rastreados" value="—" icon={Award} tone="violet" />
      </div>

      <h2 className="font-semibold text-foreground">Trilhas Gerenciais</h2>
      <CatalogTrackGrid tracks={catalogTracks} onSelect={onSelectCatalogTrack} />
      <OfficialTrainingGrid trainings={trainings} onMarkWatched={onMarkWatched} />
    </div>
  )
}

function CatalogTrackGrid({
  tracks,
  onSelect,
}: {
  tracks: ManagerCatalogTrack[]
  onSelect: (track: ManagerCatalogTrack) => void
}) {
  if (!tracks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
        Nenhuma trilha corresponde à busca.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tracks.map(track => (
        <article
          key={track.id}
          className={`flex flex-col rounded-2xl border border-border-subtle bg-white p-5 shadow-sm ${track.comingSoon ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen size={18} />
            </span>
            <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-muted-foreground">
              {track.comingSoon ? 'Em breve' : 'Iniciar'}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">{track.title}</h3>
          <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{track.description}</p>
          {!track.comingSoon && (
            <>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{track.lessons} aulas</span>
                <span>0%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100" />
              <button
                type="button"
                onClick={() => onSelect(track)}
                className="mt-3 w-full rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Iniciar
              </button>
            </>
          )}
        </article>
      ))}
    </div>
  )
}

export function OfficialTrainingGrid({
  trainings,
  onMarkWatched,
}: Pick<ManagerDevelopmentPanelProps, 'trainings' | 'onMarkWatched'>) {
  const [openedTrainingIds, setOpenedTrainingIds] = useState<Set<string>>(() => new Set())

  if (!trainings.length) return null

  return (
    <>
      <h2 className="font-semibold text-foreground">Conteúdos Oficiais</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trainings.map(training => {
          const materialUrl = getSafeTrainingMaterialUrl(training.video_url)
          const hasOpenedMaterial = openedTrainingIds.has(training.id)
          const canComplete = Boolean(materialUrl) && hasOpenedMaterial && !training.watched
          const completionLabel = training.watched
            ? 'Concluído ✓'
            : !materialUrl
              ? 'Conclusão indisponível'
              : hasOpenedMaterial
                ? 'Marcar como concluído'
                : 'Abra o conteúdo para concluir'

          return (
            <article key={training.id} className="flex flex-col rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <BookOpen size={18} />
                </span>
                <span className={`rounded-lg px-2 py-1 text-xs font-medium ${
                  training.watched ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-muted-foreground'
                }`}>
                  {training.watched ? 'Concluído' : 'Iniciar'}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{training.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{training.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{training.duration_minutes || 0} min</span>
                <span>{training.watched ? '100%' : '0%'}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: training.watched ? '100%' : '0%' }} />
              </div>
              {materialUrl ? (
                <a
                  href={materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenedTrainingIds(current => {
                    if (current.has(training.id)) return current
                    const next = new Set(current)
                    next.add(training.id)
                    return next
                  })}
                  className="mt-3 w-full rounded-xl border border-emerald-200 py-2 text-center text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Abrir conteúdo
                </a>
              ) : (
                <span className="mt-3 rounded-xl bg-gray-50 py-2 text-center text-xs font-medium text-muted-foreground">
                  Material indisponível
                </span>
              )}
              <button
                type="button"
                disabled={!canComplete}
                onClick={() => {
                  if (canComplete) void onMarkWatched(training.id)
                }}
                className={`mt-2 w-full rounded-xl py-2 text-xs font-semibold ${
                  training.watched
                    ? 'cursor-default bg-emerald-50 text-emerald-600'
                    : canComplete
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-gray-100 text-muted-foreground'
                }`}
              >
                {completionLabel}
              </button>
            </article>
          )
        })}
      </div>
    </>
  )
}

type TeamDevelopmentPanelProps = {
  average: number
  inDay: number
  attention: number
  teamRows: TeamRow[]
  allTrainings: Trainings
  storeName: string
  isAssigning: boolean
  onRemindSeller: (sellerId: string, trainingTitle: string) => Promise<void>
  onOpenDetails: (member: TeamRow) => void
  setAssigningTo: (sellerId: string | null) => void
  onAssignOnboarding: (sellerId: string) => Promise<void>
  assignments: Assignments
  suggestions: Suggestions
  institutionalForm: InstitutionalForm
  setInstitutionalForm: Dispatch<SetStateAction<InstitutionalForm>>
  onCreateInstitutionalContent: (event: FormEvent) => Promise<void>
  savingInstitutional: boolean
}

function TeamDevelopmentPanel(props: TeamDevelopmentPanelProps) {
  return (
    <div className="space-y-5 p-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <TeamStat label="Média de conclusão" value={`${props.average}%`} tone="emerald" />
        <TeamStat label="Vendedores em dia" value={props.inDay} tone="blue" />
        <TeamStat label="Vendedores atrasados" value={props.attention} tone="amber" />
        <TeamStat label="Certificados não rastreados" value="—" tone="violet" />
      </div>
      <UniversityTeamTable
        teamRows={props.teamRows}
        allTrainings={props.allTrainings}
        storeName={props.storeName}
        isAssigning={props.isAssigning}
        onRemindSeller={props.onRemindSeller}
        onOpenDetails={props.onOpenDetails}
        setAssigningTo={props.setAssigningTo}
        onAssignOnboarding={props.onAssignOnboarding}
        assignments={props.assignments}
      />
      <InstitutionalContentForm
        suggestions={props.suggestions}
        institutionalForm={props.institutionalForm}
        setInstitutionalForm={props.setInstitutionalForm}
        onCreateInstitutionalContent={props.onCreateInstitutionalContent}
        savingInstitutional={props.savingInstitutional}
      />
    </div>
  )
}

function InstitutionalContentForm({
  suggestions,
  institutionalForm,
  setInstitutionalForm,
  onCreateInstitutionalContent,
  savingInstitutional,
}: Pick<
  TeamDevelopmentPanelProps,
  'suggestions' | 'institutionalForm' | 'setInstitutionalForm' | 'onCreateInstitutionalContent' | 'savingInstitutional'
>) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-foreground">Conteúdo institucional</h2>
      <p className="mt-1 text-xs text-muted-foreground">História, valores, cultura e processos da loja.</p>
      <form onSubmit={onCreateInstitutionalContent} className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Input
          value={institutionalForm.title}
          onChange={event => setInstitutionalForm(previous => ({ ...previous, title: event.target.value }))}
          placeholder="Título do conteúdo"
        />
        <Input
          value={institutionalForm.video_url}
          onChange={event => setInstitutionalForm(previous => ({ ...previous, video_url: event.target.value }))}
          placeholder="Link do vídeo ou material"
        />
        <Button type="submit" disabled={savingInstitutional}>
          {savingInstitutional ? 'Publicando...' : 'Publicar'}
        </Button>
        <textarea
          value={institutionalForm.description}
          onChange={event => setInstitutionalForm(previous => ({ ...previous, description: event.target.value }))}
          placeholder="Descrição do conteúdo"
          className="min-h-20 rounded-xl border border-border p-3 text-sm lg:col-span-3"
        />
      </form>
      {suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.slice(0, 6).map(suggestion => (
            <Badge key={suggestion.id} variant={suggestion.priority === 'high' ? 'danger' : 'brand'}>
              {suggestion.theme}: {suggestion.title}
            </Badge>
          ))}
        </div>
      )}
    </section>
  )
}

function UniversityStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone: 'emerald' | 'blue' | 'green' | 'violet'
}) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${styles[tone]}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function TeamStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: 'emerald' | 'blue' | 'amber' | 'violet'
}) {
  const styles = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    violet: 'text-violet-600',
  }
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className={`text-2xl font-bold ${styles[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function UniversityTeamTable({
  teamRows,
  allTrainings,
  storeName,
  isAssigning,
  onRemindSeller,
  onOpenDetails,
  setAssigningTo,
  onAssignOnboarding,
  assignments,
}: {
  teamRows: TeamRow[]
  allTrainings: Trainings
  storeName: string
  isAssigning: boolean
  onRemindSeller: (sellerId: string, trainingTitle: string) => Promise<void>
  onOpenDetails: (member: TeamRow) => void
  setAssigningTo: (sellerId: string | null) => void
  onAssignOnboarding: (sellerId: string) => Promise<void>
  assignments: Assignments
}) {
  if (!teamRows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
        Nenhum vendedor vinculado para acompanhamento.
      </div>
    )
  }

  const hasOfficialContent = allTrainings.length > 0
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-white shadow-sm">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-border-subtle bg-gray-50">
          <tr>
            {['Vendedor', 'Unidade', 'Trilha Atual', 'Progresso', 'Status', 'Ações'].map(label => (
              <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {teamRows.map(member => {
            const pendingTraining = allTrainings.find(training => !member.watched.includes(training.id))
            const statusLabel = !hasOfficialContent ? 'Sem conteúdo' : member.progress >= 75 ? 'Em dia' : 'Atenção'
            const statusStyle = !hasOfficialContent
              ? 'bg-gray-100 text-muted-foreground'
              : member.progress >= 75
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            const hasActiveOnboarding = assignments.some(
              assignment => assignment.seller_id === member.seller_id && assignment.status === 'active',
            )

            return (
              <tr key={member.seller_id}>
                <td className="px-4 py-3 font-medium text-foreground">{member.seller_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{storeName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {pendingTraining?.title || (hasOfficialContent ? 'Trilha concluída' : 'Nenhum conteúdo oficial')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${member.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{member.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusStyle}`}>{statusLabel}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDetails(member)}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Ver detalhes
                    </button>
                    {pendingTraining && (
                      <button
                        type="button"
                        disabled={isAssigning}
                        onClick={() => void onRemindSeller(member.seller_id, pendingTraining.title)}
                        className="text-xs font-medium text-emerald-600"
                      >
                        Cobrar
                      </button>
                    )}
                    {hasOfficialContent && (
                      <button
                        type="button"
                        onClick={() => setAssigningTo(member.seller_id)}
                        className="text-xs font-medium text-blue-600"
                      >
                        Atribuir
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isAssigning || hasActiveOnboarding}
                      onClick={() => void onAssignOnboarding(member.seller_id)}
                      className="text-xs font-medium text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Trilha entrada
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AssignTrainingDialog({
  assigningTo,
  allTrainings,
  isAssigning,
  onClose,
  onAssignTraining,
}: {
  assigningTo: string | null
  allTrainings: Trainings
  isAssigning: boolean
  onClose: () => void
  onAssignTraining: (trainingId: string) => Promise<void>
}) {
  const dialogContentRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogContentRef, Boolean(assigningTo))

  if (!assigningTo) return null
  return (
    <Modal
      open
      onClose={onClose}
      title="Atribuir treinamento"
      size="lg"
      referenceStyle
      showClose={false}
      className="!max-h-[85vh]"
    >
      <div ref={dialogContentRef} data-testid="assign-training-focus-scope" className="space-y-2">
        {allTrainings.map(training => (
          <button
            key={training.id}
            type="button"
            disabled={isAssigning}
            onClick={() => void onAssignTraining(training.id)}
            className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-sm hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span>{training.title}</span>
            <Send size={15} className="text-emerald-600" />
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-border py-2 text-sm font-medium text-foreground"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}

export function CatalogTrackDialog({
  track,
  onClose,
}: {
  track: ManagerCatalogTrack | null
  onClose: () => void
}) {
  const dialogContentRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogContentRef, Boolean(track))

  if (!track) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={track.title}
      description={track.description}
      size="sm"
      referenceStyle
      showClose={false}
    >
      <div ref={dialogContentRef} data-testid="catalog-track-focus-scope" className="space-y-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <BookOpen size={20} />
        </span>
        <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-muted-foreground">
          Catálogo gerencial com {track.lessons} aulas. O progresso só será registrado quando houver conteúdo oficial vinculado à trilha.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-border py-2 text-sm font-medium text-foreground"
        >
          Fechar
        </button>
      </div>
    </Modal>
  )
}

export function TeamTrainingDetailDialog({
  member,
  allTrainings,
  storeName,
  onClose,
}: {
  member: TeamRow | null
  allTrainings: Trainings
  storeName: string
  onClose: () => void
}) {
  if (!member) return null
  const pendingTraining = allTrainings.find(training => !member.watched.includes(training.id))
  const status = allTrainings.length === 0
    ? 'Sem conteúdo'
    : member.progress >= 75
      ? 'Em dia'
      : 'Atenção'

  return (
    <Modal
      open
      onClose={onClose}
      title={`Detalhes de ${member.seller_name}`}
      description="Acompanhamento real dos treinamentos atribuídos à equipe."
      size="sm"
      referenceStyle
      showClose={false}
    >
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Detail label="Vendedor" value={member.seller_name} />
        <Detail label="Unidade" value={storeName} />
        <Detail label="Progresso" value={`${member.progress}%`} />
        <Detail label="Status" value={status} />
        <Detail label="Conteúdos concluídos" value={`${member.watched.length} de ${allTrainings.length}`} />
        <Detail label="Última pendência" value={pendingTraining?.title || 'Nenhuma'} />
        <Detail label="Gargalo atual" value={member.current_gap || 'Nenhum diagnóstico oficial'} />
      </dl>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-xl border border-border py-2 text-sm font-medium text-foreground"
      >
        Fechar
      </button>
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  )
}
