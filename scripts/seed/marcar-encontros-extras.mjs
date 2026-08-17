/**
 * Recalcula quais encontros são adicionais ao contrato.
 *
 * A primeira marcação usou posição cronológica: "o que passa do total vira
 * extra". O total fechava, mas escolhia errado — na Espíndola, o encontro
 * "Análise das Implementações e Plano de Ação Trimestral" (tema do programa)
 * virou extra, enquanto acompanhamentos anteriores ficaram como contratuais.
 *
 * A regra correta olha o TIPO do encontro:
 *   1. encontro temático (objetivo próprio da metodologia) é sempre contratual;
 *   2. acompanhamentos contam até o que o produto prevê (3 nos produtos novos);
 *   3. acompanhamento excedente e encontro sem objetivo viram extras;
 *   4. se ainda passar do total contratado, o excesso mais recente vira extra.
 */
import { classificarEncontro, decidirExtras } from './encontrosExtras.mjs'

const REF = 'fbhcmzzgwjdgkctlfvbo'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const APPLY = process.argv.includes('--apply')
if (!TOKEN) {
  console.error('Defina SUPABASE_ACCESS_TOKEN.')
  process.exit(1)
}

const sql = async query => {
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const text = await response.text()
    if (response.ok) return JSON.parse(text)
    if (response.status >= 500 && tentativa < 3) {
      await new Promise(resolve => setTimeout(resolve, 3000 * tentativa))
      continue
    }
    throw new Error(`${response.status} ${text.slice(0, 300)}`)
  }
}

const clientes = await sql(`
  SELECT c.id, c.name, p.total_visits,
         (SELECT count(*) FROM public.etapas_modelo_visita_consultoria e
           WHERE e.program_key = c.program_template_key AND e.objective ILIKE '%acompanh%') AS acompanhamentos_previstos
    FROM public.clientes_consultoria c
    JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
   WHERE EXISTS (SELECT 1 FROM public.visitas_consultoria v WHERE v.client_id = c.id)
   ORDER BY c.name;
`)

let mudancas = []
for (const cliente of clientes) {
  const encontros = await sql(`
    SELECT id, visit_number, objective, fora_do_contrato
      FROM public.visitas_consultoria WHERE client_id = '${cliente.id}'
     ORDER BY scheduled_at, visit_number;
  `)
  const extras = decidirExtras(encontros, Number(cliente.total_visits), Number(cliente.acompanhamentos_previstos))
  for (const encontro of encontros) {
    const deveSer = extras.has(encontro.id)
    if (deveSer !== encontro.fora_do_contrato) {
      mudancas.push({ cliente: cliente.name, visita: encontro.visit_number, objetivo: (encontro.objective ?? '(sem objetivo)').slice(0, 40), de: encontro.fora_do_contrato, para: deveSer, id: encontro.id })
    }
  }
}

console.log(`\n${mudancas.length} encontro(s) com marcação a corrigir:\n`)
console.table(mudancas.slice(0, 25).map(m => ({ cliente: m.cliente, visita: m.visita, objetivo: m.objetivo, extra: `${m.de} → ${m.para}` })))
if (mudancas.length > 25) console.log(`... e mais ${mudancas.length - 25}`)

if (!APPLY) {
  console.log('\nDiagnóstico apenas. Para aplicar: --apply')
  process.exit(0)
}

for (const mudanca of mudancas) {
  await sql(`UPDATE public.visitas_consultoria SET fora_do_contrato = ${mudanca.para}, updated_at = now() WHERE id = '${mudanca.id}';`)
}
console.log(`${mudancas.length} marcação(ões) corrigida(s).`)

const conferencia = await sql(`
  SELECT
    (SELECT count(*) FROM public.visitas_consultoria WHERE fora_do_contrato) AS extras,
    (SELECT count(*) FROM public.vw_jornada_alem_do_contratado) AS alem_do_contratado,
    (SELECT count(*) FROM public.visitas_consultoria v WHERE v.fora_do_contrato
       AND v.objective IS NOT NULL AND v.objective NOT ILIKE '%acompanh%') AS tematicos_marcados_extra;
`)
console.table(conferencia)
