import LegacyConsultoriaVisitaExecucaoPage from './LegacyConsultoriaVisitaExecucaoPage'

/**
 * Ponte de compatibilidade do fluxo PMR. O domínio existente permanece congelado
 * enquanto políticas e estado de submissão são extraídos para módulos testáveis.
 */
export function ConsultoriaVisitaExecucaoPage() {
  return <LegacyConsultoriaVisitaExecucaoPage />
}

export default ConsultoriaVisitaExecucaoPage
