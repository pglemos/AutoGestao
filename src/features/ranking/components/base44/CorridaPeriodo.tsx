import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Flag, Trophy } from 'lucide-react'
import { RankingAvatar } from './RankingAvatar'
import { primeiroNome } from './nome'
import type { RankedVendedor } from '../../hooks/useStoreRankingPageData'

const LABEL_MAX = 80
const AVATAR_COMPACTO = 28
/** O avatar de "você" carrega `ring-2 ring-offset-2`, ~8px além do diâmetro. */
const AVATAR_RING = 8
const MAX_PISTA_COMPACTA = 4
/** Duas etiquetas na pista estreita precisam disso entre os centros. */
const LABEL_COMPACTO_MAX = 64
const LABEL_GAP_COMPACTO = LABEL_COMPACTO_MAX + 6

/** A pista encolhe no celular do vendedor; as peças acompanham. */
function useCompactTrack() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches)
    setCompact(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return compact
}

/** Largura real da pista, em px. Sem ela não dá para garantir separação. */
function useTrackWidth<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.getBoundingClientRect().width)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

/**
 * Posição horizontal de cada corredor, em px, garantindo `minGap` entre
 * vizinhos. O código antigo só deslocava EMPATES, com um passo fixo de 42px
 * menor que a própria etiqueta (até 80px) — então empatados colidiam mesmo no
 * desktop, e valores distintos colidiam ao serem prensados contra o piso da
 * pista. Uma varredura para a direita e outra para a esquerda resolvem os dois
 * casos de uma vez.
 */
export function layoutCorredores(valores: number[], maxVal: number, trackWidth: number, minGap: number, margem: number): number[] {
  const usable = Math.max(0, trackWidth - margem * 2)
  const ordem = valores.map((valor, index) => ({ index, valor })).sort((a, b) => a.valor - b.valor || a.index - b.index)
  const x = ordem.map(({ valor }) => margem + Math.min(usable, Math.max(0, (valor / maxVal) * usable)))

  for (let i = 1; i < x.length; i++) x[i] = Math.max(x[i], x[i - 1] + minGap)
  for (let i = x.length - 2; i >= 0; i--) x[i] = Math.min(x[i], x[i + 1] - minGap)

  const out = new Array<number>(valores.length)
  ordem.forEach(({ index }, i) => { out[index] = Math.min(trackWidth - margem, Math.max(margem, x[i])) })
  return out
}

/**
 * Quem entra na pista quando ela é estreita.
 *
 * Com oito corredores numa pista de ~285px, a separação mínima consome todo o
 * espaço e as posições param de representar vendas: viram uma fila de espaços
 * iguais. Trocar uma colisão visível por uma escala falsa é pior — a tela
 * promete não mentir. No celular a pista mostra só o líder, você e seus dois
 * vizinhos diretos; a tabela abaixo continua com a lista inteira.
 *
 * Recebe a lista já ordenada por vendas (desc) e devolve o subconjunto na
 * mesma ordem.
 */
export function selecionarCorredores<T extends { id: string }>(vendedores: T[], meuId: string | undefined, max: number): T[] {
  if (vendedores.length <= max) return vendedores
  const meuIndex = vendedores.findIndex(v => v.id === meuId)
  const prioridade = meuIndex >= 0
    ? [meuIndex, 0, meuIndex - 1, meuIndex + 1]
    : [0, 1, 2, 3]
  const escolhidos: number[] = []
  for (const i of prioridade) {
    if (i >= 0 && i < vendedores.length && !escolhidos.includes(i)) escolhidos.push(i)
    if (escolhidos.length === max) break
  }
  return escolhidos.sort((a, b) => a - b).map(i => vendedores[i])
}

type Props = {
  vendedores: RankedVendedor[]
  /** Meta da loja no período — rótulo do cabeçalho, nunca a linha de chegada. */
  metaLoja: number
  /** Meta INDIVIDUAL do usuário no período. `null` = sem meta; a corrida não
   *  ganha linha de chegada inventada, mostra a liderança. */
  metaCorrida: number | null
  meuId?: string
}

function formatVendas(v: number) {
  return `${v} venda${v === 1 ? '' : 's'}`
}

