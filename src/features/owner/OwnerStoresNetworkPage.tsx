import { NetworkDashboardPage } from '@/features/network-dashboard/NetworkDashboardPage'

/**
 * "Minhas Lojas" — visão consolidada de matriz e filiais do dono.
 *
 * Reaproveita o cockpit de rede já existente, trocando apenas a fonte de dados
 * para `get_owner_network_cockpit`, que devolve somente as lojas onde o
 * chamador tem vínculo ativo de dono. O dono com uma única loja vê essa loja;
 * o dono de várias vê o consolidado no topo e uma linha por unidade.
 */
export default function OwnerStoresNetworkPage() {
  return <NetworkDashboardPage scope="owner" />
}
