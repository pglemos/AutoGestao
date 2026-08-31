import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { ProductDetailPanel } from './ProductDetailPanel'
import type { ConsultingProduct } from './consultingProducts'

export function ProductDetailDrawer(props: { product: ConsultingProduct | null; onClose: () => void; onChanged?: () => void }) {
  const { product } = props
  const [saving, setSaving] = useState(false)

  if (!product) return null

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`${product.name || product.program_key} — v${product.versao}`}
      size="xl"
      closeOnEscape={!saving}
      footer={<Button variant="outline" onClick={props.onClose} disabled={saving}>Fechar</Button>}
    >
      <div className="mt-5">
        <ProductDetailPanel product={product} variant="drawer" onChanged={props.onChanged} onSavingChange={setSaving} />
      </div>
    </Modal>
  )
}
