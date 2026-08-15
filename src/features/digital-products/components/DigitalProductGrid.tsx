import { AnimatePresence, motion } from 'motion/react'
import { Package } from 'lucide-react'
import { MxEmptyState } from '@/components/module/MxModuleVisualPrimitives'
import { DigitalProductCard } from './DigitalProductCard'
import type { ProductRecord } from '../types'

export function DigitalProductGrid({ products, canManage, onEdit, onArchive }: { products: ProductRecord[]; canManage: boolean; onEdit: (product: ProductRecord) => void; onArchive: (product: ProductRecord) => void }) {
  if (!products.length) return <MxEmptyState variant="filter" icon={Package} title="Nenhum produto encontrado" description={canManage ? 'Crie um produto ou ajuste os filtros do catálogo.' : 'Nenhum produto ativo foi liberado para o seu perfil.'} />
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <motion.li key={product.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: index * 0.02 }}>
            <DigitalProductCard product={product} canManage={canManage} onEdit={onEdit} onArchive={onArchive} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
