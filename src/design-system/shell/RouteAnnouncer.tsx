import * as React from 'react'
import { useLocation } from 'react-router-dom'

export interface RouteAnnouncerProps {
  /** `id` do landmark que deve receber o foco após navegar. */
  mainContentId: string
}

/**
 * Move o foco e anuncia a troca de rota.
 *
 * Em uma SPA a navegação não recarrega a página, então o leitor de tela não
 * percebe a mudança e o foco fica preso no link clicado — o usuário de teclado
 * recomeça a tabulação do meio do menu (§13.3, §14).
 *
 * A montagem inicial é ignorada: roubar o foco no primeiro carregamento
 * atrapalharia quem chegou por link direto.
 */
export function RouteAnnouncer({ mainContentId }: RouteAnnouncerProps) {
  const { pathname } = useLocation()
  const firstRender = React.useRef(true)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    const target = document.getElementById(mainContentId)
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }

    // `document.title` é estático neste app ("MX PERFORMANCE" em toda rota),
    // então anunciá-lo repetiria a mesma frase a cada navegação. O nome útil é
    // o `h1` da tela recém-montada; a rota serve de reserva.
    const frame = requestAnimationFrame(() => {
      const heading = target?.querySelector('h1')?.textContent?.trim()
      setMessage(heading || `Navegou para ${pathname}`)
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, mainContentId])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="mx-route-announcer"
    >
      {message}
    </div>
  )
}
