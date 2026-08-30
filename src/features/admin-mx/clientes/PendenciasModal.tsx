import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { REPAIRABLE_CHECKS, type RepairKey, runClientRepair } from './clientRepairs'
import { buildClientReadiness, type ReadinessCheck, readinessSummary } from './clientReadiness'
import { getClientStrategicPlanPublicationSummary } from '@/features/strategic-plan/publicationSummary'
import { evaluateOwnerMasterReadiness } from './ownerMasterReadiness'
import { Modal } from '@/components/organisms/Modal'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuth } from '@/hooks/useAuth'

interface PendenciasModalProps {
  open: boolean
  clientId: string
  clientName: string
  onClose: () => void
  onRefetch: () => void
  onCorrect?: (check: ReadinessCheck) => void
}

export function PendenciasModal({ open, clientId, clientName, onClose, onRefetch, onCorrect }: PendenciasModalProps) {
  const { supabaseUser } = useAuth()
  const [checks, setChecks] = useState<ReadinessCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [repairing, setRepairing] = useState<RepairKey | null>(null)
  const [storeTaken, setStoreTaken] = useState(false)

  useEffect(() => {
    if (!open || !clientId) return
    loadChecks()
  }, [open, clientId])

  const loadChecks = async () => {
    setLoading(true)
    try {
      const [clientRes, unitsRes, modulesRes, assignmentsRes, clientsRes, ownerMaster] = await Promise.all([
        supabase.from('clientes_consultoria').select('*').eq('id', clientId).single(),
        supabase.from('unidades_cliente_consultoria').select('name, is_primary').eq('client_id', clientId),
        supabase.from('modulos_cliente_consultoria').select('enabled').eq('client_id', clientId),
        supabase.from('atribuicoes_consultoria').select('active, assignment_role').eq('client_id', clientId),
        supabase.from('clientes_consultoria').select('primary_store_id, status').eq('primary_store_id', (await supabase.from('clientes_consultoria').select('primary_store_id').eq('id', clientId).single()).data?.primary_store_id).neq('id', clientId),
        evaluateOwnerMasterReadiness(clientId),
      ])

      const client = clientRes.data
      if (!client) {
        toast.error('Cliente não encontrado')
        return
      }

      const busyStores = new Set(
        (clientsRes.data ?? [])
          .filter(c => ['ativo', 'ativa', 'active'].includes(String(c.status ?? '').toLowerCase()))
          .map(c => c.primary_store_id)
          .filter((id): id is string => Boolean(id))
      )
      setStoreTaken(busyStores.has(client.primary_store_id))

      if (ownerMaster.error) toast.error(ownerMaster.error)
      const ownerMasterResolution = ownerMaster.readiness
      const people = ownerMasterResolution.persons

      const year = new Date().getFullYear()
      const { summary: publicationSummary } = await getClientStrategicPlanPublicationSummary({
        clientAccountId: clientId,
        referenceYear: year,
      })
      const planCycle = publicationSummary?.cycle ?? null
      const publicationCard = publicationSummary?.card ?? null
      const rosterLen = publicationSummary?.rosterCodes.length ?? 0

      const builtChecks = buildClientReadiness({
        status: client.status ?? null,
        primary_store_id: client.primary_store_id ?? null,
        product_name: client.product_name ?? null,
        program_template_key: (client as { program_template_key?: string | null }).program_template_key ?? null,
        modality: client.modality ?? null,
        cnpj: client.cnpj ?? null,
        contract_start_date: (client as { contract_start_date?: string | null }).contract_start_date ?? null,
        implementation_owner_id: (client as { implementation_owner_id?: string | null }).implementation_owner_id ?? null,
        units: (unitsRes.data ?? []).map(u => ({ name: u.name ?? null, is_primary: u.is_primary ?? null })),
        contacts: people.map(a => ({
          name: a.nome ?? null,
          is_primary: Boolean(a.is_dono_master),
          email: a.email ?? null,
        })),
        modules: (modulesRes.data ?? []).map(m => ({ enabled: m.enabled ?? null })),
        assignments: (assignmentsRes.data ?? []).map(a => ({ active: a.active ?? null, assignment_role: a.assignment_role ?? null })),
        storeTakenByOtherClient: busyStores.has(client.primary_store_id),
        owner_master: {
          status: ownerMasterResolution.status,
          id: ownerMasterResolution.person?.id ?? null,
          name: ownerMasterResolution.person?.nome ?? null,
          email: ownerMasterResolution.person?.email ?? null,
          personStatus: ownerMasterResolution.person?.status ?? null,
        },
        strategic_plan_ready: planCycle && publicationCard
          ? {
              // Card manda: status exibido pode ser Publicado mesmo se o ciclo
              // bruto for revisado (versão já publicada ao Dono).
              cycleStatus: publicationCard.cycleStatus,
              total: rosterLen || publicationCard.indicadoresComMeta + publicationCard.metasPendentes,
              ready: publicationCard.metasPublicadas,
              pending: publicationCard.metasPendentes,
              indicadoresComMeta: publicationCard.indicadoresComMeta,
            }
          : null,
      })

      setChecks(builtChecks)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao carregar pendências')
    } finally {
      setLoading(false)
    }
  }

  const handleRepair = async (key: RepairKey) => {
    if (!supabaseUser || repairing) return
    setRepairing(key)
    try {
      const result = await runClientRepair({
        key,
        clientId,
        clientName,
        programKey: checks.find(c => c.key === 'produto')?.evaluationStatus === 'VALID' ? (checks.find(c => c.key === 'produto')?.detail.includes('jornada') ? 'unknown' : null) : null,
        userId: supabaseUser.id,
      })
      if (result.repaired) {
        toast.success(result.message)
        await loadChecks()
        onRefetch()
      } else {
        toast.error(result.message)
      }
    } finally {
      setRepairing(null)
    }
  }

  const summary = readinessSummary(checks)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pendências — ${clientName}`}
      size="lg"
      closeOnEscape={Boolean(!loading && !repairing)}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading || Boolean(repairing)}>Fechar</Button>
        </>
      }
    >
      <div className="mt-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">Carregando pendências...</div>
        ) : (
          <>
            {summary.canActivate
              ? <MxStatusBanner tone="success">{`Checklist completo em ${summary.completed} de ${summary.total} itens. O cliente pode ser ativado.`}</MxStatusBanner>
              : <MxStatusBanner tone="warning">{`Ativação bloqueada: ${summary.blockers.length} item(ns) impeditivo(s).`}</MxStatusBanner>}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Impeditivos ({summary.blockers.length})</h3>
              <ul className="space-y-2">
                {summary.blockers.map(check => (
                  <li key={check.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{check.label}</div>
                      <div className="text-xs text-muted-foreground">{check.detail}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!check.ok && (REPAIRABLE_CHECKS as string[]).includes(check.key) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(repairing)}
                          onClick={() => handleRepair(check.key as RepairKey)}
                        >
                          {repairing === check.key ? 'Reparando...' : 'Reparar'}
                        </Button>
                      ) : !check.ok && onCorrect && check.correctionRoute ? (
                        <Button variant="outline" size="sm" onClick={() => onCorrect(check)}>
                          Corrigir
                        </Button>
                      ) : null}
                      <span className="text-xs font-semibold text-status-error-text">Pendente</span>
                    </div>
                  </li>
                ))}
                {summary.blockers.length === 0 && (
                  <li className="text-center py-4 text-muted-foreground">Nenhum impeditivo</li>
                )}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Informativos ({summary.warnings.length})</h3>
              <ul className="space-y-2">
                {summary.warnings.map(check => (
                  <li key={check.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{check.label}</div>
                      <div className="text-xs text-muted-foreground">{check.detail}</div>
                    </div>
                    <span className={check.ok ? 'text-xs font-semibold text-status-success-text' : 'text-xs font-semibold text-status-warning-text'}>
                      {check.ok ? 'OK' : 'Faltando'}
                    </span>
                  </li>
                ))}
                {summary.warnings.length === 0 && (
                  <li className="text-center py-4 text-muted-foreground">Nenhuma informação pendente</li>
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </Modal>
  )
}
