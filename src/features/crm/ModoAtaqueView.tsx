import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, FileText, MessageCircle, Pause, Phone, Target, Trophy, Zap } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import type { Cliente } from '@/lib/schemas/crm.schema'
import type { OportunidadeComCliente } from '@/features/crm/hooks/useOportunidades'
import type { CadenciaResultadoAcao } from '@/features/crm/lib/cadencia'
import { aplicarTom, obterScriptSugerido, TONS, type ScriptTom } from '@/features/crm/lib/scriptTemplates'

const STORAGE_KEY = 'mx_modo_ataque'

type StatsSessao = { executadas: number; visitas: number; propostas: number; recuperacoes: number }

type ResultadoCard = {
  label: string
  emoji: string
  cor: 'green' | 'red' | 'slate' | 'blue' | 'orange' | 'teal' | 'yellow'
  status: CadenciaResultadoAcao
  statBucket?: 'visitas' | 'propostas' | 'recuperacoes'
}

const RESULTADOS_CARDS: ResultadoCard[] = [
  { label: 'Executado', emoji: '✅', cor: 'green', status: 'feito' },
  { label: 'Não atendeu', emoji: '🚫', cor: 'red', status: 'nao_feito' },
  { label: 'Não respondeu', emoji: '🔕', cor: 'slate', status: 'aguardando' },
  { label: 'Visita agendada', emoji: '📅', cor: 'blue', status: 'aguardando', statBucket: 'visitas' },
  { label: 'Proposta enviada', emoji: '📋', cor: 'orange', status: 'aguardando', statBucket: 'propostas' },
  { label: 'Remarcar', emoji: '🔄', cor: 'teal', status: 'aguardando', statBucket: 'recuperacoes' },
  { label: 'Perdeu interesse', emoji: '❌', cor: 'red', status: 'nao_feito' },
  { label: 'Venda realizada', emoji: '🏆', cor: 'yellow', status: 'feito' },
  { label: 'Outro', emoji: '💬', cor: 'slate', status: 'feito' },
]

const COR_MAP: Record<ResultadoCard['cor'], string> = {
  green: 'bg-white border-green-200 hover:bg-green-50',
  red: 'bg-white border-red-200 hover:bg-red-50',
  slate: 'bg-white border-border hover:bg-slate-50',
  blue: 'bg-white border-blue-200 hover:bg-blue-50',
  orange: 'bg-white border-amber-200 hover:bg-amber-50',
  teal: 'bg-white border-[#005BFF]/20 hover:bg-blue-50',
  yellow: 'bg-white border-amber-200 hover:bg-amber-50',
}

interface ModoAtaqueViewProps {
  clientes: Cliente[]
  oportunidadePorCliente: Map<string, OportunidadeComCliente>
  registrarStatusCadencia: (input: { clienteId: string; status: CadenciaResultadoAcao; observacao?: string | null; canalContato?: 'whatsapp' | 'ligacao' | 'presencial' | null }) => Promise<{ error: string | null }>
  onSair: () => void
  onAbrirFicha: (clienteId: string) => void
  onPlanoAtaque: () => void
}

function phoneDigits(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '')
}

function diasAte(dataISO: string | null): number {
  if (!dataISO) return Infinity
  return Math.round((new Date(`${dataISO}T12:00:00`).getTime() - Date.now()) / 86400000)
}

function prioridadeCliente(cliente: Cliente): number {
  let score = diasAte(cliente.proxima_acao_em)
  if (cliente.relacionamento === 'critico') score -= 1000
  else if (cliente.relacionamento === 'ruim') score -= 500
  return score
}

