import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Car, MessageCircle, Plus, Users, X, Zap } from 'lucide-react'
import { toast } from '@/lib/toast'
import { FormField } from '@/components/molecules/FormField'
import type { Cliente } from '@/lib/schemas/crm.schema'
import { isEtapaTerminal, toDateOnlyBR } from '@/lib/schemas/crm.schema'
import type { OportunidadeComCliente } from '@/features/crm/hooks/useOportunidades'
import type { AgendamentoComCliente } from '@/features/crm/hooks/useAgendamentos'
import { useVeiculosEstoque, type VeiculoEstoque } from '@/features/crm/hooks/useVeiculosEstoque'
import { derivarSituacao, derivarTemperatura, type Temperatura } from '@/features/crm/lib/mentorComercial'
import type { ProgressoCadencia } from '@/features/crm/lib/cadencia'

interface PlanoAtaqueTabProps {
  clientes: Cliente[]
  oportunidadePorCliente: Map<string, OportunidadeComCliente>
  progressoPorCliente: Map<string, ProgressoCadencia>
  agendamentos: AgendamentoComCliente[]
  vendedorNome: string
  onAbrirFicha: (clienteId: string) => void
}

function normalizar(str: string | null | undefined): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
}

function clientesCompativeis(
  clientes: Cliente[],
  oportunidadePorCliente: Map<string, OportunidadeComCliente>,
  veiculo: VeiculoEstoque,
): Cliente[] {
  const termos = [veiculo.marca, veiculo.modelo, veiculo.versao, veiculo.ano]
    .filter(Boolean)
    .map(normalizar)
  if (termos.length === 0) return []

  return clientes.filter(cliente => {
    const interesse = normalizar(oportunidadePorCliente.get(cliente.id)?.veiculo_interesse)
    if (!interesse) return false
    return termos.some(termo => termo && interesse.includes(termo))
  })
}

function diasDesde(dataISO: string): number {
  return Math.floor((Date.now() - new Date(`${dataISO}T12:00:00`).getTime()) / 86400000)
}

function entradaLabel(dataISO: string): string {
  const dias = diasDesde(dataISO)
  if (dias <= 0) return 'Entrou hoje'
  if (dias === 1) return 'Entrou ontem'
  return `Entrou há ${dias} dias`
}

function diasEntre(dataIso: string | null | undefined, hoje: string): number | null {
  if (!dataIso) return null
  const dataOnly = dataIso.length === 10 ? dataIso : toDateOnlyBR(new Date(dataIso))
  const ms = new Date(`${hoje}T00:00:00`).getTime() - new Date(`${dataOnly}T00:00:00`).getTime()
  return Math.round(ms / 86400000)
}

type ClienteContexto = {
  cliente: Cliente
  oportunidade?: OportunidadeComCliente
  situacao: string
  temperatura: Temperatura
  diasVencido: number | null
  diasSemContato: number | null
  temGarantia: boolean
}

type MissaoDef = {
  id: string
  nome: string
  icone: string
  prioridade: 'Máxima' | 'Alta' | 'Média' | 'Baixa'
  objetivo: string
  porqueAgora: string
  filtro: (ctx: ClienteContexto) => boolean
}

// Nenhuma missão comercial deve capturar um cliente cuja venda foi cancelada:
// a oportunidade acabou e o próximo passo pertence à estratégia de
// recuperação, não à esteira. As missões de pós-venda e de perda continuam
// mirando 'Venda realizada'/'Venda perdida' de propósito.
const semVendaCancelada = (missoes: MissaoDef[]): MissaoDef[] => missoes.map(missao => ({
  ...missao,
  filtro: (ctx: ClienteContexto) => ctx.situacao !== 'Venda cancelada' && missao.filtro(ctx),
}))

