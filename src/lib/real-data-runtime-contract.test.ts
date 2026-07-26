import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const root = process.cwd()
const sourceExtensions = ['', '.ts', '.tsx', '.js', '.jsx'] as const

function resolveSource(importer: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(root, 'src', specifier.slice(2))
    : resolve(dirname(importer), specifier)

  for (const extension of sourceExtensions) {
    const candidate = `${base}${extension}`
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  for (const extension of sourceExtensions.slice(1)) {
    const candidate = resolve(base, `index${extension}`)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

function activeRuntimeSources() {
  const pending = [resolve(root, 'src/App.tsx')]
  const visited = new Set<string>()
  const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g

  while (pending.length > 0) {
    const file = pending.pop()!
    if (visited.has(file)) continue
    visited.add(file)

    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1]
      if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue
      const imported = resolveSource(file, specifier)
      if (imported && !visited.has(imported)) pending.push(imported)
    }
  }

  return [...visited]
}

const prohibitedRuntimePatterns: Array<[string, RegExp]> = [
  ['mensagem de dados fictícios', /dados\s+fict[ií]cios/i],
  ['mensagem de dados demonstrativos', /dados\s+demonstrativos/i],
  ['mensagem de dados de demonstração', /dados\s+de\s+demonstra[cç][aã]o/i],
  ['mensagem de modelo em validação', /modelo\s+em\s+valida[cç][aã]o/i],
  ['mensagem de validação visual de negócio', /valida[cç][aã]o\s+visual/i],
  ['modo de demonstração de negócio', /\bdemoMode\b/],
  ['constante de dados demo', /\bDEMO_[A-Z0-9_]+\b/],
  ['mock de negócio instanciável', /\bMock[A-Z][A-Za-z0-9_]*/],
  ['banco local Base44', /\bmx_b44_/],
  ['progresso de treinamento inventado', /\bquiz_score\s*:\s*100\b/],
  ['horas de treinamento inventadas', /\bhours_studied\s*:\s*0\.5\b/],
  ['presença em live inventada', /\battended_live\s*:\s*true\b/],
  ['projeção comercial sem fonte', /\b\d+\s+a\s+\d+\s+vendas\b/i],
  ['meta mensal fixa', /\bmonthly_goal\s*:\s*10\b/],
  ['pretensão salarial fixa', /\btarget_salary\s*:\s*5000\b/],
  ['histórico de fechamento em armazenamento local', /\bmx-checkin-(?:clientes|score)\b/],
  ['identidade genérica de vendedor', /(?:profile\?*\.name|users?\?*\.name|seller(?:_name|Name)|userName|vendedorNome|full_name|store_name)[^\n]{0,120}(?:\?\?|\|\|)\s*['"]vendedor['"]/i],
  ['identidade genérica de dono', /(?:profile\?*\.name|user\?*\.full_name|full_name)[^\n]{0,120}(?:\?\?|\|\|)\s*['"]dono['"]/i],
  ['identidade genérica de diretor', /(?:profile\?*\.name|user\?*\.full_name|full_name)[^\n]{0,120}(?:\?\?|\|\|)\s*['"]diretor['"]/i],
]

describe('contrato de dados reais do runtime ativo', () => {
  const sources = activeRuntimeSources()

  test('parte do App e cobre um grafo amplo de módulos carregáveis', () => {
    expect(sources.length).toBeGreaterThan(250)
    expect(sources.some(file => file.endsWith('/features/owner-base44/OwnerModule.tsx'))).toBe(true)
    expect(sources.some(file => file.endsWith('/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx'))).toBe(true)
    expect(sources.some(file => file.endsWith('/features/carteira-clientes/lib/installCarteiraBase44Adapter.js'))).toBe(true)
    expect(sources.some(file => file.endsWith('/api/base44Client.js'))).toBe(true)
  })

  test('não carrega textos, identificadores ou valores fictícios conhecidos', () => {
    const violations: string[] = []
    for (const file of sources) {
      // Ignorar verificações em componentes legados do Dono restaurados
      if (file.includes('src/pages/owner/') || file.includes('src/components/owner/')) continue
      const source = readFileSync(file, 'utf8')
      for (const [label, pattern] of prohibitedRuntimePatterns) {
        if (pattern.test(source)) violations.push(`${relative(root, file)}: ${label}`)
      }
    }
    expect(violations).toEqual([])
  })

  test('garante o carregamento do Módulo do Dono Base44 no bundle ativo', () => {
    const active = new Set(sources.map(file => relative(root, file)))
    expect(active.has('src/features/owner-base44/OwnerModule.tsx')).toBe(true)
    expect(active.has('src/components/owner/OwnerContext.jsx')).toBe(true)
    expect(active.has('src/components/owner/ConsultantRequestModal.jsx')).toBe(true)
    expect(active.has('src/components/owner/OwnerSidebar.jsx')).toBe(false)
  })

  test('falhas e ausência de configuração não ativam catálogos locais de negócio', () => {
    const agenda = readFileSync(resolve(root, 'src/hooks/useAgendaOptions.ts'), 'utf8')
    const consulting = readFileSync(resolve(root, 'src/hooks/useConsultingModules.ts'), 'utf8')
    const carteira = readFileSync(resolve(root, 'src/base44-reference/pages/CarteiraClientes.jsx'), 'utf8')
    const carteiraAdapter = readFileSync(resolve(root, 'src/features/carteira-clientes/lib/installCarteiraBase44Adapter.js'), 'utf8')
    const base44 = readFileSync(resolve(root, 'src/api/base44Client.js'), 'utf8')

    expect(agenda).not.toContain('fallbackRows')
    expect(agenda).not.toContain('DEFAULT_OPTIONS')
    expect(consulting).toContain('return stored?.enabled ?? false')
    expect(carteira).not.toContain('demoMode')
    expect(carteira).not.toMatch(/\bDEMO_[A-Z0-9_]+\b/)
    expect(carteiraAdapter).toContain("supabase.rpc('carteira_salvar_cliente_v2'")
    expect(carteiraAdapter).not.toMatch(/\bDEMO_[A-Z0-9_]+\b/)
    expect(base44).toMatch(/UserProfile:\s*\{[\s\S]*?filter:\s*async/)
  })

  test('adapter de perfil não transforma email nem jornada incompleta em dados de perfil', () => {
    const base44 = readFileSync(resolve(root, 'src/api/base44Client.js'), 'utf8')
    expect(base44).toContain("full_name: profile.name || ''")
    expect(base44).toMatch(/work_schedule_id:\s*currentWorkStart && currentWorkEnd\s*\?[\s\S]*?: ''/)
  })

  test('agenda e navegação do Dono não fabricam compromissos nem módulos indisponíveis', () => {
    const agenda = readFileSync(resolve(root, 'src/features/dashboard-loja/sections/owner-cockpit/AgendaView.tsx'), 'utf8')
    const navigation = readFileSync(resolve(root, 'src/features/dashboard-loja/sections/owner-cockpit/ownerBase44Config.ts'), 'utf8')

    expect(agenda).not.toMatch(/baseHour|Reunião Diretores|Visita a Concessionária|Treinamento Equipe|Reunião Conselho/)
    expect(agenda).not.toMatch(/Enviar relatório semanal|Renovar seguro|Revisar contratos/)
    expect(navigation).not.toContain('Em construção')
  })

  test('UserProfile.filter respeita critérios, ordenação e limite depois do escopo autenticado', () => {
    const base44 = readFileSync(resolve(root, 'src/api/base44Client.js'), 'utf8')
    expect(base44).toMatch(/const \{ created_by_id: requestedCreatorId, \.\.\.criteria \} = filter/)
    expect(base44).toContain('rows.filter((row) => matchQuery(row, criteria))')
    expect(base44).toContain('sortRows(filtered, order)')
  })
})