function useCronometro() {
  const inicio = useRef(Date.now())
  const [texto, setTexto] = useState('00:00')
  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - inicio.current) / 1000)
      setTexto(`${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return texto
}

function objetivoDoAtaque(cliente: Cliente): { objetivo: string; proximoPasso: string; explicacao: string } {
  const proximoPasso = cliente.proxima_acao || 'Definir próximo passo'
  const acao = proximoPasso.toLowerCase()
  if (acao.includes('visita')) {
    return {
      objetivo: 'Confirmar visita e preparar atendimento',
      proximoPasso,
      explicacao: 'Este cliente tem uma ação de visita no fluxo. Priorize confirmar presença e reduzir risco de perda.',
    }
  }
  if (acao.includes('proposta')) {
    return {
      objetivo: 'Retomar proposta e criar compromisso',
      proximoPasso,
      explicacao: 'A oportunidade precisa de follow-up objetivo para transformar interesse em próximo compromisso.',
    }
  }
  return {
    objetivo: 'Avançar a oportunidade para o próximo passo',
    proximoPasso,
    explicacao: 'Execute a próxima ação recomendada para manter o cliente vivo na cadência comercial.',
  }
}

function OportunidadeCard({
  cliente,
  veiculo,
  onWhatsApp,
  onLigar,
  onFicha,
  onExecutar,
}: {
  cliente: Cliente
  veiculo: string | null | undefined
  onWhatsApp: () => void
  onLigar: () => void
  onFicha: () => void
  onExecutar: () => void
}) {
  const { objetivo, proximoPasso, explicacao } = objetivoDoAtaque(cliente)
  const canal = cliente.canal_origem || 'Sem origem'
  const iniciais = (cliente.nome || '?').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const tel = phoneDigits(cliente.telefone)

  return (
    <div className="overflow-hidden rounded-3xl border border-border-subtle bg-white shadow-xl">
      <div className="bg-gradient-to-br from-[#005BFF] to-blue-700 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
            {iniciais}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold">{cliente.nome}</p>
            <p className="mt-0.5 truncate text-sm text-blue-200">{canal} · {veiculo || cliente.empresa || 'Veículo não informado'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="mb-1 text-caption font-bold uppercase tracking-wide text-muted-foreground">Objetivo</p>
            <p className="text-sm font-bold text-foreground">{objetivo}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="mb-1 text-caption font-bold uppercase tracking-wide text-[#005BFF]">Próximo passo</p>
            <p className="text-sm font-bold text-foreground">{proximoPasso}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-snug text-amber-700">{explicacao}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {tel && (
            <a href={`tel:+55${tel}`} onClick={onLigar} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white py-3 transition-colors hover:bg-slate-50">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-caption font-semibold text-muted-foreground">Ligar</span>
            </a>
          )}
          {tel && (
            <button type="button" onClick={onWhatsApp} className="flex flex-col items-center gap-1.5 rounded-2xl border border-green-200 bg-green-50 py-3 transition-colors hover:bg-green-100">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="text-caption font-semibold text-green-700">WhatsApp</span>
            </button>
          )}
          <button type="button" onClick={onFicha} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white py-3 transition-colors hover:bg-slate-50">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-caption font-semibold text-muted-foreground">Ficha</span>
          </button>
        </div>

        <Button onClick={onExecutar} className="h-14 w-full rounded-2xl bg-[#005BFF] text-base text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
          <Zap className="h-5 w-5" /> Executar próximo passo
        </Button>
      </div>
    </div>
  )
}

export function ModoAtaqueView({ clientes, oportunidadePorCliente, registrarStatusCadencia, onSair, onAbrirFicha, onPlanoAtaque }: ModoAtaqueViewProps) {
  const fila = useMemo(
    () => clientes
      .filter(cliente => ['oportunidade', 'ativo'].includes(cliente.status))
      .slice()
      .sort((a, b) => prioridadeCliente(a) - prioridadeCliente(b)),
    [clientes],
  )

  const [indice, setIndice] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return 0
    try {
      const { indice: i } = JSON.parse(saved) as { indice: number }
      if (typeof i !== 'number') return 0
      return Math.min(Math.max(i, 0), Math.max(fila.length - 1, 0))
    } catch {
      return 0
    }
  })
  const [concluidos, setConcluidos] = useState(0)
  const [pausarOpen, setPausarOpen] = useState(false)
  const [scriptEditado, setScriptEditado] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [stats, setStats] = useState<StatsSessao>({ executadas: 0, visitas: 0, propostas: 0, recuperacoes: 0 })
  const [voltouDoWhatsApp, setVoltouDoWhatsApp] = useState(false)
  // Canal efetivamente usado nesta oportunidade (planilha #9) — vai para o
  // histórico da cadência ao registrar o resultado.
  const [canalUsado, setCanalUsado] = useState<'whatsapp' | 'ligacao' | 'presencial' | null>(null)
  const [tom, setTom] = useState<ScriptTom>('consultivo')
  const [executando, setExecutando] = useState(false)
  const tempo = useCronometro()

  const clienteAtual = fila[indice] || null
  const veiculo = clienteAtual ? oportunidadePorCliente.get(clienteAtual.id)?.veiculo_interesse : null
  const scriptSugerido = clienteAtual ? obterScriptSugerido(clienteAtual.proxima_acao, clienteAtual.nome, veiculo) : ''
  const scriptComTom = clienteAtual ? aplicarTom(scriptSugerido, tom, clienteAtual.nome, veiculo) : ''
  const script = scriptEditado ?? scriptComTom
  const tel = clienteAtual ? phoneDigits(clienteAtual.telefone) : ''
  const waUrl = tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(script)}` : null

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ indice }))
  }, [indice])

  const avancar = () => {
    setScriptEditado(null)
    setVoltouDoWhatsApp(false)
    setCanalUsado(null)
    setTom('consultivo')
    setExecutando(false)
    setConcluidos(c => c + 1)
    setIndice(i => (i + 1 >= fila.length ? fila.length : i + 1))
  }

  const handleCopiar = () => {
    navigator.clipboard.writeText(script)
    toast.success('Script copiado.')
  }

  const handleAbrirWhatsApp = () => {
    setExecutando(true)
    setCanalUsado('whatsapp')
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setVoltouDoWhatsApp(true)
        document.removeEventListener('visibilitychange', onVisible)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
  }

  const handleResultado = async (card: ResultadoCard) => {
    if (!clienteAtual) return
    setSalvando(true)
    const { error } = await registrarStatusCadencia({ clienteId: clienteAtual.id, status: card.status, canalContato: canalUsado })
    setSalvando(false)
    if (error) {
      toast.error(error)
      return
    }
    setStats(prev => ({
      executadas: prev.executadas + 1,
      visitas: prev.visitas + (card.statBucket === 'visitas' ? 1 : 0),
      propostas: prev.propostas + (card.statBucket === 'propostas' ? 1 : 0),
      recuperacoes: prev.recuperacoes + (card.statBucket === 'recuperacoes' ? 1 : 0),
    }))
    avancar()
  }

  const concluido = fila.length === 0 || indice >= fila.length

  if (concluido) {
    sessionStorage.removeItem(STORAGE_KEY)
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-mx-md px-mx-md py-mx-xl text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
            <Trophy size={32} />
          </span>
          {fila.length === 0 ? (
            <Typography variant="h2">Nenhuma oportunidade ativa para atacar agora.</Typography>
          ) : (
            <div>
              <p className="text-3xl font-bold text-[#031B3D]">🎉 Excelente!</p>
              <p className="mt-2 text-sm text-muted-foreground">Você concluiu todas as oportunidades prioritárias de hoje.</p>
            </div>
          )}
          {fila.length > 0 && (
            <div className="grid w-full max-w-lg grid-cols-2 gap-mx-sm sm:grid-cols-4">
              {[
                { label: 'Executadas', value: stats.executadas, tone: 'bg-blue-50 text-[#005BFF]' },
                { label: 'Visitas geradas', value: stats.visitas, tone: 'bg-green-50 text-green-600' },
                { label: 'Propostas enviadas', value: stats.propostas, tone: 'bg-amber-50 text-amber-600' },
                { label: 'Recuperações', value: stats.recuperacoes, tone: 'bg-purple-50 text-purple-600' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-mx-md ${s.tone}`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="mt-1 text-caption font-semibold leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex w-full max-w-sm flex-col gap-mx-xs">
            <Button variant="outline" className="w-full" onClick={onPlanoAtaque}>Ir para Plano de Ataque</Button>
            <Button className="w-full bg-[#005BFF] text-white hover:bg-blue-700" onClick={onSair}>Voltar para Carteira</Button>
            <button type="button" onClick={onSair} className="mt-1 text-xs text-muted-foreground hover:underline">Encerrar sessão</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#F0F4FF]">
      <div className="sticky top-0 z-10 bg-[#031B3D] px-mx-md py-mx-sm text-white shadow-lg">
        <div className="mx-auto flex max-w-xl flex-wrap items-center gap-3 sm:flex-nowrap">
          <span className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-wide">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#005BFF]">
              <Zap size={16} className="text-white" />
            </span>
            MODO ATAQUE
          </span>
          <div className="order-3 w-full min-w-0 sm:order-none sm:flex-1">
            <div className="mb-1 flex items-center justify-between text-caption text-text-disabled">
              <span>{concluidos} de {fila.length} oportunidades concluídas</span>
              <span className="font-mono text-muted-foreground">{tempo}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-[#005BFF] transition-all duration-500" style={{ width: `${fila.length > 0 ? Math.round((concluidos / fila.length) * 100) : 0}%` }} />
            </div>
          </div>
          <Button variant="ghost" className="ml-auto shrink-0 text-white hover:bg-white/10" onClick={() => setPausarOpen(true)}>
            <Pause size={16} /> Pausar
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-mx-md py-mx-lg">
        {clienteAtual && !executando && (
          <OportunidadeCard
            cliente={clienteAtual}
            veiculo={veiculo}
            onWhatsApp={handleAbrirWhatsApp}
            onLigar={() => setCanalUsado('ligacao')}
            onFicha={() => onAbrirFicha(clienteAtual.id)}
            onExecutar={() => setExecutando(true)}
          />
        )}

        {clienteAtual && executando && (
          <Card className="overflow-hidden p-0">
            <div className="bg-gradient-to-br from-[#005BFF] to-blue-700 p-mx-lg text-white">
              <div className="flex items-center gap-mx-sm">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-xl font-bold">
                  {(clienteAtual.nome || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <Typography variant="h2" className="text-white">{clienteAtual.nome}</Typography>
                  <Typography variant="p" className="text-white/80">{veiculo || 'Veículo não informado'}</Typography>
                </div>
              </div>
            </div>

            <div className="space-y-mx-md p-mx-lg">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-mx-sm">
                <Typography variant="caption" className="font-bold text-amber-600">Próxima ação</Typography>
                <Typography variant="p" className="mt-1 font-semibold">{clienteAtual.proxima_acao || 'Definir próximo passo'}</Typography>
              </div>

              <div>
                <Typography variant="caption" tone="muted" className="mb-mx-xs block font-semibold">Tom da mensagem</Typography>
                <div className="mb-mx-sm flex flex-wrap gap-1.5">
                  {TONS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.desc}
                      onClick={() => { setTom(t.id); setScriptEditado(null) }}
                      className={`rounded-xl border px-2.5 py-1 text-caption font-semibold transition-all ${
                        tom === t.id
                          ? 'border-[#005BFF] bg-[#005BFF] text-white'
                          : 'border-border bg-white text-muted-foreground hover:border-blue-300 hover:text-[#005BFF]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <Typography variant="caption" tone="muted" className="mb-mx-xs block font-semibold">Script sugerido</Typography>
                <textarea
                  value={script}
                  onChange={event => setScriptEditado(event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-border bg-slate-50 p-mx-sm text-sm text-foreground outline-none focus:border-[#005BFF] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-mx-xs">
                {tel && (
                  <a href={`tel:+55${tel}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-border-subtle bg-white py-mx-sm hover:bg-gray-50">
                    <Phone size={16} className="text-muted-foreground" />
                    <Typography variant="caption" className="font-semibold">Ligar</Typography>
                  </a>
                )}
                <button type="button" onClick={handleCopiar} className="flex flex-col items-center gap-1.5 rounded-xl border border-border-subtle bg-white py-mx-sm hover:bg-gray-50">
                  <Copy size={16} className="text-muted-foreground" />
                  <Typography variant="caption" className="font-semibold">Copiar</Typography>
                </button>
                <button type="button" onClick={() => onAbrirFicha(clienteAtual.id)} className="flex flex-col items-center gap-1.5 rounded-xl border border-border-subtle bg-white py-mx-sm hover:bg-gray-50">
                  <FileText size={16} className="text-muted-foreground" />
                  <Typography variant="caption" className="font-semibold">Ficha</Typography>
                </button>
              </div>

              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block" onClick={handleAbrirWhatsApp}>
                  <Button variant="whatsapp" className="w-full">
                    <MessageCircle size={16} /> Abrir WhatsApp
                  </Button>
                </a>
              )}

              <div className={voltouDoWhatsApp ? 'rounded-xl ring-4 ring-blue-100 transition-shadow' : ''}>
                <Typography variant="caption" tone="muted" className="mb-mx-xs block font-semibold">
                  {voltouDoWhatsApp ? 'Como terminou esse contato?' : 'Resultado do contato'}
                </Typography>
                <div className="grid grid-cols-3 gap-mx-xs">
                  {RESULTADOS_CARDS.map(card => (
                    <button
                      key={card.label}
                      type="button"
                      disabled={salvando}
                      onClick={() => handleResultado(card)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-all disabled:opacity-50 ${COR_MAP[card.cor]}`}
                    >
                      <span className="text-2xl leading-none">{card.emoji}</span>
                      <span className="text-center text-caption font-semibold leading-tight">{card.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={avancar} className="w-full text-center text-xs font-semibold text-muted-foreground hover:underline">
                Pular sem registrar resultado
              </button>
            </div>
          </Card>
        )}
      </div>

      {pausarOpen && (
        <div className="fixed inset-0 z-[210] grid place-items-center bg-black/50 p-4">
          <Card className="w-full max-w-xs space-y-mx-sm p-mx-lg text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
              <Pause size={20} />
            </span>
            <Typography variant="h3">Pausar o Modo Ataque?</Typography>
            <Typography variant="p" tone="muted">Sua posição na fila é salva. Você continua de onde parou.</Typography>
            <div className="flex flex-col gap-mx-xs pt-mx-xs">
              <Button className="bg-[#005BFF] text-white hover:bg-blue-700" onClick={() => setPausarOpen(false)}>Continuar atacando</Button>
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={onSair}>Sair do Modo Ataque</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
