import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, Copy, Link2, Mail, MapPin, Phone, Plus, RefreshCw, Save, Trash2, UserRound } from 'lucide-react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import type { Store } from '@/types/database'
import type { StoreUpdateFields } from '@/hooks/useTeam'
import { getPreRegistrationLink } from '@/lib/utils'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { toast } from '@/lib/toast'

interface StoreEditModalProps {
  open: boolean
  store: Store | null
  saving?: boolean
  onClose: () => void
  onSubmit: (id: string, updates: Partial<StoreUpdateFields>) => Promise<void>
}

export function StoreEditModal({ open, store, saving = false, onClose, onSubmit }: StoreEditModalProps) {
  const [form, setForm] = useState<StoreUpdateFields>({
    name: '',
    manager_email: null,
    legal_name: '',
    cnpj: '',
    address: '',
    administrative_phone: '',
    partners: [],
    active: true,
  })

  useEffect(() => {
    if (!store) return
    setForm({
      name: store.name,
      manager_email: store.manager_email || '',
      legal_name: store.legal_name || '',
      cnpj: store.cnpj || '',
      address: store.address || '',
      administrative_phone: store.administrative_phone || '',
      partners: store.partners?.length ? store.partners : [{ name: '', document: '', phone: '', email: '' }],
      active: store.active,
    })
  }, [store])

  const registrationLink = store ? getPreRegistrationLink(store.name) : ''

  const submitStoreUpdate = async () => {
    if (!store) return

    await onSubmit(store.id, {
      name: form.name,
      manager_email: form.manager_email || null,
      legal_name: form.legal_name || null,
      cnpj: form.cnpj || null,
      address: form.address || null,
      administrative_phone: form.administrative_phone || null,
      partners: form.partners,
      active: form.active,
    })
  }

  const handleCopyRegistrationLink = async () => {
    if (!registrationLink) return
    try {
      await navigator.clipboard.writeText(registrationLink)
      toast.success('Link de pré-cadastro copiado.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!store) return

    if (store.active && !form.active) {
      requestToastConfirmation({
        key: `archive-store-modal:${store.id}`,
        title: `Arquivar ${store.name}?`,
        description: 'Gerentes e vendedores podem perder visibilidade operacional.',
        label: 'Arquivar',
        onConfirm: submitStoreUpdate,
      })
      return
    }

    await submitStoreUpdate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Loja"
      description={store ? `Unidade ${store.name}` : 'Atualize os dados cadastrais da unidade'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>CANCELAR</Button>
          <Button type="submit" form="store-edit-form" disabled={saving || !store} className="">
            {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            SALVAR
          </Button>
        </>
      }
    >
      <form id="store-edit-form" onSubmit={handleSubmit} className="space-y-mx-lg">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-mx-md">
          <div className="flex items-center justify-between gap-mx-sm mb-mx-sm">
            <div className="min-w-0">
              <Typography variant="caption" className="">Link de pré-cadastro</Typography>
              <Typography variant="tiny" tone="muted" className="mt-1 block font-bold">Envie este link para dono, gerente e vendedores preencherem os dados.</Typography>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCopyRegistrationLink()}
              className="shrink-0 rounded-2xl"
            >
              <Copy size={14} className="mr-2" />
              COPIAR
            </Button>
          </div>
          <div className="relative">
            <Link2 size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-emerald-600" aria-hidden="true" />
            <Input
              readOnly
              value={registrationLink}
              className="!pl-14 !h-14 font-bold"
            />
          </div>
        </div>

        <div className="space-y-mx-xs">
          <Typography as="label" htmlFor="edit-store-name" variant="caption" className="">
            Nome da Loja
          </Typography>
          <div className="relative">
            <Building2 size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <Input
              id="edit-store-name"
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value.toUpperCase() }))}
              className="!pl-14 !h-14 font-bold uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs md:col-span-2">
            <Typography as="label" htmlFor="edit-store-legal-name" variant="caption" className="">
              Razão Social
            </Typography>
            <Input
              id="edit-store-legal-name"
              value={form.legal_name || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, legal_name: event.target.value.toUpperCase() }))}
              placeholder="RAZÃO SOCIAL DA LOJA"
              className="!h-14 font-bold uppercase tracking-widest"
            />
          </div>

          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="edit-store-cnpj" variant="caption" className="">
              CNPJ
            </Typography>
            <Input
              id="edit-store-cnpj"
              value={form.cnpj || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, cnpj: event.target.value }))}
              placeholder="00.000.000/0000-00"
              className="!h-14 font-bold"
            />
          </div>

          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="edit-store-address" variant="caption" className="">
              Endereço
            </Typography>
            <div className="relative">
              <MapPin size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <Input
                id="edit-store-address"
                value={form.address || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value.toUpperCase() }))}
                placeholder="RUA, NÚMERO, BAIRRO, CIDADE/UF"
                className="!pl-14 !h-14 font-bold uppercase"
              />
            </div>
          </div>

          <div className="space-y-mx-xs md:col-span-2">
            <Typography as="label" htmlFor="edit-store-administrative-phone" variant="caption" className="">
              Telefone administrativo
            </Typography>
            <div className="relative">
              <Phone size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <Input
                id="edit-store-administrative-phone"
                value={form.administrative_phone || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, administrative_phone: event.target.value }))}
                placeholder="(00) 00000-0000"
                className="!pl-14 !h-14 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="space-y-mx-xs">
          <div className="flex items-center justify-between">
            <Typography as="label" htmlFor="edit-store-manager-email" variant="caption" className="">
              E-mail do Gestor
            </Typography>
            <Badge variant="outline" className="text-mx-micro">Opcional</Badge>
          </div>
          <div className="relative">
            <Mail size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <Input
              id="edit-store-manager-email"
              type="email"
              value={form.manager_email || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, manager_email: event.target.value }))}
              placeholder="gestor@unidade.com.br"
              className="!pl-14 !h-14 font-bold"
            />
          </div>
        </div>

        <div className="space-y-mx-sm">
          <div className="flex items-center justify-between gap-mx-md">
            <div>
              <Typography variant="caption" className="">
                Sócios da loja
              </Typography>
              <Typography variant="tiny" tone="muted" className="mt-1 block font-bold">
                Cadastre um ou mais sócios com documento e telefone de contato.
              </Typography>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((prev) => ({ ...prev, partners: [...(prev.partners || []), { name: '', document: '', phone: '', email: '' }] }))}
              className="rounded-2xl"
            >
              <Plus size={14} className="mr-2" />
              SÓCIO
            </Button>
          </div>

          <div className="space-y-mx-sm">
            {(form.partners || []).map((partner, index) => (
              <div key={index} className="rounded-2xl border border-gray-200 bg-white p-mx-md">
                <div className="flex items-center justify-between mb-mx-sm">
                  <div className="flex items-center gap-mx-xs">
                    <UserRound size={16} className="text-emerald-600" />
                    <Typography variant="tiny" className="">Sócio {index + 1}</Typography>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setForm((prev) => ({ ...prev, partners: (prev.partners || []).filter((_, itemIndex) => itemIndex !== index) }))}
                    className="h-mx-10 w-mx-10 rounded-2xl text-status-error"
                    aria-label={`Remover sócio ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-sm">
                  <Input
                    value={partner.name}
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      partners: (prev.partners || []).map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value.toUpperCase() } : item),
                    }))}
                    placeholder="NOME DO SÓCIO"
                    className="!h-12 font-bold uppercase"
                  />
                  <Input
                    value={partner.document || ''}
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      partners: (prev.partners || []).map((item, itemIndex) => itemIndex === index ? { ...item, document: event.target.value } : item),
                    }))}
                    placeholder="CPF / DOCUMENTO"
                    className="!h-12 font-bold"
                  />
                  <Input
                    value={partner.phone || ''}
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      partners: (prev.partners || []).map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item),
                    }))}
                    placeholder="TELEFONE DO SÓCIO"
                    className="!h-12 font-bold"
                  />
                  <Input
                    type="email"
                    value={partner.email || ''}
                    onChange={(event) => setForm((prev) => ({
                      ...prev,
                      partners: (prev.partners || []).map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item),
                    }))}
                    placeholder="EMAIL DO SÓCIO"
                    className="!h-12 font-bold"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <label htmlFor="edit-store-active" className="flex items-start gap-mx-sm rounded-2xl border border-gray-200 bg-gray-50 p-mx-md cursor-pointer">
          <input
            id="edit-store-active"
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            className="mt-1 h-mx-sm w-mx-sm accent-brand-primary"
          />
          <span className="flex-1">
            <span className="block text-sm font-bold uppercase tracking-widest text-gray-800">Loja ativa</span>
            <span className="block text-xs font-bold text-gray-500 mt-1">
              Desmarcar arquiva a unidade sem excluir dados historicos.
            </span>
          </span>
        </label>

        {!form.active && (
          <div className="flex items-start gap-mx-sm rounded-2xl border border-status-warning/20 bg-status-warning-surface p-mx-md text-status-warning">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <Typography variant="tiny" className="font-bold">
              A loja arquivada sai da lista de unidades ativas. Os registros historicos continuam preservados.
            </Typography>
          </div>
        )}
      </form>
    </Modal>
  )
}
