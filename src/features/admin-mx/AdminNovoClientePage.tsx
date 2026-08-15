import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { useAuth } from '@/hooks/useAuth'
import { DEFAULT_CONSULTING_MODULES } from '@/hooks/useConsultingModules'
import { toast } from '@/lib/toast'
import {
  MxErrorState,
  MxField,
  MxInput,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
  MxTextarea,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAdminConsultingProducts, useAdminTeam } from './hooks/useAdminMxLists'
import { createClientProgram } from './novo-cliente/createClientProgram'
import {
  NEW_CLIENT_STEPS,
  emptyNewClientDraft,
  pendingNewClientSteps,
  validateNewClientStep,
  type NewClientDraft,
} from './novo-cliente/newClientDraft'

const MODALITIES = ['presencial', 'online', 'hibrido']

const BUSINESS_PHASES = [
  { value: 'ESTRUTURACAO', label: 'Estruturação' },
  { value: 'CRESCIMENTO', label: 'Crescimento' },
  { value: 'CONSOLIDACAO', label: 'Consolidação' },
  { value: 'EXPANSAO', label: 'Expansão' },
  { value: 'RECUPERACAO', label: 'Recuperação' },
]

export function AdminNovoClientePage() {
  const { supabaseUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const products = useAdminConsultingProducts()
  const team = useAdminTeam()
  const [draft, setDraft] = useState<NewClientDraft>(emptyNewClientDraft)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const errors = useMemo(() => validateNewClientStep(step, draft), [step, draft])
  const pending = useMemo(() => pendingNewClientSteps(draft), [draft])
  const patch = (values: Partial<NewClientDraft>) => setDraft(current => ({ ...current, ...values }))

  const goNext = () => {
    if (errors.length) {
      toast.error(errors[0])
      return
    }
    setStep(current => Math.min(current + 1, 7))
  }

  const submit = async () => {
    if (submitting) return
    if (pending.length) {
      toast.error(`Pendências nos passos ${pending.join(', ')}.`)
      return
    }
    if (!supabaseUser) {
      toast.error('Sessão expirada. Entre novamente.')
      return
    }
    setSubmitting(true)
    try {
      const result = await createClientProgram(draft, supabaseUser.id)
      if (result.error || !result.clientId) {
        toast.error(result.error ?? 'Falha ao criar o cliente.')
        return
      }
      toast.success('Cliente criado com estrutura, módulos e consultores.')
      navigate(result.slug ? `/consultoria/clientes/${result.slug}` : '/clientes')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MxModulePage id="admin-mx-novo-cliente" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          eyebrow="Administração MX"
          title="Novo cliente"
          description="Cadastro completo: identificação, lojas, produto, jornada, módulos e pessoas."
          actions={<Button variant="outline" onClick={() => navigate('/clientes')}><ArrowLeft size={16} />Voltar</Button>}
        />

        <MxSectionCard>
          <div className="flex flex-wrap gap-2 p-5">
            {NEW_CLIENT_STEPS.map(item => {
              const state = item.id === step ? 'atual' : pending.includes(item.id) ? 'pendente' : 'ok'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  aria-current={item.id === step ? 'step' : undefined}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    state === 'atual'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : state === 'pendente'
                        ? 'border-border text-muted-foreground'
                        : 'border-primary/40 text-primary'
                  }`}
                >
                  {item.id}. {item.label}
                </button>
              )
            })}
          </div>
        </MxSectionCard>

        {errors.length ? <MxStatusBanner tone="warning">{errors.join(' ')}</MxStatusBanner> : null}

        <MxSectionCard>
          <MxSectionHeader title={NEW_CLIENT_STEPS[step - 1].label} description={`Passo ${step} de 7.`} />
          <div className="space-y-4 p-5">
            {step === 1 ? (
              <>
                <MxField label="Nome do cliente"><MxInput value={draft.name} onChange={event => patch({ name: event.target.value })} placeholder="Concessionária Alfa" /></MxField>
                <MxField label="Razão social"><MxInput value={draft.legal_name} onChange={event => patch({ legal_name: event.target.value })} /></MxField>
                <MxField label="CNPJ"><MxInput value={draft.cnpj} onChange={event => patch({ cnpj: event.target.value })} placeholder="00.000.000/0001-00" /></MxField>
                <MxField label="Observações"><MxTextarea value={draft.notes} onChange={event => patch({ notes: event.target.value })} rows={3} /></MxField>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <MxField label="Tipo de estrutura">
                  <MxSelect value={draft.structure_type} onChange={event => patch({ structure_type: event.target.value as NewClientDraft['structure_type'] })}>
                    <option value="LOJA_UNICA">Loja única</option>
                    <option value="REDE">Rede (matriz e filiais)</option>
                  </MxSelect>
                </MxField>
                {draft.units.map((unit, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[2fr_2fr_1fr_auto]">
                    <MxField label="Loja"><MxInput value={unit.name} onChange={event => patch({ units: draft.units.map((item, position) => position === index ? { ...item, name: event.target.value } : item) })} /></MxField>
                    <MxField label="Cidade"><MxInput value={unit.city} onChange={event => patch({ units: draft.units.map((item, position) => position === index ? { ...item, city: event.target.value } : item) })} /></MxField>
                    <MxField label="UF"><MxInput value={unit.state} maxLength={2} onChange={event => patch({ units: draft.units.map((item, position) => position === index ? { ...item, state: event.target.value.toUpperCase() } : item) })} /></MxField>
                    <div className="flex items-end gap-2">
                      <Button type="button" variant={unit.is_primary ? 'primary' : 'outline'} size="sm" onClick={() => patch({ units: draft.units.map((item, position) => ({ ...item, is_primary: position === index })) })}>Principal</Button>
                      {draft.units.length > 1 ? <Button type="button" variant="outline" size="sm" aria-label={`Remover loja ${index + 1}`} onClick={() => patch({ units: draft.units.filter((_, position) => position !== index) })}><Trash2 size={16} /></Button> : null}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => patch({ units: [...draft.units, { name: '', city: '', state: '', is_primary: false }] })}><Plus size={16} />Adicionar loja</Button>
                <MxField label="Fase empresarial" hint="Momento do negócio — orienta a priorização da jornada.">
                  <MxSelect value={draft.business_phase} onChange={event => patch({ business_phase: event.target.value })}>
                    <option value="">Não informada</option>
                    {BUSINESS_PHASES.map(phase => <option key={phase.value} value={phase.value}>{phase.label}</option>)}
                  </MxSelect>
                </MxField>
              </>
            ) : null}

            {step === 3 ? (
              products.error ? <MxErrorState description={products.error} retry={() => void products.refetch()} /> : (
                <>
                  <MxField label="Produto contratado">
                    <MxSelect
                      value={draft.program_template_key}
                      onChange={event => {
                        const product = products.rows.find(item => item.program_key === event.target.value)
                        patch({ program_template_key: event.target.value, product_name: product?.name ?? '' })
                      }}
                    >
                      <option value="">Selecione o produto</option>
                      {products.rows.map(product => <option key={product.program_key} value={product.program_key}>{product.name || product.program_key}</option>)}
                    </MxSelect>
                  </MxField>
                  <MxField label="Modalidade">
                    <MxSelect value={draft.modality} onChange={event => patch({ modality: event.target.value })}>
                      <option value="">Selecione a modalidade</option>
                      {MODALITIES.map(item => <option key={item} value={item}>{item}</option>)}
                    </MxSelect>
                  </MxField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MxField label="Início do contrato"><MxInput type="date" value={draft.contract_start_date} onChange={event => patch({ contract_start_date: event.target.value })} /></MxField>
                    <MxField label="Fim do contrato"><MxInput type="date" value={draft.contract_end_date} onChange={event => patch({ contract_end_date: event.target.value })} /></MxField>
                  </div>
                </>
              )
            ) : null}

            {step === 4 ? (
              team.error ? <MxErrorState description={team.error} retry={() => void team.refetch()} /> : (
                <fieldset className="space-y-2">
                  <MxField label="Responsável MX pela implantação">
                    <MxSelect value={draft.implementation_owner_id} onChange={event => patch({ implementation_owner_id: event.target.value })}>
                      <option value="">Selecione o responsável</option>
                      {team.rows.map(member => <option key={member.id} value={member.id}>{member.name || member.email || member.id}</option>)}
                    </MxSelect>
                  </MxField>
                  <legend className="text-sm text-muted-foreground">Consultores da jornada (o primeiro marcado vira responsável pela carteira).</legend>
                  {team.rows.filter(member => (member.role ?? '').startsWith('consultor') || member.role === 'admin').map(member => (
                    <label key={member.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.consultant_ids.includes(member.id)}
                        onChange={event => patch({ consultant_ids: event.target.checked ? [...draft.consultant_ids, member.id] : draft.consultant_ids.filter(id => id !== member.id) })}
                      />
                      <span>{member.name || member.email || member.id}</span>
                    </label>
                  ))}
                </fieldset>
              )
            ) : null}

            {step === 5 ? (
              <fieldset className="space-y-2">
                <legend className="text-sm text-muted-foreground">Módulos liberados para o cliente.</legend>
                {DEFAULT_CONSULTING_MODULES.map(module => (
                  <label key={module.module_key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.enabled_modules.includes(module.module_key)}
                      onChange={event => patch({ enabled_modules: event.target.checked ? [...draft.enabled_modules, module.module_key] : draft.enabled_modules.filter(key => key !== module.module_key) })}
                    />
                    <span>{module.label}{module.premium ? ' (premium)' : ''}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            {step === 6 ? (
              <>
                {draft.contacts.map((contact, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[2fr_1fr_2fr_1fr_auto]">
                    <MxField label="Nome"><MxInput value={contact.name} onChange={event => patch({ contacts: draft.contacts.map((item, position) => position === index ? { ...item, name: event.target.value } : item) })} /></MxField>
                    <MxField label="Cargo"><MxInput value={contact.role} onChange={event => patch({ contacts: draft.contacts.map((item, position) => position === index ? { ...item, role: event.target.value } : item) })} /></MxField>
                    <MxField label="E-mail"><MxInput type="email" value={contact.email} onChange={event => patch({ contacts: draft.contacts.map((item, position) => position === index ? { ...item, email: event.target.value } : item) })} /></MxField>
                    <MxField label="Telefone"><MxInput value={contact.phone} onChange={event => patch({ contacts: draft.contacts.map((item, position) => position === index ? { ...item, phone: event.target.value } : item) })} /></MxField>
                    <div className="flex items-end gap-2">
                      <Button type="button" variant={contact.is_primary ? 'primary' : 'outline'} size="sm" onClick={() => patch({ contacts: draft.contacts.map((item, position) => ({ ...item, is_primary: position === index })) })}>Principal</Button>
                      {draft.contacts.length > 1 ? <Button type="button" variant="outline" size="sm" aria-label={`Remover contato ${index + 1}`} onClick={() => patch({ contacts: draft.contacts.filter((_, position) => position !== index) })}><Trash2 size={16} /></Button> : null}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => patch({ contacts: [...draft.contacts, { name: '', role: '', email: '', phone: '', is_primary: false }] })}><Plus size={16} />Adicionar pessoa</Button>
              </>
            ) : null}

            {step === 7 ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Nome', draft.name || '—'],
                  ['Razão social', draft.legal_name || '—'],
                  ['CNPJ', draft.cnpj || '—'],
                  ['Estrutura', draft.structure_type === 'LOJA_UNICA' ? 'Loja única' : 'Rede'],
                  ['Lojas', String(draft.units.filter(unit => unit.name.trim()).length)],
                  ['Fase empresarial', BUSINESS_PHASES.find(phase => phase.value === draft.business_phase)?.label || '—'],
                  ['Produto', draft.product_name || '—'],
                  ['Modalidade', draft.modality || '—'],
                  ['Contrato', draft.contract_start_date ? `${draft.contract_start_date} → ${draft.contract_end_date || 'sem fim'}` : '—'],
                  ['Responsável MX', team.rows.find(member => member.id === draft.implementation_owner_id)?.name || '—'],
                  ['Consultores', String(draft.consultant_ids.length)],
                  ['Módulos', String(draft.enabled_modules.length)],
                  ['Pessoas', String(draft.contacts.filter(contact => contact.name.trim()).length)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-semibold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </MxSectionCard>

        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(current => Math.max(current - 1, 1))}><ArrowLeft size={16} />Anterior</Button>
          {step < 7
            ? <Button onClick={goNext}>Próximo<ArrowRight size={16} /></Button>
            : <Button disabled={submitting || pending.length > 0} onClick={() => void submit()}><Check size={16} />{submitting ? 'Criando...' : 'Criar cliente'}</Button>}
        </div>
      </div>
    </MxModulePage>
  )
}

export default AdminNovoClientePage
