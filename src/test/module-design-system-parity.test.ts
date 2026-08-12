import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const srcRoot = fileURLToPath(new URL('../', import.meta.url))

const layout = read('../components/Layout.tsx')
const main = read('../main.tsx')
const sidebarShell = read('../components/MxSidebarShell.tsx')
const managerCanonical = read('../features/dashboard-loja/sections/ManagerSellerParityHomeCanonical.tsx')
const managerPrimitives = read('../features/manager/shared/ManagerVisualPrimitives.tsx')
const universalPrimitives = read('../components/module/MxModuleVisualPrimitives.tsx')
const button = read('../components/atoms/Button.tsx')
const roleVisualScope = read('../components/module/MxRoleVisualScope.tsx')
const rootTokens = read('../index.css')
const painelConsultor = [
  read('../pages/PainelConsultor.tsx'),
  read('../features/network-dashboard/NetworkDashboardPage.tsx'),
  read('../features/network-dashboard/components/NetworkDashboardHeader.tsx'),
  read('../features/network-dashboard/sections/NetworkMetricsSection.tsx'),
].join('\n')
const lojasContainer = read('../features/lojas/Lojas.container.tsx')
const lojasHeader = read('../features/lojas/sections/LojasHeader.tsx')
const consultoriaClientes = [
  read('../pages/ConsultoriaClientes.tsx'),
  read('../features/consulting-clients/ConsultingClientsPage.tsx'),
  read('../features/consulting-clients/ConsultantAssignedClientsPage.tsx'),
  read('../features/consulting-clients/sections/ConsultingClientMetrics.tsx'),
  read('../features/consulting-clients/sections/ConsultingClientToolbar.tsx'),
].join('\n')

const legacyFiles = [
  '../design-system/internal-mx/InternalMxPageFrame.tsx',
  '../design-system/internal-mx/internal-mx-frame.css',
  '../design-system/internal-mx/internal-mx-components.css',
  '../design-system/internal-mx/internal-mx-routes.css',
  '../styles/manager-visual-scope.css',
]

function runtimeFiles(directory: string, files: string[] = []) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    const relative = path.slice(srcRoot.length).replaceAll('\\', '/')
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (relative === 'test' || relative.includes('/__tests__')) continue
      runtimeFiles(path, files)
      continue
    }
    if (!/\.(ts|tsx|css)$/.test(name) || /\.(test|spec)\.(ts|tsx)$/.test(name)) continue
    files.push(path)
  }
  return files
}

