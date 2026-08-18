import { useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Link2,
  QrCode,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxInput,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { getPreRegistrationLink } from '@/lib/utils'
import type { Store } from '@/types/database'
import { InscricoesPendentesPanel } from './InscricoesPendentesPanel'
import type { PortfolioClient } from './clientPortfolio'

export interface InscricoesTabProps {
  clients: PortfolioClient[]
  lojas: Store[]
  onOpenEnrollmentModal: (client: PortfolioClient) => void
}

export function InscricoesTab({ clients, lojas, onOpenEnrollmentModal }: InscricoesTabProps) {
  const [selectedStoreName, setSelectedStoreName] = useState<string>(clients[0]?.name ?? '')
  const [copied, setCopied] = useState(false)

  const activeLink = selectedStoreName ? getPreRegistrationLink(selectedStoreName) : ''

  const handleCopy = () => {
    if (!activeLink) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(activeLink)
      setCopied(true)
      toast.success('Link copiado para a área de transferência!')
      setTimeout(() => setCopied(false), 2500)
    } else {
      toast.info(`Link: ${activeLink}`)
    }
  }

  const selectedClient = clients.find(c => c.name === selectedStoreName)

  return (
    <div className="space-y-5">
      {/* 1. Painel de Inscrições Recebidas e Pendentes de Validação */}
      <InscricoesPendentesPanel />

      {/* 2. Gerador Rápido de Links de Pré-cadastro para Equipes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <MxSectionCard>
            <MxSectionHeader
              title="Gerador de Links de Pré-Cadastro"
              description="Compartilhe o link de entrada com vendedores, gerentes e consultores para autocadastro direto na loja."
            />

            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="store-select-link" className="block text-caption font-medium text-foreground mb-1.5">
                  Selecione a Loja / Unidade
                </label>
                <MxSelect
                  id="store-select-link"
                  value={selectedStoreName}
                  onChange={e => setSelectedStoreName(e.target.value)}
                  className="w-full"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.primary_store_city ? `(${c.primary_store_city})` : ''}
                    </option>
                  ))}
                </MxSelect>
              </div>

              {activeLink && (
                <div className="rounded-xl border border-border bg-surface-alt/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Link Público de Cadastro
                    </span>
                    <span className="inline-flex items-center gap-1 text-caption font-medium text-status-success-text">
                      <UserCheck size={14} />
                      Válido para entrada direta
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MxInput
                      value={activeLink}
                      readOnly
                      className="font-mono text-xs bg-card"
                    />
                    <Button
                      type="button"
                      variant={copied ? 'primary' : 'outline'}
                      className="shrink-0 h-10 px-4"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="mr-1.5" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="mr-1.5" /> Copiar Link
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                    <span>
                      Destino: <strong className="text-foreground">{selectedStoreName}</strong>
                    </span>
                    {selectedClient && (
                      <button
                        type="button"
                        onClick={() => onOpenEnrollmentModal(selectedClient)}
                        className="text-brand-primary hover:underline focus-visible:underline font-medium inline-flex items-center gap-1 outline-none"
                      >
                        <Sparkles size={12} />
                        Gerar link com validade e limites
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </MxSectionCard>
        </div>

        {/* 3. Guia de Boas Práticas e Autocadastro */}
        <div>
          <MxSectionCard className="h-full">
            <MxSectionHeader
              title="Fluxo de Triagem MX"
            />
            <div className="p-5 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-3">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-brand-primary font-bold text-caption">
                  1
                </div>
                <div>
                  <strong className="text-foreground block">Envio do Link</strong>
                  Envie o link para os profissionais da loja preencherem nome, WhatsApp e e-mail.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-brand-primary font-bold text-caption">
                  2
                </div>
                <div>
                  <strong className="text-foreground block">Aprovação & Perfis</strong>
                  Aparecerá nesta aba para você selecionar a loja de destino e os papéis (Vendedor, Gerente, Dono).
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-brand-primary font-bold text-caption">
                  3
                </div>
                <div>
                  <strong className="text-foreground block">Acesso Imediato</strong>
                  Após a aprovação, o usuário é cadastrado e liberado para operar o sistema com a visão correta.
                </div>
              </div>
            </div>
          </MxSectionCard>
        </div>
      </div>
    </div>
  )
}
