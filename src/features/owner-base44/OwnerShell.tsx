import { Toaster as OwnerToaster } from '@/components/ui/toaster'
import OwnerLayout from '@/components/owner/OwnerLayout'
import '@/styles/owner-base44-exact.css'

/**
 * Shell do módulo do Dono montado na raiz do roteador.
 *
 * As telas do Dono são registradas no roteador principal (sem o prefixo
 * /dono); é o perfil autenticado que decide qual componente cada URL entrega.
 * Este shell aplica o escopo visual `.owner-b44` e a moldura do módulo
 * (sidebar, topbar com filtros e modal do consultor).
 */
export default function OwnerShell() {
  return (
    <div className="owner-b44 owner-base44-exact h-dvh min-h-0 overflow-hidden">
      <OwnerLayout />
      <OwnerToaster />
    </div>
  )
}
