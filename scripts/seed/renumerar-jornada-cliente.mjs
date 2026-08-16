/**
 * Renumera a jornada de clientes cuja numeração saiu fora de 1..N.
 *
 * A ordem é cronológica (data agendada), com o número antigo como desempate:
 * jornada é sequência no tempo, e a numeração herdada da importação não segue
 * a data — na Wcar, os encontros 11, 12 e 13 são de janeiro e o "0" é de
 * fevereiro. O número de origem continua preservado em `source_visit_code`.
 *
 *   SUPABASE_ACCESS_TOKEN=... node scripts/seed/renumerar-jornada-cliente.mjs
 *   SUPABASE_ACCESS_TOKEN=... node scripts/seed/renumerar-jornada-cliente.mjs --apply
 *   ... --cliente="Wcar"      restringe a um cliente
 */
const REF = 'fbhcmzzgwjdgkctlfvbo'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const APPLY = process.argv.includes('--apply')
const FILTRO = process.argv.find(arg => arg.startsWith('--cliente='))?.split('=')[1] ?? null
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
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

const filtroSql = FILTRO ? `AND c.name = '${FILTRO.replace(/'/g, "''")}'` : ''

// Clientes cuja jornada não é exatamente 1..N.
const clientes = await sql(`
  SELECT c.id, c.name,
         count(v.id) AS encontros,
         min(v.visit_number) AS menor,
         max(v.visit_number) AS maior
    FROM public.clientes_consultoria c
    JOIN public.visitas_consultoria v ON v.client_id = c.id
   WHERE true ${filtroSql}
   GROUP BY c.id, c.name
  HAVING min(v.visit_number) <> 1 OR max(v.visit_number) <> count(v.id)
   ORDER BY c.name;
`)

if (!clientes.length) {
  console.log('Nenhum cliente com numeração fora de 1..N.')
  process.exit(0)
}

console.log(`\n${clientes.length} cliente(s) com jornada a renumerar:\n`)
console.table(clientes.map(c => ({ cliente: c.name, encontros: c.encontros, menor: c.menor, maior: c.maior })))

for (const cliente of clientes) {
  const visitas = await sql(`
    SELECT visit_number, scheduled_at::date AS agendada, status
      FROM public.visitas_consultoria
     WHERE client_id = '${cliente.id}'
     ORDER BY scheduled_at, visit_number;
  `)
  console.log(`\n${cliente.name}:`)
  console.table(visitas.map((v, index) => ({ de: v.visit_number, para: index + 1, agendada: v.agendada, status: v.status })))
}

if (!APPLY) {
  console.log('\nDiagnóstico apenas. Para aplicar: --apply')
  process.exit(0)
}

const carimbo = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
await sql(`
  CREATE TABLE IF NOT EXISTS public.backup_visit_number_${carimbo} AS
  SELECT id, client_id, visit_number, scheduled_at FROM public.visitas_consultoria
   WHERE client_id IN (${clientes.map(c => `'${c.id}'`).join(', ')});
`)
console.log(`\nBackup criado: public.backup_visit_number_${carimbo}`)

for (const cliente of clientes) {
  // Duas fases: joga para uma faixa alta antes de reescrever, para nunca
  // colidir com um número que ainda existe na mesma jornada.
  await sql(`
    WITH ordenado AS (
      SELECT id, row_number() OVER (ORDER BY scheduled_at, visit_number) AS nova
        FROM public.visitas_consultoria WHERE client_id = '${cliente.id}'
    )
    UPDATE public.visitas_consultoria v
       SET visit_number = 1000 + o.nova, updated_at = now()
      FROM ordenado o WHERE o.id = v.id;
  `)
  await sql(`
    UPDATE public.visitas_consultoria
       SET visit_number = visit_number - 1000, updated_at = now()
     WHERE client_id = '${cliente.id}' AND visit_number > 1000;
  `)
  console.log(`${cliente.name}: ${cliente.encontros} encontro(s) renumerado(s).`)
}

const restantes = await sql(`
  SELECT count(*) AS fora_de_ordem FROM (
    SELECT c.id FROM public.clientes_consultoria c
      JOIN public.visitas_consultoria v ON v.client_id = c.id
     GROUP BY c.id
    HAVING min(v.visit_number) <> 1 OR max(v.visit_number) <> count(v.id)
  ) t;
`)
console.log('Clientes ainda fora de 1..N:', restantes[0].fora_de_ordem)
