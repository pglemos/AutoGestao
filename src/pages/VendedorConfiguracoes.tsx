import { Link } from 'react-router-dom'
import { Bell, GraduationCap, HelpCircle, ShieldCheck, UserRound } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { useAuth } from '@/hooks/useAuth'
import { PageCanvas } from '@/design-system/page'

const SETTINGS = [
  {
    title: 'Meu Perfil',
    description: 'Dados profissionais, rotina, objetivos e remuneração.',
    to: '/perfil',
    cta: 'Abrir Meu Perfil',
    icon: UserRound,
  },
  {
    title: 'Notificações',
    description: 'Alertas, comunicados e pendências obrigatórias.',
    to: '/notificacoes',
    cta: 'Ver notificações',
    icon: Bell,
  },
  {
    title: 'Treinamento',
    description: 'Trilhas, aulas, biblioteca e provas.',
    to: '/universidade-mx',
    cta: 'Abrir treinamento',
    icon: GraduationCap,
  },
  {
    title: 'Ajuda',
    description: 'Suporte operacional para rotina, correções e feedback.',
    to: '/ajuda',
    cta: 'Abrir ajuda',
    icon: HelpCircle,
  },
]

export default function VendedorConfiguracoes() {
  const { membership, profile, role } = useAuth()

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-50 no-scrollbar">
      <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-mx-lg">
        <SellerPageHeader
          icon={ShieldCheck}
          title="Configurações"
          subtitle="Preferências e atalhos operacionais do vendedor."
          actions={
            <Badge variant="brand" className="rounded-mx-full px-mx-md py-mx-sm">
              {role || 'Perfil não informado'}
            </Badge>
          }
        />

        <section className="grid items-start grid-cols-1 gap-mx-lg xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit border bg-white p-mx-lg">
            <div className="flex items-start gap-mx-md">
              <span className="grid h-mx-14 w-mx-14 shrink-0 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-600">
                <ShieldCheck size={26} />
              </span>
              <div className="min-w-0">
                <Typography variant="h2" className="text-2xl">
                  {profile?.name || 'Nome não informado'}
                </Typography>
                <Typography variant="p" tone="muted" className="mt-mx-xs">
                  {membership?.store?.name || 'Loja não vinculada'}
                </Typography>
              </div>
            </div>

            <div className="mt-mx-lg rounded-xl border border-gray-200 bg-gray-50 p-mx-md">
              <Typography variant="caption" className="">
                Acesso
              </Typography>
              <Typography variant="p" tone="muted" className="mt-mx-xs">
                Configurações administrativas seguem restritas à liderança da loja e equipe MX.
              </Typography>
            </div>
          </Card>

          <section className="grid grid-cols-1 gap-mx-md md:grid-cols-2" aria-label="Configurações do vendedor">
            {SETTINGS.map((item) => (
              <Card key={item.title} className="border bg-white p-mx-md sm:p-mx-lg">
                <div className="flex h-full flex-col gap-mx-md">
                  <div className="flex items-start gap-mx-md">
                    <span className="grid h-mx-12 w-mx-12 shrink-0 place-items-center rounded-2xl bg-status-success-surface text-mx-green-700">
                      <item.icon size={22} />
                    </span>
                    <div className="min-w-0">
                      <Typography variant="h3" className="">
                        {item.title}
                      </Typography>
                      <Typography variant="p" tone="muted" className="mt-mx-xs">
                        {item.description}
                      </Typography>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="mt-auto min-h-10 justify-center">
                    <Link to={item.to}>{item.cta}</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </section>
        </section>
      </PageCanvas>
    </div>
  )
}
