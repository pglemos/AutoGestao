/**
 * Faxina completa das jornadas herdadas da importação, em quatro passos:
 *
 *   1. mescla visitas duplicadas (mesmo cliente e mesma data), preservando a
 *      linha vinda do calendário e movendo as entregas da órfã;
 *   2. remove entrega que virou cópia exata depois da mesclagem;
 *   3. move para PMR Híbrido (12 encontros) o cliente cuja jornada real não
 *      cabe no PMR Plus (9);
 *   4. renumera cronologicamente o que sobrou.
 *
 * Sem `--apply` só diagnostica. Com `--apply`, faz backup de tudo que toca.
 */
const REF = 'fbhcmzzgwjdgkctlfvbo'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const APPLY = process.argv.includes('--apply')
if (!TOKEN) {
  console.error('Defina SUPABASE_ACCESS_TOKEN.')
  process.exit(1)
}
const carimbo = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)

const sql = async query => {
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const text = await response.text()
    if (response.ok) return JSON.parse(text)
    // A API de management devolve 502 esporádico em execução longa.
    if (response.status >= 500 && tentativa < 3) {
      await new Promise(resolve => setTimeout(resolve, 3000 * tentativa))
      continue
    }
    throw new Error(`${response.status} ${text.slice(0, 300)}`)
  }
}

/** Em cada grupo de mesma data, a visita que fica é a mais completa. */
const VISITA_PRESERVADA = `
  SELECT DISTINCT ON (client_id, scheduled_at::date) id, client_id, scheduled_at::date AS dia
    FROM public.visitas_consultoria
   ORDER BY client_id, scheduled_at::date,
            (source_import_key IS NULL), (objective IS NULL), created_at
`

const duplicadas = await sql(`
  WITH preservada AS (${VISITA_PRESERVADA})
  SELECT v.id, v.client_id, c.name AS cliente, v.scheduled_at::date AS dia, p.id AS fica
    FROM public.visitas_consultoria v
    JOIN public.clientes_consultoria c ON c.id = v.client_id
    JOIN preservada p ON p.client_id = v.client_id AND p.dia = v.scheduled_at::date
   WHERE v.id <> p.id
   ORDER BY c.name, v.scheduled_at;
`)

const semLugar = await sql(`
  WITH preservada AS (${VISITA_PRESERVADA})
  SELECT c.id, c.name, c.program_template_key, p.total_visits, count(pr.id) AS encontros
    FROM public.clientes_consultoria c
    JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
    JOIN preservada pr ON pr.client_id = c.id
   GROUP BY c.id, c.name, c.program_template_key, p.total_visits
  HAVING count(pr.id) > p.total_visits
   ORDER BY count(pr.id) DESC;
`)

console.log(`\n1) Visitas duplicadas a mesclar: ${duplicadas.length}`)
console.table(Object.entries(duplicadas.reduce((acc, d) => { acc[d.cliente] = (acc[d.cliente] ?? 0) + 1; return acc }, {})))
console.log(`\n3) Clientes cuja jornada não cabe no produto: ${semLugar.length}`)
console.table(semLugar.map(c => ({ cliente: c.name, produto: c.program_template_key, contratado: c.total_visits, encontros: Number(c.encontros) })))

if (!APPLY) {
  console.log('\nDiagnóstico apenas. Para aplicar: --apply')
  process.exit(0)
}

await sql(`
  CREATE TABLE IF NOT EXISTS public.backup_faxina_visitas_${carimbo} AS
    SELECT * FROM public.visitas_consultoria;
  CREATE TABLE IF NOT EXISTS public.backup_faxina_entregas_${carimbo} AS
    SELECT * FROM public.consultoria_itens_entrega;
`)
console.log(`\nBackup: backup_faxina_visitas_${carimbo} e backup_faxina_entregas_${carimbo}`)

// 1 + 2. Entregas da órfã: as que a visita preservada já tem (mesmo
// `source_key`, que é chave única por visita) são descartadas; o resto migra.
let descartadas = 0
for (const dup of duplicadas) {
  const apagadas = await sql(`
    DELETE FROM public.consultoria_itens_entrega orfa
     WHERE orfa.visit_id = '${dup.id}'
       AND EXISTS (
         SELECT 1 FROM public.consultoria_itens_entrega mantida
          WHERE mantida.visit_id = '${dup.fica}'
            AND coalesce(mantida.source_key, '') = coalesce(orfa.source_key, '')
       )
    RETURNING orfa.id;
  `)
  descartadas += apagadas.length
  await sql(`UPDATE public.consultoria_itens_entrega SET visit_id = '${dup.fica}', updated_at = now() WHERE visit_id = '${dup.id}';`)
  await sql(`DELETE FROM public.visitas_consultoria WHERE id = '${dup.id}';`)
}
console.log(`${duplicadas.length} visita(s) duplicada(s) mesclada(s); ${descartadas} entrega(s) repetida(s) descartada(s).`)

// 3. Produto compatível com a jornada real.
for (const cliente of semLugar) {
  const destino = Number(cliente.encontros) <= 12 ? 'pmr_hibrido' : null
  if (!destino) {
    console.log(`  ! ${cliente.name}: ${cliente.encontros} encontros — acima de qualquer produto do catálogo, mantido em ${cliente.program_template_key}`)
    continue
  }
  await sql(`
    UPDATE public.clientes_consultoria
       SET program_template_key = 'pmr_hibrido', product_name = 'PMR Híbrido', updated_at = now()
     WHERE id = '${cliente.id}';
  `)
}
console.log('Produtos ajustados para quem cabia em PMR Híbrido.')

// 4. Renumeração final.
const fora = await sql(`
  SELECT c.id, c.name FROM public.clientes_consultoria c
    JOIN public.visitas_consultoria v ON v.client_id = c.id
   GROUP BY c.id, c.name
  HAVING min(v.visit_number) <> 1 OR max(v.visit_number) <> count(v.id);
`)
for (const cliente of fora) {
  await sql(`
    WITH ordenado AS (
      SELECT id, row_number() OVER (ORDER BY scheduled_at, visit_number) AS nova
        FROM public.visitas_consultoria WHERE client_id = '${cliente.id}'
    )
    UPDATE public.visitas_consultoria v SET visit_number = 1000 + o.nova, updated_at = now()
      FROM ordenado o WHERE o.id = v.id;
  `)
  await sql(`UPDATE public.visitas_consultoria SET visit_number = visit_number - 1000, updated_at = now() WHERE client_id = '${cliente.id}' AND visit_number > 1000;`)
}
console.log(`${fora.length} jornada(s) renumerada(s).`)

const final = await sql(`
  SELECT
    (SELECT count(*) FROM (SELECT client_id FROM public.visitas_consultoria GROUP BY 1
       HAVING min(visit_number) <> 1 OR max(visit_number) <> count(*)) t) AS fora_de_1_a_n,
    (SELECT count(*) FROM (SELECT client_id, visit_number FROM public.visitas_consultoria
       GROUP BY 1,2 HAVING count(*) > 1) t) AS numeros_repetidos,
    (SELECT count(*) FROM (SELECT client_id, scheduled_at::date FROM public.visitas_consultoria
       GROUP BY 1,2 HAVING count(*) > 1) t) AS mesma_data_repetida,
    (SELECT count(*) FROM public.vw_jornada_alem_do_contratado) AS alem_do_contratado,
    (SELECT count(*) FROM public.visitas_consultoria) AS visitas;
`)
console.table(final)
