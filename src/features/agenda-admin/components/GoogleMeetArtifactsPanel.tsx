import { Clipboard, FileText, ScrollText } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import type { GoogleMeetArtifact } from '@/hooks/agenda'

type GoogleMeetArtifactsPanelProps = {
  artifact?: GoogleMeetArtifact | null
  hasMeetLink?: boolean
}

function statusLabel(status?: GoogleMeetArtifact['status']) {
  switch (status) {
    case 'processed':
      return { label: 'Ata gerada', variant: 'success' as const }
    case 'transcript_not_ready':
      return { label: 'Transcrição em processamento', variant: 'warning' as const }
    case 'no_transcript':
      return { label: 'Sem transcrição oficial', variant: 'warning' as const }
    case 'failed':
      return { label: 'Falha na ata', variant: 'danger' as const }
    case 'pending':
      return { label: 'Ata pendente', variant: 'outline' as const }
    case 'no_conference_record':
      return { label: 'Reunião não localizada', variant: 'warning' as const }
    default:
      return { label: 'Ata não processada', variant: 'outline' as const }
  }
}

function textStats(value?: string | null) {
  const text = value?.trim() || ''
  if (!text) return '0 caracteres'
  return `${text.length.toLocaleString('pt-BR')} caracteres`
}

async function copyText(label: string, value?: string | null) {
  const text = value?.trim()
  if (!text) {
    toast.error(`${label} ainda não está disponível.`)
    return
  }
  await navigator.clipboard.writeText(text)
  toast.success(`${label} copiada.`)
}

export function GoogleMeetArtifactsPanel({ artifact, hasMeetLink }: GoogleMeetArtifactsPanelProps) {
  if (!artifact && !hasMeetLink) return null

  const status = statusLabel(artifact?.status)
  const ataText = artifact?.ata_text?.trim() || ''
  const transcriptText = artifact?.transcript_text?.trim() || ''
  const processedAt = artifact?.processed_at
    ? new Date(artifact.processed_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : null

  return (
    <div className="mt-mx-sm rounded-xl border border-gray-200 bg-gray-50/60 p-mx-sm">
      <div className="flex flex-wrap items-center justify-between gap-mx-xs">
        <div className="flex flex-wrap items-center gap-mx-xs">
          <Badge variant={status.variant} className="text-mx-nano">{status.label}</Badge>
          {artifact?.meeting_code && (
            <Typography variant="tiny" tone="muted" className="font-mono">{artifact.meeting_code}</Typography>
          )}
          {processedAt && (
            <Typography variant="tiny" tone="muted">Processado em {processedAt}</Typography>
          )}
        </div>
        {artifact?.error_message && (
          <Typography variant="tiny" tone="error" className="font-bold">{artifact.error_message}</Typography>
        )}
      </div>

      {artifact?.status === 'processed' && (
        <div className="mt-mx-sm space-y-mx-xs">
          <details className="rounded-xl border border-gray-200 bg-white p-mx-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-mx-sm">
              <span className="flex items-center gap-mx-xs">
                <FileText size={14} className="text-emerald-600" />
                <Typography variant="tiny" className="">Ata da reunião</Typography>
              </span>
              <span className="text-mx-nano font-bold uppercase tracking-widest text-muted-foreground">{textStats(ataText)}</span>
            </summary>
            <div className="mt-mx-sm flex justify-end">
              <Button type="button" variant="ghost" size="xs" onClick={() => copyText('Ata', ataText)}>
                <Clipboard size={12} /> Copiar ata
              </Button>
            </div>
            <pre className="mt-mx-xs max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-mx-sm text-mx-xs leading-relaxed text-foreground">
              {ataText || 'Ata ainda não disponível.'}
            </pre>
          </details>

          <details className="rounded-xl border border-gray-200 bg-white p-mx-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-mx-sm">
              <span className="flex items-center gap-mx-xs">
                <ScrollText size={14} className="text-emerald-600" />
                <Typography variant="tiny" className="">Transcrição oficial</Typography>
              </span>
              <span className="text-mx-nano font-bold uppercase tracking-widest text-muted-foreground">{textStats(transcriptText)}</span>
            </summary>
            <div className="mt-mx-sm flex justify-end">
              <Button type="button" variant="ghost" size="xs" onClick={() => copyText('Transcrição', transcriptText)}>
                <Clipboard size={12} /> Copiar transcrição
              </Button>
            </div>
            <pre className="mt-mx-xs max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-mx-sm text-mx-xs leading-relaxed text-foreground">
              {transcriptText || 'Transcrição ainda não disponível.'}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
