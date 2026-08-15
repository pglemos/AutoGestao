import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Link2, Lock, PackageSearch, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxInput,
  MxMetricCard,
  MxMetricGrid,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { useAuth } from '@/hooks/useAuth'
import {
  competenceMetaCount,
  createStrategicPackage,
  fetchLinkablePackageVersions,
  fetchPackageVersionItems,
  fetchPublishedIndicators,
  groupIndicatorsByArea,
  inclusionReasonLabel,
  linkPackageToProduct,
  publishPackageVersion,
  summarizePackageIndicators,
  toggleProductUsesStrategicPlan,
  type PackageIndicator,
  type StrategicPackageVersion,
} from './strategicPlan'
import type { ConsultingProduct } from './consultingProducts'

type LinkableVersion = StrategicPackageVersion

export function ProductStrategicPlanTab(props: { product: ConsultingProduct; onChanged?: () => void }) {
  const { product } = props
  const { supabaseUser } = useAuth()
  const userId = supabaseUser?.id ?? ''
  const isPublished = product.status === 'publicado'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usesPlan, setUsesPlan] = useState(product.usa_plano_estrategico)
  const [pkgVersion, setPkgVersion] = useState<LinkableVersion | null>(null)
  const [items, setItems] = useState<PackageIndicator[]>([])
  const [linkable, setLinkable] = useState<LinkableVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState('')
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('todas')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const reload = async () => {
    setLoading(true)
    const [versionRows, linkableRows] = await Promise.all([
      product.indicator_package_version_id ? fetchPackageVersionItems(product.indicator_package_version_id) : Promise.resolve({ rows: [], error: null }),
      fetchLinkablePackageVersions(),
    ])
    setItems(versionRows.error ? [] : versionRows.rows)
    setPkgVersion(linkableRows.rows.find(v => v.id === product.indicator_package_version_id) ?? null)
    setLinkable(linkableRows.error ? [] : linkableRows.rows)
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [product.program_key, product.indicator_package_version_id])

  const areas = useMemo(() => [...new Set(items.map(item => item.area))].sort(), [items])
  const summary = useMemo(() => summarizePackageIndicators(items), [items])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter(item => {
      if (areaFilter !== 'todas' && item.area !== areaFilter) return false
      if (!term) return true
      return item.label.toLowerCase().includes(term) || item.metric_key.toLowerCase().includes(term)
    })
  }, [items, search, areaFilter])
  const groups = useMemo(() => groupIndicatorsByArea(filtered), [filtered])

  const togglePlan = async (value: boolean) => {
    if (saving) return
    setSaving(true)
    try {
      const result = await toggleProductUsesStrategicPlan(product.program_key, value)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setUsesPlan(value)
      toast.success(value ? 'Plano Estratégico ativado para este produto.' : 'Plano Estratégico desativado.')
      props.onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  const linkVersion = async () => {
    if (!selectedVersion || saving) return
    setSaving(true)
    try {
      const result = await linkPackageToProduct(product.program_key, selectedVersion)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Pacote de indicadores vinculado ao produto.')
      props.onChanged?.()
      await reload()
    } finally {
      setSaving(false)
    }
  }

  const createAndLink = async () => {
    if (saving) return
    setSaving(true)
    try {
      const { rows: indicators, error } = await fetchPublishedIndicators()
      if (error || !indicators.length) {
        toast.error('Nenhum indicador publicado disponível para compor o pacote padrão.')
        return
      }
      const created = await createStrategicPackage(
        { nome: `Padrão ${product.name ?? product.program_key}`, descricao: 'Pacote padrão gerado a partir do catálogo publicado.', metricKeys: indicators.map(item => item.metric_key) },
        userId,
      )
      if (created.error) {
        toast.error(created.error)
        return
      }
      const published = await publishPackageVersion(created.packageId, created.versionId, userId)
      if (published.error) {
        toast.error(published.error)
        return
      }
      const linked = await linkPackageToProduct(product.program_key, created.versionId)
      if (linked.error) {
        toast.error(linked.error)
        return
      }
      toast.success('Pacote padrão criado, publicado e vinculado ao produto.')
      props.onChanged?.()
      await reload()
    } finally {
      setSaving(false)
    }
  }

  const toggleDept = (area: string) => setExpanded(prev => ({ ...prev, [area]: !prev[area] }))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-foreground">Este produto utiliza Plano Estratégico</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Quando ativado, os clientes deste produto recebem os indicadores padrão do pacote vinculado.</p>
          </div>
          <div className="flex items-center gap-2">
            {isPublished ? <span className="flex items-center gap-1 text-xs text-status-warning-text"><Lock size={12} /> Publicado</span> : null}
            <button
              type="button"
              role="switch"
              aria-checked={usesPlan}
              aria-label="Utilizar Plano Estratégico neste produto"
              disabled={saving || isPublished}
              onClick={() => void togglePlan(!usesPlan)}
              className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${usesPlan ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-transform ${usesPlan ? 'translate-x-5' : ''}`} />
            </button>
            <span className={`text-xs font-medium ${usesPlan ? 'text-primary' : 'text-muted-foreground'}`}>{usesPlan ? 'Sim' : 'Não'}</span>
          </div>
        </div>
      </div>

      {loading ? null : !usesPlan ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-8 text-center">
          <SlidersHorizontal size={24} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Este produto não utiliza o Plano Estratégico como entrega padrão.</p>
        </div>
      ) : !product.indicator_package_version_id ? (
        <div className="rounded-xl border border-status-warning/30 bg-status-warning-surface p-6 text-center">
          <AlertCircle size={24} className="mx-auto mb-2 text-status-warning" />
          <p className="text-sm font-medium text-status-warning-text">Nenhum pacote de indicadores vinculado</p>
          <p className="mt-1 text-xs text-status-warning-text/80">Vincule um pacote de indicadores publicado para definir os indicadores padrão deste produto.</p>
          {!isPublished ? (
            <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-2">
              <MxSelect aria-label="Versão publicada do pacote" value={selectedVersion} onChange={event => setSelectedVersion(event.target.value)} className="min-w-[220px]">
                <option value="">Selecione um pacote publicado...</option>
                {linkable.map(version => (
                  <option key={version.id} value={version.id}>{version.nome ?? `v${version.versao}`} · v{version.versao} · {version.total_indicadores} indicadores</option>
                ))}
              </MxSelect>
              <Button onClick={() => void linkVersion()} disabled={!selectedVersion || saving}>{saving ? 'Vinculando...' : 'Vincular'}</Button>
              {linkable.length === 0 ? (
                <Button variant="outline" onClick={() => void createAndLink()} disabled={saving}><Plus size={14} />Criar pacote padrão</Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Pacote vinculado</div>
                <div className="font-bold text-foreground">{pkgVersion?.nome ?? 'Pacote'}{pkgVersion ? ` · v${pkgVersion.versao}` : ''}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Status: {pkgVersion?.status === 'publicada' ? 'Publicada' : 'Rascunho'}</div>
              </div>
              {pkgVersion ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pkgVersion.status === 'publicada' ? 'bg-status-success-surface text-status-success-text' : 'bg-muted text-muted-foreground'}`}>
                  {pkgVersion.status === 'publicada' ? 'Publicado' : 'Rascunho'}
                </span>
              ) : null}
            </div>
            <MxMetricGrid>
              <MxMetricCard title="Indicadores" value={summary.total} detail="No pacote" icon={PackageSearch} />
              <MxMetricCard title="Digitáveis" value={summary.manuais} detail="Entrada manual" icon={PackageSearch} tone="info" />
              <MxMetricCard title="Calculáveis" value={summary.calculados} detail="Por fórmula" icon={PackageSearch} tone="violet" />
              <MxMetricCard title="Departamentos" value={summary.departamentos} detail="Áreas cobertas" icon={PackageSearch} />
              <MxMetricCard title="Competências Meta" value={competenceMetaCount(summary.total)} detail="Metas mensais (×12)" icon={PackageSearch} tone="success" />
            </MxMetricGrid>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
            <div className="relative min-w-48 flex-1">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou código..." aria-label="Buscar indicador do pacote" className="pl-8" />
            </div>
            <MxSelect value={areaFilter} onChange={event => setAreaFilter(event.target.value)} aria-label="Filtrar por área">
              <option value="todas">Todas as áreas</option>
              {areas.map(area => <option key={area} value={area}>{area}</option>)}
            </MxSelect>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            {groups.length ? (
              <MxTableSurface>
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Ordem</TableHead>
                      <TableHead>Indicador</TableHead>
                      <TableHead className="w-32">Área</TableHead>
                      <TableHead className="w-24">Meta</TableHead>
                      <TableHead className="w-24">Formato</TableHead>
                      <TableHead className="w-32">Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map(group => (
                      <StrategicPlanGroupRows
                        key={group.area}
                        area={group.area}
                        items={group.items}
                        expanded={expanded[group.area] ?? group.area === groups[0]?.area}
                        onToggle={() => toggleDept(group.area)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </MxTableSurface>
            ) : (
              <MxEmptyState variant="filter" title="Nenhum indicador no pacote" description={search || areaFilter !== 'todas' ? 'Ajuste a busca ou o filtro de área.' : 'Este pacote não possui indicadores.'} />
            )}
          </div>

          {isPublished ? (
            <MxStatusBanner tone="info" className="flex items-center gap-2">
              <Lock size={14} /> Produto publicado — o pacote de indicadores é imutável. Para alterar, crie uma nova versão do produto.
            </MxStatusBanner>
          ) : (
            <MxStatusBanner tone="neutral" className="flex items-center gap-2">
              <Link2 size={14} /> A versão publicada do pacote é congelada; edições futuras exigem nova versão do pacote e do produto.
            </MxStatusBanner>
          )}
        </>
      )}
    </div>
  )
}

