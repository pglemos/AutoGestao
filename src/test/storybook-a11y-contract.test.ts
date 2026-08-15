import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(import.meta.url).replace(/\/[^/]+$/, '')
const ROOT = `${HERE}/../..`

const mainTs = readFileSync(`${ROOT}/.storybook/main.ts`, 'utf8')
const previewTs = readFileSync(`${ROOT}/.storybook/preview.ts`, 'utf8')

describe('FASE AD 30.012 — a11y addon checks no Storybook', () => {
  test('addon a11y está registrado no main.ts', () => {
    expect(mainTs).toContain('@storybook/addon-a11y')
  })

  test('addon-essentials está registrado no main.ts (inclui viewport/controls)', () => {
    expect(mainTs).toContain('@storybook/addon-essentials')
  })

  test('parâmetro a11y está ativo no preview.ts', () => {
    expect(previewTs).toContain("a11y: {")
    expect(previewTs).toContain("element: '#storybook-root'")
  })

  test('glob matcher de stories cobre src/**', () => {
    expect(mainTs).toContain('../src/**/*.stories.@(ts|tsx|mdx)')
  })
})

describe('FASE AD 30.013 — responsive viewports nos stories', () => {
  test('viewports mobile/tablet/desktop definidos no preview.ts', () => {
    expect(previewTs).toContain('viewport: {')
    expect(previewTs).toContain('mobile: {')
    expect(previewTs).toContain('tablet: {')
    expect(previewTs).toContain('desktop: {')
  })

  test('viewport mobile usa 390px (largura canônica mobile do projeto)', () => {
    expect(previewTs).toContain("width: '390px'")
  })

  test('viewport desktop usa 1440px (largura canônica desktop)', () => {
    expect(previewTs).toContain("width: '1440px'")
  })
})

describe('FASE AD 30.006 — story de Card existe', () => {
  const cardStory = readFileSync(`${ROOT}/src/components/molecules/_stories/Card.stories.tsx`, 'utf8')

  test('Card.stories.tsx existe e exporta o componente Card', () => {
    expect(cardStory).toContain("from '@/components/molecules/Card'")
    expect(cardStory).toContain('component: Card')
  })

  test('cobre os estados do Card (padrão, interativo, selecionado)', () => {
    expect(cardStory).toContain('export const Padrão')
    expect(cardStory).toContain('export const Interativo')
    expect(cardStory).toContain('export const Selecionado')
  })
})
