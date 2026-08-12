import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { OwnerPerformanceAlert } from './PerformanceAlerts'

type OwnerDecisionCardsProps = {
  alerts: OwnerPerformanceAlert[]
  hasDRE: boolean
}

/**
 * 3 cards de decisão exclusivos do perfil Dono (resumo do que decide, acompanha e
 * status financeiro). Extraído de DashboardLoja.tsx (Story 2.5).
 */
export function OwnerDecisionCards({ alerts, hasDRE }: OwnerDecisionCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-mx-md xl:grid-cols-3">
      <Card className="border border-status-warning/20 bg-status-warning-surface p-mx-lg">
        <Typography variant="tiny" className="text-status-warning-text">O que eu decido hoje</Typography>
        <Typography variant="h3" className="mt-mx-xs text-status-warning-text">
          {alerts[0]?.title || 'Sem decisão crítica'}
        </Typography>
        <Typography variant="p" className="mt-mx-xs text-sm text-status-warning-text">
          {alerts[0]?.recommendation || 'Manter a cadência e observar oportunidades.'}
        </Typography>
        <Typography variant="p" className="mt-mx-xs text-sm text-status-warning-text">
          {alerts[0]?.action || 'Acompanhe a execução e mantenha a cadência de gestão.'}
        </Typography>
      </Card>
      <Card className="border bg-white p-mx-lg">
        <Typography variant="tiny" className="">O que eu acompanho</Typography>
        <Typography variant="h3" className="mt-mx-xs">Execução do gerente</Typography>
        <Typography variant="p" tone="muted" className="mt-mx-xs text-sm">
          Disciplina diária, funil comercial e atingimento de meta ficam separados das ações operacionais.
        </Typography>
      </Card>
      <Card className="border bg-white p-mx-lg">
        <Typography variant="tiny" className="">Financeiro</Typography>
        <Typography variant="h3" className="mt-mx-xs">{hasDRE ? 'DRE disponível' : 'DRE pendente'}</Typography>
        <Typography variant="p" tone="muted" className="mt-mx-xs text-sm">
          {hasDRE
            ? 'Use o resultado líquido como contexto da decisão comercial.'
            : 'Solicite ao Admin MX o cadastro do DRE para conectar performance e margem.'}
        </Typography>
      </Card>
    </section>
  )
}

export default OwnerDecisionCards
