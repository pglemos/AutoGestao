import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  User,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  useCentralMxPlanosAcaoSegmentado,
  type CentralMxPlanoScope,
} from '../hooks/useCentralMxPlanosAcaoSegmentado'
import type {
  CentralMxPlanoAcaoRow,
  CentralMxPlanoStatus,
} from '../hooks/useCentralMxPlanosAcao'
import { CentralMxCriarPlanoModal } from './CentralMxCriarPlanoModal'

/**
 * Painel segmentado de planos de ação — Sprint 3 (S3-T1, delta N1 da ata).
 *
 * Mostra abas para Loja / Departamento / Vendedor. O schema já suportava
 * segmentação via `scope_type`; esta UI explicita a separação e permite
 * acompanhar quem é dono de cada plano sem misturar escopos.
 */

const SCOPE_LABEL: Record<CentralMxPlanoScope, { label: string; icon: typeof Building2 }> = {
  loja: { label: 'Loja', icon: Building2 },
  departamento: { label: 'Departamento', icon: Users },
  vendedor: { label: 'Vendedor', icon: User },
}

const STATUS_TONE: Record<CentralMxPlanoStatus, string> = {
  pendente: 'border-status-warning/30 bg-status-warning-surface text-status-warning',
  em_andamento: 'border-brand-primary/40 bg-mx-indigo-50 text-emerald-600',
  atrasado: 'border-status-error/30 bg-status-error-surface text-status-error',
  validando_eficacia: 'border-border bg-gray-50 text-muted-foreground',
  concluido: 'border-status-success/30 bg-status-success-surface text-status-success',
}

type Props = {
  storeId: string | null | undefined
  createRequest?: number
  defaultScope?: CentralMxPlanoScope
  availableScopes?: CentralMxPlanoScope[]
  readOnly?: boolean
}

