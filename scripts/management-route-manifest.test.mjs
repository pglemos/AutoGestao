import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  MANAGEMENT_ROLES,
  managementRouteManifest,
  managementSourceEntries,
} from '../src/design-system/management/managementRouteManifest.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('o manifesto cobre as superfícies dos cinco perfis de gestão', () => {
  // 37 desde f4311438, que unificou a tela de meta: /metas passou a redirecionar
  // para /meta-loja e saiu do manifesto. A contagem explícita é tripwire contra
  // rota de gestão adicionada ou removida sem revisão.
  assert.equal(managementRouteManifest.length, 37)
  assert.equal(new Set(managementRouteManifest.map((route) => route.key)).size, managementRouteManifest.length)
  assert.equal(new Set(managementSourceEntries).size, managementSourceEntries.length)
  for (const role of ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente']) {
    assert.equal(MANAGEMENT_ROLES.includes(role), true, `Perfil ausente: ${role}`)
    assert.equal(managementRouteManifest.some((route) => route.roles.includes(role)), true, `Sem rota: ${role}`)
  }
})

test('todas as entradas do manifesto existem e usam apenas perfis autorizados', () => {
  for (const route of managementRouteManifest) {
    assert.equal(fs.existsSync(path.join(root, 'src', route.source)), true, `Fonte ausente: ${route.source}`)
    assert.equal(route.path.startsWith('/'), true, `Rota inválida: ${route.path}`)
    assert.equal(Boolean(route.surface), true, `Superfície ausente: ${route.key}`)
    assert.equal(route.roles.length > 0, true, `Perfis ausentes: ${route.key}`)
    for (const role of route.roles) {
      assert.equal(MANAGEMENT_ROLES.includes(role), true, `Perfil fora do escopo em ${route.key}: ${role}`)
    }
  }
})
