#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { buildXlsxWorkbook } from '../src/lib/export'
import {
  buildTeamContactRows,
  buildTeamContactsWorkbook,
  type ContactExportMembership,
  type ContactExportSellerTenure,
  type ContactExportStore,
} from '../src/lib/team-contacts-export'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getArgValue(name: string) {
  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return inline?.slice(name.length + 1)
}

function defaultOutPath() {
  const date = new Date().toISOString().slice(0, 10)
  return resolve(process.cwd(), 'scratch', 'exports', `contatos-cadastros-mx-${date}.xlsx`)
}

async function fetchAllRows<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
) {
  const pageSize = 1000
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data || []) as T[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.')
    process.exit(1)
  }

  const outPath = resolve(process.cwd(), getArgValue('--out') || defaultOutPath())
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const memberships = await fetchAllRows<ContactExportMembership>((from, to) =>
    supabase
      .from('vinculos_loja')
      .select('user_id, store_id, role, is_active, ended_at, created_at, users:usuarios(id, name, email, phone, active), store:lojas(id, name, active)')
      .in('role', ['dono', 'gerente', 'vendedor'])
      .range(from, to),
  )

  const sellerTenures = await fetchAllRows<ContactExportSellerTenure>((from, to) =>
    supabase
      .from('vendedores_loja')
      .select('seller_user_id, store_id, started_at, ended_at, is_active')
      .range(from, to),
  )

  const stores = await fetchAllRows<ContactExportStore>((from, to) =>
    supabase
      .from('lojas')
      .select('id, name, active, partners')
      .eq('active', true)
      .range(from, to),
  )

  const rows = buildTeamContactRows({
    memberships,
    sellerTenures,
    stores,
    referenceDate: new Date().toISOString().slice(0, 10),
  })
  const sheets = buildTeamContactsWorkbook(rows)

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, buildXlsxWorkbook(sheets.map((sheet) => ({
    name: sheet.name,
    headers: [...sheet.headers],
    rows: sheet.rows.map((row) => ({ ...row })),
  }))))
  console.log(`Planilha gerada: ${outPath}`)
  console.log(`Contatos exportados: ${rows.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
