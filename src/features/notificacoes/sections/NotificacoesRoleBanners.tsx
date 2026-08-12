import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'

type Props = {
  isOwner: boolean
}

export function NotificacoesRoleBanners({ isOwner }: Props) {
  return (
    isOwner ? (
      <Card className="border border-status-info/20 bg-status-info-surface p-mx-md">
        <Typography variant="h3" className="tracking-tight text-status-info-text">
          Notificações filtradas para Dono
        </Typography>
        <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
          Você recebe sinais de decisão, aprovações que exigem ciência e alertas de governança da rede. Ações técnicas de pré-cadastro, permissões e operação diária ficam com Admin MX ou gerente.
        </Typography>
      </Card>
    ) : null
  )
}

export default NotificacoesRoleBanners
