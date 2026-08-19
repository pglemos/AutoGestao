import React from 'react'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { Input } from '@/components/atoms/Input'
import { Users } from 'lucide-react'

interface Props {
  data: {
    meta_mensal: string
    projecao: string
    leads_mes: string
    estoque_disponivel: string
    consultant_name: string
    visit_date: string
    tempo: string
    alvo: string
  }
  onChange: (updates: Partial<Props['data']>) => void
  clientName: string
}

export function VisitHeaderBase({ data, onChange, clientName }: Props) {
  return (
    <Card className="p-mx-lg bg-white border relative overflow-hidden group">
      <div className="absolute top-mx-0 right-mx-0 p-mx-lg opacity-5 group-hover:opacity-10 transition-opacity">
        <Users className="w-mx-20 h-mx-20 text-status-success-text" />
      </div>

      <div className="relative z-[var(--mx-z-sticky)] min-w-0">
        <div className="flex min-w-0 flex-col lg:flex-row lg:items-start justify-between gap-mx-md mb-mx-lg border-b border-border-subtle pb-mx-md">
          <div className="min-w-0">
            <Typography variant="tiny" tone="muted" className="mb-0 block opacity-60">Identificação do Cliente</Typography>
            <Typography variant="h1" className="text-2xl sm:text-3xl lg:text-4xl leading-tight break-words">
              {clientName}
            </Typography>
          </div>
          <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-mx-md w-full lg:w-auto">
            <div className="space-y-mx-xs">
              <Typography variant="tiny" tone="muted" className="font-bold">Consultor</Typography>
              <Input aria-label="Consultor" id="header-consultant" name="header-consultant" value={data.consultant_name} onChange={e => onChange({ consultant_name: e.target.value })} className="h-mx-10 bg-surface-alt/50 border border-border-subtle focus:bg-white focus:border-brand-primary font-bold transition-all shadow-sm" />
            </div>
            <div className="space-y-mx-xs">
              <Typography variant="tiny" tone="muted" className="font-bold">Data</Typography>
              <Input aria-label="Data" id="header-date" name="header-date" type="date" value={data.visit_date} onChange={e => onChange({ visit_date: e.target.value })} className="h-mx-10 bg-surface-alt/50 border border-border-subtle focus:bg-white focus:border-brand-primary font-bold transition-all shadow-sm" />
            </div>
            <div className="space-y-mx-xs">
              <Typography variant="tiny" tone="muted" className="font-bold">Tempo</Typography>
              <Input aria-label="Tempo" id="header-time" name="header-time" value={data.tempo} onChange={e => onChange({ tempo: e.target.value })} className="h-mx-10 bg-surface-alt/50 border border-border-subtle focus:bg-white focus:border-brand-primary font-bold transition-all shadow-sm" />
            </div>
            <div className="space-y-mx-xs">
              <Typography variant="tiny" tone="muted" className="font-bold">Alvo</Typography>
              <Input aria-label="Alvo" id="header-target" name="header-target" value={data.alvo} onChange={e => onChange({ alvo: e.target.value })} className="h-mx-10 bg-surface-alt/50 border border-border-subtle focus:bg-white focus:border-brand-primary font-bold transition-all shadow-sm" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-mx-md">
          <div className="space-y-mx-xs p-mx-md bg-brand-primary/5 rounded-2xl border border-brand-primary/10 shadow-sm">
            <Typography variant="tiny" className="text-mx-tiny">Meta Mensal</Typography>
            <Input id="header-meta" name="header-meta" value={data.meta_mensal} onChange={e => onChange({ meta_mensal: e.target.value })} placeholder="Ex: 25" className="bg-transparent border-none p-mx-0 text-2xl font-bold text-status-success-text focus-visible:ring-0 placeholder:text-status-success-text/10" />
          </div>
          <div className="space-y-mx-xs p-mx-md bg-gray-900/5 rounded-2xl border border-brand-secondary/10 shadow-sm">
            <Typography variant="tiny" className="text-brand-secondary text-mx-tiny">Projeção</Typography>
            <Input aria-label="Projeção" id="header-projection" name="header-projection" value={data.projecao} onChange={e => onChange({ projecao: e.target.value })} className="bg-transparent border-none p-mx-0 text-2xl font-bold text-brand-secondary focus-visible:ring-0" />
          </div>
          <div className="space-y-mx-xs p-mx-md bg-surface-alt rounded-2xl border border-border shadow-sm">
            <Typography variant="tiny" className="text-mx-tiny">Leads (Mês)</Typography>
            <Input aria-label="Leads (Mês)" id="header-leads" name="header-leads" value={data.leads_mes} onChange={e => onChange({ leads_mes: e.target.value })} className="bg-transparent border-none p-mx-0 text-2xl font-bold text-foreground focus-visible:ring-0" />
          </div>
          <div className="space-y-mx-xs p-mx-md bg-surface-alt rounded-2xl border border-border shadow-sm">
            <Typography variant="tiny" className="text-mx-tiny">Estoque</Typography>
            <Input aria-label="Estoque" id="header-stock" name="header-stock" value={data.estoque_disponivel} onChange={e => onChange({ estoque_disponivel: e.target.value })} className="bg-transparent border-none p-mx-0 text-2xl font-bold text-foreground focus-visible:ring-0" />
          </div>
        </div>
      </div>
    </Card>
  )
}
