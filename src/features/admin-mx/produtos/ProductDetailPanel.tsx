import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { TabNav } from '@/components/molecules/TabNav'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { Check, ChevronDown, ChevronUp, Eye, Lock, MinusCircle, Package, Plus, RefreshCw } from 'lucide-react'
import { toast } from '@/lib/toast'
import { ProductStrategicPlanTab } from './ProductStrategicPlanTab'
import { PREVIEW_PROFILES, RELEASE_STAGE_LABELS, TECHNICAL_STATUS_LABELS, VISIBILITY_LABELS, moduleInclusionState } from './capabilityCatalog'
import {
  encounterTimeStatus,
  fetchEncounterTimes,
  fetchProductModules,
  patchProductModule,
  productRequiresNewVersion,
  restoreProductCapabilityDefaults,
  saveEncounterTimes,
  saveProductModules,
  summarizeTimes,
  toggleProductModuleGroup,
  type ConsultingProduct,
  type EncounterTime,
  type ProductModule,
} from './consultingProducts'

type DetailTab = 'resumo' | 'modulos' | 'tempos' | 'plano'

const DRAWER_TABS = [
  { key: 'resumo' as const, label: 'Resumo' },
  { key: 'modulos' as const, label: 'Módulos' },
  { key: 'tempos' as const, label: 'Tempos e Capacidade' },
  { key: 'plano' as const, label: 'Plano Estratégico' },
]

const INLINE_TABS = [
  { key: 'modulos' as const, label: 'Módulos' },
  { key: 'tempos' as const, label: 'Tempos e Capacidade' },
  { key: 'plano' as const, label: 'Plano Estratégico' },
]

