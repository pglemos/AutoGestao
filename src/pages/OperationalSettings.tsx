import { useEffect, useMemo, useState } from 'react'
import { Building2, Info, Mail, RefreshCw, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import {
  MxField,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { useStoreDeliveryRules } from '@/hooks/useStoreDeliveryRules'
import { useStoreMetaRules } from '@/hooks/useGoals'
import { useStores } from '@/hooks/useTeam'
import { toast } from '@/lib/toast'

const DELIVERY_LISTS = [
  { label: 'Relatório Matinal', key: 'matinal', description: 'Destinatários do relatório diário da operação.' },
  { label: 'Ciclo Semanal', key: 'weekly', description: 'Destinatários das mentorias e fechamentos semanais.' },
  { label: 'Estratégico e Direção', key: 'monthly', description: 'Diretoria e sócios que recebem o fechamento executivo.' },
] as const

const FUTURE_POLICIES = [
  ['Diagnóstico detalhado', 'Registro ampliado de eventos operacionais para suporte técnico.'],
  ['Fechamento diário estrito', 'Bloqueio do cockpit quando o fechamento obrigatório estiver pendente.'],
  ['Fechamento retroativo', 'Autorização controlada para correções fora da janela operacional.'],
] as const

export default function OperationalSettings() {
  const { role } = useAuth()
  const { lojas, loading: storesLoading } = useStores()
  const initialStoreId = useMemo(() => new URLSearchParams(window.location.search).get('id') || '', [])
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [emailLists, setEmailLists] = useState({ matinal: '', weekly: '', monthly: '' })

  const {
    deliveryRules,
    loading: deliveryLoading,
    refetch: refetchDeliveryRules,
    accessMode,
    canManage,
    readOnlyMessage,
    updateDeliveryRules,
  } = useStoreDeliveryRules(selectedStoreId)
  const {
    metaRules,
    loading: metaLoading,
    fetchMetaRules,
    updateMetaRules,
  } = useStoreMetaRules(selectedStoreId)

  useEffect(() => {
    setEmailLists({
      matinal: deliveryRules?.matinal_recipients?.join(', ') || '',
      weekly: deliveryRules?.weekly_recipients?.join(', ') || '',
      monthly: deliveryRules?.monthly_recipients?.join(', ') || '',
    })
  }, [deliveryRules])

  const handleRefresh = async () => {
    if (!selectedStoreId) return
    setRefreshing(true)
    await Promise.all([refetchDeliveryRules(), fetchMetaRules()])
    setRefreshing(false)
    toast.success('Parâmetros operacionais atualizados.')
  }

  const handleProjectionMode = async (projectionMode: 'calendar' | 'business') => {
    if (!canManage) {
      toast.error(readOnlyMessage)
      return
    }
    const { error } = await updateMetaRules({ projection_mode: projectionMode })
    if (error) toast.error(error)
    else toast.success('Modo de projeção atualizado.')
  }

  const handleSave = async () => {
    if (!selectedStoreId) {
      toast.error('Selecione uma unidade antes de salvar.')
      return
    }
    if (!canManage) {
      toast.error(readOnlyMessage)
      return
    }

    setSaving(true)
    const normalizeEmails = (value: string) => value
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.includes('@'))

    const { error } = await updateDeliveryRules({
      matinal_recipients: normalizeEmails(emailLists.matinal),
      weekly_recipients: normalizeEmails(emailLists.weekly),
      monthly_recipients: normalizeEmails(emailLists.monthly),
    })
    setSaving(false)

    if (error) toast.error(error)
    else toast.success('Destinatários operacionais salvos.')
  }

  if (accessMode === 'hidden') {
    return (
      <MxModulePage>
        <MxModuleHeader title="Configuração operacional" description="Seu perfil não possui acesso a esta área." />
        <MxStatusBanner tone="danger">Acesso não autorizado para o perfil {role || 'sem perfil'}.</MxStatusBanner>
      </MxModulePage>
    )
  }

  const loading = storesLoading || deliveryLoading || metaLoading

  return (
    <MxModulePage accessMode={accessMode}>
      <MxModuleHeader
        eyebrow="Governança por unidade"
        title="Configuração operacional"
        description="Controle listas de distribuição e regras reais de projeção sem expor ações administrativas a perfis de consulta."
        actions={(
          <>
            <Button
              variant="managerSecondary"
              size="icon"
              onClick={() => void handleRefresh()}
              disabled={refreshing || !selectedStoreId}
              aria-label="Atualizar configuração operacional"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
            </Button>
            {canManage ? (
              <Button
                data-mx-requires-manage=""
                variant="managerPrimary"
                onClick={() => void handleSave()}
                disabled={saving || !selectedStoreId}
                loading={saving}
              >
                {!saving && <Save size={17} aria-hidden="true" />}
                Salvar configuração
              </Button>
            ) : (
              <Badge variant="outline">Somente leitura</Badge>
            )}
          </>
        )}
      />

      {!canManage ? <MxStatusBanner tone="info">{readOnlyMessage}</MxStatusBanner> : null}

      {loading ? (
        <MxSectionCard><MxLoadingState label="Carregando parâmetros operacionais" /></MxSectionCard>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            <MxSectionCard>
              <MxSectionHeader
                title="Unidade analisada"
                description="A seleção altera somente o contexto dos dados exibidos."
                actions={<Building2 size={18} className="text-emerald-600" aria-hidden="true" />}
              />
              <div className="space-y-4 p-5">
                <MxField label="Loja" htmlFor="operational-store">
                  <Select
                    id="operational-store"
                    value={selectedStoreId}
                    onChange={(event) => setSelectedStoreId(event.target.value)}
                    aria-label="Selecionar loja"
                  >
                    <option value="">Selecione uma unidade</option>
                    {lojas.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </Select>
                </MxField>
                <MxStatusBanner tone={selectedStoreId ? 'success' : 'neutral'}>
                  {selectedStoreId ? 'Unidade carregada para consulta.' : 'Selecione uma unidade para carregar as regras.'}
                </MxStatusBanner>
              </div>
            </MxSectionCard>

            <MxSectionCard>
              <MxSectionHeader
                title="Políticas em preparação"
                description="Controles sem persistência permanecem visíveis, porém não fingem que foram salvos."
                actions={<ShieldCheck size={18} className="text-gray-500" aria-hidden="true" />}
              />
              <div className="divide-y divide-gray-100 px-5">
                {FUTURE_POLICIES.map(([title, description]) => (
                  <div key={title} className="flex items-start justify-between gap-4 py-4">
                    <div>
                      <Typography variant="h3" className="text-sm font-semibold text-gray-800">{title}</Typography>
                      <Typography variant="p" className="mt-1 text-sm text-gray-500">{description}</Typography>
                    </div>
                    <Badge variant="outline" className="shrink-0">Em preparação</Badge>
                  </div>
                ))}
              </div>
            </MxSectionCard>
          </div>

          <div className="space-y-5">
            <MxSectionCard>
              <MxSectionHeader
                title="Projeção de metas"
                description="Defina a base matemática usada na projeção da unidade."
                actions={<SlidersHorizontal size={18} className="text-emerald-600" aria-hidden="true" />}
              />
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <Button
                  data-mx-requires-manage=""
                  variant={metaRules?.projection_mode === 'calendar' ? 'managerPrimary' : 'managerSecondary'}
                  onClick={() => void handleProjectionMode('calendar')}
                  disabled={!canManage || !selectedStoreId}
                  aria-pressed={metaRules?.projection_mode === 'calendar'}
                >
                  Dias corridos
                </Button>
                <Button
                  data-mx-requires-manage=""
                  variant={metaRules?.projection_mode === 'business' ? 'managerPrimary' : 'managerSecondary'}
                  onClick={() => void handleProjectionMode('business')}
                  disabled={!canManage || !selectedStoreId}
                  aria-pressed={metaRules?.projection_mode === 'business'}
                >
                  Dias úteis
                </Button>
              </div>
            </MxSectionCard>

            <MxSectionCard>
              <MxSectionHeader
                title="Destinatários oficiais"
                description="Separe os e-mails por vírgula. Endereços sem @ são ignorados ao salvar."
                actions={<Mail size={18} className="text-emerald-600" aria-hidden="true" />}
              />
              <div className="space-y-5 p-5">
                {DELIVERY_LISTS.map((list) => (
                  <MxField key={list.key} label={list.label} hint={list.description} htmlFor={`emails-${list.key}`}>
                    <Textarea
                      id={`emails-${list.key}`}
                      value={emailLists[list.key]}
                      onChange={(event) => setEmailLists((current) => ({ ...current, [list.key]: event.target.value }))}
                      placeholder="email1@empresa.com, email2@empresa.com"
                      disabled={!canManage || !selectedStoreId}
                      aria-label={`${list.label}: lista de e-mails`}
                    />
                  </MxField>
                ))}
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-800">
                  <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <Typography variant="p" className="text-sm">
                    Alterações são registradas por usuário e unidade. O Consultor MX permanece em consulta segura.
                  </Typography>
                </div>
              </div>
            </MxSectionCard>
          </div>
        </div>
      )}
    </MxModulePage>
  )
}
