/**
 * Abre um caminho da aplicação em uma aba nova.
 *
 * Não usa `window.open`: com `noopener`/`noreferrer` a especificação manda
 * devolver `null` mesmo quando a aba abre, então qualquer fallback baseado no
 * retorno acaba navegando a aba atual junto — foi exatamente o que apareceu em
 * produção no botão "Gerenciar filiais". O clique na âncora sintética herda o
 * gesto do usuário e não é barrado por bloqueador de pop-up.
 */
export function openInNewTab(path: string) {
  const anchor = document.createElement('a')
  anchor.href = path
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}
