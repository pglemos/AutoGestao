import React, { useState } from 'react'
import {
  CheckCircle2, Zap, Target, ExternalLink, BarChart3,
  Clock, TrendingUp, Award, Rocket,
  ShieldAlert, Presentation
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { useConsultingStrategicPlan } from '@/hooks/useConsultingStrategicPlan'
import { useFeedbacks, usePDIs } from '@/hooks/useData'
import { useSellersByStore } from '@/hooks/useTeam'
import { cn } from '@/lib/utils'

export function VisitTwoExecution({ clientId, clientSlug }: { clientId: string, clientSlug: string }) {
  const { latestPlan } = useConsultingStrategicPlan(clientId)
  return (
    <div className="space-y-mx-lg">
      <Card className="p-mx-lg border border-status-error/30 bg-status-error/5 shadow-sm rounded-2xl">
        <div className="flex items-center gap-mx-sm mb-mx-xs">
          <ShieldAlert className="w-mx-6 h-mx-6 text-status-error" />
          <Typography variant="h3" className="text-status-error">Trava Metodológica</Typography>
        </div>
        <Typography variant="p" className="text-status-error text-sm">
          Sem o formulário de ACOMPANHAMENTO DIÁRIO (SGAP) instalado no celular dos vendedores e a rotina validada, o trabalho não avança.
        </Typography>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
        <Card className="p-mx-lg bg-white border shadow-sm flex flex-col justify-center gap-mx-md">
          <div className="flex items-center gap-mx-sm">
            <div className="p-mx-xs bg-emerald-600/10 rounded-xl text-emerald-600"><Zap className="w-mx-5 h-mx-5" /></div>
            <Typography variant="h3">Ferramentas de Gestão</Typography>
          </div>
          <Button className="w-full justify-between h-mx-12 shadow-sm font-bold bg-white" variant="outline" onClick={() => window.open(`/consultoria/clientes/${clientSlug}?tab=strategic`, '_blank')}>
            <div className="flex items-center gap-mx-sm"><Target className="w-mx-4 h-mx-4 text-muted-foreground" />Planejamento Estratégico</div>
            <ExternalLink className="w-mx-4 h-mx-4 text-muted-foreground" />
          </Button>
          <Button className="w-full justify-between h-mx-12 shadow-sm font-bold border-brand-primary bg-white" variant="outline" onClick={() => window.open(`/consultoria/clientes/${clientSlug}?tab=daily`, '_blank')}>
            <div className="flex items-center gap-mx-sm"><BarChart3 className="w-mx-4 h-mx-4" />Validar SGAP Diário</div>
            <ExternalLink className="w-mx-4 h-mx-4 opacity-50" />
          </Button>
        </Card>

        <Card className="p-mx-lg bg-gray-50/30 border shadow-sm flex flex-col items-center justify-center text-center">
          {latestPlan ? (
            <div className="space-y-mx-xs">
              <div className="w-mx-12 h-mx-12 bg-white rounded-mx-full flex items-center justify-center mx-auto shadow-sm border border-gray-200">
                <CheckCircle2 className="w-mx-6 h-mx-6 text-status-success" />
              </div>
              <Typography variant="h3" className="">P.E. Validado</Typography>
              <Typography variant="p" className="text-mx-micro">{latestPlan.title}</Typography>
            </div>
          ) : (
            <div className="space-y-mx-xs opacity-50">
              <div className="w-mx-12 h-mx-12 bg-white rounded-mx-full flex items-center justify-center mx-auto border border-gray-200">
                <Rocket className="w-mx-6 h-mx-6 text-muted-foreground" />
              </div>
              <Typography variant="p" className="text-sm font-bold">Aguardando registro do P.E. no sistema</Typography>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export function VisitThreeExecution() {
  return (
    <Card className="p-mx-lg shadow-sm border bg-white">
      <div className="flex items-center gap-mx-sm mb-mx-md">
        <div className="p-mx-xs bg-emerald-600/10 rounded-xl text-emerald-600"><Clock size={20} /></div>
        <Typography variant="h3" className="text-lg">Ritual de Rotinas (Disciplina)</Typography>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
        <div className="p-mx-md bg-gray-50/30 rounded-2xl border border-gray-200 relative">
          <Badge className="absolute -top-mx-tiny left-mx-md font-bold text-mx-micro text-white border-none px-mx-sm py-0.5 shadow-sm">GERENTE</Badge>
          <ul className="space-y-mx-md text-sm font-medium text-muted-foreground mt-2">
            {[ '09:30 - Cobrar preenchimento SGAP', '10:30 - Reunião Matinal / Ranking', '14:00 - Auditoria de CRM / Funil', '17:00 - Devolutiva Imediata' ].map(li => (<li key={li} className="flex items-center gap-mx-xs"><div className="w-mx-xs h-mx-xs rounded-mx-full bg-gray-900 shrink-0" /> {li}</li>))}
          </ul>
        </div>
        <div className="p-mx-md bg-gray-50/30 rounded-2xl border border-gray-200 relative">
          <Badge className="absolute -top-mx-tiny left-mx-md font-bold text-mx-micro text-white border-none px-mx-sm py-0.5 shadow-sm">VENDEDOR</Badge>
          <ul className="space-y-mx-md text-sm font-medium text-muted-foreground mt-2">
            {[ 'Registro Leads Porta/Online', 'Agendamentos Carteira', 'Atendimento e Prospecção', 'Lançamento Vendas Ontem' ].map(li => (<li key={li} className="flex items-center gap-mx-xs"><div className="w-mx-xs h-mx-xs rounded-mx-full bg-emerald-600 shrink-0" /> {li}</li>))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

export function VisitFourExecution({ storeId, onGenerateSummary }: { storeId: string, onGenerateSummary: (t: string) => void }) {
  const { sellers, loading } = useSellersByStore(storeId)
  const { createFeedback } = useFeedbacks({ storeId })
  const [s, setS] = useState(false); const [v, setV] = useState(''); const [p, setP] = useState(''); const [a, setA] = useState(''); const [m, setM] = useState(0)
  const [funnel, setFunnel] = useState({ leads: 0, agd: 0, visit: 0, sale: 0 })

  const save = async () => {
    if (!storeId) return toast.error('Vincule este cliente a uma loja antes de registrar devolutiva.')
    if (!v) return toast.error('Vendedor obrigatório')
    setS(true)
    try {
      await createFeedback({
        seller_id: v,
        positives: p,
        attention_points: '...',
        action: a,
        meta_compromisso: m,
        week_reference: new Date().toISOString(),
        leads_week: funnel.leads,
        agd_week: funnel.agd,
        visit_week: funnel.visit,
        vnd_week: funnel.sale,
        tx_lead_agd: funnel.leads > 0 ? (funnel.agd / funnel.leads) * 100 : 0,
        tx_agd_visita: funnel.agd > 0 ? (funnel.visit / funnel.agd) * 100 : 0,
        tx_visita_vnd: funnel.visit > 0 ? (funnel.sale / funnel.visit) * 100 : 0
      })
      const sn = sellers.find(s => s.id === v)?.name || 'Vnd'
      onGenerateSummary(`--- AUDITORIA DE FUNIL: ${sn} ---\nLeads: ${funnel.leads} | Agd: ${funnel.agd} | Visitas: ${funnel.visit} | Vendas: ${funnel.sale}\nPositivos: ${p}\nAção: ${a}\nMeta: ${m}`)
      toast.success('Devolutiva e Funil salvos no sistema')
      setV(''); setP(''); setA(''); setM(0); setFunnel({ leads: 0, agd: 0, visit: 0, sale: 0 })
    } finally { setS(false) }
  }

  return (
    <Card className="p-mx-lg border bg-white">
      <div className="flex items-center gap-mx-sm mb-mx-md">
        <div className="p-mx-xs bg-emerald-600/10 rounded-xl text-emerald-600"><TrendingUp size={20} /></div>
        <Typography variant="h3" className="text-lg">Visita 4: Ritual de Devolutiva e Funil</Typography>
      </div>

      <div className="space-y-mx-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
          <div className="space-y-mx-md">
            <Typography variant="tiny" className="font-bold">Dados do Vendedor</Typography>
            <select aria-label="Dados do Vendedor" value={v} onChange={e => setV(e.target.value)} disabled={!storeId || loading} className="w-full h-mx-10 px-mx-md rounded-xl border border-gray-200 bg-white text-sm font-bold disabled:opacity-60">
              <option value="">{loading ? 'Carregando vendedores...' : 'Selecione o vendedor...'}</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!storeId && (
              <Typography variant="tiny" className="block text-status-error font-bold">
                Cliente sem loja vinculada. Vincule a loja para listar apenas os vendedores dela.
              </Typography>
            )}

            <div className="grid grid-cols-2 gap-mx-sm">
              <div className="space-y-mx-xs">
                <Typography variant="tiny" tone="muted">LEADS</Typography>
                <Input aria-label="LEADS" type="number" value={funnel.leads} onChange={e => setFunnel({...funnel, leads: parseInt(e.target.value) || 0})} className="h-mx-10 font-bold" />
              </div>
              <div className="space-y-mx-xs">
                <Typography variant="tiny" tone="muted">AGEND.</Typography>
                <Input aria-label="AGEND." type="number" value={funnel.agd} onChange={e => setFunnel({...funnel, agd: parseInt(e.target.value) || 0})} className="h-mx-10 font-bold" />
              </div>
              <div className="space-y-mx-xs">
                <Typography variant="tiny" tone="muted">VISITAS</Typography>
                <Input aria-label="VISITAS" type="number" value={funnel.visit} onChange={e => setFunnel({...funnel, visit: parseInt(e.target.value) || 0})} className="h-mx-10 font-bold" />
              </div>
              <div className="space-y-mx-xs">
                <Typography variant="tiny" tone="muted">VENDAS</Typography>
                <Input aria-label="VENDAS" type="number" value={funnel.sale} onChange={e => setFunnel({...funnel, sale: parseInt(e.target.value) || 0})} className="h-mx-10 font-bold" />
              </div>
            </div>
          </div>

          <div className="space-y-mx-md">
             <Typography variant="tiny" className="font-bold">Acordos de Melhoria</Typography>
             <Textarea value={p} onChange={e => setP(e.target.value)} className="min-h-mx-20 text-sm" placeholder="Pontos Fortes observados..." />
             <Textarea value={a} onChange={e => setA(e.target.value)} className="min-h-mx-20 text-sm" placeholder="Ação de correção (O que vai mudar?)" />
          </div>
        </div>

        <div className="flex gap-mx-md items-end border-t border-gray-100 pt-mx-md">
          <div className="w-1/3 md:w-1/4">
            <Typography variant="tiny" tone="muted" className="mb-1 block text-mx-tiny">META ACORDADA</Typography>
            <Input aria-label="META ACORDADA" type="number" value={m} onChange={e => setM(parseInt(e.target.value) || 0)} className="h-mx-12 font-bold text-emerald-600 text-center text-xl" />
          </div>
          <Button className="flex-1 h-mx-12 text-sm" variant="primary" onClick={save} loading={s} icon={<CheckCircle2 size={16} />}>SALVAR FEEDBACK NO CRM</Button>
        </div>
      </div>
    </Card>
  )
}

export function VisitFiveExecution({ storeId, onGenerateSummary }: { storeId: string, onGenerateSummary: (t: string) => void }) {
  const { sellers, loading } = useSellersByStore(storeId)
  const { createPDI } = usePDIs(storeId)
  const [isSaving, setIsSaving] = useState(false)
  const [sellerId, setSellerId] = useState('')
  const [goal6m, setGoal6m] = useState('')
  const [goal12m, setGoal12m] = useState('')
  const [action, setAction] = useState('')
  const [notes, setNotes] = useState('')

  const handleSave = async () => {
    if (!storeId) return toast.error('Vincule este cliente a uma loja antes de criar o PDI.')
    if (!sellerId || !goal6m || !action) return toast.error('Selecione o vendedor e preencha objetivo e ação')
    setIsSaving(true)
    try {
      await createPDI({
        seller_id: sellerId,
        meta_6m: goal6m,
        meta_12m: goal12m || 'A definir',
        meta_24m: 'A definir',
        action_1: action,
        comp_prospeccao: 3,
        comp_abordagem: 3,
        comp_demonstracao: 3,
        comp_fechamento: 3,
        comp_crm: 3,
        comp_digital: 3,
        comp_disciplina: 3,
        comp_organizacao: 3,
        comp_negociacao: 3,
        comp_produto: 3
      })

      const sellerName = sellers.find(seller => seller.id === sellerId)?.name || 'Nome não informado'
      onGenerateSummary(`--- PDI VISITA 5: ${sellerName} ---\nObjetivo 6 meses: ${goal6m}\nObjetivo 12 meses: ${goal12m || 'A definir'}\nAção inicial: ${action}\nObservações: ${notes || 'Sem observações adicionais.'}`)
      toast.success('PDI registrado no sistema')
      setSellerId(''); setGoal6m(''); setGoal12m(''); setAction(''); setNotes('')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="p-mx-lg border bg-white">
      <div className="flex items-center gap-mx-sm mb-mx-md">
        <div className="p-mx-xs bg-emerald-600/10 rounded-xl text-emerald-600"><Award size={20} /></div>
        <Typography variant="h3" className="text-lg">Visita 5: Plano de Desenvolvimento Individual (PDI)</Typography>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
        <div className="space-y-mx-md">
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Vendedor / Gerente</Typography>
            <select aria-label="Vendedor / Gerente" value={sellerId} onChange={e => setSellerId(e.target.value)} disabled={!storeId || loading} className="w-full h-mx-10 px-mx-md rounded-xl border border-gray-200 bg-white text-sm font-bold disabled:opacity-60">
              <option value="">{loading ? 'Carregando vendedores...' : 'Selecione o vendedor...'}</option>
              {sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
            </select>
            {!storeId && (
              <Typography variant="tiny" className="block text-status-error font-bold">
                Cliente sem loja vinculada. Vincule a loja para listar apenas os vendedores dela.
              </Typography>
            )}
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Objetivo em 6 meses</Typography>
            <Textarea value={goal6m} onChange={e => setGoal6m(e.target.value)} placeholder="Onde essa pessoa precisa estar em 6 meses?" className="min-h-mx-20" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Objetivo em 12 meses</Typography>
            <Input value={goal12m} onChange={e => setGoal12m(e.target.value)} placeholder="Opcional" className="h-mx-10" />
          </div>
        </div>
        <div className="space-y-mx-md">
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Ação inicial combinada</Typography>
            <Textarea value={action} onChange={e => setAction(e.target.value)} placeholder="Primeira ação prática do PDI" className="min-h-mx-24" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Observações do consultor</Typography>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contexto, riscos ou apoio necessário" className="min-h-mx-24" />
          </div>
        </div>
      </div>
      <Button className="w-full mt-mx-md h-mx-12" variant="primary" onClick={handleSave} loading={isSaving} icon={<Award size={16} />}>SALVAR PDI NO SISTEMA</Button>
    </Card>
  )
}

export function VisitSixExecution({ onGenerateSummary }: { onGenerateSummary: (t: string) => void }) {
  const [plan, setPlan] = useState({
    positioning: '',
    owner: '',
    startDate: '',
    contentPillars: '',
    trafficAction: '',
    notes: ''
  })

  const handleSave = () => {
    if (!plan.positioning || !plan.owner || !plan.startDate) return toast.error('Preencha posicionamento, responsável e prazo de início')
    onGenerateSummary(`--- MARKETING, CONTEÚDO E TRÁFEGO ---\nPosicionamento: ${plan.positioning}\nResponsável: ${plan.owner}\nInício: ${plan.startDate}\nPilares de conteúdo: ${plan.contentPillars || 'A definir'}\nAção de tráfego pago: ${plan.trafficAction || 'A definir'}\nObservações: ${plan.notes || 'Sem observações adicionais.'}`)
    toast.success('Plano de marketing registrado!')
    setPlan({ positioning: '', owner: '', startDate: '', contentPillars: '', trafficAction: '', notes: '' })
  }

  return (
    <Card className="p-mx-lg border bg-white">
      <div className="flex items-center gap-mx-sm mb-mx-md">
        <div className="p-mx-xs bg-emerald-600/10 rounded-xl text-emerald-600"><Presentation size={20} /></div>
        <Typography variant="h3" className="text-lg">Visita 6: Posicionamento de Marketing, Conteúdo e Tráfego Pago</Typography>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg mb-mx-md">
        <div className="space-y-mx-xs">
          <Typography variant="tiny" className="font-bold">Posicionamento da loja</Typography>
          <Textarea value={plan.positioning} onChange={e => setPlan({ ...plan, positioning: e.target.value })} placeholder="Qual mensagem a loja vai sustentar nos canais?" className="min-h-mx-24" />
        </div>
        <div className="space-y-mx-xs">
          <Typography variant="tiny" className="font-bold">Pilares de conteúdo</Typography>
          <Textarea value={plan.contentPillars} onChange={e => setPlan({ ...plan, contentPillars: e.target.value })} placeholder="Ex: oferta, autoridade, bastidores, prova social" className="min-h-mx-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-mx-md mb-mx-md">
        <div className="space-y-mx-xs">
          <Typography variant="tiny" className="font-bold">Responsável</Typography>
          <Input value={plan.owner} onChange={e => setPlan({ ...plan, owner: e.target.value })} className="h-mx-10 font-bold" placeholder="Nome do responsável" />
        </div>
        <div className="space-y-mx-xs">
          <Typography variant="tiny" className="font-bold">Prazo de início</Typography>
          <Input aria-label="Prazo de início" type="date" value={plan.startDate} onChange={e => setPlan({ ...plan, startDate: e.target.value })} className="h-mx-10 font-bold" />
        </div>
        <div className="space-y-mx-xs">
          <Typography variant="tiny" className="font-bold">Ação de tráfego pago</Typography>
          <Input value={plan.trafficAction} onChange={e => setPlan({ ...plan, trafficAction: e.target.value })} className="h-mx-10 font-bold" placeholder="Campanha, verba ou público" />
        </div>
      </div>
      <div className="space-y-mx-xs mb-mx-md">
        <Typography variant="tiny" className="font-bold">Observações e próximos passos</Typography>
        <Textarea value={plan.notes} onChange={e => setPlan({ ...plan, notes: e.target.value })} placeholder="Pendências, materiais necessários ou decisões do proprietário" className="min-h-mx-20" />
      </div>
      <Button className="w-full h-mx-12" variant="primary" onClick={handleSave} icon={<Presentation size={16} />}>REGISTRAR PLANO DE MARKETING</Button>
    </Card>
  )
}

export function VisitSevenExecution({ onGenerateSummary }: { onGenerateSummary: (t: string) => void }) {
  const [review, setReview] = useState({
    results: '',
    positives: '',
    improvements: '',
    clientFeedback: '',
    nextQuarterPlan: '',
    followUpModel: ''
  })

  const save = () => {
    if (!review.results || !review.nextQuarterPlan) return toast.error('Preencha resultado do trimestre e plano dos próximos 3 meses')
    onGenerateSummary(`--- ANÁLISE DE IMPLEMENTAÇÕES E PLANO TRIMESTRAL ---\nResultados do trimestre: ${review.results}\nPontos positivos: ${review.positives || 'A registrar'}\nPontos a melhorar: ${review.improvements || 'A registrar'}\nFeedback do cliente: ${review.clientFeedback || 'A registrar'}\nPlano dos próximos 3 meses: ${review.nextQuarterPlan}\nModelo de acompanhamento: ${review.followUpModel || 'A definir'}`)
    toast.success('Análise trimestral registrada!')
    setReview({ results: '', positives: '', improvements: '', clientFeedback: '', nextQuarterPlan: '', followUpModel: '' })
  }

  return (
    <Card className="p-mx-lg border bg-white">
      <div className="flex items-center gap-mx-sm mb-mx-md">
        <div className="p-mx-xs bg-emerald-600/10 rounded-xl text-emerald-600"><Rocket size={20} /></div>
        <Typography variant="h3" className="text-lg">Visita 7: Análise das Implementações e Plano de Ação Trimestral</Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
        <div className="space-y-mx-md">
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Resultado do trimestre</Typography>
            <Textarea value={review.results} onChange={e => setReview({ ...review, results: e.target.value })} className="min-h-mx-24 text-sm" placeholder="Indicadores, implementações concluídas e impacto observado" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Pontos positivos</Typography>
            <Textarea value={review.positives} onChange={e => setReview({ ...review, positives: e.target.value })} className="min-h-mx-20 text-sm" placeholder="O que evoluiu e deve ser mantido" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Pontos a melhorar</Typography>
            <Textarea value={review.improvements} onChange={e => setReview({ ...review, improvements: e.target.value })} className="min-h-mx-20 text-sm" placeholder="Gargalos, riscos e ajustes necessários" />
          </div>
        </div>

        <div className="space-y-mx-md">
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Feedback do cliente</Typography>
            <Textarea value={review.clientFeedback} onChange={e => setReview({ ...review, clientFeedback: e.target.value })} className="min-h-mx-20 text-sm" placeholder="Percepção do proprietário/gestor sobre o ciclo" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Plano dos próximos 3 meses</Typography>
            <Textarea value={review.nextQuarterPlan} onChange={e => setReview({ ...review, nextQuarterPlan: e.target.value })} className="min-h-mx-24 text-sm" placeholder="Prioridades, responsáveis e prazos do próximo trimestre" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Modelo de acompanhamento / renovação</Typography>
            <Textarea value={review.followUpModel} onChange={e => setReview({ ...review, followUpModel: e.target.value })} className="min-h-mx-20 text-sm" placeholder="Como será acompanhado após a visita 7" />
          </div>
        </div>
      </div>

      <Button className="w-full mt-mx-md h-mx-12" variant="primary" onClick={save} icon={<Target size={16} />}>REGISTRAR ANÁLISE E PLANO TRIMESTRAL</Button>
    </Card>
  )
}

export function VisitEightExecution({ onGenerateSummary }: { onGenerateSummary: (t: string) => void }) {
  const [review, setReview] = useState({
    periodResult: '',
    pendingActions: '',
    positives: '',
    improvements: '',
    nextActions: '',
    nextDate: '',
  })

  const save = () => {
    if (!review.periodResult || !review.nextActions) {
      return toast.error('Preencha resultado do periodo e proximas acoes')
    }

    onGenerateSummary(`--- ACOMPANHAMENTO MENSAL ---\nResultado do periodo: ${review.periodResult}\nPendencias revisadas: ${review.pendingActions || 'A registrar'}\nPontos positivos: ${review.positives || 'A registrar'}\nPontos a melhorar: ${review.improvements || 'A registrar'}\nProximas acoes: ${review.nextActions}\nProxima data: ${review.nextDate || 'A definir'}`)
    toast.success('Acompanhamento mensal registrado!')
    setReview({ periodResult: '', pendingActions: '', positives: '', improvements: '', nextActions: '', nextDate: '' })
  }

  return (
    <Card className="p-mx-lg border bg-white">
      <div className="flex items-center gap-mx-sm mb-mx-md">
        <div className="p-mx-xs bg-emerald-600/10 rounded-xl text-emerald-600"><Clock size={20} /></div>
        <Typography variant="h3" className="text-lg">Acompanhamento Mensal</Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
        <div className="space-y-mx-md">
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Resultado do periodo</Typography>
            <Textarea value={review.periodResult} onChange={e => setReview({ ...review, periodResult: e.target.value })} className="min-h-mx-24 text-sm" placeholder="Indicadores, fatos relevantes e evolucao observada" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Pendencias do plano de acao</Typography>
            <Textarea value={review.pendingActions} onChange={e => setReview({ ...review, pendingActions: e.target.value })} className="min-h-mx-20 text-sm" placeholder="O que ficou pendente, atrasado ou sem dono claro" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Pontos positivos</Typography>
            <Textarea value={review.positives} onChange={e => setReview({ ...review, positives: e.target.value })} className="min-h-mx-20 text-sm" placeholder="O que evoluiu no periodo" />
          </div>
        </div>

        <div className="space-y-mx-md">
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Pontos a melhorar</Typography>
            <Textarea value={review.improvements} onChange={e => setReview({ ...review, improvements: e.target.value })} className="min-h-mx-20 text-sm" placeholder="Gargalos, riscos e ajustes" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Proximas acoes e responsaveis</Typography>
            <Textarea value={review.nextActions} onChange={e => setReview({ ...review, nextActions: e.target.value })} className="min-h-mx-24 text-sm" placeholder="Acoes, responsaveis e prazos" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Proxima data</Typography>
            <Input aria-label="Proxima data" type="date" value={review.nextDate} onChange={e => setReview({ ...review, nextDate: e.target.value })} className="h-mx-10 font-bold" />
          </div>
        </div>
      </div>

      <Button className="w-full mt-mx-md h-mx-12" variant="primary" onClick={save} icon={<Target size={16} />}>REGISTRAR ACOMPANHAMENTO</Button>
    </Card>
  )
}

export function VisitChecklist({ items, onToggle }: { items: Array<{ task: string, completed: boolean }>, onToggle: (i: number) => void }) {
  const toggle = (i: number) => onToggle(i)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-mx-sm">
      {items.map((it, i) => (
        <div
          key={i}
          role="checkbox"
          tabIndex={0}
          aria-checked={it.completed}
          onClick={() => toggle(i)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggle(i)
            }
          }}
          className={cn(
            "p-mx-md rounded-2xl border cursor-pointer transition-all flex items-start gap-mx-sm text-xs font-bold shadow-sm hover:shadow-sm active:scale-95 min-h-mx-16",
            it.completed
              ? "bg-emerald-600/10 text-emerald-600 border-brand-primary/30"
              : "bg-white border-gray-200 text-muted-foreground hover:border-brand-primary/40 hover:bg-gray-50/20"
          )}
        >
          <div className={cn(
            "w-mx-6 h-mx-6 rounded-mx-full flex items-center justify-center border transition-all",
            it.completed ? "bg-emerald-600 border-brand-primary text-white" : "bg-white border-gray-200 text-transparent"
          )}>
            <CheckCircle2 className="w-mx-4 h-mx-4" />
          </div>
          <span className={cn("min-w-0 leading-snug text-left transition-all", it.completed && "opacity-70")}>{it.task}</span>
        </div>
      ))}
    </div>
  )
}
