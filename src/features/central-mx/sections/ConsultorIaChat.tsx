import { useMemo, useState } from 'react'
import {
  Bot,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import {
  useConsultorIa,
  type ConsultorIaPriority,
  type ConsultorIaSolucao,
} from '../hooks/useConsultorIa'

/**
 * Consultor IA — Chat balão rules-based (Sprint 1 — N9 + N10 da ata).
 *
 * Conversa simulada em formato de balões com sugestões geradas pela engine
 * `consultor_ia_sugerir_acao`. Não há LLM — todas as falas vêm de tabela.
 * As sugestões ficam persistidas em `consultor_solucoes` (banco de soluções
 * para retroalimentação futura — N10).
 */

const PRIORITY_TONE: Record<ConsultorIaPriority, string> = {
  critica: 'border-status-error/40 bg-status-error-surface text-status-error',
  alta: 'border-status-warning/40 bg-status-warning-surface text-status-warning',
  media: 'border-brand-primary/40 bg-mx-indigo-50 text-emerald-600',
  baixa: 'border-status-success/40 bg-status-success-surface text-status-success',
}

const PRIORITY_LABEL: Record<ConsultorIaPriority, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

type Props = {
  storeId: string | null | undefined
}

export function ConsultorIaChat({ storeId }: Props) {
  const consultor = useConsultorIa(storeId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const total = useMemo(() => consultor.solucoes.length, [consultor.solucoes])
  const lastUpdate = consultor.solucoes[0]?.created_at
  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdate) return null
    return new Date(lastUpdate).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [lastUpdate])

  return (
    <Card className="p-mx-lg">
      <div className="flex items-start justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-emerald-600 p-mx-sm text-pure-white">
            <Bot size={22} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Consultor IA
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              {storeId
                ? total > 0
                  ? `${total} sugestão(ões) ativa(s)${lastUpdateLabel ? ` • última: ${lastUpdateLabel}` : ''}`
                  : 'Sem sugestões registradas. Clique em "Gerar sugestões".'
                : 'Selecione uma loja para iniciar.'}
            </Typography>
          </div>
        </div>
        <div className="flex items-center gap-mx-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={consultor.refresh}
            disabled={consultor.loading}
            aria-label="Atualizar sugestões"
          >
            {consultor.loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => consultor.gerarSugestoes()}
            disabled={!storeId || consultor.generating}
          >
            {consultor.generating ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Sparkles size={14} className="mr-1" />
            )}
            Gerar sugestões
          </Button>
        </div>
      </div>

      {consultor.error && (
        <div className="mt-mx-md flex items-start gap-mx-xs rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <AlertTriangle size={16} className="mt-mx-tiny text-status-error" />
          <Typography variant="tiny" className="text-status-error">
            {consultor.error}
          </Typography>
        </div>
      )}

      <div className="mt-mx-md grid grid-cols-2 gap-mx-sm md:grid-cols-4">
        {(['critica', 'alta', 'media', 'baixa'] as ConsultorIaPriority[]).map((p) => (
          <div
            key={p}
            className={cn(
              'rounded-2xl border p-mx-sm text-center',
              PRIORITY_TONE[p],
            )}
          >
            <Typography variant="caption" className="">
              {PRIORITY_LABEL[p]}
            </Typography>
            <Typography as="p" variant="h3" className="mt-mx-tiny">
              {consultor.counts[p]}
            </Typography>
          </div>
        ))}
      </div>

      <ol className="mt-mx-md space-y-mx-sm" aria-label="Conversa do Consultor IA">
        {consultor.solucoes.map((solucao) => (
          <ConsultorIaBalloon
            key={solucao.id}
            solucao={solucao}
            expanded={expandedId === solucao.id}
            onToggle={() =>
              setExpandedId((current) => (current === solucao.id ? null : solucao.id))
            }
          />
        ))}
        {!consultor.solucoes.length && !consultor.loading && (
          <li className="rounded-2xl border border-dashed border-gray-200 p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Nenhuma sugestão registrada para esta loja.
            </Typography>
          </li>
        )}
      </ol>

      <div className="mt-mx-md rounded-xl border border-dashed border-gray-200 p-mx-sm">
        <Typography variant="tiny" tone="muted" className="font-bold normal-case tracking-normal">
          Esta versão do Consultor IA usa regras determinísticas. Cada sugestão é registrada no
          banco de soluções para retroalimentação futura (N10 — ata 2026-05-22 §01:33).
        </Typography>
      </div>
    </Card>
  )
}

function ConsultorIaBalloon({
  solucao,
  expanded,
  onToggle,
}: {
  solucao: ConsultorIaSolucao
  expanded: boolean
  onToggle: () => void
}) {
  const toneClass = PRIORITY_TONE[solucao.priority] ?? PRIORITY_TONE.media
  return (
    <li className="flex items-start gap-mx-sm">
      <div className="rounded-mx-full bg-emerald-600 p-mx-xs text-pure-white shadow-sm">
        <Bot size={16} aria-hidden="true" />
      </div>
      <div className={cn('flex-1 min-w-0 rounded-2xl border p-mx-sm shadow-sm', toneClass)}>
        <div className="flex flex-wrap items-center gap-mx-xs">
          <Badge variant="outline" className="">
            {PRIORITY_LABEL[solucao.priority]}
          </Badge>
          <Badge variant="outline" className="max-w-full whitespace-normal break-all tracking-wide">
            {solucao.rule_code}
          </Badge>
        </div>
        <Typography variant="p" className="mt-mx-xs">
          {solucao.problem}
        </Typography>
        <Typography variant="p" className="mt-mx-xs text-sm font-bold">
          {solucao.recommendation}
        </Typography>
        {expanded && (
          <div className="mt-mx-sm space-y-mx-tiny rounded-xl bg-white/40 p-mx-xs">
            <Typography variant="tiny" tone="muted" className="font-bold normal-case tracking-normal">
              Regra: {solucao.rule_version}
            </Typography>
            <Typography variant="tiny" tone="muted" className="font-bold normal-case tracking-normal">
              Registrado em {new Date(solucao.created_at).toLocaleString('pt-BR')}
            </Typography>
            {solucao.rationale && (
              <Typography variant="tiny" className="font-bold normal-case tracking-normal">
                {solucao.rationale}
              </Typography>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="mt-mx-xs inline-flex items-center gap-mx-tiny text-mx-tiny font-bold uppercase tracking-widest underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        >
          {expanded ? (
            <>
              Ocultar contexto <ChevronUp size={12} />
            </>
          ) : (
            <>
              Ver contexto <ChevronDown size={12} />
            </>
          )}
        </button>
      </div>
    </li>
  )
}
