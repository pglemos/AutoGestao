import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/molecules/Card'
import { MetricCard } from '@/components/molecules/MetricCard'
import { SectionCard, SectionHeader, SectionContent } from '@/components/molecules/SectionCard'

const root = resolve(import.meta.dir, '../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE M — 13.001/13.005/13.006/13.010 família canônica de cards.
 *
 * A família canônica é: Card (geometria única) + MetricCard (KPI) +
 * SectionCard (seção). Todos consomem tokens de geometria
 * (--mx-card-radius/--mx-card-padding/--mx-card-shadow) e NUNCA hex/z-index cru
 * nem rounded-2xl/shadow-sm literais. O MxSectionCard do módulo gerencial
 * precisa delegar ao SectionCard canônico (single ownership).
 */
describe('FASE M — família canônica de cards (13.001/13.005/13.006/13.010)', () => {
  test('13.001 — Card family: Header/Title/Description/Content/Footer usam tokens', () => {
    const src = read('src/components/molecules/Card.tsx')
    for (const part of ['CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter']) {
      expect(src.includes(`const ${part} =`), part).toBe(true)
    }
    expect(src).toContain('var(--mx-card-padding)')
    expect(src).toContain('var(--mx-card-radius)')
    expect(src).toContain('var(--mx-card-shadow)')

    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>Meta</CardTitle>
          <CardDescription>Descrição</CardDescription>
        </CardHeader>
        <CardContent>Conteúdo</CardContent>
        <CardFooter>Rodapé</CardFooter>
      </Card>,
    )
    for (const attr of ['data-mx-card', 'data-mx-card-header', 'data-mx-card-title', 'data-mx-card-description', 'data-mx-card-content', 'data-mx-card-footer']) {
      expect(html).toContain(`${attr}=""`)
    }
  })

  test('13.005 — MetricCard canônico tokenizado (sem hex/z cru)', () => {
    const src = read('src/components/molecules/MetricCard.tsx')
    expect(src).toContain('var(--mx-card-radius)')
    expect(src).toContain('var(--mx-card-padding)')
    expect(src).toContain('var(--mx-card-shadow)')
    expect(src).toContain('var(--mx-card-hover-shadow)')
    // Sem cor crua
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    // Sem z-index arbitrário
    expect(src).not.toMatch(/z-\[/)

    const html = renderToStaticMarkup(
      <MetricCard label="Vendas" value="R$ 12.400" icon={<Activity />} trend={{ direction: 'up', label: '+8%', isPositive: true }} />,
    )
    expect(html).toContain('Vendas')
    expect(html).toContain('R$ 12.400')
  })

  test('13.006 — SectionCard canônico existe em molecules e usa tokens', () => {
    const src = read('src/components/molecules/SectionCard.tsx')
    expect(src).toContain('var(--mx-card-radius)')
    expect(src).toContain('var(--mx-card-padding)')
    expect(src).toContain('var(--mx-card-shadow)')
    // Sem geometria crua
    expect(src.includes('rounded-2xl')).toBe(false)
    expect(src.includes('shadow-sm')).toBe(false)
    expect(src.includes('p-5')).toBe(false)

    const html = renderToStaticMarkup(
      <SectionCard>
        <SectionHeader title="Execução" description="Resumo" />
        <SectionContent>Conteúdo</SectionContent>
      </SectionCard>,
    )
    expect(html).toContain('data-mx-section-card=""')
    expect(html).toContain('data-mx-section-header=""')
  })

  test('13.010 — MxSectionCard do módulo gerencial delega ao canônico (sem geometria crua)', () => {
    const src = read('src/components/module/MxModuleVisualPrimitives.tsx')
    expect(src).toContain('SectionCard')
    expect(src).not.toMatch(/MxSectionCard[^{]*rounded-2xl/)
    expect(src).not.toMatch(/data-mx-section-card=""[^)]*rounded-2xl/)
  })

  test('13.007 — Card interativo só ganha hover com a prop interactive', () => {
    const src = read('src/components/molecules/Card.tsx')
    expect(src).toContain('interactive')
    expect(src).toContain('cursor-pointer')
    expect(src).toContain('hover:shadow-[var(--mx-card-hover-shadow)]')
    expect(src).toContain('data-interactive')
  })

  test('13.008 — Card selecionado ganha anel semântico via prop selected', () => {
    const src = read('src/components/molecules/Card.tsx')
    expect(src).toContain('selected')
    expect(src).toContain('ring-2 ring-status-info/30')
    expect(src).toContain('data-selected')

    const html = renderToStaticMarkup(<Card selected>Selecionado</Card>)
    expect(html).toContain('data-selected=""')
  })

  test('13.009 — MetricCard não tem hover incondicional; só com interactive', () => {
    const src = read('src/components/molecules/MetricCard.tsx')
    // O hover é condicional à prop interactive (nunca cru/incondicional).
    expect(src).toContain('interactive')
    expect(src).not.toMatch(/'hover:shadow-\[var\(--mx-card-hover-shadow\)\]'/)
    expect(src).toMatch(/interactive && 'cursor-pointer hover:shadow-\[var\(--mx-card-hover-shadow\)\] hover:bg-surface-alt'/)
  })
})
