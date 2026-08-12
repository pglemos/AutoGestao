import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  BarChart3, TrendingUp, MessageSquare, Sparkles,
  PieChart, Layers, ChevronRight, ChevronLeft,
  Paperclip, Trash2, Camera, Loader2, CheckCircle2, Circle, Save,
  FileText, Plus, Info, Globe, Smartphone,
  Users, Target, Award, Zap, ShieldAlert,
  ArrowRight, MousePointer2, LayoutDashboard
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Card, CardContent } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import {
  ResponsiveContainer, PieChart as RePie, Pie, Cell,
  BarChart as ReBar, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line
} from 'recharts'
import { usePmrDiagnostics } from '@/hooks/usePmrDiagnostics'
import type { PmrFormField } from '@/lib/schemas/consulting-client.schema'
import type { VisitOneQuantData } from '@/features/consultoria/types'
import { cn } from '@/lib/utils'

type VisitOneTab = 'dashboards' | 'benchmark' | 'entrevistas'
type VisitOneStockKey = keyof VisitOneQuantData['stock']

const VISIT_ONE_TABS: Array<{ id: VisitOneTab; label: string; icon: LucideIcon }> = [
  { id: 'dashboards', label: 'DASHBOARDS BI', icon: LayoutDashboard },
  { id: 'benchmark', label: 'COMPARATIVO MERCADO', icon: Globe },
  { id: 'entrevistas', label: 'ENTREVISTAS PMR', icon: Users },
]

