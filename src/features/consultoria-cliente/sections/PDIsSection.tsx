import { format } from 'date-fns'
import { Download, Eye, FileText, ShieldCheck } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { usePDIs } from '@/hooks/useData'
import { downloadEvidenceAttachment, openEvidenceAttachment } from '@/lib/consultoria/evidence-attachments'
import type { ConsultingVisit, ConsultingVisitAttachment } from '@/features/consultoria/types'

type VisitPdiAttachment = ConsultingVisitAttachment & { visitNumber: number }

type Props = {
  storeId: string
  visits?: ConsultingVisit[]
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isPdiEvidence(file: ConsultingVisitAttachment) {
  return file.filename.toLowerCase().includes('pdi') || file.content_type?.includes('pdf')
}

async function handleEvidenceAction(action: 'open' | 'download', file: ConsultingVisitAttachment) {
  try {
    if (action === 'open') await openEvidenceAttachment(file)
    else await downloadEvidenceAttachment(file)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível acessar o anexo.')
  }
}

export function PDIsSection({ storeId, visits = [] }: Props) {
  const { profile, role } = useAuth()
  const { pdis, loading, acknowledge } = usePDIs(storeId)
  const visitPdiAttachments: VisitPdiAttachment[] = visits
    .filter((visit) => visit.visit_number === 5)
    .flatMap((visit) => (visit.attachments || [])
      .filter(isPdiEvidence)
      .map((attachment) => ({ ...attachment, visitNumber: visit.visit_number })))

  if (loading) return <div className="p-mx-lg opacity-50">Carregando planos de carreira...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg animate-in fade-in slide-in-from-bottom-4 duration-500 pb-mx-xl">
      {pdis.length === 0 && visitPdiAttachments.length === 0 && (
        <Card className="p-mx-lg border-dashed text-center opacity-50 md:col-span-2">
          <Typography variant="p">Nenhum PDI registrado para esta loja.</Typography>
        </Card>
      )}
      {visitPdiAttachments.map((attachment) => (
        <Card key={`visit-pdi-${attachment.id}`} className="p-mx-lg bg-white border">
          <div className="flex justify-between items-start gap-mx-md mb-mx-md">
            <div className="min-w-0">
              <Typography variant="h3" className="text-lg truncate">{attachment.filename}</Typography>
              <Typography variant="tiny" tone="muted">PDI anexado na visita {attachment.visitNumber} em {format(new Date(attachment.uploaded_at), 'dd/MM/yyyy')}</Typography>
            </div>
            <Badge variant="brand">ANEXO</Badge>
          </div>

          <div className="p-mx-md bg-gray-50/30 rounded-2xl flex items-center gap-mx-sm mb-mx-md">
            <FileText className="w-mx-5 h-mx-5 text-status-success-text shrink-0" />
            <div className="min-w-0">
              <Typography variant="p" className="text-sm font-bold truncate">{attachment.filename}</Typography>
              <Typography variant="tiny" tone="muted">{formatFileSize(attachment.size_bytes)}</Typography>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-mx-sm">
            <Button variant="outline" size="sm" onClick={() => void handleEvidenceAction('open', attachment)} icon={<Eye />}>
              Visualizar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void handleEvidenceAction('download', attachment)} icon={<Download />}>
              Baixar
            </Button>
          </div>
        </Card>
      ))}
      {pdis.map((pdi) => {
        const canSellerSign = profile?.id === pdi.seller_id && !pdi.seller_acknowledged_at
        const canManagerSign = (isPerfilInternoMx(role) || role === 'gerente') && !pdi.manager_acknowledged_at

        return (
          <Card key={pdi.id} className="p-mx-lg bg-white border hover:border-brand-primary/30 transition-all group">
            <div className="flex justify-between items-start mb-mx-md">
              <div>
                <Typography variant="h3" className="text-lg group-hover:text-status-success-text transition-colors">{pdi.seller_name || 'Nome não informado'}</Typography>
                <Typography variant="tiny" tone="muted">Plano criado em {format(new Date(pdi.created_at), 'dd/MM/yyyy')}</Typography>
              </div>
              <Badge variant={pdi.status === 'ativo' ? 'success' : 'outline'}>{pdi.status.toUpperCase()}</Badge>
            </div>

            <div className="space-y-mx-md mb-mx-md">
              <div className="p-mx-md bg-gray-50/30 rounded-2xl">
                <Typography variant="tiny" className="font-bold mb-1 block">Objetivo 6 Meses</Typography>
                <Typography variant="p" className="text-sm font-bold italic">"{pdi.meta_6m}"</Typography>
              </div>
              <div className="grid grid-cols-2 gap-mx-md">
                <div>
                  <Typography variant="tiny" className="font-bold">Meta 1 Ano</Typography>
                  <Typography variant="p" className="text-xs">{pdi.meta_12m || '-'}</Typography>
                </div>
                <div>
                  <Typography variant="tiny" className="font-bold">Meta 2 Anos</Typography>
                  <Typography variant="p" className="text-xs">{pdi.meta_24m || '-'}</Typography>
                </div>
              </div>
            </div>

            <div className="pt-mx-md border-t border-border-subtle grid grid-cols-2 gap-mx-md">
              <div className="space-y-mx-xs">
                {pdi.seller_acknowledged_at ? (
                  <div className="flex items-center gap-mx-xs text-status-success">
                    <ShieldCheck className="w-mx-4 h-mx-4" />
                    <Typography variant="tiny" className="text-mx-micro">Vendedor OK</Typography>
                  </div>
                ) : canSellerSign ? (
                  <Button variant="primary" size="sm" className="w-full text-mx-micro" onClick={() => acknowledge(pdi.id, 'seller')}>ASSINAR VENDEDOR</Button>
                ) : (
                  <Typography variant="tiny" className="font-bold text-mx-micro opacity-30">Pendente Vendedor</Typography>
                )}
              </div>

              <div className="space-y-mx-xs">
                {pdi.manager_acknowledged_at ? (
                  <div className="flex items-center gap-mx-xs text-status-success">
                    <ShieldCheck className="w-mx-4 h-mx-4" />
                    <Typography variant="tiny" className="text-mx-micro">Gestor OK</Typography>
                  </div>
                ) : canManagerSign ? (
                  <Button variant="outline" size="sm" className="w-full text-mx-micro border-brand-primary" onClick={() => acknowledge(pdi.id, 'manager')}>ASSINAR GESTOR</Button>
                ) : (
                  <Typography variant="tiny" className="font-bold text-mx-micro opacity-30">Pendente Gestor</Typography>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default PDIsSection
