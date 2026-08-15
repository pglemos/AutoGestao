import { useEffect, useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { ENROLLMENT_PROFILES, emptyEnrollmentLinkDraft, validateEnrollmentLinkDraft, type EnrollmentLinkDraft, type EnrollmentProfile } from './enrollmentLink'

export function EnrollmentLinkModal(props: {
  open: boolean
  submitting: boolean
  onSubmit: (draft: EnrollmentLinkDraft) => Promise<string | null>
  onClose: () => void
}) {
  const [draft, setDraft] = useState<EnrollmentLinkDraft>(emptyEnrollmentLinkDraft)
  const [generated, setGenerated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!props.open) return
    setDraft(emptyEnrollmentLinkDraft())
    setGenerated(null)
    setCopied(false)
    setError('')
  }, [props.open])

  const patch = (values: Partial<EnrollmentLinkDraft>) => setDraft(current => ({ ...current, ...values }))

  const generate = async () => {
    const invalid = validateEnrollmentLinkDraft(draft)
    if (invalid) {
      setError(invalid)
      return
    }
    setError('')
    const url = await props.onSubmit(draft)
    if (url) setGenerated(url)
  }

  const copy = () => {
    if (!generated) return
    void navigator.clipboard?.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const profileLabel = ENROLLMENT_PROFILES.find(profile => profile.value === draft.perfil_acesso)?.label ?? draft.perfil_acesso

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Gerar Link de Autocadastro"
      description="A equipe do cliente se cadastra sozinha; os registros aguardam validação."
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>{generated ? 'Fechar' : 'Cancelar'}</Button>
          {!generated ? (
            <Button onClick={() => void generate()} disabled={props.submitting}>
              <Link2 size={16} />{props.submitting ? 'Gerando...' : 'Gerar link'}
            </Button>
          ) : null}
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone="warning">O autocadastro não concede acesso. Os registros ficam aguardando validação da equipe MX.</MxStatusBanner>
        {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}

        {!generated ? (
          <>
            <MxField label="Perfil de acesso">
              <MxSelect aria-label="Perfil de acesso do link" value={draft.perfil_acesso} onChange={event => patch({ perfil_acesso: event.target.value as EnrollmentProfile })}>
                {ENROLLMENT_PROFILES.map(profile => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Nome interno do link">
              <Input value={draft.nome_interno} onChange={event => patch({ nome_interno: event.target.value })} placeholder={`Link de cadastro — ${profileLabel}`} />
            </MxField>
            <div className="grid gap-4 sm:grid-cols-2">
              <MxField label="Validade (dias)">
                <Input type="number" min={1} max={30} value={String(draft.validade_dias)} onChange={event => patch({ validade_dias: Number(event.target.value) })} />
              </MxField>
              <MxField label="Limite de usos">
                <Input type="number" min={1} max={100} value={String(draft.limite_usos)} onChange={event => patch({ limite_usos: Number(event.target.value) })} />
              </MxField>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <MxStatusBanner tone="success">Link de autocadastro gerado com sucesso.</MxStatusBanner>
            <MxField label="URL do autocadastro">
              <div className="flex gap-2">
                <Input readOnly className="font-mono text-xs" value={generated} />
                <Button variant="outline" size="sm" onClick={copy} aria-label="Copiar link">
                  {copied ? <><Check size={14} />Copiado</> : <><Copy size={14} />Copiar</>}
                </Button>
              </div>
            </MxField>
            <p className="text-xs text-muted-foreground">Perfil: {profileLabel} · Validade: {draft.validade_dias} dias · Limite: {draft.limite_usos} usos</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
