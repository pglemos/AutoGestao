import { useRef, type ChangeEvent } from 'react'
import { Download, Eye, FileUp, FolderOpen, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { isAdministradorMx, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useConsultingDriveFiles, type ConsultingDriveFile } from '@/hooks/useConsultingDriveFiles'
import { downloadEvidenceAttachment, openEvidenceAttachment } from '@/lib/consultoria/evidence-attachments'
import type { ConsultingVisit, ConsultingVisitAttachment } from '@/features/consultoria/types'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

type VisitEvidenceFile = ConsultingVisitAttachment & { visitNumber: number; visitStatus: string }

function formatBytes(value?: string | number) {
  const bytes = Number(value || 0)
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function getKind(file: ConsultingDriveFile) {
  const mime = file.mimeType || ''
  if (mime.includes('pdf')) return 'PDF'
  if (mime.startsWith('image/')) return 'Imagem'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'Planilha'
  if (mime.includes('document') || mime.includes('word')) return 'Documento'
  return 'Arquivo'
}

async function handleEvidenceAction(action: 'open' | 'download', file: ConsultingVisitAttachment) {
  try {
    if (action === 'open') await openEvidenceAttachment(file)
    else await downloadEvidenceAttachment(file)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível acessar o anexo.')
  }
}

export function ConsultingDriveFilesView({ clientId, visits = [] }: { clientId: string; visits?: ConsultingVisit[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { role } = useAuth()
  const canUseFiles = isPerfilInternoMx(role)
  const canReconnect = isAdministradorMx(role)
  const { connectCentral } = useGoogleCalendar({ autoFetch: false })
  const {
    folderUrl,
    files,
    loading,
    uploading,
    error,
    needsReconnect,
    listFiles,
    uploadFiles,
    deleteFile,
  } = useConsultingDriveFiles(canUseFiles ? clientId : null)
  const visitEvidenceFiles: VisitEvidenceFile[] = visits.flatMap((visit) => (visit.attachments || []).map((attachment) => ({
    ...attachment,
    visitNumber: visit.visit_number,
    visitStatus: visit.status,
  })))
  const totalFiles = files.length + visitEvidenceFiles.length

  const handleSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (selected.length === 0) return

    const oversized = selected.find(file => file.size > MAX_FILE_SIZE_BYTES)
    if (oversized) {
      toast.error(`${oversized.name} excede o limite de 25 MB`)
      return
    }

    const result = await uploadFiles(selected)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(`${selected.length} ${selected.length === 1 ? 'arquivo enviado' : 'arquivos enviados'}.`)
  }

  if (!canUseFiles) {
    return (
      <Card className="p-mx-xl border-dashed text-center">
        <Typography variant="h3" className="">Acesso restrito</Typography>
      </Card>
    )
  }

  return (
    <section className="space-y-mx-lg animate-in fade-in slide-in-from-bottom-4 duration-500 pb-mx-xl">
      <Card className="p-mx-lg bg-white border">
        <div className="flex flex-col gap-mx-md lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-mx-md min-w-0">
            <div className="h-mx-12 w-mx-12 rounded-2xl bg-brand-primary/10 text-status-success-text flex items-center justify-center shrink-0">
              <FolderOpen className="h-mx-6 w-mx-6" />
            </div>
            <div className="min-w-0">
              <Typography variant="h3" className="">Arquivos</Typography>
              <Typography variant="tiny" tone="muted" className="">
                {totalFiles} {totalFiles === 1 ? 'item' : 'itens'}
              </Typography>
            </div>
          </div>

          <div className="flex flex-wrap gap-mx-xs">
            <Button variant="outline" size="sm" onClick={() => listFiles()} loading={loading} icon={<RefreshCw />}>
              Atualizar
            </Button>
            {folderUrl && (
              <Button variant="outline" size="sm" onClick={() => window.open(folderUrl, '_blank', 'noopener,noreferrer')} icon={<FolderOpen />}>
                Abrir pasta
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()} loading={uploading} icon={<UploadCloud />}>
              Enviar
            </Button>
            <input aria-label="Selecionar arquivo" ref={inputRef} type="file" multiple className="hidden" onChange={handleSelectFiles} />
          </div>
        </div>

        {error && (
          <div className="mt-mx-lg rounded-2xl border border-status-warning/30 bg-status-warning/10 p-mx-md flex flex-col gap-mx-sm md:flex-row md:items-center md:justify-between">
            <Typography variant="p" className="text-sm font-bold">{error}</Typography>
            {needsReconnect && canReconnect && (
              <Button variant="warning" size="sm" onClick={connectCentral}>
                Reconectar
              </Button>
            )}
          </div>
        )}

        {!loading && totalFiles === 0 && (
          <div className="mt-mx-lg rounded-2xl border border-dashed border-border p-mx-xl text-center">
            <FileUp className="h-mx-10 w-mx-10 mx-auto text-muted-foreground mb-mx-sm" />
            <Typography variant="p" tone="muted" className="font-bold">Nenhum arquivo registrado.</Typography>
          </div>
        )}

        {totalFiles > 0 && (
          <div className="mt-mx-lg overflow-hidden rounded-2xl border border-border-subtle">
            {visitEvidenceFiles.map((file) => (
              <div key={`visit-${file.id}`} className="grid grid-cols-1 gap-mx-sm border-b border-border-subtle p-mx-md last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-mx-xs min-w-0">
                    <Badge variant="brand" className="shrink-0">Visita {file.visitNumber}</Badge>
                    <Badge variant="outline" className="shrink-0">{file.content_type?.includes('image') ? 'Imagem' : 'Anexo'}</Badge>
                    <Typography variant="p" className="truncate">{file.filename}</Typography>
                  </div>
                  <Typography variant="tiny" tone="muted" className="font-bold mt-mx-xs">
                    {formatBytes(file.size_bytes)} • {formatDate(file.uploaded_at)}
                  </Typography>
                </div>
                <div className="flex gap-mx-xs">
                  <Button variant="outline" size="xs" onClick={() => void handleEvidenceAction('open', file)} icon={<Eye />}>
                    Abrir
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => void handleEvidenceAction('download', file)} icon={<Download />}>
                    Baixar
                  </Button>
                </div>
              </div>
            ))}
            {files.map((file) => (
              <div key={file.id} className="grid grid-cols-1 gap-mx-sm border-b border-border-subtle p-mx-md last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-mx-xs min-w-0">
                    <Badge variant="outline" className="shrink-0">{getKind(file)}</Badge>
                    <Typography variant="p" className="truncate">{file.name}</Typography>
                  </div>
                  <Typography variant="tiny" tone="muted" className="font-bold mt-mx-xs">
                    {formatBytes(file.size)} • {formatDate(file.modifiedTime || file.createdTime)}
                  </Typography>
                </div>
                <div className="flex gap-mx-xs">
                  {file.webViewLink && (
                    <Button variant="outline" size="xs" onClick={() => window.open(file.webViewLink, '_blank', 'noopener,noreferrer')} icon={<Eye />}>
                      Abrir
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => window.open(
                      file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`,
                      '_blank',
                      'noopener,noreferrer',
                    )}
                    icon={<Download />}
                  >
                    Baixar
                  </Button>
                  <Button variant="danger" size="xs" onClick={() => deleteFile(file.id)} disabled={loading || uploading} icon={<Trash2 />}>
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  )
}