export function CorridaPeriodo({ vendedores, metaLoja, metaCorrida, meuId }: Props) {
  const temChegada = typeof metaCorrida === 'number' && metaCorrida > 0
  const maxVal = Math.max(...vendedores.map(v => v.vendas), temChegada ? metaCorrida : 0, 1)
  const liderVal = Math.max(...vendedores.map(v => v.vendas), 0)

  // Numa pista de ~285px (375px de viewport) oito etiquetas de nome não cabem
  // de jeito nenhum: elas se sobrepõem mesmo com o passo de empate reduzido.
  // No celular a pista fica só com os avatares — nome apenas para você e para
  // o líder. A tabela logo abaixo carrega a lista completa.
  const compacto = useCompactTrack()
  const trackRef = useRef<HTMLDivElement>(null)
  const trackWidth = useTrackWidth(trackRef)
  const minGap = compacto ? AVATAR_COMPACTO + AVATAR_RING + 8 : LABEL_MAX + 6
  const margem = compacto ? AVATAR_COMPACTO / 2 + AVATAR_RING : 24

  const naPista = useMemo(
    () => (compacto ? selecionarCorredores(vendedores, meuId, MAX_PISTA_COMPACTA) : vendedores),
    [compacto, vendedores, meuId]
  )
  const ocultos = vendedores.length - naPista.length
  const meuIndexNaPista = naPista.findIndex(v => v.id === meuId)

  const posicoes = useMemo(
    () => layoutCorredores(naPista.map(v => v.vendas), maxVal, trackWidth, minGap, margem),
    [naPista, maxVal, trackWidth, minGap, margem]
  )

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-status-success-text" />
            <h2 className="text-body font-bold text-foreground">Corrida do Período</h2>
          </div>
          <span className="text-[12px] font-semibold text-muted-foreground bg-surface-alt px-2.5 py-1 rounded-lg border border-border">
            Meta da loja: <strong className="text-foreground">{formatVendas(metaLoja)}</strong>
          </span>
        </div>
        <p className="text-mx-tiny text-muted-foreground mb-6">
          {temChegada
            ? 'Avanço de cada vendedor no período. A chegada é a sua meta individual.'
            : 'Avanço de cada vendedor no período. Você ainda não tem meta individual cadastrada.'}
          {ocultos > 0 && ` Na pista: o líder e seus vizinhos diretos — os outros ${ocultos} estão na tabela abaixo.`}
        </p>
      </div>

      <div className={`relative px-2 pb-2 ${compacto ? 'pt-8' : 'pt-10'}`}>
        {/* Pista de corrida */}
        <div ref={trackRef} className="relative h-14 bg-gradient-to-r from-slate-100 via-slate-50 to-emerald-50/40 rounded-2xl border border-border overflow-visible">
          {/* Faixa de progresso do líder */}
          <div
            className="absolute left-0 top-0 h-full rounded-2xl transition-all duration-700"
            style={{
              width: `${Math.min(100, Math.max(6, (liderVal / maxVal) * 100))}%`,
              background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-brand-primary) 18%, transparent), color-mix(in srgb, var(--color-brand-primary) 6%, transparent))',
            }}
          />

          {/* Linha de chegada — só existe quando há meta individual */}
          {temChegada && (
            <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-b from-brand-primary to-status-success rounded-r-2xl opacity-70 flex items-center justify-center">
              <Trophy className="w-3 h-3 text-white -ml-0.5 opacity-90" aria-hidden="true" />
            </div>
          )}

          {/* Marcadores dos corredores (com prevenção de colisão) */}
          {naPista.map((v, i) => {
            const isMe = v.id === meuId
            const isLider = v.vendas === liderVal && liderVal > 0
            // Na pista estreita só você e o líder recebem nome — e o do líder
            // cede se as duas etiquetas fossem se encostar.
            const colideComMinhaTag = compacto && !isMe && meuIndexNaPista >= 0
              && Math.abs(posicoes[i] - posicoes[meuIndexNaPista]) < LABEL_GAP_COMPACTO
            const mostraNome = !compacto || isMe || (isLider && !colideComMinhaTag)

            return (
              <div
                key={v.id}
                className={`absolute flex flex-col items-center transition-all duration-500 ${isMe ? 'z-[var(--mx-z-topbar)]' : 'z-[var(--mx-z-sticky)] hover:z-[var(--mx-z-sidebar)]'}`}
                style={{
                  left: trackWidth > 0 ? `${posicoes[i]}px` : `${margem}px`,
                  visibility: trackWidth > 0 ? undefined : 'hidden',
                  top: compacto ? '-26px' : '-34px',
                  transform: 'translateX(-50%)',
                }}
              >
                {/* Nome e vendas. Quem não recebe etiqueta mantém o espaço dela:
                    sem isso a coluna encolhe e o avatar sobe, desalinhando a
                    fileira de corredores. */}
                <div
                  aria-hidden={mostraNome ? undefined : true}
                  className={`mb-1 px-1.5 py-0.5 rounded-md text-center whitespace-nowrap shadow-xs text-mx-tiny font-bold transition-transform min-w-0 ${compacto ? 'max-w-[64px]' : 'max-w-[80px]'} ${
                    mostraNome ? '' : 'invisible'
                  } ${
                    isMe
                      ? 'bg-brand-primary text-white border border-brand-primary/40'
                      : 'bg-white text-foreground border border-border'
                  }`}
                >
                  <span className="truncate block">{primeiroNome(v.nome)}</span>
                  <span className={`block text-mx-micro font-medium ${isMe ? 'text-white/90' : 'text-muted-foreground'}`}>
                    {formatVendas(v.vendas)}
                  </span>
                </div>

                {/* Avatar do vendedor */}
                <div
                  className={`rounded-full transition-transform hover:scale-110 ${isMe ? 'ring-2 ring-brand-primary ring-offset-2' : ''}`}
                  title={`${v.nome} — ${formatVendas(v.vendas)}`}
                >
                  <RankingAvatar
                    nome={v.nome}
                    foto={v.foto}
                    size={compacto ? AVATAR_COMPACTO : 34}
                    border={isMe ? '2px solid var(--color-brand-primary)' : '2px solid var(--color-border-default)'}
                  />
                </div>

                {/* Tag VOCÊ */}
                {isMe && (
                  <span className="mt-1 text-mx-micro font-extrabold tracking-wider text-white bg-brand-primary px-1.5 py-0.5 rounded-full uppercase shadow-xs">
                    VOCÊ
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Marcadores de escala 0% e 100% */}
        <div className="flex justify-between gap-2 mt-2 px-1">
          <span className="text-mx-tiny font-medium text-muted-foreground">Largada (0 vendas)</span>
          <span className="text-mx-tiny font-bold text-brand-primary text-right">
            {temChegada ? `Sua meta (${formatVendas(metaCorrida)})` : `Liderança (${formatVendas(liderVal)})`}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CorridaPeriodo
