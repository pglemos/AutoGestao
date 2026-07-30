import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { EMAIL_PATTERN, splitRecipients } from '../data/store-settings'

type RecipientPreviewProps = { value: string }

/**
 * Lista preview de destinatários de relatório (matinal/semanal/mensal),
 * validando cada e-mail individualmente.
 * Extraído de DashboardLoja.tsx (Story 2.5).
 */
export function RecipientPreview({ value }: RecipientPreviewProps) {
  const recipients = splitRecipients(value)
  if (!recipients.length) {
    return (
      <Typography variant="tiny" tone="muted" className="block normal-case tracking-normal">
        Nenhum destinatário configurado.
      </Typography>
    )
  }

  return (
    <div className="flex flex-wrap gap-mx-xs">
      {recipients.map(recipient => {
        const valid = EMAIL_PATTERN.test(recipient)
        return (
          <span
            key={recipient}
            className={cn(
              'rounded-mx-full border px-mx-xs py-mx-tiny text-mx-micro font-bold',
              valid
                ? 'border-status-success/20 bg-status-success-surface text-status-success'
                : 'border-status-error/20 bg-status-error-surface text-status-error'
            )}
          >
            {recipient}
          </span>
        )
      })}
    </div>
  )
}

export default RecipientPreview
