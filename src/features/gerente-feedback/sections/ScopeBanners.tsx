import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'

export function ManagerScopeBanner() {
  return (
    <Card className="border border-status-info/20 bg-status-info-surface p-mx-lg">
      <Typography variant="h3" className="tracking-tight text-status-info-text">
        Escopo do gerente
      </Typography>
      <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
        Aqui você executa devolutivas da sua unidade. Admin MX vê governança multi-loja e Dono
        acompanha consistência, mas a criação semanal operacional fica com o gerente.
      </Typography>
    </Card>
  )
}

export function OwnerScopeBanner() {
  return (
    <Card className="border border-status-info/20 bg-status-info-surface p-mx-lg">
      <Typography variant="h3" className="tracking-tight text-status-info-text">
        Devolutivas como governança
      </Typography>
      <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
        Esta rota mostra evidências de feedback individual e relatórios semanais. O Dono acompanha
        consistência e cobra cadência; criação e execução das devolutivas ficam com gerente/Admin
        MX.
      </Typography>
    </Card>
  )
}