export function CentralMxPlanoSegmentadoPanel({
  storeId,
  createRequest = 0,
  defaultScope = 'loja',
  availableScopes = ['loja', 'departamento', 'vendedor'],
  readOnly = false,
}: Props) {
  const { profile, role } = useAuth()
  const segmentado = useCentralMxPlanosAcaoSegmentado(storeId)
  const [activeScope, setActiveScope] = useState<CentralMxPlanoScope>(defaultScope)
  const activeList = segmentado.planos[activeScope]
  const [openCreate, setOpenCreate] = useState(false)
  const [pendingCreateRequest, setPendingCreateRequest] = useState(false)
  const [scopeChoices, setScopeChoices] = useState<
    Array<{ scope: CentralMxPlanoScope; scopeId: string; label: string }>
  >([])

  useEffect(() => {
    let cancelled = false
    if (!storeId) {
      setScopeChoices([])
      return
    }
    if (role === 'vendedor' && profile?.id) {
      setScopeChoices([{ scope: 'vendedor', scopeId: profile.id, label: 'Meu plano de ação' }])
      return
    }
    setScopeChoices([{ scope: 'loja', scopeId: storeId, label: 'Loja' }])
    ;(async () => {
      const [deptRes, sellerRes, lojaRes] = await Promise.all([
        supabase
          .from('departamentos_mx')
          .select('id, name, code')
          .eq('loja_id', storeId)
          .eq('status', 'ativo'),
        supabase
          .from('vendedores_loja')
          .select('seller_user_id, usuarios:seller_user_id(name)')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .limit(50),
        supabase.from('lojas').select('id, name').eq('id', storeId).maybeSingle(),
      ])
      if (cancelled) return
      const lojaName = lojaRes.data?.name ?? 'Loja'
      const choices: Array<{ scope: CentralMxPlanoScope; scopeId: string; label: string }> = [
        { scope: 'loja', scopeId: storeId, label: `Loja • ${lojaName}` },
      ]
      for (const dept of deptRes.data ?? []) {
        choices.push({
          scope: 'departamento',
          scopeId: dept.id as string,
          label: `Departamento • ${dept.name ?? dept.code}`,
        })
      }
      for (const seller of sellerRes.data ?? []) {
        const rawName = Array.isArray(seller.usuarios)
          ? (seller.usuarios[0] as { name?: string } | undefined)?.name
          : (seller.usuarios as { name?: string } | null)?.name
        choices.push({
          scope: 'vendedor',
          scopeId: seller.seller_user_id as string,
          label: `Vendedor • ${rawName ?? seller.seller_user_id}`,
        })
      }
      setScopeChoices(choices)
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.id, role, storeId])

  const orderedChoices = useMemo(
    () =>
      [...scopeChoices].sort((a, b) => {
        const order: CentralMxPlanoScope[] = ['loja', 'departamento', 'vendedor']
        return order.indexOf(a.scope) - order.indexOf(b.scope)
      }),
    [scopeChoices],
  )

  useEffect(() => {
    if (createRequest > 0) setPendingCreateRequest(true)
  }, [createRequest])

  useEffect(() => {
    if (!pendingCreateRequest || !storeId || orderedChoices.length === 0) return
    setOpenCreate(true)
    setPendingCreateRequest(false)
  }, [pendingCreateRequest, storeId, orderedChoices.length])

  return (
    <Card className="p-mx-lg">
      <header className="flex items-start justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-emerald-600 p-mx-sm text-pure-white shadow-sm">
            <ClipboardList size={22} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Plano de Ação segmentado
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              Loja {segmentado.totals.loja} • Departamento {segmentado.totals.departamento} • Vendedor{' '}
              {segmentado.totals.vendedor}
            </Typography>
          </div>
        </div>
        <div className="flex items-center gap-mx-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={segmentado.refresh}
            disabled={segmentado.loading}
          >
            {segmentado.loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            <span className="ml-1">Atualizar</span>
          </Button>
          {!readOnly && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setOpenCreate(true)}
              disabled={!storeId || orderedChoices.length === 0}
            >
              <Plus size={14} className="mr-1" />
              Novo plano
            </Button>
          )}
        </div>
      </header>

      {segmentado.error && (
        <div className="mt-mx-md rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="text-status-error">
            {segmentado.error}
          </Typography>
        </div>
      )}

      <div role="tablist" aria-label="Escopo do plano de ação" className="mt-mx-md flex flex-wrap gap-mx-xs">
        {availableScopes.map((scope) => {
          const def = SCOPE_LABEL[scope]
          const isActive = activeScope === scope
          return (
            <button
              key={scope}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActiveScope(scope)}
              className={cn(
                'inline-flex items-center gap-mx-xs rounded-2xl border px-mx-sm py-mx-xs text-mx-tiny font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/30',
                isActive
                  ? 'border-brand-primary bg-emerald-600 text-pure-white shadow-sm'
                  : 'border-border bg-white text-muted-foreground',
              )}
            >
              <def.icon size={14} aria-hidden="true" />
              {def.label}
              <Badge variant="outline" className="">
                {segmentado.totals[scope]}
              </Badge>
            </button>
          )
        })}
      </div>

      <div className="mt-mx-md grid grid-cols-2 gap-mx-sm md:grid-cols-4">
        <CountTile
          label="Pendentes"
          value={segmentado.countsByStatus.pendente}
          tone="warning"
        />
        <CountTile
          label="Em andamento"
          value={segmentado.countsByStatus.em_andamento}
          tone="brand"
        />
        <CountTile
          label="Atrasados"
          value={segmentado.countsByStatus.atrasado}
          tone="danger"
        />
        <CountTile
          label="Validando"
          value={segmentado.countsByStatus.validando_eficacia}
          tone="muted"
        />
      </div>

      <ul className="mt-mx-md space-y-mx-sm">
        {activeList.map((plano) => (
          <PlanoRow
            key={plano.id}
            plano={plano}
            onConcluir={segmentado.marcarConcluido}
            readOnly={readOnly}
          />
        ))}
        {!activeList.length && !segmentado.loading && (
          <li className="rounded-2xl border border-dashed border-border p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Sem planos de ação ativos no escopo {SCOPE_LABEL[activeScope].label}.
            </Typography>
          </li>
        )}
      </ul>

      <CentralMxCriarPlanoModal
        open={openCreate}
        defaultScope={activeScope}
        scopeOptions={orderedChoices}
        onClose={() => setOpenCreate(false)}
        onCreated={() => segmentado.refresh()}
      />
    </Card>
  )
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'warning' | 'brand' | 'danger' | 'muted'
}) {
  const toneClass: Record<typeof tone, string> = {
    warning: 'border-status-warning/30 bg-status-warning-surface text-status-warning',
    brand: 'border-brand-primary/30 bg-mx-indigo-50 text-emerald-600',
    danger: 'border-status-error/30 bg-status-error-surface text-status-error',
    muted: 'border-border bg-gray-50 text-muted-foreground',
  }
  return (
    <div className={cn('rounded-2xl border p-mx-sm text-center', toneClass[tone])}>
      <Typography variant="caption" className="">
        {label}
      </Typography>
      <Typography as="p" variant="h3" className="mt-mx-tiny">
        {value}
      </Typography>
    </div>
  )
}

function PlanoRow({
  plano,
  onConcluir,
  readOnly,
}: {
  plano: CentralMxPlanoAcaoRow
  onConcluir: (id: string, eficaciaNota?: string) => Promise<void>
  readOnly: boolean
}) {
  return (
    <li className={cn('rounded-2xl border p-mx-md', STATUS_TONE[plano.status])}>
      <div className="flex flex-col gap-mx-xs md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-mx-xs">
            <Badge variant="outline" className="">
              {plano.departamento}
            </Badge>
            <Badge variant="outline" className="">
              {plano.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="">
              {plano.origem}
            </Badge>
            <Badge variant="outline" className="">
              {plano.prioridade}
            </Badge>
          </div>
          <Typography variant="p" className="mt-mx-xs">
            <span className="mr-mx-xs text-emerald-600">{plano.codigo || `PA-${plano.id.slice(0, 8).toUpperCase()}`}</span>
            {plano.acao}
          </Typography>
          <Typography variant="tiny" tone="muted" className="block">
            Objetivo: {plano.objetivo || 'Não informado'} • Indicador: {plano.indicador}
          </Typography>
          <Typography variant="tiny" tone="muted" className="block">
            Progresso: {plano.progresso ?? 0}% • Problema: {plano.problema}
          </Typography>
          {plano.prazo && (
            <Typography variant="tiny" tone="muted" className="block">
              Prazo: {new Date(`${plano.prazo}T12:00:00`).toLocaleDateString('pt-BR')}
            </Typography>
          )}
        </div>
        <div className="flex items-center gap-mx-xs">
          {!readOnly && plano.status !== 'concluido' && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => onConcluir(plano.id)}
            >
              <CheckCircle2 size={14} className="mr-1" /> Concluir
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
