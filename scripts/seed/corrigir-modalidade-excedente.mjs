/**
 * Ajusta a modalidade das visitas que estouram o máximo presencial do produto.
 *
 * Converte para "Online" apenas o EXCEDENTE agendado, começando pelos encontros
 * de maior número. Não toca em visita concluída nem em presencial que caiba no
 * contrato — o objetivo é acertar o dado herdado da importação (270 visitas
 * marcadas presenciais, 3 concluídas), não apagar decisão de consultor.
 *
 *   SUPABASE_ACCESS_TOKEN=... node scripts/seed/corrigir-modalidade-excedente.mjs
 *   SUPABASE_ACCESS_TOKEN=... node scripts/seed/corrigir-modalidade-excedente.mjs --apply
 */
const REF = 'fbhcmzzgwjdgkctlfvbo'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const APPLY = process.argv.includes('--apply')
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

// Excedente = presenciais além do máximo, entre as ainda agendadas, das mais
// recentes para as mais antigas.
const SELECAO = `
  WITH ranked AS (
    SELECT v.id, v.client_id, v.visit_number, v.status, c.name AS cliente, p.max_presenciais,
           row_number() OVER (PARTITION BY v.client_id ORDER BY v.visit_number DESC) AS ordem_reversa,
           count(*) OVER (PARTITION BY v.client_id) AS total_presenciais
      FROM public.visitas_consultoria v
      JOIN public.clientes_consultoria c ON c.id = v.client_id
      JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
     WHERE lower(coalesce(v.modality, '')) = 'presencial'
       AND p.max_presenciais IS NOT NULL
  )
  SELECT * FROM ranked
   WHERE total_presenciais > max_presenciais
     AND ordem_reversa <= (total_presenciais - max_presenciais)
     AND status = 'agendada'
`

const alvo = await sql(`${SELECAO} ORDER BY cliente, visit_number;`)
const porCliente = alvo.reduce((acc, row) => {
  acc[row.cliente] = (acc[row.cliente] ?? 0) + 1
  return acc
}, {})

console.log(`\n${alvo.length} visita(s) agendada(s) a converter para Online, em ${Object.keys(porCliente).length} cliente(s):\n`)
console.table(porCliente)

const protegidas = await sql(`${SELECAO} AND status <> 'agendada';`.replace('AND status = \'agendada\'', ''))
console.log(`Visitas no excedente que NÃO serão tocadas por não estarem agendadas: ${protegidas.filter(r => r.status !== 'agendada').length}`)

if (!APPLY) {
  console.log('\nDiagnóstico apenas. Para aplicar: --apply')
  process.exit(0)
}

const carimbo = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
await sql(`
  CREATE TABLE IF NOT EXISTS public.backup_modality_${carimbo} AS
  SELECT id, client_id, visit_number, modality, status FROM public.visitas_consultoria
   WHERE lower(coalesce(modality, '')) = 'presencial';
`)
console.log(`\nBackup criado: public.backup_modality_${carimbo}`)

await sql(`
  UPDATE public.visitas_consultoria
     SET modality = 'Online', updated_at = now()
   WHERE id IN (SELECT id FROM (${SELECAO}) alvo);
`)
console.log(`${alvo.length} visita(s) convertida(s).`)

const restantes = await sql(`
  SELECT count(*) AS clientes_acima FROM (
    SELECT c.id
      FROM public.clientes_consultoria c
      JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
      LEFT JOIN public.visitas_consultoria v ON v.client_id = c.id
     WHERE p.max_presenciais IS NOT NULL
     GROUP BY c.id, p.max_presenciais
    HAVING count(v.id) FILTER (WHERE lower(coalesce(v.modality, '')) = 'presencial') > p.max_presenciais
  ) t;
`)
console.log('Clientes ainda acima do máximo presencial:', restantes[0].clientes_acima)
