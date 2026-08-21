import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
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
import { ChevronDown, ChevronUp, Eye, Lock, Package } from 'lucide-react'
import { toast } from '@/lib/toast'
import { ProductStrategicPlanTab } from './ProductStrategicPlanTab'
import { PREVIEW_PROFILES, RELEASE_STAGE_LABELS, TECHNICAL_STATUS_LABELS, VISIBILITY_LABELS, moduleInclusionState } from './capabilityCatalog'
import {
  encounterTimeStatus,
  fetchEncounterTimes,
  fetchProductModules,
  saveEncounterTimes,
  saveProductModules,
  summarizeTimes,
  type ConsultingProduct,
  type EncounterTime,
  type ProductModule,
} from './consultingProducts'

type DetailTab = 'resumo' | 'modulos' | 'tempos' | 'plano'

const TABS = [
  { key: 'resumo' as const, label: 'Resumo' },
  { key: 'modulos' as const, label: 'Módulos' },
  { key: 'tempos' as const, label: 'Tempos e Capacidade' },
  { key: 'plano' as const, label: 'Plano Estratégico' },
]

export function ProductDetailDrawer(props: { product: ConsultingProduct | null; onClose: () => void; onChanged?: () => void }) {
  const { product } = props
  const [tab, setTab] = useState<DetailTab>('resumo')
  const [modules, setModules] = useState<ProductModule[]>([])
  const [times, setTimes] = useState<EncounterTime[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [previewProfile, setPreviewProfile] = useState('DONO')

  useEffect(() => {
    if (!product) return
    setTab('resumo')
    setShowPreview(false)
    setPreviewProfile('DONO')
    setLoading(true)
    void Promise.all([
      fetchProductModules(product.program_key),
      fetchEncounterTimes(product.program_key, product.total_visits ?? 0),
    ]).then(([nextModules, nextTimes]) => {
      setModules(nextModules)
      setTimes(nextTimes)
      setLoading(false)
    })
  }, [product])

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

  if (!product) return null

  const patchModule = (key: string, values: Partial<ProductModule>) =>
    setModules(current => current.map(item => (item.module_key === key ? { ...item, ...values } : item)))

  const patchTime = (visit: number, values: Partial<EncounterTime>) =>
    setTimes(current => current.map(item => (item.visit_number === visit ? { ...item, ...values } : item)))

  const persist = async () => {
    if (saving) return
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`${product.name || product.program_key} — v${product.versao}`}
      size="xl"
      closeOnEscape={!saving}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={saving}>Fechar</Button>
          {tab === 'modulos' || tab === 'tempos' ? <Button onClick={() => void persist()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button> : null}
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

        {loading ? <MxLoadingState label="Carregando produto" /> : null}

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
              <MxStatusBanner tone="info">A liberação marcada aqui é herdada pelos clientes que contratam este produto.</MxStatusBanner>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setModules(current => current.map(item => item.technical_status === 'TEMPORARIAMENTE_INDISPONIVEL' ? item : ({ ...item, incluido: true })))}>Marcar todos</Button>
                <Button variant="outline" size="sm" onClick={() => setModules(current => current.map(item => item.obrigatorio ? item : ({ ...item, incluido: false })))}>Limpar não obrigatórios</Button>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(value => !value)}><Eye size={14} />{showPreview ? 'Fechar prévia' : 'Visualizar como perfil'}</Button>
              </div>
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
                <Table className="min-w-[1040px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead colSpan={7}>Matriz de capacidades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleGroups.map(group => {
                      const included = group.items.filter(item => item.incluido).length
                      const state = moduleInclusionState(included, group.items.length)
                      const expanded = expandedModules[group.code] ?? true
                      return (
                        <Fragment key={group.code}>
                          <TableRow key={group.code} className="bg-surface-alt">
                            <TableCell colSpan={7}>
                              <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setExpandedModules(current => ({ ...current, [group.code]: !expanded }))}>
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                <span className="font-semibold text-foreground">{group.label}</span>
                                <span className="text-xs text-muted-foreground">{included}/{group.items.length} incluídos · {state === 'partial' ? 'parcial' : state === 'full' ? 'liberado' : 'bloqueado'}</span>
                              </button>
                            </TableCell>
                          </TableRow>
                          {expanded ? group.items.map(item => (
                            <TableRow key={item.module_key}>
                              <TableCell>
                                <div className="font-semibold text-foreground">{item.menu_label ?? item.label}</div>
                                <div className="text-xs text-muted-foreground">{item.menu_code ?? item.module_key}</div>
                              </TableCell>
                              <TableCell>
                                <input type="checkbox" aria-label={`Incluir ${item.menu_label ?? item.label}`} disabled={(item.obrigatorio && item.incluido) || item.technical_status === 'TEMPORARIAMENTE_INDISPONIVEL'} checked={item.incluido} onChange={event => patchModule(item.module_key, { incluido: event.target.checked })} />
                              </TableCell>
                              <TableCell>
                                <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" aria-label={`Tornar ${item.menu_label ?? item.label} obrigatório`} disabled={!item.incluido} checked={item.obrigatorio} onChange={event => patchModule(item.module_key, { obrigatorio: event.target.checked })} />{item.obrigatorio ? <Lock size={12} aria-hidden="true" /> : null}</label>
                              </TableCell>
                              <TableCell>
                                <Input aria-label={`Etapa de ${item.menu_label ?? item.label}`} value={item.etapa ?? ''} onChange={event => patchModule(item.module_key, { etapa: event.target.value || null })} />
                              </TableCell>
                              <TableCell>
                                <MxSelect aria-label={`Visibilidade de ${item.menu_label ?? item.label}`} value={item.visibilidade} onChange={event => patchModule(item.module_key, { visibilidade: event.target.value as ProductModule['visibilidade'] })}>
                                  <option value="dono">Dono</option>
                                  <option value="gerente">Gerente</option>
                                  <option value="interno">Interno MX</option>
                                </MxSelect>
                              </TableCell>
                              <TableCell><div className="text-xs text-muted-foreground">{RELEASE_STAGE_LABELS[item.release_stage]} · {VISIBILITY_LABELS[item.visibility]}</div></TableCell>
                              <TableCell><div className="text-xs font-medium text-muted-foreground">{TECHNICAL_STATUS_LABELS[item.technical_status]}</div></TableCell>
                            </TableRow>
                          )) : null}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </MxTableSurface>
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
                          <Input type="number" min={0} step="0.5" aria-label={`Horas online do encontro ${item.visit_number}`} value={item.horas_online === null ? '' : String(item.horas_online)} onChange={event => patchTime(item.visit_number, { horas_online: event.target.value === '' ? null : Number(event.target.value) })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} step="0.5" aria-label={`Horas presenciais do encontro ${item.visit_number}`} value={item.horas_presencial === null ? '' : String(item.horas_presencial)} onChange={event => patchTime(item.visit_number, { horas_presencial: event.target.value === '' ? null : Number(event.target.value) })} />
                        </TableCell>
                        <TableCell>
                          <MxSelect aria-label={`Origem do tempo do encontro ${item.visit_number}`} value={item.origem} onChange={event => patchTime(item.visit_number, { origem: event.target.value as EncounterTime['origem'] })}>
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
            </div>
          ) : <MxEmptyState title="Jornada sem encontros" description="Defina o total de encontros do produto para configurar os tempos." />
        ) : null}

        {!loading && tab === 'plano' ? <ProductStrategicPlanTab product={product} onChanged={props.onChanged} /> : null}
      </div>
    </Modal>
  )
}
