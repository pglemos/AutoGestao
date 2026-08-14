import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * FASE U — 21.001/21.002/21.007 (Ícones)
 *
 * Inventário e padrão de ícones:
 *   - 21.001/21.002 — `lucide-react` é a ÚNICA biblioteca de ícones do runtime;
 *     SVGs inline são permitidos apenas para não-ícones (charts/gauges/logos).
 *   - 21.007 — ícones decorativos dentro de controles interativos precisam de
 *     `aria-hidden` (ou do padrão canônico IconButton/Button que injeta isso).
 */
const root = resolve(import.meta.dir, '..', '..')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'base44-reference') continue
    const full = resolve(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) out.push(...walk(full))
    else if (/(\.(ts|tsx|js|jsx))$/.test(entry) && !/\.(test|spec|playwright)\./.test(entry)) out.push(full)
  }
  return out
}

describe('FASE U — padrão de ícones (Lucide) e decorativos aria-hidden', () => {
  test('21.001/21.002 — nenhuma biblioteca de ícones além de lucide-react é importada', () => {
    const otherLibs = [
      "from 'react-icons",
      'from "react-icons',
      "from 'iconify",
      'from "@iconify',
      "from '@heroicons",
      'from "tabler-icons',
      "from 'phosphor-react",
    ]
    const offenders: string[] = []
    for (const file of walk(resolve(root, 'src'))) {
      const src = readFileSync(file, 'utf8')
      if (otherLibs.some((lib) => src.includes(lib))) offenders.push(file)
    }
    expect(offenders, `imports de outras libs de ícones: ${offenders.join(', ')}`).toEqual([])
  })

  test('21.001 — lucide-react é adotado em todo o runtime (>= 300 arquivos)', () => {
    let count = 0
    for (const file of walk(resolve(root, 'src'))) {
      const src = readFileSync(file, 'utf8')
      if (src.includes("from 'lucide-react'")) count += 1
    }
    expect(count).toBeGreaterThanOrEqual(300)
  })

  test('21.007 — IconButton canônico injeta aria-hidden no ícone decorativo', () => {
    const iconButton = readFileSync(resolve(root, 'src/components/atoms/IconButton.tsx'), 'utf8')
    expect(iconButton).toContain('aria-hidden')
    expect(iconButton).toContain('VisuallyHidden')
    expect(iconButton).toContain('label')
  })

  test('21.007 — Button asChild com ícone decorativo exige nome no elemento real', () => {
    // O `<a>` interno do asChild é o alvo do axe: o nome acessível precisa estar
    // no elemento real, não só no Button pai (defeito DS7 — ConsultorTreinamentos).
    const consultor = readFileSync(
      resolve(root, 'src/pages/ConsultorTreinamentos.tsx'),
      'utf8',
    )
    expect(consultor).not.toContain('aria-label="Ação"')
    expect(consultor).toContain('aria-label={`Assistir treinamento: ${t.title}`}')
    expect(consultor).toContain('aria-hidden="true"')
  })
})
