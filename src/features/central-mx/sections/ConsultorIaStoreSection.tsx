import type { ReactNode } from 'react'
import { Bell, Bot, CheckCircle2, ChevronRight } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import { ConsultorIaChat } from './ConsultorIaChat'

type ConsultorIaTone = 'brand' | 'info' | 'success'

const toneClasses: Record<ConsultorIaTone, string> = {
  brand: 'bg-mx-indigo-50 text-brand-primary border border-mx-indigo-100',
  info: 'bg-status-info-surface text-status-info border border-status-info/20',
  success: 'bg-status-success-surface text-status-success border border-status-success/20',
}

type ConsultorIaStoreSectionProps = {
  storeId: string | null | undefined
}

export function ConsultorIaStoreSection({ storeId }: ConsultorIaStoreSectionProps) {
  return (
    <>
      <ConsultorIaModuleGrid
        title="Consultor IA"
        subtitle="Leitura consultiva baseada em regras, contexto e prioridades."
        items={[
          { title: 'Perguntar ao Consultor MX', detail: 'Use alertas e indicadores como contexto.', icon: <Bot size={20} />, tone: 'brand' },
          { title: 'Orientações registradas', detail: 'Histórico consultivo da unidade.', icon: <Bell size={20} />, tone: 'info' },
          { title: 'Recomendações de ação', detail: 'Sugestões ligadas ao plano de ação.', icon: <CheckCircle2 size={20} />, tone: 'success' },
        ]}
      />
      <ConsultorIaChat storeId={storeId} />
    </>
  )
}

function ConsultorIaModuleGrid({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: Array<{ title: string; detail: string; icon: ReactNode; tone: ConsultorIaTone }>
}) {
  return (
    <div className="space-y-mx-md">
      <div>
        <Typography variant="h2" className="text-2xl md:text-3xl">
          {title}
        </Typography>
        <Typography variant="p" tone="muted" className="mt-1 font-bold">
          {subtitle}
        </Typography>
      </div>
      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="min-h-[180px] p-mx-lg">
            <div className={cn('h-mx-12 w-mx-12 rounded-mx-xl flex items-center justify-center shadow-mx-sm', toneClasses[item.tone])}>
              {item.icon}
            </div>
            <Typography variant="h3" className="mt-mx-md text-lg">
              {item.title}
            </Typography>
            <Typography variant="p" tone="muted" className="mt-mx-xs text-sm font-bold">
              {item.detail}
            </Typography>
            <div className="mt-mx-md flex items-center gap-mx-xs text-brand-primary">
              <Typography variant="tiny" className="">
                Abrir
              </Typography>
              <ChevronRight size={16} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default ConsultorIaStoreSection
