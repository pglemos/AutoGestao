import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { inspectRouteLayoutMetadata } from '../../scripts/lint-route-layout-metadata.mjs'
import {
  resolveRouteLayout,
  DEFAULT_ROUTE_LAYOUT,
} from '../design-system/page/routeLayoutMetadata'

describe('contrato de metadata de layout por rota', () => {
  test('resolve todas as rotas do App.tsx sem cair no default silencioso', () => {
    const result = inspectRouteLayoutMetadata(
      readFileSync('src/App.tsx', 'utf8'),
      readFileSync('src/design-system/page/routeLayoutMetadata.ts', 'utf8'),
    )

    expect(result.pass, JSON.stringify(result, null, 2)).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.invalid).toEqual([])
  })

  test('não confunde rota pública iniciada por barra com ausência de metadata', () => {
    const result = inspectRouteLayoutMetadata(
      `<Route path="/login" /><Route path="consultoria/clientes" />`,
      `const layouts = {
        '/login': { width: 'form' },
        consultoria: { width: 'wide' },
      }`,
    )

    expect(result.pass).toBe(true)
  })

  test('rotas parametrizadas de consultoria resolvem wide pelo prefixo, sem default silencioso', () => {
    // `/consultoria` é `wide` (linha 92 do mapa). As rotas filhas
    // parametrizadas resolvem pelo prefixo mais longo — resolução explícita,
    // NÃO o `DEFAULT_ROUTE_LAYOUT`. Adicionar entradas explícitas para
    // `:clientSlug` e `:visitNumber` seria redundante; este teste fixa a
    // decisão atual (`width: wide`, padrão consultoria) e a ausência de default.
    expect(resolveRouteLayout('/consultoria/clientes/:clientSlug')).toEqual({ width: 'wide' })
    expect(resolveRouteLayout('/consultoria/clientes/:clientSlug/visitas/:visitNumber')).toEqual({ width: 'wide' })
    expect(resolveRouteLayout('/consultoria/clientes/:clientSlug')).not.toEqual(DEFAULT_ROUTE_LAYOUT)
    expect(resolveRouteLayout('/consultoria/clientes/:clientSlug/visitas/:visitNumber')).not.toEqual(DEFAULT_ROUTE_LAYOUT)
  })
})