function StrategicPlanGroupRows(props: { area: string; items: PackageIndicator[]; expanded: boolean; onToggle: () => void }) {
  const { area, items, expanded, onToggle } = props
  return (
    <>
      <TableRow onClick={onToggle} className="cursor-pointer hover:bg-muted/40">
        <TableCell colSpan={6} className="bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            <span className="text-xs font-semibold">{area}</span>
            <span className="text-xs text-muted-foreground">{items.length} indicador(es)</span>
          </div>
        </TableCell>
      </TableRow>
      {expanded ? items.map(item => (
        <TableRow key={item.metric_key}>
          <TableCell className="font-mono text-xs text-muted-foreground">{item.sort_order || '—'}</TableCell>
          <TableCell>
            <div className="font-medium text-foreground">{item.label}</div>
            <div className="font-mono text-xs text-muted-foreground">{item.metric_key}</div>
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">{item.area}</TableCell>
          <TableCell>
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${item.calculavel ? 'bg-status-info-surface text-status-info-text' : 'bg-status-success-surface text-status-success-text'}`}>
              {item.calculavel ? 'Calculado' : 'Digitável'}
            </span>
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">{item.value_type || '—'}</TableCell>
          <TableCell>
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${item.inclusion_reason === 'dependencia_formula' ? 'bg-status-warning-surface text-status-warning-text' : 'bg-status-success-surface text-status-success-text'}`}>
              {inclusionReasonLabel(item.inclusion_reason)}
            </span>
          </TableCell>
        </TableRow>
      )) : null}
    </>
  )
}
