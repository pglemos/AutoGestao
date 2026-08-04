import { base44 } from '@/api/base44Client'
import CarteiraClientesReference from '@/base44-reference/pages/CarteiraClientes.jsx'
import { installCarteiraBase44Adapter } from '@/features/carteira-clientes/lib/installCarteiraBase44Adapter'
import { useAuth } from '@/hooks/useAuth'

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
  const { simulationRole, simulationLoading, isSimulating } = useAuth()
  const waitingForSimulationIdentity = simulationLoading
    || (simulationRole === 'vendedor' && !isSimulating)

  // Em um reload durante a simulação, os efeitos dos filhos podem executar
  // antes do hook de autenticação terminar de resolver vendedor e loja. Não
  // montamos a referência Base44 nesse intervalo, evitando que sua consulta
  // inicial seja feita com o UID real do administrador.
  if (waitingForSimulationIdentity) {
    return (
      <div
        className="flex h-full min-h-[320px] items-center justify-center text-sm font-semibold text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Preparando carteira do vendedor simulado...
      </div>
    )
  }

  return <CarteiraClientesReference />
}
