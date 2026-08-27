import { base44 } from '@/api/base44Client'
import CarteiraClientesReference from '@/base44-reference/pages/CarteiraClientes.jsx'
import { installCarteiraBase44Adapter } from '@/features/carteira-clientes/lib/installCarteiraBase44Adapter'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PageCanvas } from '@/design-system/page'
import { CarteiraSellerPicker } from '../components/CarteiraSellerPicker'
import {
  onCarteiraSellerFilterChange,
  readCarteiraSellerFilter,
} from '../lib/carteiraSellerFilter'

installCarteiraBase44Adapter(base44)

/**
 * Interaction surface preserved from the Base44 reference implementation.
 * These names are intentionally documented here because every overlay and
 * flow must remain available after the route replacement.
 */
export const CARTEIRA_BASE44_PARITY_SURFACE = [
  'CarteiraAtivaTab',
  'PlanoAtaqueTab',
  'ExecucaoMissao',
  'NovoClienteModal',
  'WhatsAppRoteiro',
  'FichaClienteSheet',
  'ProximaOportunidadeModal',
  'RetornoWhatsAppModal',
  'ModoAtaque',
] as const

export function CarteiraClientesBase44Page() {
  const { simulationRole, simulationLoading, isSimulating, role, membership } = useAuth()
  // Vendedor vê só a própria carteira: para ele não há o que escolher.
  const podeFiltrarPorVendedor = role === 'gerente' || role === 'dono'

  // A referência Base44 busca os clientes uma vez, ao montar. Trocar o recorte
  // no seletor mudava o `sessionStorage` sem refazer a consulta — a lista
  // continuava a mesma e o gerente via o número do vendedor anterior. A `key`
  // remonta a referência a cada troca, refazendo a busca já escopada.
  const [recorte, setRecorte] = useState<string>(() => readCarteiraSellerFilter() ?? '')
  useEffect(
    () => onCarteiraSellerFilterChange(() => setRecorte(readCarteiraSellerFilter() ?? '')),
    [],
  )
  const waitingForSimulationIdentity = simulationLoading
    || (simulationRole === 'vendedor' && !isSimulating)

  // Em um reload durante a simulação, os efeitos dos filhos podem executar
  // antes do hook de autenticação terminar de resolver vendedor e loja. Não
  // montamos a referência Base44 nesse intervalo, evitando que sua consulta
  // inicial seja feita com o UID real do administrador.
  return (
    <PageCanvas as="div" width="wide" bottomClearance="navigation" className="flex min-h-full flex-col gap-4">
      {waitingForSimulationIdentity ? (
        <div className="flex min-h-[320px] flex-1 items-center justify-center text-sm font-semibold text-muted-foreground" role="status" aria-live="polite">
          Preparando carteira do vendedor simulado...
        </div>
      ) : (
        <>
          {podeFiltrarPorVendedor ? (
            <CarteiraSellerPicker storeId={membership?.store_id ?? null} />
          ) : null}
          <CarteiraClientesReference key={recorte || 'loja-inteira'} />
        </>
      )}
    </PageCanvas>
  )
}
