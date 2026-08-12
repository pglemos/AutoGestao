import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MANAGER_NAVIGATION_CONTEXT_KEY = 'mx_contexto_navegacao'

export function ManagerHomeReturnLink() {
  const navigate = useNavigate()
  const context = readManagerReturnContext()

  if (!context) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (context.consumeBeforeNavigate) {
          sessionStorage.removeItem(MANAGER_NAVIGATION_CONTEXT_KEY)
        }
        navigate(context.path)
      }}
      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft size={16} /> {context.label}
    </button>
  )
}

function readManagerReturnContext(): {
  path: '/home' | '/rotina'
  label: string
  consumeBeforeNavigate: boolean
} | null {
  if (typeof sessionStorage === 'undefined') return null
  const rawContext = sessionStorage.getItem(MANAGER_NAVIGATION_CONTEXT_KEY)
  if (!rawContext) return null

  try {
    const context = JSON.parse(rawContext) as { origemNavegacao?: unknown }
    if (context.origemNavegacao === 'DASHBOARD_GERENCIAL') {
      return { path: '/home', label: 'Voltar para o Início', consumeBeforeNavigate: true }
    }
    if (context.origemNavegacao === 'ROTINA_DO_DIA_GERENTE') {
      return { path: '/rotina', label: 'Voltar para a Rotina do Dia', consumeBeforeNavigate: false }
    }
    return null
  } catch {
    return null
  }
}

export default ManagerHomeReturnLink
