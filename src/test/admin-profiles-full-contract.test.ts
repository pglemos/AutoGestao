import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { scanSourceFiles } from './lib/scanSourceFiles'

/**
 * FASE AB — Perfis Administrador Geral / Admin MX / Consultor MX
 *
 * Objetivo: eliminar visual administrativo paralelo sem perder densidade e
 * capabilities. 28.001-003: inventário das rotas exclusivas dos 3 perfis
 * (acesso simétrico — capability de perfil interno). 28.004-011: cada painel
 * usa os MESMOS primitives canônicos (`MxModulePage`/`PageCanvas`), sem página
 * solta nem segunda paleta. 28.012: permissão por capability/RLS, não por
 * aparência (RoleSwitch/ForbiddenRoute). 28.013: densidade compacta herdada do
 * shell, sem segunda paleta/componentes.
 *
 * C8: varredura 100% fs.
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

/** Rotas exclusivas dos perfis admin (inventário 28.001-003, acesso simétrico). */
const ADMIN_EXCLUSIVE_ROUTES = [
  '/lojas/:storeSlug/filiais',
  '/painel',
  '/lojas',
  '/agenda',
  '/consultoria/clientes',
  '/consultoria/clientes/:clientSlug',
  '/consultoria/clientes/:clientSlug/visitas/:visitNumber',
  '/clientes',
  '/clientes/novo',
  '/consultoria-mx',
  '/indicadores',
  '/planos-acao',
  '/configuracoes/operacional',
  '/configuracoes/consultoria-pmr',
  '/configuracoes/reprocessamento',
]

/** Páginas dos painéis admin e o primitive canônico que devem usar. */
const ADMIN_PAGES: Array<[string, string]> = [
  ['src/features/network-dashboard/NetworkDashboardPage.tsx', 'MxModulePage'],
  ['src/features/lojas/Lojas.container.tsx', 'MxModulePage'],
  ['src/features/admin-mx/AdminNovoClientePage.tsx', 'MxModulePage'],
  ['src/features/admin-mx/AdminConsultoriaMxPage.tsx', 'MxModulePage'],
  ['src/features/admin-mx/AdminIndicadoresPage.tsx', 'MxModulePage'],
  ['src/features/admin-mx/AdminPlanosAcaoGlobalPage.tsx', 'MxModulePage'],
  ['src/features/consulting-clients/ConsultingClientsPage.tsx', 'MxModulePage'],
  ['src/features/consulting-clients/ConsultantAssignedClientsPage.tsx', 'MxModulePage'],
  // 28.006: detalhes de cliente e execução de visita (Consultoria Clientes).
  ['src/features/consultoria-cliente/ScopedConsultoriaClienteDetalhe.tsx', 'MxModulePage'],
  ['src/features/consultoria-visita/LegacyConsultoriaVisitaExecucaoPage.tsx', 'PageCanvas'],
  // 28.007: Agenda compartilhada usa PageTemplate (wide, adopted).
  ['src/features/agenda-admin/AgendaAdmin.container.tsx', 'PageTemplate'],
  // 28.008/28.009/28.010: Configurações, Reprocessamento, Auditoria.
  ['src/features/configuracoes/components/ConfiguracoesShell.tsx', 'MxModulePage'],
  ['src/features/reprocessing/LegacyReprocessamentoPage.tsx', 'MxModulePage'],
  ['src/features/operational-diagnostics/OperationalDiagnosticsPage.tsx', 'MxModulePage'],
]

describe('FASE AB — perfis administrador', () => {
  test('28.001-003: as 15 rotas exclusivas admin existem no App.tsx (acesso simétrico)', () => {
    const app = read('src/App.tsx')
    for (const route of ADMIN_EXCLUSIVE_ROUTES) {
      // A rota está no App.tsx (path composto ou path relativo).
      const lastSegment = route.split('/').pop() ?? route
      expect(app, `rota ${route} ausente no App.tsx`).toMatch(new RegExp(lastSegment.replace(/[:]/g, '\\$&')))
    }
  })

  test('28.004-011: painéis admin usam os mesmos primitives canônicos (sem página solta)', () => {
    for (const [file, primitive] of ADMIN_PAGES) {
      const source = read(file)
      expect(source, `${file} sem ${primitive}`).toContain(primitive)
    }
  })

  test('28.012: permissão por capability/RLS via RoleSwitch, não por aparência', () => {
    // As rotas exclusivas usam RoleSwitch/ForbiddenRoute (sem CSS para esconder).
    const app = read('src/App.tsx')
    expect(app).toContain('RoleSwitch')
    expect(app).toContain('ForbiddenRoute')
  })

  test('28.013: densidade compacta herdada do shell, sem segunda paleta', () => {
    const config = read('src/design-system/shell/appShellConfig.ts')
    expect(config).toContain('administrador_geral: INTERNAL_CONFIG')
    expect(config).toContain('administrador_mx: INTERNAL_CONFIG')
    expect(config).toContain('consultor_mx: INTERNAL_CONFIG')
    expect(config).toContain("density: 'compact'")
    // Sem cor/tema por perfil.
    expect(config).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  test('28.004-011: nenhuma página admin "solta" (sem primitive canônico) no runtime', () => {
    const adminMx = read('src/features/admin-mx/AdminNovoClientePage.tsx')
    // As páginas admin-mx não definem padding/width próprios de página.
    expect(adminMx).not.toMatch(/p-mx-(lg|xl)\b[^)]*className/)
  })
})
