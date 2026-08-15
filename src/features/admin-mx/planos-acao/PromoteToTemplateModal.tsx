import { useState } from 'react'
import { Crown, Loader2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { promotePlanToTemplate } from './actionPlanWizardLogic'

/**
 * Promove um plano de ação existente a template (rascunho) na biblioteca.
 * Sanea dados específicos do cliente; o plano original não é alterado.
 */
export function PromoteToTemplateModal(props: {
  open: boolean
  planId: string | null
  planTitle: string | null
  onClose: () => void
  onPromoted: () => void
}) {
  const [promoting, setPromoting] = useState(false)
  const [result, setResult] = useState<{ templateId: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { supabaseUser } = useAuth()

  const promote = async () => {
    if (promoting || !props.planId) return
    setPromoting(true)
    setError(null)
    try {
      const result = await promotePlanToTemplate({ planId: props.planId, userId: supabaseUser?.id ?? '' })
      if (result.error) {
        toast.error(result.error)
        setError(result.error)
        return
      }
      setResult({ templateId: result.templateId })
      toast.success('Template em rascunho criado na biblioteca.')
      props.onPromoted()
    } finally {
      setPromoting(false)
    }
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Transformar em template"
      size="lg"
      closeOnEscape={!promoting}
      footer={result ? (
        <Button onClick={props.onClose}>Fechar</Button>
      ) : (
        <>
          <Button variant="outline" onClick={props.onClose} disabled={promoting}>Cancelar</Button>
          <Button onClick={() => void promote()} disabled={promoting || !props.planId}>
            {promoting ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
            {promoting ? 'Criando...' : 'Criar rascunho na biblioteca'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {result ? (
          <MxStatusBanner tone="success">
            <div className="font-medium text-foreground">{props.planTitle || 'Plano'} virou um template em rascunho.</div>
            <div className="mt-1 text-sm">Disponível para revisão na aba Biblioteca de templates.</div>
          </MxStatusBanner>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Uma cópia reutilizável será criada na biblioteca de planos de ação. Os dados específicos deste
              cliente não serão transportados.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <h4 className="mb-2 text-xs font-bold uppercase text-foreground">Dados aproveitados</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Título da ação</li>
                  <li>• Departamento</li>
                  <li>• Indicador</li>
                  <li>• Estrutura das ações</li>
                  <li>• Orientações de execução</li>
                  <li>• Prazo recomendado</li>
                  <li>• Prioridade</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <h4 className="mb-2 text-xs font-bold uppercase text-foreground">Dados não transportados</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Nome do cliente</li>
                  <li>• CNPJ / Razão social</li>
                  <li>• Nomes das unidades</li>
                  <li>• Responsável real</li>
                  <li>• Datas específicas</li>
                  <li>• Evidências do cliente</li>
                  <li>• Histórico de execução</li>
                </ul>
              </div>
            </div>
            {error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : null}
          </>
        )}
      </div>
    </Modal>
  )
}
