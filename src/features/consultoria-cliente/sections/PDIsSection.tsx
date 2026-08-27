import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, FileText, Target } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { usePDISessions } from '@/hooks/usePDI_MX'
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
  const navigate = useNavigate()
  // `pdi_sessoes` é onde o PDI vive: o que o gestor conduz, imprime e assina.
  // A tabela `pdis` que esta aba lia está vazia em produção — o consultor
  // abria "Plano de Carreira" e via sempre "nenhum PDI registrado", mesmo com
  // planos ativos na loja.
  const { pdis, loading } = usePDISessions(storeId)
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

          <div className="p-mx-md bg-surface-alt/30 rounded-2xl flex items-center gap-mx-sm mb-mx-md">
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
            <Button variant="outline" size="sm" onClick={() => void handleEvidenceAction('download', attachment)} icon={<Download />}>
              Baixar
            </Button>
          </div>
        </Card>
      ))}
      {pdis.map((pdi) => (
        <Card key={pdi.id} className="p-mx-lg bg-white border hover:border-brand-primary/30 transition-all group">
          <div className="flex justify-between items-start mb-mx-md">
            <div className="min-w-0">
              <Typography variant="h3" className="text-lg group-hover:text-status-success-text transition-colors truncate">
                {pdi.seller_name || 'Nome não informado'}
              </Typography>
              <Typography variant="tiny" tone="muted">
                Plano criado em {format(new Date(pdi.created_at), 'dd/MM/yyyy')}
              </Typography>
            </div>
            <Badge variant={pdi.status === 'concluido' ? 'success' : 'outline'}>{(pdi.status || '').toUpperCase()}</Badge>
          </div>

          <div className="space-y-mx-md mb-mx-md">
            <div className="p-mx-md bg-surface-alt/30 rounded-2xl">
              <Typography variant="tiny" className="font-bold mb-1 block">Objetivo 6 Meses</Typography>
              <Typography variant="p" className="text-sm font-bold italic">"{pdi.meta_6m || 'A definir'}"</Typography>
            </div>
            <div className="grid grid-cols-2 gap-mx-md">
              <div>
                <Typography variant="tiny" className="font-bold">Meta 12 Meses</Typography>
                <Typography variant="p" className="text-xs">{pdi.meta_12m || '-'}</Typography>
              </div>
              <div>
                <Typography variant="tiny" className="font-bold">Meta 24 Meses</Typography>
                <Typography variant="p" className="text-xs">{pdi.meta_24m || '-'}</Typography>
              </div>
            </div>
          </div>

          {/* As assinaturas do PDI são feitas no documento impresso — a sessão
              não guarda aceite digital, então o caminho honesto é abrir o
              documento em vez de exibir um botão que não assina nada. */}
          <div className="pt-mx-md border-t border-border-subtle">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/pdi/${pdi.id}/print`)}
              icon={<Target />}
            >
              Abrir documento do PDI
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default PDIsSection
