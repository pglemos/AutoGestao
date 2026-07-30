import { Link } from 'react-router-dom'
import { Bell, CheckSquare, History, LifeBuoy, MessageSquare, Phone, UserRound } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'

export default function VendedorAjuda() {
  return (
    <main className="w-full h-full flex flex-col overflow-y-auto no-scrollbar bg-surface-alt px-mx-sm py-mx-md sm:px-mx-md lg:px-mx-lg">
      <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-4 pb-32">
        <SellerPageHeader icon={LifeBuoy} title="Ajuda" subtitle="Suporte operacional para o vendedor" />

        <section className="grid grid-cols-1 gap-mx-lg lg:grid-cols-3">
        <Card className="border-none bg-white p-mx-lg lg:col-span-2">
          <div className="flex items-start gap-mx-md">
            <div className="w-mx-2xl h-mx-2xl rounded-mx-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <LifeBuoy size={28} />
            </div>
            <div className="space-y-mx-xs">
              <Typography variant="h2" className="tracking-tight">Precisa destravar algo hoje?</Typography>
              <Typography variant="p" tone="muted" className="text-sm">
                Use esta rota para saber onde agir sem procurar no menu. Problemas de número, prazo, correção ou feedback devem seguir um caminho claro antes de acionar o gestor.
              </Typography>
            </div>
          </div>

          <div className="mt-mx-lg grid grid-cols-1 gap-mx-sm sm:grid-cols-2">
            {[
              { title: 'Fechamento Diário', desc: 'Preencher ou revisar produção D-1 e Central de Execução de hoje.', icon: CheckSquare, to: '/vendedor/terminal-mx' },
              { title: 'Corrigir um dia', desc: 'Ajustar um lançamento anterior com motivo.', icon: History, to: '/vendedor/terminal-mx' },
              { title: 'Alertas pendentes', desc: 'Ver cobranças, feedback e avisos obrigatórios.', icon: Bell, to: '/notificacoes' },
              { title: 'Feedback', desc: 'Confirmar ciência e ver próximos passos do gestor.', icon: MessageSquare, to: '/devolutivas' },
            ].map(item => (
              <Button key={item.title} asChild variant="outline" className="h-auto justify-start bg-white p-mx-md text-left">
                <Link to={item.to}>
                  <item.icon size={18} className="mr-mx-sm shrink-0 text-brand-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm font-black uppercase tracking-tight text-text-primary">{item.title}</span>
                    <span className="block text-xs font-bold normal-case tracking-normal text-text-tertiary">{item.desc}</span>
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </Card>

        <Card className="border-none bg-white p-mx-lg">
          <div className="space-y-mx-md">
            <Badge variant="brand" className="rounded-mx-full px-4 py-1">Escala de suporte</Badge>
            <div className="space-y-mx-sm">
              <div className="flex items-start gap-mx-sm rounded-mx-xl border border-border-default bg-surface-alt p-mx-md">
                <UserRound size={18} className="mt-0.5 text-brand-primary" />
                <div>
                  <Typography variant="caption" className="tracking-tight">1. Gerente da unidade</Typography>
                  <Typography variant="p" tone="muted" className="text-xs">Correção de lançamento, dúvida de meta ou devolutiva.</Typography>
                </div>
              </div>
              <div className="flex items-start gap-mx-sm rounded-mx-xl border border-border-default bg-surface-alt p-mx-md">
                <Phone size={18} className="mt-0.5 text-brand-primary" />
                <div>
                  <Typography variant="caption" className="tracking-tight">2. Admin MX</Typography>
                  <Typography variant="p" tone="muted" className="text-xs">Acesso, produto digital, configuração de perfil ou erro técnico persistente.</Typography>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  </main>
)
}
