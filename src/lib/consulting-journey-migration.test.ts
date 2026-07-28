import { readFileSync } from 'node:fs'
import { expect, test } from 'bun:test'

const sql = readFileSync('supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql', 'utf8')

test('cria somente estruturas portuguesas ausentes', () => {
  for (const table of [
    'consultoria_progresso_aula',
    'consultoria_itens_entrega',
    'consultoria_participantes_encontro',
    'consultoria_solicitacoes_antecipacao',
    'consultoria_historico_antecipacao',
  ]) expect(sql).toContain(`public.${table}`)
  for (const forbidden of ['consulting_lessons', 'lesson_progress', 'meeting_preparations', 'anticipation_requests']) expect(sql).not.toContain(forbidden)
})

test('usa RPCs seguras e não expõe visitas diretamente', () => {
  for (const fn of [
    'get_consultoria_jornada_loja',
    'salvar_progresso_aula_consultoria',
    'atualizar_item_entrega_consultoria',
    'confirmar_participante_consultoria',
    'solicitar_antecipacao_consultoria',
    'revisar_antecipacao_consultoria',
    'cancelar_antecipacao_consultoria',
    'registrar_evidencia_consultoria',
    'revisar_evidencia_consultoria',
  ]) expect(sql).toContain(fn)
  expect(sql).toContain('SECURITY DEFINER')
  expect(sql).toContain('can_access_consulting_client')
  expect(sql).toContain('eh_area_interna_mx')
  expect(sql).toContain('v_elapsed_seconds + 2')
  expect(sql).toContain("p_status NOT IN ('em_analise','aprovada','devolvida')")
})


test('reconhece o programa real e vincula evidência ao requisito da Entrega', () => {
  expect(sql).toContain("WHEN 'pmr_7'")
  expect(sql).toContain("SET evidence_id = v_row.id")
  expect(sql).toContain("item_type <> 'evidence'")
  expect(sql).toContain("ALTER COLUMN source_key SET NOT NULL")
  expect(sql).toContain("lower(COALESCE(v_item ->> 'completed', 'false'))")
})
