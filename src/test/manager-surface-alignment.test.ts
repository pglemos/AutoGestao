import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

/**
 * Componentes que bifurcam a aparência conforme `MxSurfaceVisualMode`.
 *
 * O modo `manager` é a aparência aprovada do Base44/Dono; `default` é o visual
 * legado do MX (caixa alta, pesos black, tracking largo, sombra interna).
 * A unificação caminha para o primeiro.
 */
const FORKED_COMPONENTS = [
  'src/components/atoms/Badge.tsx',
  'src/components/atoms/Input.tsx',
  'src/components/atoms/Select.tsx',
  'src/components/atoms/Textarea.tsx',
  'src/components/atoms/Skeleton.tsx',
  'src/components/atoms/Typography.tsx',
  'src/components/molecules/Card.tsx',
  'src/components/molecules/PageHeading.tsx',
  'src/components/organisms/DataGrid.tsx',
] as const

describe('alinhamento de superfície nos módulos sob o shell universal', () => {
  it('o escopo por perfil fornece o mesmo modo a botões e superfícies', () => {
    const scope = read('src/components/module/MxRoleVisualScope.tsx')
    // Antes, só os botões recebiam o modo aprovado: a mesma tela misturava
    // botão Base44 com campo, card e tabela legados.
    expect(scope).toContain('<ButtonVisualProvider mode="manager">')
    expect(scope).toContain('<MxSurfaceVisualProvider mode="manager">')
  })

  it('o módulo do Dono inteiro recebe o modo aprovado, não só o cabeçalho', () => {
    const ownerHeading = read('src/components/owner/OwnerPageHeading.jsx')
    expect(ownerHeading).toContain('<MxSurfaceVisualProvider mode="manager">')

    // Sem o provider no shell, telas compartilhadas com o Gerente (por exemplo
    // FalarConsultorDono) renderizavam campos legados para o Dono e aprovados
    // para o Gerente — a mesma tela com duas aparências.
    const ownerShell = read('src/features/owner-base44/OwnerShell.tsx')
    expect(ownerShell).toContain('<MxSurfaceVisualProvider mode="manager">')
  })

  it('os perfis internos MX já recebem o modo aprovado', () => {
    const internalScope = read('src/components/module/InternalMxVisualScope.tsx')
    expect(internalScope).toContain('<MxSurfaceVisualProvider mode="manager">')
  })

  it('o inventário de componentes bifurcados não cresce', () => {
    // Nenhum componente novo pode introduzir bifurcação por perfil (§8.5).
    // Quando um for unificado, remova-o desta lista.
    const forked = FORKED_COMPONENTS.filter((path) =>
      read(path).includes('useMxSurfaceVisualMode'),
    )
    expect(forked).toEqual([...FORKED_COMPONENTS])

    // Os átomos e moléculas criados na Fase 2 não bifurcam.
    for (const path of [
      'src/components/atoms/IconButton.tsx',
      'src/components/atoms/Checkbox.tsx',
      'src/components/molecules/SearchField.tsx',
      'src/components/molecules/MetricCard.tsx',
    ]) {
      expect(read(path)).not.toContain('useMxSurfaceVisualMode')
    }
  })

  it('o vendedor permanece fora do escopo, por decisão explícita', () => {
    // O tema escuro do vendedor é a maior divergência da referência e migra
    // por último (Fase 6) — não pode ser arrastado junto sem validação.
    const layout = read('src/components/Layout.tsx')
    expect(layout).toContain("<MxRoleVisualScope manager={role !== 'vendedor'}>")
  })
})
