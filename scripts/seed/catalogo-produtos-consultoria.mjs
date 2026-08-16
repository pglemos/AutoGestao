/**
 * Semeia o catálogo oficial de produtos de consultoria e a metodologia de cada
 * encontro, a partir da planilha CONSULTORIA-CRONOGRAMADEVISITAS.
 *
 * Idempotente: produto por `program_key`, versão de metodologia por
 * (program_key, methodology_version_number) e encontro por (versão, visita).
 * Rodar de novo atualiza em vez de duplicar.
 *
 * Uso: SUPABASE_ACCESS_TOKEN=... node scripts/seed/catalogo-produtos-consultoria.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs'

const REF = 'fbhcmzzgwjdgkctlfvbo'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const DRY = process.argv.includes('--dry-run')
if (!TOKEN) {
  console.error('Defina SUPABASE_ACCESS_TOKEN.')
  process.exit(1)
}

const ENCONTROS = JSON.parse(readFileSync(new URL('./encontros-consultoria.json', import.meta.url), 'utf8'))

/** Regras da especificação: os limites pertencem à versão do produto. */
const PRODUTOS = [
  { program_key: 'pmr_online', name: 'PMR Online', planilha: 'PMR ONLINE', total_visits: 12, min_presenciais: 0, max_presenciais: 0, modalidade: 'online', descricao: 'Programa de Maximização de Resultados — 12 encontros, todos online.' },
  { program_key: 'pmr_hibrido', name: 'PMR Híbrido', planilha: 'PMR HIBRIDO', total_visits: 12, min_presenciais: 2, max_presenciais: 9, modalidade: 'hibrido', descricao: 'Programa de Maximização de Resultados — 12 encontros, de 2 a 9 presenciais.' },
  { program_key: 'pmr_plus', name: 'PMR Plus', planilha: 'ENCONTRO_PMR PLUS', total_visits: 9, min_presenciais: 2, max_presenciais: 9, modalidade: 'hibrido', descricao: 'PMR Plus — 9 encontros com foco financeiro, de 2 a 9 presenciais.' },
  { program_key: 'ppa', name: 'PPA', planilha: 'ENCONTRO_PPA', total_visits: 9, min_presenciais: 2, max_presenciais: 9, modalidade: 'hibrido', descricao: 'Programa de Performance Acelerada — 9 encontros, de 2 a 9 presenciais.' },
]

const sql = async query => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

const lit = value => (value === null || value === undefined || value === '' ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`)

for (const produto of PRODUTOS) {
  const encontros = ENCONTROS[produto.planilha] ?? []
  if (encontros.length !== produto.total_visits) {
    console.warn(`aviso: ${produto.program_key} tem ${encontros.length} encontro(s) na planilha e ${produto.total_visits} previstos`)
  }
  if (DRY) {
    console.log(`[dry-run] ${produto.program_key}: ${encontros.length} encontros, ${produto.min_presenciais}-${produto.max_presenciais} presenciais`)
    continue
  }

  await sql(`
    insert into public.programas_visita_consultoria
      (program_key, name, total_visits, active, status, versao, descricao, modalidade, min_presenciais, max_presenciais)
    values (${lit(produto.program_key)}, ${lit(produto.name)}, ${produto.total_visits}, true, 'publicado', 1,
            ${lit(produto.descricao)}, ${lit(produto.modalidade)}, ${produto.min_presenciais}, ${produto.max_presenciais})
    on conflict (program_key) do update set
      name = excluded.name, total_visits = excluded.total_visits, descricao = excluded.descricao,
      modalidade = excluded.modalidade, min_presenciais = excluded.min_presenciais,
      max_presenciais = excluded.max_presenciais, updated_at = now();
  `)

  const [versao] = await sql(`
    insert into public.versoes_metodologia_produto
      (program_key, product_name, methodology_version_number, status, encounters_configured, encounters_pending, published_at)
    values (${lit(produto.program_key)}, ${lit(produto.name)}, '1.0', 'publicado', ${encontros.length}, 0, now())
    on conflict (program_key, methodology_version_number) do update set
      encounters_configured = excluded.encounters_configured, status = 'publicado',
      published_at = coalesce(public.versoes_metodologia_produto.published_at, now()), updated_at = now()
    returning id;
  `)

  for (const encontro of encontros) {
    await sql(`
      insert into public.conteudo_encontro
        (methodology_version_id, visit_number, objective, reason, required_participant_roles, status, owner_visibility, can_be_anticipated)
      values ('${versao.id}', ${encontro.n}, ${lit(encontro.motivo)}, ${lit(encontro.motivo)}, ${lit(encontro.alvo)}, 'publicado', true, false)
      on conflict (methodology_version_id, visit_number) do update set
        objective = excluded.objective, reason = excluded.reason,
        required_participant_roles = excluded.required_participant_roles, updated_at = now();
    `)
    // Estrutura do produto: é ela que nomeia os encontros na jornada da tela
    // de metodologia (etapas_modelo_visita_consultoria), separada do conteúdo
    // metodológico versionado.
    await sql(`
      insert into public.etapas_modelo_visita_consultoria
        (program_key, visit_number, objective, target, duration, active)
      values (${lit(produto.program_key)}, ${encontro.n}, ${lit(encontro.motivo)}, ${lit(encontro.alvo)},
              ${lit(encontro.formato_ou_tempo || null)}, true)
      on conflict (program_key, visit_number) do update set
        objective = excluded.objective, target = excluded.target,
        duration = excluded.duration, updated_at = now();
    `)
    // Modalidade prevista do encontro vira hora presencial ou online.
    const presencial = String(encontro.formato_ou_tempo).toLowerCase().includes('presencial')
    await sql(`
      insert into public.tempos_encontro_produto (program_key, visit_number, horas_online, horas_presencial, origem)
      values (${lit(produto.program_key)}, ${encontro.n}, ${presencial ? 'NULL' : '2'}, ${presencial ? '8' : 'NULL'}, 'planilha')
      on conflict (program_key, visit_number) do update set
        horas_online = excluded.horas_online, horas_presencial = excluded.horas_presencial,
        origem = 'planilha', updated_at = now();
    `)
  }
  console.log(`ok ${produto.program_key}: ${encontros.length} encontro(s) semeados`)
}

if (!DRY) {
  const resumo = await sql(`
    select p.program_key, p.total_visits, p.min_presenciais, p.max_presenciais,
           (select count(*) from public.tempos_encontro_produto t where t.program_key = p.program_key) as tempos
    from public.programas_visita_consultoria p order by p.program_key;
  `)
  console.table(resumo)
}
