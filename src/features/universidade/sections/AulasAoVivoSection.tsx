import { useState, type ReactNode } from 'react'
import { toast } from '@/lib/toast'
import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  FileQuestion,
  Medal,
  PlayCircle,
  Video,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { Modal } from '@/components/organisms/Modal'
import { cn } from '@/lib/utils'
import { useAulasAoVivo, type AulaAoVivo, type ProvaAula } from '@/hooks/useAulasAoVivo'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

const formatHour = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Link "adicionar ao calendário" (Google Calendar template) para a aula real. */
function calendarUrl(aula: AulaAoVivo): string {
  const start = new Date(aula.inicio)
  const end = new Date(start.getTime() + aula.duracao_minutos * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: aula.titulo,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: aula.descricao || 'Aula ao vivo MX Performance',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function AulasAoVivoSection() {
  const { aulas, proximaAula, futuras, gravacoes, indicadores, presencaPorAula, loading, getProva, submeterProva } = useAulasAoVivo()
  const [provaAula, setProvaAula] = useState<AulaAoVivo | null>(null)
  const [prova, setProva] = useState<ProvaAula | null>(null)
  const [respostas, setRespostas] = useState<number[]>([])
  const [enviando, setEnviando] = useState(false)
  const aulaPrincipal = proximaAula || futuras[0] || null
  const agenda = futuras.slice(0, 3)
  const gravacoesDisplay = gravacoes.slice(0, 3)
  const horasConteudo = aulas
    .filter(aula => presencaPorAula.get(aula.id)?.aprovado)
    .reduce((acc, aula) => acc + aula.duracao_minutos, 0)

  async function abrirProva(aula: AulaAoVivo) {
    const { prova: p, error } = await getProva(aula.id)
    if (error || !p) {
      toast.error(error || 'Prova indisponível.')
      return
    }
    if (!p.questoes.length) {
      toast.error('Esta aula ainda não tem questões cadastradas.')
      return
    }
    setProvaAula(aula)
    setProva(p)
    setRespostas(new Array(p.questoes.length).fill(-1))
  }

  async function enviarProva() {
    if (!provaAula || !prova) return
    if (respostas.some(r => r < 0)) {
      toast.error('Responda todas as questões.')
      return
    }
    setEnviando(true)
    const { resultado, error } = await submeterProva(provaAula.id, respostas)
    setEnviando(false)
    if (error || !resultado) {
      toast.error(error || 'Falha ao enviar a prova.')
      return
    }
    toast.success(resultado.aprovado ? `Presença validada! Nota ${resultado.nota}%` : `Nota ${resultado.nota}% - revise e tente novamente.`)
    setProvaAula(null)
    setProva(null)
  }

  return (
    <section className="space-y-mx-lg" aria-label="Aulas ao Vivo">
      <div className="flex flex-col gap-mx-sm border-b border-border-default pb-mx-md xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Typography variant="h2" className="text-3xl tracking-normal">Aulas ao Vivo</Typography>
          <Typography variant="p" tone="muted">Participe das aulas ao vivo, faça a prova e valide sua presença para ganhar pontos no Score.</Typography>
        </div>
        <Button variant="outline" onClick={() => document.getElementById('aulas-como-funciona')?.scrollIntoView({ behavior: 'smooth' })}><PlayCircle size={16} /> Como funciona</Button>
      </div>

      <div className="grid grid-cols-1 gap-mx-xl xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-mx-lg">
          <div>
            <Typography variant="h3" className="mb-mx-sm">Próxima Aula ao Vivo</Typography>
            {aulaPrincipal ? (
            <div className="grid grid-cols-1 overflow-hidden rounded-mx-lg border border-border-default bg-white shadow-mx-sm lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="grid min-h-[220px] grid-cols-[100px_minmax(0,260px)_1fr] bg-sidebar-bg-strong text-white">
                <div className="flex flex-col items-center justify-center bg-status-info text-white">
                  <Badge variant="info" className="mb-mx-sm">{aulaPrincipal.status === 'ao_vivo' ? 'Ao vivo' : 'Agendada'}</Badge>
                  <span className="text-sm font-black uppercase">{formatDate(aulaPrincipal.inicio).slice(0, 3)}</span>
                  <span className="text-5xl font-black leading-none">{new Date(aulaPrincipal.inicio).getDate()}</span>
                  <span className="text-xl font-black uppercase">{new Date(aulaPrincipal.inicio).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                </div>
                <div className="grid place-items-center bg-white/5"><Video size={56} className="text-white/40" /></div>
                <div className="flex flex-col justify-center p-mx-lg">
                  <Typography variant="h2" tone="white" className="text-2xl">{aulaPrincipal.titulo}</Typography>
                  {aulaPrincipal.descricao && <Typography variant="p" tone="white" className="mt-mx-xs opacity-75">{aulaPrincipal.descricao}</Typography>}
                  <div className="mt-mx-md flex flex-wrap gap-mx-md text-sm font-black text-white/80">
                    {aulaPrincipal.instrutor && <span>Com: {aulaPrincipal.instrutor}</span>}
                    <span className="inline-flex items-center gap-1"><Clock size={15} /> {formatHour(aulaPrincipal.inicio)} às {formatHour(new Date(new Date(aulaPrincipal.inicio).getTime() + aulaPrincipal.duracao_minutos * 60000).toISOString())}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={15} /> {aulaPrincipal.duracao_minutos} min</span>
                    <Badge variant={aulaPrincipal.status === 'ao_vivo' ? 'success' : 'info'}>{aulaPrincipal.status === 'ao_vivo' ? 'Ao vivo' : 'Agendada'}</Badge>
                  </div>
                  <Typography variant="tiny" tone="white" className="mt-mx-md block normal-case tracking-normal opacity-70">Sua presença será validada pela prova realizada após a aula.</Typography>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-mx-sm p-mx-lg">
                {aulaPrincipal.link_transmissao ? (
                  <Button asChild className="h-mx-14">
                    <a href={aulaPrincipal.link_transmissao} target="_blank" rel="noreferrer"><Video size={16} /> Participar da aula</a>
                  </Button>
                ) : (
                  <Button className="h-mx-14" disabled><Video size={16} /> Link ainda não liberado</Button>
                )}
                <Button asChild variant="outline" className="h-mx-14">
                  <a href={calendarUrl(aulaPrincipal)} target="_blank" rel="noreferrer"><CalendarDays size={16} /> Adicionar ao calendário</a>
                </Button>
                <Button variant="ghost" onClick={() => abrirProva(aulaPrincipal)}>Fazer a prova <ChevronRight size={16} /></Button>
              </div>
            </div>
            ) : (
            <div className="grid min-h-[220px] place-items-center rounded-mx-lg border border-border-default bg-white p-mx-lg text-center shadow-mx-sm">
              <div>
                <Video size={36} className="mx-auto text-text-tertiary" />
                <Typography variant="p" className="mt-mx-sm">{loading ? 'Carregando aulas...' : 'Nenhuma aula ao vivo agendada'}</Typography>
                {!loading && <Typography variant="caption" tone="muted" className="normal-case tracking-normal">Quando sua loja ou a MX agendar uma aula, ela aparece aqui com link, prova e presença.</Typography>}
              </div>
            </div>
            )}
          </div>

          <div id="aulas-como-funciona">
            <Typography variant="h3" className="mb-mx-md">Como funciona</Typography>
            <div className="grid grid-cols-1 gap-mx-md md:grid-cols-4">
              <Step icon={<CalendarDays size={24} />} title="1. Participe da aula" text="Participe ao vivo ou assista a gravação." />
              <Step icon={<FileQuestion size={24} />} title="2. Faça a prova" text="Responda o quiz com 5 a 10 perguntas." />
              <Step icon={<Medal size={24} />} title="3. Valide sua presença" text="Acerte 70% ou mais e sua presença será confirmada." />
              <Step icon={<BarChart3 size={24} />} title="4. Ganhe pontos no Score" text="Sua presença e desempenho impactam seu Score." />
            </div>
          </div>

          <Card className="border bg-status-info-surface p-mx-lg shadow-none">
            <Typography variant="h3" className="">Suas aulas recentes</Typography>
            <div className="mt-mx-md grid grid-cols-1 gap-mx-md md:grid-cols-4">
              <MiniMetric icon={<CalendarDays size={22} />} value={String(indicadores.presencasValidadas)} label="Presenças validadas" hint="provas aprovadas" />
              <MiniMetric icon={<CheckCircle size={22} />} value={indicadores.mediaProvas === null ? '—' : `${indicadores.mediaProvas}%`} label="Média de acertos" hint={indicadores.mediaProvas === null ? 'nenhuma prova feita' : 'nas provas'} />
              <MiniMetric icon={<Award size={22} />} value={String(indicadores.pontos)} label="Pontos conquistados" hint="com aulas ao vivo" />
              <MiniMetric icon={<Clock size={22} />} value={horasConteudo > 0 ? `${Math.floor(horasConteudo / 60)}h ${horasConteudo % 60 ? `${horasConteudo % 60}m` : ''}`.trim() : '—'} label="Horas de conteúdo" hint="em aulas com presença" />
            </div>
          </Card>
        </div>

        <aside className="space-y-mx-md">
          <Card className="border p-mx-lg shadow-none">
            <div className="mb-mx-sm flex items-center justify-between">
              <Typography variant="h3" className="">Agenda de Aulas</Typography>
            </div>
            <div className="divide-y divide-border-default">
              {agenda.length === 0 && (
                <Typography variant="caption" tone="muted" className="block py-mx-sm normal-case tracking-normal">Sem próximas aulas na agenda.</Typography>
              )}
              {agenda.map((aula) => (
                <button key={aula.id} type="button" onClick={() => abrirProva(aula)} className="flex w-full items-center gap-mx-md py-mx-sm text-left">
                  <div className="flex h-mx-16 w-mx-14 shrink-0 flex-col items-center justify-center rounded-mx-md bg-surface-alt">
                    <span className="text-xs font-black uppercase text-status-info">{formatDate(aula.inicio).slice(0, 3)}</span>
                    <span className="text-2xl font-black text-text-primary">{new Date(aula.inicio).getDate()}</span>
                    <span className="text-xs font-black uppercase text-text-secondary">{new Date(aula.inicio).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Typography variant="p" className="">{aula.titulo}</Typography>
                    <Typography variant="tiny" tone="muted" className="tracking-normal">{formatHour(aula.inicio)} às {formatHour(new Date(new Date(aula.inicio).getTime() + aula.duracao_minutos * 60000).toISOString())}</Typography>
                    {aula.instrutor && <Typography variant="tiny" tone="muted" className="block tracking-normal">Com {aula.instrutor}</Typography>}
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </Card>

          <Card className="border p-mx-lg shadow-none">
            <div className="mb-mx-sm flex items-center justify-between">
              <Typography variant="h3" className="">Gravações disponíveis</Typography>
            </div>
            <div className="space-y-mx-sm">
              {gravacoesDisplay.length === 0 && (
                <Typography variant="caption" tone="muted" className="block normal-case tracking-normal">Nenhuma gravação disponível ainda.</Typography>
              )}
              {gravacoesDisplay.map((aula) => {
                const presenca = presencaPorAula.get(aula.id)
                const conteudo = (
                  <>
                    <div className="relative grid h-mx-16 w-mx-24 shrink-0 place-items-center overflow-hidden rounded-mx-md bg-sidebar-bg-strong text-white">
                      <PlayCircle size={28} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Typography variant="p" className="truncate">{aula.titulo}</Typography>
                      <Typography variant="tiny" tone="muted" className="tracking-normal">{aula.instrutor ? `Com ${aula.instrutor}` : 'Universidade MX'}</Typography>
                      <Typography variant="tiny" tone="muted" className="block tracking-normal">{new Date(aula.inicio).toLocaleDateString('pt-BR')} • {aula.duracao_minutos} min</Typography>
                    </div>
                    <div className="text-right">
                      <Typography variant="tiny" tone="muted" className="tracking-normal">Nota</Typography>
                      <Typography variant="p" className="">{presenca?.nota !== null && presenca?.nota !== undefined ? `${presenca.nota}%` : '—'}</Typography>
                    </div>
                  </>
                )
                return aula.gravacao_url ? (
                  <a key={aula.id} href={aula.gravacao_url} target="_blank" rel="noreferrer" className="flex items-center gap-mx-sm rounded-mx-md transition-colors hover:bg-surface-alt">
                    {conteudo}
                  </a>
                ) : (
                  <div key={aula.id} className="flex items-center gap-mx-sm">{conteudo}</div>
                )
              })}
            </div>
          </Card>
        </aside>
      </div>

      <Card className="border border-accent-blue/20 bg-accent-blue-soft p-mx-lg shadow-none">
        <div className="flex flex-col gap-mx-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-mx-md">
            <Award size={34} className="text-accent-blue" />
            <div>
              <Typography variant="h3">Presença que gera resultado!</Typography>
              <Typography variant="p" tone="muted">Participe, aprenda e aplique. Cada aula é uma oportunidade de evoluir e se destacar.</Typography>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(provaAula && prova)}
        onClose={() => { setProvaAula(null); setProva(null) }}
        title={`Prova de presença - ${provaAula?.titulo ?? ''}`}
        description={prova ? `Acerte ${prova.nota_minima}% ou mais para validar sua presença e ganhar ${prova.pontos_score} pontos.` : undefined}
        footer={
          <div className="flex justify-end gap-mx-sm">
            <Button variant="ghost" onClick={() => { setProvaAula(null); setProva(null) }}>Cancelar</Button>
            <Button onClick={enviarProva} disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar respostas'}</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-mx-md">
          {prova?.questoes.map((questao, qIndex) => (
            <div key={qIndex}>
              <Typography variant="p" className="font-bold">{qIndex + 1}. {questao.pergunta}</Typography>
              <div className="mt-mx-xs flex flex-col gap-mx-tiny">
                {questao.opcoes.map((opcao, oIndex) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setRespostas(current => current.map((r, i) => i === qIndex ? oIndex : r))}
                    className={cn(
                      'rounded-mx-md border px-mx-md py-mx-xs text-left text-sm transition-colors',
                      respostas[qIndex] === oIndex
                        ? 'border-status-info bg-status-info-surface font-bold text-status-info'
                        : 'border-border-subtle text-text-secondary hover:bg-surface-alt',
                    )}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  )
}

function Step({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="text-center">
      <span className="mx-auto flex h-mx-16 w-mx-16 items-center justify-center rounded-full bg-status-info-surface text-status-info">{icon}</span>
      <Typography variant="p" className="mt-mx-sm">{title}</Typography>
      <Typography variant="p" tone="muted" className="text-sm">{text}</Typography>
    </div>
  )
}

function MiniMetric({ icon, value, label, hint }: { icon: ReactNode; value: string; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-mx-sm">
      <span className="flex h-mx-12 w-mx-12 items-center justify-center rounded-full bg-white text-status-info">{icon}</span>
      <div>
        <Typography variant="tiny" tone="muted" className="tracking-normal">{label}</Typography>
        <Typography variant="h2" className="text-2xl">{value}</Typography>
        <Typography variant="tiny" tone="muted" className="tracking-normal">{hint}</Typography>
      </div>
    </div>
  )
}

export default AulasAoVivoSection
