/**
 * Remapeia clientes dos produtos legados (`pmr_7`, `pmr_9`) para o catálogo
 * oficial, com base no maior encontro já registrado na jornada.
 *
 * NÃO roda sozinho: sem `--apply` faz apenas o diagnóstico. Trocar o produto de
 * um cliente muda a jornada esperada, a capacidade do consultor e o que o Dono
 * vê — é decisão de produto, não de script.
 *
 *   SUPABASE_ACCESS_TOKEN=... node scripts/seed/remapear-produtos-clientes.mjs
 *   SUPABASE_ACCESS_TOKEN=... node scripts/seed/remapear-produtos-clientes.mjs --apply --regra=por-jornada
 *
 * Regras disponíveis:
 *   por-jornada  cada cliente vai para o menor produto que comporta sua jornada
 *   plus         todos para PMR Plus (9 encontros)
 *   hibrido      todos para PMR Híbrido (12 encontros)
 */
import { escolherProduto } from './remapeamentoProdutos.mjs'

const REF = 'fbhcmzzgwjdgkctlfvbo'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const APPLY = process.argv.includes('--apply')
const REGRA = (process.argv.find(arg => arg.startsWith('--regra='))?.split('=')[1]) ?? 'por-jornada'
if (!TOKEN) {
  console.error('Defina SUPABASE_ACCESS_TOKEN.')
  process.exit(1)
}

const sql = async query => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 400)}`)
  return JSON.parse(text)
}

const clientes = await sql(`
  SELECT c.id, c.name, c.program_template_key, c.status,
         coalesce(max(v.visit_number), 0) AS maior_encontro,
         count(v.id) AS encontros
    FROM public.clientes_consultoria c
    LEFT JOIN public.visitas_consultoria v ON v.client_id = c.id
   WHERE c.program_template_key IN ('pmr_7', 'pmr_9')
   GROUP BY c.id, c.name, c.program_template_key, c.status
   ORDER BY maior_encontro DESC, c.name;
`)

const plano = clientes.map(cliente => ({
  ...cliente,
  destino: escolherProduto(cliente.maior_encontro, REGRA),
}))

const resumo = plano.reduce((acc, item) => {
  const chave = `${item.program_template_key} → ${item.destino.key}`
  acc[chave] = (acc[chave] ?? 0) + 1
  return acc
}, {})

console.log(`\nRegra: ${REGRA} · ${plano.length} cliente(s) em produto legado\n`)
console.table(resumo)
console.log('\nClientes com jornada acima de 9 encontros (exigem PMR Híbrido):')
console.table(plano.filter(item => item.maior_encontro > 9).map(item => ({
  cliente: item.name, maior_encontro: item.maior_encontro, destino: item.destino.key,
})))

if (!APPLY) {
  console.log('\nDiagnóstico apenas. Para aplicar: --apply --regra=<por-jornada|plus|hibrido>')
  process.exit(0)
}

// Snapshot antes, para reverter se preciso.
const carimbo = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
await sql(`
  CREATE TABLE IF NOT EXISTS public.backup_program_key_${carimbo} AS
  SELECT id, program_template_key, product_name FROM public.clientes_consultoria
   WHERE program_template_key IN ('pmr_7', 'pmr_9');
`)
console.log(`\nBackup criado: public.backup_program_key_${carimbo}`)

for (const item of plano) {
  await sql(`
    UPDATE public.clientes_consultoria
       SET program_template_key = '${item.destino.key}',
           product_name = '${item.destino.nome}',
           updated_at = now()
     WHERE id = '${item.id}';
  `)
}
console.log(`${plano.length} cliente(s) remapeado(s).`)

const conferencia = await sql(`
  SELECT program_template_key, count(*) AS clientes
    FROM public.clientes_consultoria GROUP BY 1 ORDER BY 2 DESC;
`)
console.table(conferencia)
const inconsistentes = await sql('SELECT count(*) AS total FROM public.vw_jornada_alem_do_contratado;')
console.log('Clientes com jornada além do contratado após o remapeamento:', inconsistentes[0].total)
