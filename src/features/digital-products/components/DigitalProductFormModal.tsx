import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import { Archive, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { cn } from '@/lib/utils'
import { PRODUCT_AUDIENCES, PRODUCT_CATEGORIES } from '../lib/digitalProductCatalog'
import type { ProductAudience, ProductForm, ProductRecord } from '../types'

export function DigitalProductFormModal({ open, editingProduct, form, saving, canManage, onFormChange, onToggleAudience, onSubmit, onClose }: {
  open: boolean
  editingProduct: ProductRecord | null
  form: ProductForm
  saving: boolean
  canManage: boolean
  onFormChange: Dispatch<SetStateAction<ProductForm>>
  onToggleAudience: (audience: ProductAudience) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingProduct ? 'Editar produto digital' : 'Novo produto digital'}
      description="Defina público, status, ordem e descrição do catálogo."
      size="2xl"
      footer={canManage ? <><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button data-mx-requires-manage="" type="submit" form="digital-product-form" disabled={saving}>{saving ? 'Salvando...' : editingProduct ? 'Salvar alterações' : 'Criar produto'}</Button></> : undefined}
      referenceStyle
    >
      <form id="digital-product-form" onSubmit={onSubmit} className="space-y-5">
        <MxField label="Nome do produto">
          <MxInput value={form.name} onChange={(event: ChangeEvent<HTMLInputElement>) => onFormChange((current: ProductForm) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Método Vendedor Profissional" required disabled={!canManage} />
        </MxField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MxField label="Categoria">
            <MxSelect value={form.category} onChange={(event: ChangeEvent<HTMLSelectElement>) => onFormChange((current: ProductForm) => ({ ...current, category: event.target.value }))} disabled={!canManage}>
              {PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Status">
            <MxSelect value={form.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => onFormChange((current: ProductForm) => ({ ...current, status: event.target.value as ProductForm['status'] }))} disabled={!canManage}>
              <option value="ativo">Ativo</option><option value="rascunho">Rascunho</option><option value="arquivado">Arquivado</option>
            </MxSelect>
          </MxField>
          <MxField label="Ordem">
            <MxInput type="number" min="0" max="999" value={form.sort_order} onChange={(event: ChangeEvent<HTMLInputElement>) => onFormChange((current: ProductForm) => ({ ...current, sort_order: event.target.value }))} disabled={!canManage} />
          </MxField>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2"><Users size={16} className="text-emerald-600" /><Typography variant="caption" className="font-medium text-muted-foreground">Públicos onde aparece</Typography></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRODUCT_AUDIENCES.map((audience) => {
              const selected = form.target_roles.includes(audience.key)
              return <button key={audience.key} type="button" disabled={!canManage} onClick={() => onToggleAudience(audience.key)} className={cn('min-h-20 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60', selected ? 'border-emerald-300 bg-emerald-50 text-foreground' : 'border-gray-200 bg-gray-50 text-muted-foreground hover:border-emerald-200')}><span className="block text-sm font-semibold">{audience.label}</span><span className="mt-1 block text-xs text-muted-foreground">{audience.description}</span></button>
            })}
          </div>
        </div>

        <MxField label="Descrição">
          <MxTextarea value={form.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onFormChange((current: ProductForm) => ({ ...current, description: event.target.value }))} placeholder="Descreva o objetivo e quando o produto deve ser usado." className="min-h-32" required disabled={!canManage} />
        </MxField>

        {editingProduct?.status === 'arquivado' ? <MxStatusBanner tone="warning"><Archive size={16} className="mr-2 inline" />Produto arquivado não aparece para os públicos operacionais.</MxStatusBanner> : null}
        <MxStatusBanner tone="info"><ShieldCheck size={16} className="mr-2 inline" />Somente Admin Master e Admin MX podem criar, editar, arquivar e alterar públicos.</MxStatusBanner>
      </form>
    </Modal>
  )
}
