import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { slugify } from '@/lib/utils'

const root = resolve(import.meta.dir, '..', '..', '..', '..')

const resolutionSource = readFileSync(
  resolve(root, 'src/features/dashboard-loja/hooks/useStoreResolution.ts'),
  'utf8',
)

const dashboardContainerSource = readFileSync(
  resolve(root, 'src/features/dashboard-loja/DashboardLoja.container.tsx'),
  'utf8',
)

const adminClientesSource = readFileSync(
  resolve(root, 'src/features/admin-mx/AdminClientesPage.tsx'),
  'utf8',
)

describe('contrato de resolução de loja e navegação de equipe', () => {
  test('slugify normaliza corretamente nomes com acentos como ANDRÉ CAR', () => {
    expect(slugify('ANDRÉ CAR')).toBe('andre-car')
    expect(slugify('andré-car')).toBe('andre-car')
    expect(slugify('OTÁVIO LAGE')).toBe('otavio-lage')
    expect(slugify('otávio-lage')).toBe('otavio-lage')
    expect(slugify('DELTA VEÍCULOS')).toBe('delta-veiculos')
  })

  test('useStoreResolution suporta allStores e matching resiliente a acentos e IDs', () => {
    expect(resolutionSource).toContain('allStores?: Store[]')
    expect(resolutionSource).toContain('decodeURIComponent(storeSlug)')
    expect(resolutionSource).toContain('slugify(decodedSlug)')
    expect(resolutionSource).toContain('store.id === storeSlug')
    expect(resolutionSource).toContain('slugify(store.name) === normalizedSlug')
  })

  test('DashboardLoja passa allStores e reconhece rota profunda /lojas/:storeSlug/equipe', () => {
    expect(dashboardContainerSource).toContain('allStores: lojas')
    expect(dashboardContainerSource).toContain("location.pathname.endsWith('/equipe')")
    expect(dashboardContainerSource).toContain("pathname.replace(/\\/equipe\\/?$/, '')")
  })

  test('AdminClientesPage resolve storeMatch real e navega para /lojas/:storeSlug/equipe com ID', () => {
    expect(adminClientesSource).toContain('client.primary_store_id && s.id === client.primary_store_id')
    expect(adminClientesSource).toContain('slugify(storeMatch.name)')
    expect(adminClientesSource).toContain('/lojas/${targetStoreSlug}/equipe${storeQuery}')
    expect(adminClientesSource).toContain('setEditingStore(storeToEdit)')
    expect(adminClientesSource).toContain('setHardDeleteStore(storeToArchive)')
  })
})
