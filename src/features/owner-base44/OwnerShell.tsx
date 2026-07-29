import { Toaster as OwnerToaster } from '@/components/ui/toaster'
import OwnerLayout from '@/components/owner/OwnerLayout'
import { MxSurfaceVisualProvider } from '@/components/module/MxSurfaceVisualContext'
import '@/styles/owner-base44-exact.css'

/**
 * Shell do módulo do Dono montado na raiz do roteador.
 *
 * As telas do Dono são registradas no roteador principal (sem o prefixo
 * /dono); é o perfil autenticado que decide qual componente cada URL entrega.
 * Este shell aplica o escopo visual `.owner-b44` e a moldura do módulo
 * (sidebar, topbar com filtros e modal do consultor).
 *
 * O modo de superfície aprovado vale para o módulo inteiro, não apenas para o
 * cabeçalho: sem isso, telas compartilhadas com o Gerente — como
 * `FalarConsultorDono` — renderizavam o campo no visual legado para o Dono e
 * no aprovado para o Gerente.
 */
export default function OwnerShell() {
  return (
    <MxSurfaceVisualProvider mode="manager">
      <div className="owner-b44 owner-base44-exact h-dvh min-h-0 overflow-hidden">
        <OwnerLayout />
        <OwnerToaster />
      </div>
    </MxSurfaceVisualProvider>
  )
}
