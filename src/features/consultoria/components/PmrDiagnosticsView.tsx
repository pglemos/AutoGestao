import type React from 'react'
import { useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { usePmrDiagnostics } from '@/hooks/usePmrDiagnostics'
import type { PmrFormField, PmrFormTemplate } from '@/lib/schemas/consulting-client.schema'

type Props = {
  clientId: string
}

const formLabels: Record<string, string> = {
  dono: 'Socio / Dono',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  processo: 'Processos',
}

// All questions extracted from the PMR documents (PDF/PPTX/DOCX)
const FULL_TEMPLATE_FIELDS: Record<string, PmrFormField[]> = {
  dono: [
    { key: 'macro_vision', label: 'Visão Macro e Potencial', type: 'textarea', required: true },
    { key: 'monthly_meta_goal', label: 'Meta Mensal Desejada (Vendas)', type: 'number', required: true },
    { key: 'owner_dependency', label: 'Dependência do Dono (1-5)', type: 'scale', required: true },
    { key: 'partner_alignment', label: 'Alinhamento e Sinergia Societária (1-5)', type: 'scale', required: true },
    { key: 'business_stage', label: 'Estágio Atual do Negócio', type: 'select', options: ['Sobrevivência', 'Intermediário', 'Boa Prática'], required: true },
    { key: 'strategic_clarity', label: 'Clareza Estratégica (1-5)', type: 'scale' },
    { key: 'long_term_vision', label: 'Visão de Longo Prazo (1-5)', type: 'scale' },
    { key: 'investment_traps', label: 'Principais Travas de Investimento/Decisão', type: 'textarea' }
  ],
  gerente: [
    { key: 'clear_goals', label: 'Metas claras para a equipe (1-5)', type: 'scale', required: true },
    { key: 'lead_followup', label: 'Acompanhamento de leads (1-5)', type: 'scale', required: true },
    { key: 'routine', label: 'Rotina gerencial estruturada (1-5)', type: 'scale', required: true },
    { key: 'manager_autonomy', label: 'Autonomia Gerencial e Flexibilidade de Preço', type: 'scale', required: true },
    { key: 'daily_tracking_process', label: 'Processo de Acompanhamento Diário de Vendas', type: 'scale', required: true },
    { key: 'team_training_process', label: 'Processo de Treinamento da Equipe', type: 'scale', required: true },
    { key: 'team_dev_process', label: 'Processo de Desenvolvimento da Equipe', type: 'scale', required: true },
    { key: 'manager_team_synergy', label: 'Sinergia entre Equipe e Gerente', type: 'scale', required: true },
    { key: 'manager_owner_synergy', label: 'Sinergia entre Gerente e Donos', type: 'scale', required: true },
    { key: 'recruitment_process', label: 'Processo de Contratação de Vendedores', type: 'scale' },
    { key: 'feedback_routine', label: 'Rotina de Devolutiva Individual', type: 'scale' },
    { key: 'strategic_communication', label: 'Comunicação Estratégica (1-5)', type: 'scale' },
    { key: 'operational_focus', label: 'Gargalo: Excesso de Foco Operacional (1-5)', type: 'scale' }
  ],
  vendedor: [
    { key: 'crm_funnel_usage', label: 'Uso do CRM e Gestão de Funil', type: 'scale', required: true },
    { key: 'online_service', label: 'Qualidade do Atendimento Online', type: 'scale', required: true },
    { key: 'in_person_service', label: 'Qualidade do Atendimento Presencial', type: 'scale', required: true },
    { key: 'lead_to_appointment', label: 'Conversão de Leads em Agendamentos', type: 'scale', required: true },
    { key: 'referral_sales', label: 'Canal de Vendas – Indicação', type: 'scale' },
    { key: 'seller_wallet', label: 'Canal de Vendas – Carteira do Vendedor', type: 'scale' },
    { key: 'result_culture', label: 'Cultura de Resultado (Comprometimento)', type: 'scale' },
    { key: 'team_climate', label: 'Clima e Motivação da Equipe', type: 'scale' },
    { key: 'compensation_plan', label: 'Satisfação com Plano de Remuneração', type: 'scale' },
    { key: 'routine_vendedor', label: 'Rotina da Equipe de Vendas', type: 'scale' },
    { key: 'vendedor_capacity', label: 'Capacidade dos Vendedores (Técnica)', type: 'scale' },
    { key: 'main_limitator', label: 'Principal Limitador de Vendas Individual', type: 'textarea' }
  ],
  processo: [
    { key: 'traffic_leads_strategy', label: 'Estratégia de Tráfego Pago e Leads', type: 'scale', required: true },
    { key: 'instagram_innovation', label: 'Instagram: Frequência, Qualidade e Inovação', type: 'scale', required: true },
    { key: 'branding_investment', label: 'Investimento em Branding', type: 'scale' },
    { key: 'ad_photo_quality', label: 'Qualidade das Fotos dos Anúncios', type: 'scale' },
    { key: 'lead_distribution_system', label: 'Sistema de Distribuição de Leads', type: 'scale' },
    { key: 'vehicle_preparation', label: 'Processo de Preparação de Veículos', type: 'scale', required: true },
    { key: 'post_sale_process', label: 'Processo de Pós-Venda', type: 'scale', required: true },
    { key: 'trade_in_evaluation', label: 'Processo de Avaliação de Usado na Troca', type: 'scale', required: true },
    { key: 'inventory_90_days', label: 'Gestão de Veículos +90 dias no Estoque', type: 'scale' },
    { key: 'pricing_autonomy_process', label: 'Processo de Precificação e Margem', type: 'scale' },
    { key: 'information_control', label: 'Controle da Informação da Origem das Vendas', type: 'scale' }
  ]
}

function emptyAnswers(template?: PmrFormTemplate) {
  if (!template) return {}
  const fields = FULL_TEMPLATE_FIELDS[template.form_key] || template.fields || []
  return Object.fromEntries(fields.map((field) => [field.key, field.type === 'boolean' ? false : '']))
}

function parseAnswerValue(field: PmrFormField, value: string | boolean) {
  if (field.type === 'boolean') return Boolean(value)
  if (field.type === 'number' || field.type === 'scale') {
    if (value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return value
}

export function PmrDiagnosticsView({ clientId }: Props) {
  const { templates, responsesByTemplate, loading, error, saveResponse } = usePmrDiagnostics(clientId)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  
  const enrichedTemplates = useMemo(() => {
      return templates.map(t => ({
          ...t,
          fields: FULL_TEMPLATE_FIELDS[t.form_key] || t.fields
      }))
  }, [templates])

  const selectedTemplate = useMemo(() => {
    return enrichedTemplates.find((template) => template.id === (selectedTemplateId || enrichedTemplates[0]?.id))
  }, [selectedTemplateId, enrichedTemplates])
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [respondentName, setRespondentName] = useState('')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const currentAnswers = Object.keys(answers).length ? answers : emptyAnswers(selectedTemplate)

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId)
    setSelectedTemplateId(templateId)
    setAnswers(emptyAnswers(template))
    setRespondentName('')
    setSummary('')
  }

  const handleFieldChange = (field: PmrFormField, value: string | boolean) => {
    setAnswers((current) => ({
      ...emptyAnswers(selectedTemplate),
      ...current,
      [field.key]: parseAnswerValue(field, value),
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTemplate) return

    const requiredMissing = selectedTemplate.fields.some((field) => {
      if (!field.required) return false
      const value = currentAnswers[field.key]
      return value === '' || value === null || typeof value === 'undefined'
    })

    if (requiredMissing) {
      toast.error('Preencha os campos obrigatorios do diagnostico.')
      return
    }

    setSubmitting(true)
    const { error: saveError } = await saveResponse({
      template_id: selectedTemplate.id,
      respondent_name: respondentName,
      respondent_role: formLabels[selectedTemplate.form_key] || selectedTemplate.form_key,
      answers: currentAnswers,
      summary,
    })
    setSubmitting(false)

    if (saveError) {
      toast.error(saveError)
      return
    }

    toast.success('Diagnostico PMR salvo.')
    setAnswers(emptyAnswers(selectedTemplate))
    setRespondentName('')
    setSummary('')
  }

  if (loading) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="p">Carregando formularios PMR...</Typography>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="h3" tone="error">Diagnostico indisponivel</Typography>
        <Typography variant="p" tone="muted">{error}</Typography>
      </Card>
    )
  }

  return (
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-mx-lg">
      <Card className="p-mx-lg border-none bg-white xl:col-span-2">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-mx-md mb-mx-lg">
          <div>
            <Typography variant="h3">DIAGNOSTICO PMR NATIVO</Typography>
            <Typography variant="caption" tone="muted">
              Visita 1: donos, gerentes, vendedores e processos sem links externos.
            </Typography>
          </div>
          <Select
            aria-label="Selecionar formulario"
            value={selectedTemplate?.id || ''}
            onChange={(event) => handleTemplateChange(event.target.value)}
            className="md:w-mx-64"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </Select>
        </div>

        {selectedTemplate ? (
          <form onSubmit={handleSubmit} className="space-y-mx-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
              <div className="space-y-mx-xs">
                <Typography as="label" htmlFor="pmr-respondent" variant="caption">Respondente</Typography>
                <Input
                  id="pmr-respondent"
                  value={respondentName}
                  onChange={(event) => setRespondentName(event.target.value)}
                  placeholder="Nome da pessoa entrevistada"
                />
              </div>
              <div className="space-y-mx-xs">
                <Typography variant="caption">Tipo</Typography>
                <div className="h-mx-14 sm:h-12 rounded-xl border border-border bg-surface-alt px-5 flex items-center">
                  <Typography variant="p" className="">
                    {formLabels[selectedTemplate.form_key] || selectedTemplate.title}
                  </Typography>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
              {selectedTemplate.fields.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 space-y-mx-xs' : 'space-y-mx-xs'}>
                  <Typography as="label" htmlFor={`pmr-field-${field.key}`} variant="caption">
                    {field.label}{field.required ? ' *' : ''}
                  </Typography>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={`pmr-field-${field.key}`}
                      value={String(currentAnswers[field.key] || '')}
                      onChange={(event) => handleFieldChange(field, event.target.value)}
                      className="min-h-mx-24"
                    />
                  ) : field.type === 'boolean' ? (
                    <label className="h-mx-14 sm:h-12 rounded-xl border border-border bg-white px-5 flex items-center gap-mx-sm font-bold">
                      <input
                        type="checkbox"
                        checked={Boolean(currentAnswers[field.key])}
                        onChange={(event) => handleFieldChange(field, event.target.checked)}
                      />
                      Sim
                    </label>
                  ) : field.type === 'select' ? (
                    <Select
                      id={`pmr-field-${field.key}`}
                      value={String(currentAnswers[field.key] || '')}
                      onChange={(event) => handleFieldChange(field, event.target.value)}
                    >
                      <option value="">Selecionar...</option>
                      {(field.options || []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={`pmr-field-${field.key}`}
                      type={field.type === 'number' || field.type === 'scale' ? 'number' : 'text'}
                      min={field.type === 'scale' ? 0 : undefined}
                      max={field.type === 'scale' ? 5 : undefined}
                      value={String(currentAnswers[field.key] ?? '')}
                      onChange={(event) => handleFieldChange(field, event.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="pmr-summary" variant="caption">Resumo da entrevista</Typography>
              <Textarea
                id="pmr-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Sintese para alimentar o planejamento estrategico e o plano de acao..."
                className="min-h-mx-28"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'SALVANDO...' : 'SALVAR DIAGNOSTICO'}
              </Button>
            </div>
          </form>
        ) : (
          <Typography variant="p" tone="muted">Nenhum formulario ativo encontrado.</Typography>
        )}
      </Card>

      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="h3" className="mb-mx-md">RESPOSTAS COLETADAS</Typography>
        <div className="space-y-mx-sm">
          {templates.map((template) => {
            const responses = responsesByTemplate.get(template.id) || []
            return (
              <div key={template.id} className="p-mx-md rounded-xl bg-surface-alt border border-border">
                <div className="flex items-center justify-between gap-mx-sm">
                  <Typography variant="p" className="">{template.title}</Typography>
                  <Badge variant={responses.length ? 'success' : 'outline'} className="rounded-mx-full px-3 py-1">
                    {responses.length}
                  </Badge>
                </div>
                {responses[0] ? (
                  <Typography variant="tiny" tone="muted">
                    Ultima resposta: {new Date(responses[0].submitted_at).toLocaleDateString('pt-BR')}
                  </Typography>
                ) : (
                  <Typography variant="tiny" tone="muted">Pendente na Visita 1.</Typography>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </section>
  )
}