describe('paridade visual dos módulos MX com o Gerente', () => {
  test('renderiza todos os perfis no mesmo shell sem frame visual paralelo', () => {
    expect(layout).toContain("from './MxSidebarShell'")
    expect(layout.split('<MxSidebarShell').length - 1).toBe(1)
    expect(layout).not.toContain('InternalMxPageFrame')
    expect(layout).not.toContain('mx-internal-workspace')
    expect(layout).toContain('{pageContent}')
  })

  test('mantém um único landmark main-content, pertencente ao shell universal', () => {
    expect(sidebarShell.split('id="main-content"').length - 1).toBe(1)
    expect(read('../components/module/InternalMxTemplateSlots.tsx')).not.toMatch(/<main[\s>]/)

    for (const file of runtimeFiles(srcRoot)) {
      if (file.endsWith('/components/MxSidebarShell.tsx')) continue
      const source = readFileSync(file, 'utf8')
      expect(source).not.toContain('id="main-content"')
      expect(source).not.toContain("id='main-content'")
    }
  })

  test('não mantém adaptadores visuais legados no runtime', () => {
    expect(main).not.toContain('internal-mx-frame.css')
    expect(main).not.toContain('internal-mx-components.css')
    expect(main).not.toContain('internal-mx-routes.css')
    expect(main).not.toContain('../packages/mx-tokens/src/theme.css')
    // manager-visual-scope.css saiu do runtime: existia para corrigir a marca e
    // a escala do :root, e ambas foram promovidas para lá.
    expect(main).not.toContain('./styles/manager-visual-scope.css')
    for (const file of legacyFiles) {
      expect(existsSync(new URL(file, import.meta.url))).toBe(false)
    }
  })

  test('a fundação compartilhada usa a mesma matriz concreta do Gerente', () => {
    // A matriz visual do gerente (superfícies, bordas, sombras, tipografia) é
    // compartilhada com os primitivos universais. Os wrappers de largura
    // (`max-w-7xl`, `space-y-5`) saíram do conteúdo do módulo e passaram para
    // a camada de canvas (ConditionalPageCanvas) — não devem mais estar no
    // canonical porque vêm do canvas pai. A raiz do canonical usa
    // `flex flex-col gap-5` como convenção de fluxo vertical.
    for (const marker of [
      'bg-gray-50',
      'rounded-2xl',
      'border-border-subtle',
      'bg-white',
      'shadow-sm',
      'text-foreground',
      'text-muted-foreground',
    ]) {
      expect(managerCanonical).toContain(marker)
      expect(universalPrimitives).toContain(marker)
    }
    // O conteúdo da rota não decide mais largura, margem ou padding: o
    // PageCanvas do shell é a única autoridade dessas dimensões.
    expect(managerCanonical).toMatch(/return \(\s*<div className="flex flex-col gap-5 text-foreground">/)
    expect(managerCanonical).not.toMatch(/return\s*\(\s*<div[^>]*\b(?:mx-auto|max-w-7xl|px-4|py-6)/)

    expect(managerPrimitives).toContain("from '@/components/module/MxModuleVisualPrimitives'")
    expect(universalPrimitives).not.toContain('bg-surface-alt')
    expect(universalPrimitives).not.toContain('rounded-mx-xl')
  })

  test('a matriz de gestão não tem mais escopo próprio — vale para todo perfil', () => {
    expect(layout).toContain("from '@/components/module/MxRoleVisualScope'")
    expect(layout).toContain("<MxRoleVisualScope manager={role !== 'vendedor'}>")
    expect(roleVisualScope).toContain('data-mx-visual-system="manager"')
    expect(roleVisualScope).not.toContain('mx-manager-scope')

    // Este teste exigia que manager-visual-scope.css declarasse a marca, os
    // neutros e a escala de raio da gestão. O arquivo existia para corrigir o
    // :root, não para especializá-lo: 38 das suas 42 variáveis divergiam da
    // raiz porque a raiz ainda carregava a identidade teal. Com marca, escala e
    // neutros promovidos, o escopo ficou sem nada a dizer e foi removido.
    //
    // As asserções passam a valer sobre a raiz, que é onde a decisão mora agora.
    expect(rootTokens).toContain('--color-brand-primary: hsl(var(--mx-color-primary))')
    expect(rootTokens).toContain('--color-mx-action: hsl(var(--mx-color-primary))')
    expect(rootTokens).not.toMatch(/--color-brand-primary:\s*#00A89D/i)
    expect(rootTokens).not.toMatch(/--color-mx-action:\s*#00A89D/i)
    // Escala do §13.2 — controle 6px, card 12px. T4.6: derivada dos
    // primitivos --mx-radius-* (valores preservados, tokens únicos).
    expect(rootTokens).toContain('--radius-md: var(--mx-radius-sm)')
    expect(rootTokens).toContain('--radius-xl: var(--mx-radius-xl)')
  })

  test('aplica a variante aprovada a todos os perfis, sem par legado', () => {
    for (const variant of [
      'primary',
      'outline',
      'secondary',
      'ghost',
    ]) {
      expect(button).toContain(`${variant}:`)
    }
    // As variantes deixaram de ter par "manager": a aparência aprovada é a
    // única, então não há mais provider nem modo a resolver (§8.5).
    expect(button).not.toContain('ButtonVisualProvider')
    expect(button).not.toContain('managerPrimary')
    expect(button).not.toContain('bg-mx-action')
    expect(button).toContain('bg-emerald-600')
    expect(button).toContain('hover:bg-emerald-700')
    expect(button).toContain('border-border')
    expect(universalPrimitives).not.toContain('ButtonVisualProvider')
  })

  test('landing pages de Admin, Dono e Consultoria usam as mesmas primitives do Gerente', () => {
    for (const source of [painelConsultor, lojasContainer, consultoriaClientes]) {
      expect(source).toContain('MxModulePage')
      expect(source).not.toContain('mx-internal-workspace')
    }
    for (const source of [painelConsultor, lojasHeader, consultoriaClientes]) {
      expect(source).toContain('MxModuleHeader')
    }
    expect(painelConsultor).toContain('MxMetricCard')
    expect(lojasContainer).toContain('MxStatusBanner')
    expect(lojasContainer).toContain('<LojasHeader')
    expect(consultoriaClientes).toContain('MxMetricCard')
    expect(consultoriaClientes).toContain('MxToolbar')
    expect(consultoriaClientes).toContain('MxSectionCard')
    expect(consultoriaClientes).not.toContain('bg-brand-secondary')
    expect(consultoriaClientes).not.toContain('bg-mx-black')
    expect(consultoriaClientes).not.toContain('shadow-mx-xl')
  })

  test('proíbe marcadores do design antigo em todo código executável', () => {
    const forbidden = [
      'mxds-',
      'mx-internal-workspace',
      'InternalMxPageFrame',
      'internal-mx-components.css',
      'internal-mx-routes.css',
      'internal-mx-frame.css',
    ]

    for (const file of runtimeFiles(srcRoot)) {
      const source = readFileSync(file, 'utf8')
      for (const marker of forbidden) expect(source).not.toContain(marker)
    }
  })
})
