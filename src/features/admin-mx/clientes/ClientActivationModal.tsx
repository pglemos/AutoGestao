import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { readinessSummary, type ReadinessCheck } from './clientReadiness'

export function ClientActivationModal(props: {
  open: boolean
  clientName: string
  checks: ReadinessCheck[]
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  const summary = readinessSummary(props.checks)

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Validar e ativar — ${props.clientName}`}
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={props.onSubmit} disabled={props.submitting || !summary.canActivate}>
            {props.submitting ? 'Ativando...' : 'Ativar cliente'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {summary.canActivate
          ? <MxStatusBanner tone="success">{`Checklist completo em ${summary.completed} de ${summary.total} itens. O cliente pode ser ativado.`}</MxStatusBanner>
          : <MxStatusBanner tone="warning">{`Ativação bloqueada: ${summary.blockers.length} item(ns) impeditivo(s).`}</MxStatusBanner>}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Checklist de prontidão</h3>
          <ul className="space-y-2">
            {props.checks.filter(check => check.severity === 'impeditivo').map(check => (
              <li key={check.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div>
                  <div className="font-medium text-foreground">{check.label}</div>
                  <div className="text-xs text-muted-foreground">{check.detail}</div>
                </div>
                <span className={check.ok ? 'text-xs font-semibold text-status-success-text' : 'text-xs font-semibold text-status-error-text'}>
                  {check.ok ? 'OK' : 'Pendente'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Informações não impeditivas</h3>
          <ul className="space-y-2">
            {props.checks.filter(check => check.severity === 'informativo').map(check => (
              <li key={check.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div>
                  <div className="font-medium text-foreground">{check.label}</div>
                  <div className="text-xs text-muted-foreground">{check.detail}</div>
                </div>
                <span className="text-xs text-muted-foreground">{check.ok ? 'OK' : 'Faltando'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  )
}
