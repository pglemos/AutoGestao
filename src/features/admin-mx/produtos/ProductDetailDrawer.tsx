import { useEffect, useMemo, useState } from 'react'
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
import { Package } from 'lucide-react'
import { toast } from '@/lib/toast'
import { ProductStrategicPlanTab } from './ProductStrategicPlanTab'
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

  useEffect(() => {
    if (!product) return
    setTab('resumo')
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setModules(current => current.map(item => ({ ...item, incluido: true })))}>Marcar todos</Button>
                <Button variant="outline" size="sm" onClick={() => setModules(current => current.map(item => ({ ...item, incluido: false, obrigatorio: false })))}>Limpar</Button>
              </div>
              <MxTableSurface>
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu</TableHead>
                      <TableHead>Incluído</TableHead>
                      <TableHead>Obrigatório</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Visibilidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map(item => (
                      <TableRow key={item.module_key}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.module_key}</div>
                        </TableCell>
                        <TableCell>
                          <input type="checkbox" aria-label={`Incluir ${item.label}`} checked={item.incluido} onChange={event => patchModule(item.module_key, { incluido: event.target.checked, obrigatorio: event.target.checked ? item.obrigatorio : false })} />
                        </TableCell>
                        <TableCell>
                          <input type="checkbox" aria-label={`Tornar ${item.label} obrigatório`} disabled={!item.incluido} checked={item.obrigatorio} onChange={event => patchModule(item.module_key, { obrigatorio: event.target.checked })} />
                        </TableCell>
                        <TableCell>
                          <Input aria-label={`Etapa de ${item.label}`} value={item.etapa ?? ''} onChange={event => patchModule(item.module_key, { etapa: event.target.value || null })} />
                        </TableCell>
                        <TableCell>
                          <MxSelect aria-label={`Visibilidade de ${item.label}`} value={item.visibilidade} onChange={event => patchModule(item.module_key, { visibilidade: event.target.value as ProductModule['visibilidade'] })}>
                            <option value="dono">Dono</option>
                            <option value="gerente">Gerente</option>
                            <option value="interno">Interno MX</option>
                          </MxSelect>
                        </TableCell>
                      </TableRow>
                    ))}
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