const MISSOES: MissaoDef[] = semVendaCancelada([
  {
    id: 'financiamento_aprovado', nome: 'Converter aprovações', icone: '💳', prioridade: 'Máxima',
    objetivo: 'Converter financiamento aprovado em venda.',
    porqueAgora: 'Financiamento aprovado sem compra é a oportunidade mais quente da carteira.',
    filtro: ctx => ctx.oportunidade?.financiamento === 'aprovado' && !isEtapaTerminal(ctx.oportunidade?.etapa),
  },
  {
    id: 'nao_compareceu', nome: 'Reagendar visitas', icone: '📅', prioridade: 'Alta',
    objetivo: 'Reagendar clientes que não compareceram.',
    porqueAgora: 'Cada visita não realizada é uma oportunidade que pode ser recuperada rapidamente.',
    filtro: ctx => ctx.situacao === 'Agendamento em andamento' && (ctx.diasVencido ?? -1) > 0,
  },
  {
    id: 'confirmar_visita', nome: 'Confirmar visitas', icone: '✅', prioridade: 'Alta',
    objetivo: 'Confirmar presença de clientes agendados.',
    porqueAgora: 'Visitas confirmadas têm taxa muito maior de comparecimento.',
    filtro: ctx => ctx.situacao === 'Visita agendada' && (ctx.diasVencido ?? 1) <= 0,
  },
  {
    id: 'cliente_quente', nome: 'Agendar visitas (quentes)', icone: '🔥', prioridade: 'Alta',
    objetivo: 'Transformar interesse quente em visita.',
    porqueAgora: 'Clientes quentes sem visita perdem temperatura a cada dia.',
    filtro: ctx => ctx.temperatura === 'quente' && !['Visita agendada', 'Em negociação ativa', 'Fechamento em andamento', 'Venda realizada', 'Venda perdida'].includes(ctx.situacao),
  },
  {
    id: 'proposta_sem_retorno', nome: 'Recuperar propostas', icone: '📋', prioridade: 'Alta',
    objetivo: 'Retomar proposta e fechar negócio.',
    porqueAgora: 'Clientes com proposta sem resposta têm alto potencial e risco crescente de perda.',
    filtro: ctx => ctx.situacao === 'Fechamento em andamento',
  },
  {
    id: 'visitou_nao_comprou', nome: 'Recuperar visitas', icone: '🚗', prioridade: 'Alta',
    objetivo: 'Entender barreira e tentar fechar.',
    porqueAgora: 'Quem visitou já tem intenção. Falta superar a barreira.',
    filtro: ctx => ctx.situacao === 'Visita agendada' && (ctx.diasVencido ?? -1) > 0,
  },
  {
    id: 'lead_sem_resposta', nome: 'Retomar leads', icone: '👻', prioridade: 'Média',
    objetivo: 'Reativar leads sem resposta.',
    porqueAgora: 'Leads frios podem ser reativados com abordagem correta.',
    filtro: ctx => ['Lead sem resposta', 'Aguardando resposta do cliente', 'Primeiro contato pendente'].includes(ctx.situacao),
  },
  {
    id: 'vai_pensar', nome: 'Follow-up de decisão', icone: '🤔', prioridade: 'Média',
    objetivo: 'Descobrir objeção e converter.',
    porqueAgora: 'Clientes "vão pensar" precisam de follow-up inteligente.',
    filtro: ctx => ctx.situacao === 'Em negociação ativa',
  },
  {
    id: 'reativar_carteira', nome: 'Reativar carteira', icone: '🔄', prioridade: 'Média',
    objetivo: 'Retomar relacionamento com clientes antigos.',
    porqueAgora: 'Clientes antigos compram mais rápido do que leads novos.',
    filtro: ctx => ctx.situacao === 'Venda realizada' && (ctx.diasSemContato ?? 0) >= 60,
  },
  {
    id: 'pos_venda', nome: 'Pós-venda e indicação', icone: '⭐', prioridade: 'Média',
    objetivo: 'Manter relacionamento e pedir indicação.',
    porqueAgora: 'Clientes satisfeitos indicam. Não deixe essa janela fechar.',
    filtro: ctx => ctx.situacao === 'Venda realizada' && (ctx.diasSemContato ?? 0) < 60,
  },
  {
    id: 'garantia', nome: 'Acompanhar garantias', icone: '🛡️', prioridade: 'Baixa',
    objetivo: 'Proteger relacionamento pós-venda.',
    porqueAgora: 'Clientes com garantia precisam de atenção para manter confiança.',
    filtro: ctx => ctx.temGarantia,
  },
  {
    id: 'troca_futura', nome: 'Oportunidades de troca', icone: '🔁', prioridade: 'Baixa',
    objetivo: 'Cultivar oportunidade de troca futura.',
    porqueAgora: 'Clientes com intenção futura podem antecipar a compra.',
    filtro: ctx => ctx.situacao === 'Venda perdida',
  },
])

