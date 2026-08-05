import { afterEach, describe, expect, it } from 'bun:test'
import { openInNewTab } from './openInNewTab'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Captura o clique da âncora sintética antes que o navegador o siga. */
function capturarClique(acao: () => void) {
  const cliques: Array<{ target: string; rel: string; href: string; noDom: boolean }> = []
  const handler = (event: Event) => {
    event.preventDefault()
    const anchor = event.target as HTMLElement
    cliques.push({
      target: anchor.getAttribute('target') || '',
      rel: anchor.getAttribute('rel') || '',
      href: anchor.getAttribute('href') || '',
      noDom: anchor.isConnected,
    })
  }
  document.addEventListener('click', handler, true)
  try {
    acao()
  } finally {
    document.removeEventListener('click', handler, true)
  }
  return cliques
}

describe('openInNewTab', () => {
  it('clica uma âncora target=_blank com rel de isolamento', () => {
    const hrefAntes = window.location.href
    const cliques = capturarClique(() => openInNewTab('/lojas/ag-automoveis/filiais'))

    expect(cliques.length).toBe(1)
    expect(cliques[0].target).toBe('_blank')
    expect(cliques[0].rel).toBe('noopener noreferrer')
    expect(cliques[0].href).toBe('/lojas/ag-automoveis/filiais')
    // A âncora precisa estar no documento no momento do clique.
    expect(cliques[0].noDom).toBe(true)
    // Regressão: a versão com window.open + fallback navegava a aba atual
    // junto, porque `noopener` faz o open devolver null mesmo abrindo a aba.
    expect(window.location.href).toBe(hrefAntes)
  })

  it('não deixa a âncora sintética no DOM', () => {
    capturarClique(() => openInNewTab('/lojas/ag-automoveis/filiais'))
    expect(document.querySelectorAll('a').length).toBe(0)
  })
})
