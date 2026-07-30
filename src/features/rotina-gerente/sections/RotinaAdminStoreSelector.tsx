import { Store } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'

type Loja = { id: string; name: string }

type Props = {
  lojas: Loja[]
  onSelect: (storeId: string) => void
}

/**
 * Splash de seleção de unidade para perfis Admin (internos MX) na RotinaGerente.
 * Preserva exatamente o visual original do Centro de Comando.
 */
export function RotinaAdminStoreSelector({ lojas, onSelect }: Props) {
  return (
    <Card className="p-mx-10 md:p-14 border-none bg-white text-center space-y-mx-lg">
      <div className="w-mx-3xl h-mx-3xl rounded-2xl bg-emerald-600/10 flex items-center justify-center mx-auto">
        <Store size={48} className="text-emerald-600" />
      </div>
      <Typography variant="h2" className="tracking-tighter">
        Selecione uma Unidade
      </Typography>
      <Typography
        variant="p"
        tone="muted"
        className="max-w-md mx-auto text-xs"
      >
        Como administrador, escolha qual unidade gerenciar no Centro de Comando.
      </Typography>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-mx-sm max-w-3xl mx-auto pt-mx-lg">
        {lojas.map((store) => (
          <Button
            key={store.id}
            variant="outline"
            onClick={() => onSelect(store.id)}
            className="h-mx-2xl rounded-2xl font-bold uppercase tracking-widest text-xs border-gray-200 hover:border-brand-primary hover:bg-emerald-600/5 transition-all"
          >
            {store.name}
          </Button>
        ))}
      </div>
    </Card>
  )
}

export default RotinaAdminStoreSelector
