import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, RefreshCw } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { TabNav } from '@/components/molecules/TabNav'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { useConsultingClientBySlug } from '@/hooks/useConsultingClientBySlug'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { ClientActivationModal } from './clientes/ClientActivationModal'
import { buildClientReadiness, journeyProgress, readinessSummary } from './clientes/clientReadiness'

type ClientTab = 'visao' | 'lojas' | 'pessoas' | 'jornada' | 'modulos'

const TABS = [
  { key: 'visao' as const, label: 'Visão geral' },
  { key: 'lojas' as const, label: 'Lojas e unidades' },
  { key: 'pessoas' as const, label: 'Pessoas e consultores' },
  { key: 'jornada' as const, label: 'Jornada' },
  { key: 'modulos' as const, label: 'Módulos' },
]

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

export function AdminClienteDetalhePage() {
  const { clientSlug } = useParams<{ clientSlug: string }>()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const { client, loading, error, refetch } = useConsultingClientBySlug(clientSlug)
  const [tab, setTab] = useState<ClientTab>('visao')
  const [storeTaken, setStoreTaken] = useState(false)
  const [activationOpen, setActivationOpen] = useState(false)
  const [activating, setActivating] = useState(false)

  const checkStore = useCallback(async () => {
    if (!client?.primary_store_id || !client.id) {
      setStoreTaken(false)
      return
    }
    const { data } = await supabase
      .from('clientes_consultoria')
      .select('id, status')
      .eq('primary_store_id', client.primary_store_id)
      .neq('id', client.id)
    setStoreTaken((data ?? []).some(row => ['ativo', 'ativa', 'active'].includes(String(row.status ?? '').toLowerCase())))
  }, [client?.primary_store_id, client?.id])

  useEffect(() => { void checkStore() }, [checkStore])

  const checks = useMemo(() => {
    if (!client) return []
    return buildClientReadiness({
      status: client.status ?? null,
      primary_store_id: client.primary_store_id ?? null,
      product_name: client.product_name ?? null,
      program_template_key: (client as { program_template_key?: string | null }).program_template_key ?? null,
      modality: client.modality ?? null,
      cnpj: client.cnpj ?? null,
      contract_start_date: (client as { contract_start_date?: string | null }).contract_start_date ?? null,
      implementation_owner_id: (client as { implementation_owner_id?: string | null }).implementation_owner_id ?? null,
      units: client.units ?? [],
      contacts: client.contacts ?? [],
      modules: client.modules ?? [],
      assignments: client.assignments ?? [],
      storeTakenByOtherClient: storeTaken,
    })
  }, [client, storeTaken])

  const summary = useMemo(() => readinessSummary(checks), [checks])
  const visits = client?.visits ?? []
  const totalVisits = visits.length || 0
  const progress = useMemo(() => journeyProgress(visits, totalVisits), [visits, totalVisits])

  const activate = async () => {
    if (!client || activating) return
    setActivating(true)
    try {
      const { error: updateError } = await supabase
        .from('clientes_consultoria')
        .update({ status: 'ativo', updated_at: new Date().toISOString() })
        .eq('id', client.id)
      if (updateError) {
        toast.error(updateError.code === '23505' ? 'Esta loja já tem um cliente ativo.' : updateError.message)
        return
      }
      toast.success('Cliente ativado.')
      setActivationOpen(false)
      await refetch()
    } finally {
      setActivating(false)
    }
  }

  return (
    <MxModulePage id="admin-mx-cliente-detalhe" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          eyebrow="Administração MX"
          title={client?.name ?? 'Cliente'}
          description={client ? `${client.legal_name || 'Sem razão social'} · ${client.product_name || 'Produto não definido'}` : 'Visão 360 do cliente na consultoria.'}
          actions={(
            <>
              <Button asChild variant="outline"><Link to="/clientes"><ArrowLeft size={16} />Clientes</Link></Button>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              {client && client.status !== 'ativo'
                ? <Button onClick={() => setActivationOpen(true)}><CheckCircle2 size={16} />Validar e ativar</Button>
                : null}
            </>
          )}
        />

        {loading ? <MxLoadingState label="Carregando cliente" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : !client ? (
          <MxEmptyState title="Cliente não encontrado" description="Verifique o endereço ou volte para a lista de clientes." />
        ) : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Status" value={client.status ?? 'indefinido'} detail={summary.canActivate ? 'Pronto para ativar' : `${summary.blockers.length} impeditivo(s)`} icon={BriefcaseBusiness} tone={client.status === 'ativo' ? 'success' : 'warning'} />
              <MxMetricCard title="Lojas" value={client.units?.length ?? 0} detail="Unidades cadastradas" icon={BriefcaseBusiness} tone="info" />
              <MxMetricCard title="Consultores" value={(client.assignments ?? []).filter(item => item.active !== false).length} detail="Carteira ativa" icon={BriefcaseBusiness} tone="violet" />
              <MxMetricCard title="Prontidão" value={`${summary.completed}/${summary.total}`} detail="Itens do checklist concluídos" icon={BriefcaseBusiness} />
            </MxMetricGrid>

            <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

            {tab === 'visao' ? (
              <MxSectionCard>
                <MxSectionHeader title="Informações gerais" description="Cadastro, contrato e situação do cliente." />
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Razão social', client.legal_name || '—'],
                    ['CNPJ', client.cnpj || '—'],
                    ['Produto', client.product_name || '—'],
                    ['Modalidade', client.modality || '—'],
                    ['Estrutura', (client as { structure_type?: string | null }).structure_type === 'REDE' ? 'Rede' : (client as { structure_type?: string | null }).structure_type === 'LOJA_UNICA' ? 'Loja única' : '—'],
                    ['Fase empresarial', (client as { business_phase?: string | null }).business_phase || '—'],
                    ['Início do contrato', formatDate((client as { contract_start_date?: string | null }).contract_start_date)],
                    ['Fim do contrato', formatDate((client as { contract_end_date?: string | null }).contract_end_date)],
                    ['Etapa atual da jornada', String(client.current_visit_step ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border p-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-semibold text-foreground">{value}</dd>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-5">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Checklist de prontidão</h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {checks.map(check => (
                      <li key={check.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                        <div>
                          <div className="font-medium text-foreground">{check.label}</div>
                          <div className="text-xs text-muted-foreground">{check.detail}</div>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{check.ok ? 'OK' : check.severity === 'impeditivo' ? 'Impeditivo' : 'Pendente'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </MxSectionCard>
            ) : null}

            {tab === 'lojas' ? (
              <MxSectionCard>
                <MxSectionHeader title="Lojas e unidades" description={`${client.units?.length ?? 0} unidade(s) cadastrada(s).`} />
                <div className="p-5">
                  {client.units?.length ? (
                    <MxTableSurface>
                      <Table className="min-w-[560px]">
                        <TableHeader><TableRow><TableHead>Unidade</TableHead><TableHead>Cidade</TableHead><TableHead>UF</TableHead><TableHead>Principal</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {client.units.map(unit => (
                            <TableRow key={unit.id}>
                              <TableCell className="font-semibold text-foreground">{unit.name}</TableCell>
                              <TableCell>{unit.city || '—'}</TableCell>
                              <TableCell>{unit.state || '—'}</TableCell>
                              <TableCell>{unit.is_primary ? 'Sim' : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </MxTableSurface>
                  ) : <MxEmptyState title="Nenhuma unidade cadastrada" description="Cadastre as lojas do cliente para orientar a jornada." />}
                </div>
              </MxSectionCard>
            ) : null}

            {tab === 'pessoas' ? (
              <div className="space-y-5">
                <MxSectionCard>
                  <MxSectionHeader title="Contatos do cliente" description={`${client.contacts?.length ?? 0} contato(s).`} />
                  <div className="p-5">
                    {client.contacts?.length ? (
                      <MxTableSurface>
                        <Table className="min-w-[640px]">
                          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Principal</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {client.contacts.map(contact => (
                              <TableRow key={contact.id}>
                                <TableCell className="font-semibold text-foreground">{contact.name}</TableCell>
                                <TableCell>{contact.role || '—'}</TableCell>
                                <TableCell>{contact.email || '—'}</TableCell>
                                <TableCell>{contact.phone || '—'}</TableCell>
                                <TableCell>{contact.is_primary ? 'Sim' : '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </MxTableSurface>
                    ) : <MxEmptyState title="Nenhum contato cadastrado" description="Registre ao menos o contato principal do cliente." />}
                  </div>
                </MxSectionCard>
                <MxSectionCard>
                  <MxSectionHeader title="Consultores atribuídos" description={`${(client.assignments ?? []).filter(item => item.active !== false).length} na carteira ativa.`} />
                  <div className="p-5">
                    {client.assignments?.length ? (
                      <ul className="space-y-2">
                        {client.assignments.map(assignment => (
                          <li key={assignment.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                            <span className="font-semibold text-foreground">{assignment.user?.name || assignment.user?.email || 'Consultor'}</span>
                            <span className="text-xs text-muted-foreground">{assignment.assignment_role || 'responsável'} · {assignment.active === false ? 'inativo' : 'ativo'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <MxEmptyState title="Nenhum consultor atribuído" description="Atribua um consultor pela tela de Equipe MX." />}
                  </div>
                </MxSectionCard>
              </div>
            ) : null}

            {tab === 'jornada' ? (
              <MxSectionCard>
                <MxSectionHeader title="Jornada de encontros" description={`${visits.length} encontro(s) registrados.`} />
                <div className="space-y-4 p-5">
                  <div className="max-w-md"><MxProgress value={progress} label={`${progress}% concluído`} /></div>
                  {visits.length ? (
                    <MxTableSurface>
                      <Table className="min-w-[640px]">
                        <TableHeader><TableRow><TableHead>Encontro</TableHead><TableHead>Data</TableHead><TableHead>Modalidade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {visits.map(visit => (
                            <TableRow key={visit.id}>
                              <TableCell className="font-semibold text-foreground">Visita {visit.visit_number}</TableCell>
                              <TableCell>{formatDate(visit.effective_visit_date ?? visit.scheduled_at)}</TableCell>
                              <TableCell>{visit.modality || '—'}</TableCell>
                              <TableCell>{visit.status || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </MxTableSurface>
                  ) : <MxEmptyState title="Jornada não iniciada" description="Nenhum encontro registrado para este cliente." />}
                </div>
              </MxSectionCard>
            ) : null}

            {tab === 'modulos' ? (
              <MxSectionCard>
                <MxSectionHeader title="Módulos do cliente" description={`${(client.modules ?? []).filter(item => item.enabled !== false).length} módulo(s) liberado(s).`} />
                <div className="p-5">
                  {client.modules?.length ? (
                    <MxTableSurface>
                      <Table className="min-w-[520px]">
                        <TableHeader><TableRow><TableHead>Módulo</TableHead><TableHead>Chave</TableHead><TableHead>Liberado</TableHead><TableHead>Premium</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {client.modules.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-semibold text-foreground">{item.label || item.module_key}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.module_key}</TableCell>
                              <TableCell>{item.enabled === false ? 'Não' : 'Sim'}</TableCell>
                              <TableCell>{item.premium ? 'Sim' : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </MxTableSurface>
                  ) : <MxEmptyState title="Nenhum módulo configurado" description="O cliente entra sem acesso até liberar ao menos um módulo." />}
                </div>
              </MxSectionCard>
            ) : null}

            <ClientActivationModal
              open={activationOpen}
              clientName={client.name}
              checks={checks}
              submitting={activating}
              onSubmit={() => void activate()}
              onClose={() => setActivationOpen(false)}
            />
          </>
        )}
      </div>
    </MxModulePage>
  )
}

export default AdminClienteDetalhePage