export function VisitOneHighFidelity({ clientId, clientSlug, data, onChange }: { clientId: string, clientSlug: string, data: VisitOneQuantData, onChange: (d: VisitOneQuantData) => void }) {
  const [tab, setTab] = useState<VisitOneTab>('dashboards')

  return (
    <div className="space-y-mx-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Navegação de Contexto */}
      <div className="flex bg-white/50 backdrop-blur-sm p-mx-xs rounded-2xl border border-border shadow-mx-inner">
        {VISIT_ONE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-mx-xs py-mx-sm px-mx-md rounded-xl text-xs font-bold uppercase tracking-mx-wider transition-all",
              tab === t.id ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboards' && <VisitOneDashboards data={data} onChange={onChange} />}
      {tab === 'benchmark' && <VisitOneBenchmark data={data} />}
      {tab === 'entrevistas' && <VisitOneInterviews clientId={clientId} />}
    </div>
  )
}

function VisitOneDashboards({ data, onChange }: { data: VisitOneQuantData, onChange: (d: VisitOneQuantData) => void }) {
  const COLORS = ['#071822', '#00A89D', '#FACC15', '#6B7280']

  const handleSalesChange = (index: number, value: number) => {
    const newSales = [...data.sales]
    newSales[index] = { ...newSales[index], value }
    onChange({ ...data, sales: newSales })
  }

  const totalSales = data.sales.reduce((acc, s) => acc + (s.value || 0), 0)
  const cpl = data.marketing?.leads > 0 ? (data.marketing.investment / data.marketing.leads).toFixed(2) : '0,00'

  return (
    <div className="space-y-mx-lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-mx-lg">
        {/* Vendas Trimestre */}
        <Card className="p-mx-lg bg-white border overflow-hidden relative group/card">
          <div className="absolute -top-mx-4 -right-mx-4 p-mx-md opacity-[0.03] group-hover/card:opacity-[0.06] transition-opacity pointer-events-none text-status-success-text">
            <BarChart3 size={140} />
          </div>
          <div className="relative z-10 mb-mx-md flex items-center gap-mx-sm">
            <div className="p-mx-xs bg-brand-primary/10 rounded-xl text-status-success-text"><TrendingUp size={20} /></div>
            <div>
              <Typography variant="h3" className="text-lg">Vendas Trimestre</Typography>
              <Typography variant="tiny" tone="muted" className="opacity-60">Volume de emplacamentos/entregas</Typography>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-mx-md mb-mx-lg">
             {data.sales.map((s, i) => (
                <div key={s.month} className="space-y-mx-xs">
                   <Typography variant="tiny" className="">{s.month.toUpperCase()}</Typography>
                   <Input
                      id={`sales-${s.month}-${i}`}
                      name={`sales-${s.month}`}
                      type="number"
                      value={s.value}
                      onChange={e => handleSalesChange(i, parseInt(e.target.value) || 0)}
                      className="h-mx-12 font-bold text-xl text-center border-border bg-surface-alt/20 focus:bg-white focus:border-brand-primary transition-all shadow-sm"
                   />
                </div>
             ))}
          </div>

          <div className="flex items-center justify-between p-mx-md bg-surface-alt rounded-2xl border border-border">
             <div>
                <Typography variant="tiny" className="font-bold">Total Trimestre</Typography>
                <Typography variant="h2" className="text-3xl">{totalSales} <span className="text-sm font-bold text-muted-foreground">CARROS</span></Typography>
             </div>
             <div className="text-right">
                <Typography variant="tiny" className="font-bold">Média Mensal</Typography>
                <Typography variant="h2" className="text-3xl">{(totalSales / 3).toFixed(1)}</Typography>
             </div>
          </div>
        </Card>

        {/* Marketing ROI */}
        <Card className="p-mx-lg bg-white border overflow-hidden relative group/card">
          <div className="absolute -top-mx-4 -right-mx-4 p-mx-md opacity-[0.03] group-hover/card:opacity-[0.06] transition-opacity pointer-events-none text-brand-secondary">
            <PieChart size={140} />
          </div>
          <div className="relative z-10 mb-mx-md flex items-center gap-mx-sm">
            <div className="p-mx-xs bg-gray-900/10 rounded-xl text-brand-secondary"><Zap size={20} /></div>
            <div>
              <Typography variant="h3" className="text-lg">Performance MKT</Typography>
              <Typography variant="tiny" tone="muted" className="opacity-60">CPL e Origem de Leads</Typography>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-mx-md mb-mx-lg">
             <div className="space-y-mx-xs">
                <Typography variant="tiny" className="">Investimento Total (R$)</Typography>
                <Input
                  id="marketing-investment"
                  name="marketing-investment"
                  type="number"
                  value={data.marketing?.investment}
                  onChange={e => onChange({ ...data, marketing: { ...data.marketing, investment: parseFloat(e.target.value) || 0 } })}
                  className="h-mx-12 font-bold text-xl border-border bg-surface-alt/20 focus:bg-white focus:border-brand-primary transition-all"
                  placeholder="Ex: 5000"
                />
             </div>
             <div className="space-y-mx-xs">
                <Typography variant="tiny" className="">Leads Totais (UN)</Typography>
                <Input
                  id="marketing-leads"
                  name="marketing-leads"
                  type="number"
                  value={data.marketing?.leads}
                  onChange={e => onChange({ ...data, marketing: { ...data.marketing, leads: parseInt(e.target.value) || 0 } })}
                  className="h-mx-12 font-bold text-xl border-border bg-surface-alt/20 focus:bg-white focus:border-brand-primary transition-all"
                  placeholder="Ex: 250"
                />
             </div>
          </div>

          <div className="flex items-center justify-between p-mx-md bg-gray-900/5 rounded-2xl border border-brand-secondary/10">
             <div>
                <Typography variant="tiny" className="font-bold text-brand-secondary">Custo por Lead (CPL)</Typography>
                <Typography variant="h1" className="text-3xl text-brand-secondary">R$ {cpl}</Typography>
             </div>
             <div className="h-mx-14 w-mx-14 overflow-visible">
                <ResponsiveContainer width={56} height={56}>
                   <RePie>
                      <Pie data={data.marketing?.origin} innerRadius={20} outerRadius={28} paddingAngle={5} dataKey="value">
                         {data.marketing.origin.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                   </RePie>
                </ResponsiveContainer>
             </div>
          </div>
          <div className="mt-mx-md grid grid-cols-4 gap-mx-xs">
             {data.marketing.origin.map((o, i) => (
                <div key={o.name} className="text-center">
                   <div className="w-mx-2 h-mx-2 rounded-full mx-auto mb-1" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                   <Typography variant="tiny" className="text-mx-micro opacity-60">{o.name}</Typography>
                   <Typography variant="p" className="text-xs">{o.value}</Typography>
                </div>
             ))}
          </div>
        </Card>
      </div>

      {/* Raio-X do Estoque */}
      <Card className="p-mx-lg bg-white border overflow-hidden relative group/card">
          <div className="absolute -top-mx-4 -right-mx-4 p-mx-md opacity-[0.03] group-hover/card:opacity-[0.06] transition-opacity pointer-events-none text-status-warning-text">
            <Layers size={140} />
          </div>
          <div className="relative z-10 mb-mx-md flex items-center gap-mx-sm">
            <div className="p-mx-xs bg-status-warning/10 rounded-xl text-status-warning"><Layers size={20} /></div>
            <div>
              <Typography variant="h3" className="text-lg">Raio-X do Estoque</Typography>
              <Typography variant="tiny" tone="muted" className="opacity-60">Saúde financeira do pátio</Typography>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-mx-md">
             {([
               { k: 'qty', l: 'QTD (UN)', p: 'Ex: 45' },
               { k: 'avg_price', l: 'TICKET (R$)', p: 'Ex: 65000' },
               { k: 'fipe_delta', l: 'FIPE (+/-)', p: 'Ex: -2000' },
               { k: 'mileage', l: 'KM MÉDIA', p: 'Ex: 65000' },
               { k: 'total_inv', l: 'INVESTIMENTO (R$)', p: 'Ex: 2.5M' }
             ] satisfies Array<{ k: VisitOneStockKey; l: string; p: string }>).map(f => (
                <div key={f.k} className="space-y-mx-xs">
                   <Typography variant="tiny" className="text-mx-tiny">{f.l}</Typography>
                   <Input
                      id={`stock-${f.k}`}
                      name={`stock-${f.k}`}
                      type="number"
                      value={data.stock?.[f.k]}
                      onChange={e => onChange({ ...data, stock: { ...data.stock, [f.k]: parseFloat(e.target.value) || 0 } })}
                      className="h-mx-10 font-bold border-border bg-surface-alt/20 focus:bg-white focus:border-brand-primary transition-all shadow-sm"
                      placeholder={f.p}
                   />
                </div>
             ))}
          </div>
      </Card>
    </div>
  )
}

function VisitOneBenchmark({ data }: { data: VisitOneQuantData }) {
  return (
    <Card className="p-mx-20 text-center bg-white border border-dashed relative overflow-hidden group">
       <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="relative z-10">
         <div className="w-mx-16 h-mx-16 bg-surface-alt rounded-mx-full flex items-center justify-center mx-auto mb-mx-md border border-border-subtle group-hover:scale-110 transition-transform">
           <Globe size={48} className="text-status-success-text opacity-40" />
         </div>
         <Typography variant="h3" className="text-xl mb-mx-xs">Comparativo de Mercado</Typography>
         <Typography variant="p" className="text-sm max-w-mx-80 mx-auto font-medium tracking-tighter">
           Inteligência preditiva em processamento. Os dados de benchmarking regional serão liberados após a consolidação do primeiro ciclo mensal.
         </Typography>
       </div>
    </Card>
  )
}

function getInterviewLabel(formKey: string, fallback: string) {
  const labels: Record<string, string> = {
    dono: 'Dono / Sócio',
    gerente: 'Gerente',
    processo: 'Processos',
    vendedor: 'Vendedores',
  }
  return labels[formKey] || fallback
}

function emptyInterviewAnswers(fields: PmrFormField[]) {
  return Object.fromEntries(fields.map(field => [field.key, field.type === 'boolean' ? false : '']))
}

function parseInterviewValue(field: PmrFormField, value: string | boolean | number) {
  if (field.type === 'boolean') return Boolean(value)
  if (field.type === 'number' || field.type === 'scale') {
    if (value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return String(value)
}

function VisitOneInterviews({ clientId }: { clientId: string }) {
  const { templates, responsesByTemplate, saveResponse } = usePmrDiagnostics(clientId)
  const [activeTmpl, setActiveTmpl] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [respondentName, setRespondentName] = useState('')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)

  const currentTmpl = useMemo(() => {
    return templates.find(t => t.id === activeTmpl) || templates[0]
  }, [activeTmpl, templates])

  const currentResp = currentTmpl ? responsesByTemplate.get(currentTmpl.id)?.[0] : undefined
  const currentResponses = currentTmpl ? responsesByTemplate.get(currentTmpl.id) || [] : []
  const completedInterviews = templates.filter(template => (responsesByTemplate.get(template.id)?.length || 0) > 0).length

  useEffect(() => {
    if (!currentTmpl) return
    setAnswers({
      ...emptyInterviewAnswers(currentTmpl.fields),
      ...(currentResp?.answers || {}),
    })
    setRespondentName(currentResp?.respondent_name || '')
    setSummary(currentResp?.summary || '')
  }, [currentTmpl?.id, currentResp?.id])

  if (!templates.length || !currentTmpl) {
    return <div className="p-mx-lg text-center opacity-50">Carregando formulários de entrevista...</div>
  }

  const updateField = (field: PmrFormField, value: string | boolean | number) => {
    setAnswers(current => ({
      ...current,
      [field.key]: parseInterviewValue(field, value),
    }))
  }

  const handleSaveInterview = async () => {
    const missingRequired = currentTmpl.fields.some(field => {
      if (!field.required) return false
      const value = answers[field.key]
      return value === '' || value === null || typeof value === 'undefined'
    })

    if (missingRequired) {
      toast.error('Preencha os campos obrigatórios antes de salvar.')
      return
    }

    setSaving(true)
    const { error } = await saveResponse({
      response_id: currentResp?.id,
      template_id: currentTmpl.id,
      respondent_name: respondentName,
      respondent_role: getInterviewLabel(currentTmpl.form_key, currentTmpl.target_role),
      answers,
      summary,
    })
    setSaving(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success(currentResp ? 'Entrevista atualizada.' : 'Entrevista salva.')
  }

  return (
    <div className="space-y-mx-lg">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-mx-md">
        {templates.map(t => {
          const responses = responsesByTemplate.get(t.id) || []
          const isActive = currentTmpl.id === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTmpl(t.id)}
              className={cn(
                "text-left p-mx-md rounded-2xl border transition-all relative overflow-hidden shadow-sm min-h-mx-28",
                isActive
                  ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                  : "bg-white border-border hover:border-brand-primary/30 hover:bg-surface-alt"
              )}
            >
              <div className="flex items-start justify-between gap-mx-sm">
                <div>
                  <Typography variant="tiny" className={cn("uppercase font-bold tracking-mx-widest text-mx-tiny", isActive ? "text-white/70" : "text-muted-foreground")}>
                    Entrevista
                  </Typography>
                  <Typography variant="h3" className={cn("text-base font-bold leading-tight", isActive ? "text-white" : "text-foreground")}>
                    {getInterviewLabel(t.form_key, t.title)}
                  </Typography>
                </div>
                {responses.length ? (
                  <CheckCircle2 className={cn("w-mx-5 h-mx-5 shrink-0", isActive ? "text-white/70" : "text-status-success")} />
                ) : (
                  <Circle className={cn("w-mx-5 h-mx-5 shrink-0", isActive ? "text-white/40" : "text-muted-foreground/50")} />
                )}
              </div>
              <Typography variant="tiny" className={cn("mt-mx-md block font-bold", isActive ? "text-white/70" : "text-muted-foreground")}>
                {responses.length ? `${responses.length} resposta(s) agrupada(s)` : 'Pendente'}
              </Typography>
            </button>
          )
        })}
      </div>

      <Card className="p-mx-lg bg-white border">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-mx-md mb-mx-lg border-b border-border-subtle pb-mx-md">
          <div className="flex items-start gap-mx-sm">
            <div className="p-mx-xs bg-brand-primary/10 rounded-xl text-status-success-text"><Users size={20} /></div>
            <div>
              <Typography variant="tiny" tone="muted" className="">
                Visita 1 - Diagnóstico PMR
              </Typography>
              <Typography variant="h3" className="text-xl tracking-tight">
                {getInterviewLabel(currentTmpl.form_key, currentTmpl.title)}
              </Typography>
            </div>
          </div>
          <Badge variant={currentResponses.length ? 'success' : 'outline'} className="self-start xl:self-auto rounded-mx-full px-mx-md py-mx-xs">
            {completedInterviews}/{templates.length} entrevistas com resposta
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-md mb-mx-lg">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor={`interview-${currentTmpl.id}-respondent`} variant="tiny" className="">
              Respondente
            </Typography>
            <Input
              id={`interview-${currentTmpl.id}-respondent`}
              name={`interview-${currentTmpl.id}-respondent`}
              className="bg-surface-alt/30 focus:bg-white"
              value={respondentName}
              onChange={e => setRespondentName(e.target.value)}
              placeholder="Nome da pessoa entrevistada"
            />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="">
              Escopo
            </Typography>
            <div className="h-mx-12 rounded-xl border border-border bg-surface-alt/30 px-mx-md flex items-center">
              <Typography variant="p" className="text-sm font-bold">
                Diagnóstico consolidado da Visita 1.
              </Typography>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
          {currentTmpl.fields.map(field => {
            const value = answers[field.key]
            return (
              <div key={field.key} className={cn("space-y-mx-xs p-mx-md bg-surface-alt/30 rounded-2xl border border-border", field.type === 'textarea' ? 'md:col-span-2' : '')}>
                <Typography as="label" htmlFor={`interview-${currentTmpl.id}-${field.key}`} variant="p" className="text-xs">
                  {field.label}{field.required ? ' *' : ''}
                </Typography>

                {field.type === 'textarea' ? (
                  <Textarea
                    id={`interview-${currentTmpl.id}-${field.key}`}
                    name={`interview-${currentTmpl.id}-${field.key}`}
                    className="bg-white border-none shadow-mx-inner min-h-mx-24"
                    placeholder="Resposta do entrevistado..."
                    value={String(value || '')}
                    onChange={e => updateField(field, e.target.value)}
                  />
                ) : field.type === 'scale' ? (
                  <div className="flex flex-wrap gap-mx-sm pt-mx-xs">
                    {[1, 2, 3, 4, 5].map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateField(field, option)}
                        className={cn(
                          "h-10 w-10 min-w-10 sm:h-12 sm:w-12 sm:min-w-12 rounded-2xl font-bold transition-all border-2 flex items-center justify-center text-lg",
                          value === option
                            ? "bg-brand-primary border-brand-primary text-white shadow-sm scale-105"
                            : "bg-white border-border text-muted-foreground hover:border-brand-primary/40 hover:text-status-success-text"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : field.type === 'boolean' ? (
                  <label className="h-mx-12 rounded-xl bg-white border border-border px-mx-md flex items-center gap-mx-sm font-bold text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={e => updateField(field, e.target.checked)}
                    />
                    Sim
                  </label>
                ) : field.type === 'select' ? (
                  <Select
                    id={`interview-${currentTmpl.id}-${field.key}`}
                    name={`interview-${currentTmpl.id}-${field.key}`}
                    className="bg-white border-none shadow-mx-inner"
                    value={String(value || '')}
                    onChange={e => updateField(field, e.target.value)}
                  >
                    <option value="">Selecionar...</option>
                    {(field.options || []).map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={`interview-${currentTmpl.id}-${field.key}`}
                    name={`interview-${currentTmpl.id}-${field.key}`}
                    type={field.type === 'number' ? 'number' : 'text'}
                    className="bg-white border-none shadow-mx-inner"
                    value={String(value ?? '')}
                    onChange={e => updateField(field, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-mx-md space-y-mx-xs">
          <Typography as="label" htmlFor={`interview-${currentTmpl.id}-summary`} variant="p" className="text-xs">
            Resumo para planejamento
          </Typography>
          <Textarea
            id={`interview-${currentTmpl.id}-summary`}
            name={`interview-${currentTmpl.id}-summary`}
            className="bg-surface-alt/30 focus:bg-white min-h-mx-28"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Síntese consultiva para alimentar o planejamento estratégico e o plano de ação..."
          />
        </div>

        <div className="mt-mx-lg flex justify-end">
          <Button
            type="button"
            variant="primary"
            className="h-mx-11 px-mx-lg text-xs"
            loading={saving}
            onClick={handleSaveInterview}
            icon={<Save size={16} />}
          >
            {currentResp ? 'Atualizar Entrevista' : 'Salvar Entrevista'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