export function ProductDetailPanel(props: {
  product: ConsultingProduct
  variant?: 'inline' | 'drawer'
  onChanged?: () => void
  onSavingChange?: (saving: boolean) => void
}) {
  const { product, variant = 'inline' } = props
  const readOnly = productRequiresNewVersion(product)
  const [tab, setTab] = useState<DetailTab>(variant === 'inline' ? 'modulos' : 'resumo')
  const [modules, setModules] = useState<ProductModule[]>([])
  const [times, setTimes] = useState<EncounterTime[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [saving, setSaving] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [previewProfile, setPreviewProfile] = useState('DONO')

  useEffect(() => {
    setTab(variant === 'inline' ? 'modulos' : 'resumo')
    setShowPreview(false)
    setPreviewProfile('DONO')
    setLoading(true)
    setLoadError(null)
    let active = true
    void Promise.all([
      fetchProductModules(product.program_key),
      fetchEncounterTimes(product.program_key, product.total_visits ?? 0),
    ]).then(([moduleResult, timeResult]) => {
      if (!active) return
      setModules(moduleResult.rows)
      setTimes(timeResult.rows)
      setLoadError(moduleResult.error ?? timeResult.error)
      setLoading(false)
    })
    return () => { active = false }
  }, [product.program_key, product.total_visits, reloadNonce, variant])

  useEffect(() => {
    props.onSavingChange?.(saving)
  }, [props, saving])

  const resumoTempos = useMemo(() => summarizeTimes(times), [times])
  const modulosIncluidos = modules.filter(item => item.incluido).length
  const moduleGroups = useMemo(() => {
    const grouped = new Map<string, ProductModule[]>()
    for (const item of modules) {
      const key = item.module_code ?? 'LEGADO'
      grouped.set(key, [...(grouped.get(key) ?? []), item])
    }
    return [...grouped.entries()].map(([code, items]) => ({
      code,
      label: items[0]?.module_label ?? 'Módulos legados',
      items: [...items].sort((left, right) => left.display_order - right.display_order),
    }))
  }, [modules])
  const preview = PREVIEW_PROFILES.find(item => item.code === previewProfile) ?? PREVIEW_PROFILES[0]
  const previewModuleCodes: readonly string[] = preview.modules
  const tabs = variant === 'inline' ? INLINE_TABS : DRAWER_TABS

  const patchModule = (key: string, values: Partial<ProductModule>) => {
    if (readOnly) return
    setModules(current => current.map(item => (item.module_key === key ? patchProductModule(item, values) : item)))
  }

  const patchTime = (visit: number, values: Partial<EncounterTime>) => {
    if (readOnly) return
    setTimes(current => current.map(item => (item.visit_number === visit ? { ...item, ...values } : item)))
  }

  const persist = async () => {
    if (saving || readOnly) return
    setSaving(true)
    try {
      const result = tab === 'modulos'
        ? await saveProductModules(product.program_key, modules)
        : await saveEncounterTimes(product.program_key, times)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(tab === 'modulos' ? 'Módulos do produto salvos.' : 'Tempos do produto salvos.')
      props.onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="product-detail-panel">
      <TabNav tabs={tabs} activeTab={tab} onTabChange={setTab} />

      {readOnly ? (
        <MxStatusBanner tone="info">
          Versão publicada — padrões em modo leitura. Para alterar, crie uma nova versão em rascunho.
        </MxStatusBanner>
      ) : null}

      {loading ? <MxLoadingState label="Carregando produto" /> : null}
      {!loading && loadError ? (
        <MxStatusBanner tone="danger" className="flex flex-wrap items-center justify-between gap-3">
          <span>Não foi possível carregar todos os dados deste produto: {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => setReloadNonce(value => value + 1)}>Tentar novamente</Button>
        </MxStatusBanner>
      ) : null}

      {!loading && tab === 'resumo' ? (
        <div className="space-y-4">
          <MxMetricGrid>
            <MxMetricCard title="Encontros" value={product.total_visits ?? 0} detail="Total da jornada" icon={Package} />
            <MxMetricCard title="Presenciais" value={`${product.min_presenciais ?? '—'} a ${product.max_presenciais ?? '—'}`} detail="Faixa contratada" icon={Package} tone="info" />
            <MxMetricCard title="Contratos ativos" value={product.clients} detail="Clientes usando o produto" icon={Package} tone="success" />
            <MxMetricCard title="Módulos liberados" value={modulosIncluidos} detail={`de ${modules.length} do catálogo`} icon={Package} tone="violet" />
          </MxMetricGrid>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ['Chave', product.program_key],
              ['Status', product.status],
              ['Modalidade', product.modalidade || '—'],
              ['Plano estratégico', product.usa_plano_estrategico ? 'Utiliza' : 'Não utiliza'],
              ['Descrição', product.descricao || '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {!loading && tab === 'modulos' ? (
        modules.length ? (
          <div className="space-y-3">
            {!readOnly ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setModules(current => current.map(item => item.technical_status === 'TEMPORARIAMENTE_INDISPONIVEL' ? item : patchProductModule(item, { incluido: true })))}>Marcar todos</Button>
                <Button variant="outline" size="sm" onClick={() => setModules(current => current.map(item => item.obrigatorio ? item : patchProductModule(item, { incluido: false })))}>Limpar não obrigatórios</Button>
                <Button variant="outline" size="sm" onClick={() => setModules(current => restoreProductCapabilityDefaults(current))}><RefreshCw size={14} />Restaurar padrão do produto</Button>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(value => !value)}><Eye size={14} />{showPreview ? 'Fechar prévia' : 'Visualizar como perfil'}</Button>
              </div>
            ) : null}
            {showPreview ? (
              <div className="rounded-xl border border-border bg-surface-alt p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Perfil:</span>
                  {PREVIEW_PROFILES.map(profile => <Button key={profile.code} variant={profile.code === previewProfile ? 'primary' : 'outline'} size="sm" onClick={() => setPreviewProfile(profile.code)}>{profile.label}</Button>)}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {modules.filter(item => item.incluido && previewModuleCodes.includes(item.module_code ?? '')).map(item => <div key={item.module_key} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate text-foreground">{item.menu_label ?? item.label}</span><span className="text-xs text-muted-foreground">{VISIBILITY_LABELS[item.visibility]}</span></div>)}
                  {!modules.some(item => item.incluido && previewModuleCodes.includes(item.module_code ?? '')) ? <p className="text-sm text-muted-foreground">Nenhum menu liberado para este perfil.</p> : null}
                </div>
              </div>
            ) : null}
            <MxTableSurface>
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu</TableHead>
                    <TableHead>Incluído</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Visibilidade</TableHead>
                    <TableHead>Status técnico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleGroups.map(group => {
                    const included = group.items.filter(item => item.incluido).length
                    const state = moduleInclusionState(included, group.items.length)
                    const expanded = expandedModules[group.code] ?? true
                    return (
                      <Fragment key={group.code}>
                        <TableRow className="bg-surface-alt">
                          <TableCell colSpan={6}>
                            <div className="flex items-center gap-3">
                              {!readOnly ? (
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={state === 'full' ? `Desativar menus disponíveis de ${group.label}` : `Incluir menus disponíveis de ${group.label}`}
                                  aria-pressed={state === 'full'}
                                  onClick={() => setModules(current => toggleProductModuleGroup(current, group.code))}
                                >
                                  {state === 'full' ? <Check size={16} aria-hidden="true" /> : state === 'partial' ? <MinusCircle size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                                </button>
                              ) : null}
                              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring" onClick={() => setExpandedModules(current => ({ ...current, [group.code]: !expanded }))}>
                                {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                                <span className="font-semibold text-foreground">{group.label}</span>
                                <span className="text-xs text-muted-foreground">{included}/{group.items.length} incluídos por padrão</span>
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded ? group.items.map(item => (
                          <TableRow key={item.module_key}>
                            <TableCell>
                              <div className="font-semibold text-foreground">{item.menu_label ?? item.label}</div>
                            </TableCell>
                            <TableCell>
                              <input type="checkbox" aria-label={`Incluir ${item.menu_label ?? item.label}`} disabled={readOnly || (item.obrigatorio && item.incluido) || item.technical_status === 'TEMPORARIAMENTE_INDISPONIVEL'} checked={item.incluido} onChange={event => patchModule(item.module_key, { incluido: event.target.checked })} />
                            </TableCell>
                            <TableCell>
                              <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" aria-label={`Tornar ${item.menu_label ?? item.label} obrigatório`} disabled={readOnly || !item.incluido} checked={item.obrigatorio} onChange={event => patchModule(item.module_key, { obrigatorio: event.target.checked })} />{item.obrigatorio ? <Lock size={12} aria-hidden="true" /> : null}</label>
                            </TableCell>
                            <TableCell>
                              <Input aria-label={`Etapa de ${item.menu_label ?? item.label}`} disabled={readOnly} value={item.etapa ?? ''} onChange={event => patchModule(item.module_key, { etapa: event.target.value || null })} />
                            </TableCell>
                            <TableCell>
                              <MxSelect aria-label={`Visibilidade de ${item.menu_label ?? item.label}`} disabled={readOnly} value={item.visibilidade} onChange={event => patchModule(item.module_key, { visibilidade: event.target.value as ProductModule['visibilidade'] })}>
                                <option value="dono">Dono</option>
                                <option value="gerente">Gerente</option>
                                <option value="interno">Interno MX</option>
                              </MxSelect>
                            </TableCell>
                            <TableCell><div className="text-xs font-medium text-muted-foreground">{TECHNICAL_STATUS_LABELS[item.technical_status]}</div></TableCell>
                          </TableRow>
                        )) : null}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
            {!readOnly ? (
              <div className="flex justify-end">
                <Button onClick={() => void persist()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar módulos'}</Button>
              </div>
            ) : null}
          </div>
        ) : <MxEmptyState title="Sem módulos no catálogo" description="Cadastre módulos do sistema para liberar por produto." />
      ) : null}

      {!loading && tab === 'tempos' ? (
        times.length ? (
          <div className="space-y-3">
            <MxMetricGrid>
              <MxMetricCard title="Total online" value={`${resumoTempos.totalOnline}h`} detail="Somatório da jornada" icon={Package} tone="info" />
              <MxMetricCard title="Total presencial" value={`${resumoTempos.totalPresencial}h`} detail="Somatório da jornada" icon={Package} tone="violet" />
              <MxMetricCard title="Encontros" value={resumoTempos.encontros} detail="Previstos no produto" icon={Package} />
              <MxMetricCard title="Pendências" value={resumoTempos.pendencias} detail="Encontros sem tempo definido" icon={Package} tone={resumoTempos.pendencias ? 'warning' : 'success'} />
            </MxMetricGrid>
            <MxTableSurface>
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Encontro</TableHead>
                    <TableHead>Online (h)</TableHead>
                    <TableHead>Presencial (h)</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {times.map(item => (
                    <TableRow key={item.visit_number}>
                      <TableCell className="font-semibold text-foreground">Encontro {item.visit_number}</TableCell>
                      <TableCell>
                        <Input type="number" min={0} step="0.5" disabled={readOnly} aria-label={`Horas online do encontro ${item.visit_number}`} value={item.horas_online === null ? '' : String(item.horas_online)} onChange={event => patchTime(item.visit_number, { horas_online: event.target.value === '' ? null : Number(event.target.value) })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} step="0.5" disabled={readOnly} aria-label={`Horas presenciais do encontro ${item.visit_number}`} value={item.horas_presencial === null ? '' : String(item.horas_presencial)} onChange={event => patchTime(item.visit_number, { horas_presencial: event.target.value === '' ? null : Number(event.target.value) })} />
                      </TableCell>
                      <TableCell>
                        <MxSelect aria-label={`Origem do tempo do encontro ${item.visit_number}`} disabled={readOnly} value={item.origem} onChange={event => patchTime(item.visit_number, { origem: event.target.value as EncounterTime['origem'] })}>
                          <option value="manual">Manual</option>
                          <option value="planilha">Planilha</option>
                          <option value="padrao">Padrão MX</option>
                        </MxSelect>
                      </TableCell>
                      <TableCell>{encounterTimeStatus(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </MxTableSurface>
            {!readOnly ? (
              <div className="flex justify-end">
                <Button onClick={() => void persist()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar tempos'}</Button>
              </div>
            ) : null}
          </div>
        ) : <MxEmptyState title="Jornada sem encontros" description="Defina o total de encontros do produto para configurar os tempos." />
      ) : null}

      {!loading && tab === 'plano' ? <ProductStrategicPlanTab product={product} onChanged={props.onChanged} /> : null}
    </div>
  )
}
