import { useEffect, useState } from 'react'
import { Check, CheckSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Modal } from '@/components/organisms/Modal'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { DEFAULT_CONSULTING_MODULES } from '@/hooks/useConsultingModules'
import type { ConsultingClientModule } from '@/lib/schemas/consulting-client.schema'

export interface ClientModulesModalProps {
  open: boolean
  clientId: string
  clientName: string
  productName?: string | null
  currentModules: ConsultingClientModule[]
  userId?: string | null
  onClose: () => void
  onSuccess: () => void
}

export function ClientModulesModal({
  open,
  clientId,
  clientName,
  productName,
  currentModules,
  userId,
  onClose,
  onSuccess,
}: ClientModulesModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const active = new Set(
      currentModules
        .filter((item) => item.enabled !== false)
        .map((item) => item.module_key),
    )
    setSelectedKeys(active)
  }, [open, currentModules])

  const toggleModule = (moduleKey: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(moduleKey)) {
        next.delete(moduleKey)
      } else {
        next.add(moduleKey)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedKeys(new Set(DEFAULT_CONSULTING_MODULES.map((item) => item.module_key)))
  }

  const selectRecommended = () => {
    const isPlus = productName?.toLowerCase().includes('plus')
    const recommended = new Set(
      DEFAULT_CONSULTING_MODULES
        .filter((item) => item.enabled || (isPlus && item.module_key === 'dre'))
        .map((item) => item.module_key),
    )
    setSelectedKeys(recommended)
  }

  const handleSave = async () => {
    if (!clientId) return
    setSaving(true)
    try {
      const payload = DEFAULT_CONSULTING_MODULES.map((item) => {
        const isEnabled = selectedKeys.has(item.module_key)
        return {
          client_id: clientId,
          module_key: item.module_key,
          label: item.label,
          enabled: isEnabled,
          premium: item.premium,
          configured_by: userId || null,
          configured_at: new Date().toISOString(),
        }
      })

      const { error } = await supabase
        .from('modulos_cliente_consultoria')
        .upsert(payload, { onConflict: 'client_id,module_key' })

      if (error) {
        toast.error(`Erro ao salvar módulos: ${error.message}`)
        return
      }

      toast.success(`${selectedKeys.size} módulo(s) configurado(s) com sucesso!`)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar módulos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Gerenciar módulos — ${clientName}`}
      description="Libere ou restrinja o acesso aos módulos e ferramentas da consultoria para este cliente."
      size="lg"
      closeOnEscape={!saving}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Check size={16} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </>
      )}
    >
      <div className="mt-4 space-y-4">
        {productName ? (
          <MxStatusBanner tone="info">
            Produto contratado:{' '}
            <strong className="font-semibold text-foreground">{productName}</strong>. Os módulos selecionados ficarão imediatamente disponíveis na plataforma.
          </MxStatusBanner>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Selecione quais recursos a equipe deste cliente poderá acessar:
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectRecommended}
              disabled={saving}
            >
              <Sparkles size={14} className="text-primary" />
              Padrão do produto
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={saving}
            >
              <CheckSquare size={14} />
              Marcar todos
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {DEFAULT_CONSULTING_MODULES.map((mod) => {
            const isChecked = selectedKeys.has(mod.module_key)
            return (
              <label
                key={mod.module_key}
                className="flex cursor-pointer items-center justify-between p-3.5 transition-colors hover:bg-surface-alt/60"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleModule(mod.module_key)}
                    disabled={saving}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{mod.label}</span>
                      {mod.premium ? (
                        <Badge variant="warning">
                          Premium
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chave do sistema: <code className="text-xs">{mod.module_key}</code>
                    </p>
                  </div>
                </div>
                <div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isChecked
                        ? 'bg-status-success-bg text-status-success-text'
                        : 'bg-surface-alt text-muted-foreground'
                    }`}
                  >
                    {isChecked ? 'Liberado' : 'Bloqueado'}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