const PRIORIDADE_ORDEM: Record<MissaoDef['prioridade'], number> = { Máxima: 0, Alta: 1, Média: 2, Baixa: 3 }

function prioridadeBadgeClass(p: MissaoDef['prioridade']): string {
  if (p === 'Máxima') return 'bg-status-error-surface text-status-error-text'
  if (p === 'Alta') return 'bg-status-error-surface text-status-error-text'
  if (p === 'Média') return 'bg-status-warning-surface text-status-warning-text'
  return 'bg-muted text-muted-foreground'
}

function temperaturaBadgeClass(t: Temperatura): string {
  if (t === 'quente') return 'bg-status-error-surface text-status-error-text'
  if (t === 'morno') return 'bg-status-warning-surface text-status-warning-text'
  return 'bg-muted text-muted-foreground'
}

const TEMPERATURA_LABEL: Record<Temperatura, string> = { quente: 'Quente', morno: 'Morno', frio: 'Frio' }

export function PlanoAtaqueTab({ clientes, oportunidadePorCliente, progressoPorCliente, agendamentos, vendedorNome, onAbrirFicha }: PlanoAtaqueTabProps) {
  const { veiculos, loading, createVeiculo } = useVeiculosEstoque()
  const [modalOpen, setModalOpen] = useState(false)
  const [veiculoAtaque, setVeiculoAtaque] = useState<VeiculoEstoque | null>(null)
  const [missaoSelecionada, setMissaoSelecionada] = useState<MissaoDef | null>(null)
  const hoje = useMemo(() => toDateOnlyBR(), [])

  const listaCompativeis = useMemo(
    () => (veiculoAtaque ? clientesCompativeis(clientes, oportunidadePorCliente, veiculoAtaque) : []),
    [clientes, oportunidadePorCliente, veiculoAtaque],
  )

  const contextos = useMemo<ClienteContexto[]>(() => clientes.map(cliente => {
    const oportunidade = oportunidadePorCliente.get(cliente.id)
    const progresso = progressoPorCliente.get(cliente.id)
    return {
      cliente,
      oportunidade,
      situacao: derivarSituacao(cliente, oportunidade, progresso?.etapaAtual.label),
      temperatura: derivarTemperatura(oportunidade),
      diasVencido: diasEntre(cliente.proxima_acao_em, hoje),
      diasSemContato: diasEntre(cliente.ultima_interacao, hoje),
      temGarantia: agendamentos.some(a => a.cliente_id === cliente.id && a.tipo === 'garantia'),
    }
  }), [clientes, oportunidadePorCliente, progressoPorCliente, agendamentos, hoje])

  const missoesComContagem = useMemo(
    () => MISSOES.map(missao => ({ ...missao, contextos: contextos.filter(missao.filtro) })),
    [contextos],
  )

  const totalOportunidades = missoesComContagem.reduce((acc, m) => acc + m.contextos.length, 0)

  const missoesOrdenadas = useMemo(() => [...missoesComContagem].sort((a, b) => {
    const pa = PRIORIDADE_ORDEM[a.prioridade]
    const pb = PRIORIDADE_ORDEM[b.prioridade]
    if (pa !== pb) return pa - pb
    return b.contextos.length - a.contextos.length
  }), [missoesComContagem])

  if (veiculoAtaque) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setVeiculoAtaque(null)}
          className="flex items-center gap-1.5 text-sm text-status-info-text hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos veículos
        </button>

        <div className="bg-gradient-to-r from-status-info to-status-info rounded-2xl p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Veículo que chegou</p>
          <p className="text-xl font-bold mt-1">{veiculoAtaque.marca} {veiculoAtaque.modelo} {veiculoAtaque.versao}</p>
          <p className="text-sm text-blue-100 mt-1">
            {veiculoAtaque.ano}{veiculoAtaque.preco ? ` · ${veiculoAtaque.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
          </p>
        </div>

        {listaCompativeis.length === 0 ? (
          <div className="bg-white border border-border-subtle rounded-2xl p-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhum cliente compatível encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1">Verifique os veículos de interesse registrados na carteira.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {listaCompativeis.length} cliente{listaCompativeis.length !== 1 ? 's' : ''} compatível{listaCompativeis.length !== 1 ? 'eis' : ''}
            </p>
            {listaCompativeis.map(cliente => (
              <div key={cliente.id} className="bg-white border border-border-subtle rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-status-info-surface text-xs font-bold text-status-info-text">
                  {(cliente.nome || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{cliente.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {oportunidadePorCliente.get(cliente.id)?.veiculo_interesse || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAbrirFicha(cliente.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-status-info-text hover:bg-status-info-surface"
                >
                  Ficha
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (missaoSelecionada) {
    const missao = missoesComContagem.find(m => m.id === missaoSelecionada.id) || { ...missaoSelecionada, contextos: [] }
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setMissaoSelecionada(null)}
          className="flex items-center gap-1.5 text-sm text-status-info-text hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Plano de Ataque
        </button>

        <div className="bg-white border border-border-subtle rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-3xl">{missao.icone}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{missao.nome}</h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${prioridadeBadgeClass(missao.prioridade)}`}>{missao.prioridade}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{missao.objetivo}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">{missao.porqueAgora}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{missao.contextos.length}</p>
              <p className="text-xs text-muted-foreground">Clientes</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-muted-foreground">{missao.prioridade}</p>
              <p className="text-xs text-muted-foreground">Prioridade</p>
            </div>
          </div>
        </div>

        {missao.contextos.length === 0 ? (
          <div className="bg-white border border-border-subtle rounded-2xl p-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhum cliente nesta missão no momento.</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Clientes da missão</p>
            <div className="space-y-2">
              {missao.contextos.map(ctx => {
                const progresso = progressoPorCliente.get(ctx.cliente.id)
                const tel = (ctx.cliente.telefone || '').replace(/\D/g, '')
                const waUrl = tel && progresso
                  ? `https://wa.me/55${tel}?text=${encodeURIComponent(progresso.etapaAtual.script({ cliente: ctx.cliente.nome.split(' ')[0], vendedor: vendedorNome }))}`
                  : null
                return (
                  <div key={ctx.cliente.id} className="bg-white border border-border-subtle rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-status-info-surface text-xs font-bold text-status-info-text">
                      {(ctx.cliente.nome || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{ctx.cliente.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{ctx.situacao}</p>
                    </div>
                    <span className={`text-caption font-bold px-2 py-0.5 rounded-full shrink-0 ${temperaturaBadgeClass(ctx.temperatura)}`}>
                      {TEMPERATURA_LABEL[ctx.temperatura]}
                    </span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 flex items-center gap-1 rounded-lg border border-brand-primary/30 bg-brand-primary-subtle px-3 py-1.5 text-xs font-bold text-brand-primary-hover hover:bg-brand-primary-subtle"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onAbrirFicha(ctx.cliente.id)}
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-status-info-text hover:bg-status-info-surface"
                    >
                      Ficha
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const [faixaPrecoAtiva, setFaixaPrecoAtiva] = useState('todas')

  const FAIXAS_PRECO = useMemo(() => [
    { id: 'todas', label: 'Todas as faixas', min: 0, max: Infinity },
    { id: 'ate_50k', label: 'Até R$ 50k', min: 0, max: 50000 },
    { id: '50k_80k', label: 'R$ 50k - 80k', min: 50000, max: 80000 },
    { id: '80k_120k', label: 'R$ 80k - 120k', min: 80000, max: 120000 },
    { id: '120k_180k', label: 'R$ 120k - 180k', min: 120000, max: 180000 },
    { id: 'acima_180k', label: 'Acima de R$ 180k', min: 180000, max: Infinity },
  ], [])

  const countsFaixa = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of FAIXAS_PRECO) {
      if (f.id === 'todas') {
        map[f.id] = veiculos.length
      } else {
        map[f.id] = veiculos.filter(v => {
          const p = Number(v.preco) || 0
          return p >= f.min && p <= f.max
        }).length
      }
    }
    return map
  }, [veiculos, FAIXAS_PRECO])

  const veiculosFiltrados = useMemo(() => {
    if (faixaPrecoAtiva === 'todas') return veiculos
    const f = FAIXAS_PRECO.find(x => x.id === faixaPrecoAtiva)
    if (!f) return veiculos
    return veiculos.filter(v => {
      const p = Number(v.preco) || 0
      return p >= f.min && p <= f.max
    })
  }, [veiculos, faixaPrecoAtiva, FAIXAS_PRECO])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plano de Ataque</h1>
        <p className="text-sm text-muted-foreground mt-1">Missões calculadas a partir das situações reais da sua carteira.</p>
      </div>

      <div className="bg-white border border-border-subtle rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Veículos que chegaram</h2>
            <p className="text-sm text-muted-foreground mt-1">Encontre clientes da carteira interessados nos veículos recém-entrados.</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-white px-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-surface-alt shrink-0"
          >
            <Plus size={16} /> Registrar veículo
          </button>
        </div>

        {/* Categorização por Faixa de Preço */}
        {veiculos.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-caption font-bold text-muted-foreground uppercase tracking-wide mr-1 shrink-0">Faixa de preço:</span>
            {FAIXAS_PRECO.map(f => {
              const count = countsFaixa[f.id] ?? 0
              const ativo = faixaPrecoAtiva === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFaixaPrecoAtiva(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    ativo
                      ? 'bg-status-info text-white shadow-sm'
                      : 'bg-surface-alt text-muted-foreground border border-border-subtle hover:bg-muted'
                  }`}
                >
                  {f.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando veículos...</p>
        ) : veiculosFiltrados.length === 0 ? (
          <div className="bg-surface-alt border border-border-subtle rounded-2xl p-10 text-center">
            <Car className="mx-auto text-text-disabled" size={28} />
            <p className="mt-3 text-sm font-bold text-muted-foreground">
              {veiculos.length === 0
                ? 'Nenhum veículo recém-chegado registrado no momento.'
                : 'Nenhum veículo encontrado nesta faixa de preço.'}
            </p>
            {veiculos.length > 0 ? (
              <button
                type="button"
                onClick={() => setFaixaPrecoAtiva('todas')}
                className="mt-3 text-xs text-status-info-text font-bold hover:underline"
              >
                Ver todas as faixas de preço
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-status-info px-4 py-2 text-sm font-bold text-white hover:bg-status-info"
              >
                <Plus size={16} /> Registrar veículo que chegou
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {veiculosFiltrados.map(veiculo => {
              const compat = clientesCompativeis(clientes, oportunidadePorCliente, veiculo).length
              return (
                <div key={veiculo.id} className="bg-white border border-border-subtle rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-status-info-surface text-status-info-text">
                      <Car size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{veiculo.marca} {veiculo.modelo} {veiculo.versao}</p>
                      <p className="text-xs text-muted-foreground">
                        {veiculo.ano}{veiculo.preco ? ` · ${veiculo.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                      </p>
                      <p className="text-xs font-semibold text-status-info-text">{entradaLabel(veiculo.data_entrada)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border-subtle">
                    <Users size={14} className="text-muted-foreground" />
                    <span className={`text-xs ${compat > 0 ? 'font-bold text-muted-foreground' : 'text-muted-foreground'}`}>
                      {compat} cliente{compat !== 1 ? 's' : ''} compatível{compat !== 1 ? 'eis' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={compat === 0}
                    onClick={() => setVeiculoAtaque(veiculo)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-status-info hover:bg-status-info text-white h-10 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Zap size={16} /> Iniciar ataque
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-status-info to-status-info rounded-2xl p-5 text-white">
        <p className="text-base font-bold leading-snug">
          Olá, {vendedorNome}! Hoje existem <span className="text-blue-200 font-bold">{totalOportunidades} oportunidades</span> na sua carteira.
        </p>
        <p className="mt-1 text-sm text-blue-100">Comece pelas missões com maior prioridade.</p>
      </div>

      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Missões recomendadas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {missoesOrdenadas.map(missao => {
            const count = missao.contextos.length
            return (
              <button
                key={missao.id}
                type="button"
                onClick={() => count > 0 && setMissaoSelecionada(missao)}
                className={`text-left p-4 rounded-2xl border bg-white transition-all border-border-subtle ${count > 0 ? 'hover:border-status-info hover:shadow-sm cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-2xl">{missao.icone}</span>
                  <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${prioridadeBadgeClass(missao.prioridade)}`}>{missao.prioridade}</span>
                </div>
                <p className="text-sm font-bold text-foreground leading-tight">{missao.nome}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{missao.objetivo}</p>
                <p className="text-caption text-text-disabled mt-1 leading-snug italic">{missao.porqueAgora}</p>
                <div className="flex items-center mt-3 pt-2 border-t border-border-subtle">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">{count} cliente{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {totalOportunidades === 0 && (
        <div className="flex items-start gap-3 bg-status-warning-surface border border-status-warning/30 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-status-warning-text shrink-0 mt-0.5" />
          <p className="text-sm text-status-warning-text">Nenhuma missão recomendada no momento. Continue trabalhando a carteira normalmente.</p>
        </div>
      )}

      {modalOpen && (
        <ModalRegistrarVeiculo
          onClose={() => setModalOpen(false)}
          onSalvar={async input => {
            const { error } = await createVeiculo(input)
            if (error) { toast.error(error); return false }
            toast.success('Veículo registrado.')
            return true
          }}
        />
      )}
    </div>
  )
}

function ModalRegistrarVeiculo({ onClose, onSalvar }: { onClose: () => void; onSalvar: (input: { marca: string; modelo: string; versao: string; ano: string; preco: number | null; data_entrada: string; observacao: string }) => Promise<boolean> }) {
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [versao, setVersao] = useState('')
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [preco, setPreco] = useState('')
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().slice(0, 10))
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSalvar = async () => {
    if (!marca.trim() || !modelo.trim()) return
    setSaving(true)
    const ok = await onSalvar({
      marca, modelo, versao, ano,
      preco: preco ? Number(preco) : null,
      data_entrada: dataEntrada,
      observacao,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-surface-overlay/40 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="Registrar veículo que chegou">
      <div className="w-full max-w-[440px] space-y-4 rounded-2xl border border-border-subtle bg-white p-6 shadow-mx-2xl">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-foreground">Registrar veículo que chegou</p>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={18} className="text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Marca *" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Honda" />
          <FormField label="Modelo *" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="HR-V" />
          <FormField label="Versão" value={versao} onChange={e => setVersao(e.target.value)} placeholder="EXL" />
          <FormField label="Ano" value={ano} onChange={e => setAno(e.target.value)} placeholder="2024" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Preço (opcional)" type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="120000" />
          <FormField label="Data de entrada" type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} />
        </div>
        <FormField label="Observação (opcional)" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Baixo km, único dono..." />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-surface-alt">Cancelar</button>
          <button
            type="button"
            disabled={!marca.trim() || !modelo.trim() || saving}
            onClick={handleSalvar}
            className="flex-1 rounded-xl bg-status-info px-4 py-2.5 text-sm font-bold text-white hover:bg-status-info disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar veículo'}
          </button>
        </div>
      </div>
    </div>
  )
}
