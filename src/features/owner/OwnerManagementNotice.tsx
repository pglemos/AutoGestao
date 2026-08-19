import { AlertTriangle, BriefcaseBusiness, ChevronRight, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStoreManagementContext } from '@/hooks/useStoreManagementContext'

type OwnerManagementNoticeProps = {
  storeId?: string | null
  managerEmail?: string | null
}

export function OwnerManagementNotice({ storeId, managerEmail }: OwnerManagementNoticeProps) {
  const management = useStoreManagementContext({
    storeId,
    declaredManagerEmail: managerEmail,
  })

  if (management.loading) return null

  if (management.queryFailed) {
    return (
      <section role="status" className="flex flex-col gap-3 rounded-2xl border border-status-warning/30 bg-status-warning-surface p-mx-md text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-mx-sm">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold">Estrutura gerencial não confirmada</p>
            <p className="mt-0.5 text-sm">O sistema manteve o acesso em acompanhamento para não ampliar permissões sem validação.</p>
          </div>
        </div>
        <Link
          to="/minha-equipe"
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-status-warning/40 bg-white px-3 py-1.5 text-xs font-semibold text-status-warning-text shadow-xs hover:bg-status-warning-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning/40 sm:self-auto"
        >
          <Users size={14} /> Ver equipe e acessos <ChevronRight size={14} />
        </Link>
      </section>
    )
  }

  if (management.hasActiveManager) {
    return (
      <section role="status" className="flex items-start gap-mx-sm rounded-2xl border border-status-success/30 bg-status-success-surface p-mx-md text-status-success-text">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">Gerente ativo identificado</p>
          <p className="mt-0.5 text-sm">Você acompanha a gestão comercial como dono e pode intervir quando necessário.</p>
        </div>
      </section>
    )
  }

  return (
    <section role="status" className="flex flex-col gap-3 rounded-2xl border border-status-warning/30 bg-status-warning-surface p-mx-md text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-mx-sm">
        <BriefcaseBusiness size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">Você responde pela gestão comercial desta loja</p>
          <p className="mt-0.5 text-sm">
            {management.managerRegistrationPending
              ? 'O cadastro do gerente está pendente. Até o vínculo ser ativado, as rotinas gerenciais continuam sob sua responsabilidade.'
              : 'Não existe gerente ativo cadastrado. As rotinas gerenciais e o acompanhamento da equipe ficam disponíveis no seu menu.'}
          </p>
        </div>
      </div>
      <Link
        to="/minha-equipe"
        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-status-warning/40 bg-white px-3 py-1.5 text-xs font-semibold text-status-warning-text shadow-xs hover:bg-status-warning-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning/40 sm:self-auto"
      >
        <Users size={14} /> Gerenciar equipe <ChevronRight size={14} />
      </Link>
    </section>
  )
}
