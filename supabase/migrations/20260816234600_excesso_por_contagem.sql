-- Excesso contratual passa a ser medido por contagem, não pelo maior número.
--
-- Com encontros extras no meio da jornada, `max(visit_number)` deixa de
-- descrever o tamanho da jornada contratual: um cliente com 12 encontros
-- contratados, um extra no meio e numeração até 13 aparecia como excesso sem
-- ter nenhum. O que interessa é quantos encontros do contrato existem.

CREATE OR REPLACE VIEW public.vw_jornada_alem_do_contratado
WITH (security_invoker = true) AS
SELECT
  c.id                AS client_id,
  c.name              AS client_name,
  c.program_template_key,
  p.total_visits      AS contratadas,
  max(v.visit_number) AS maior_encontro,
  count(v.id)         AS encontros_registrados
FROM public.clientes_consultoria c
JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
JOIN public.visitas_consultoria v ON v.client_id = c.id AND NOT v.fora_do_contrato
GROUP BY c.id, c.name, c.program_template_key, p.total_visits
HAVING count(v.id) > p.total_visits;

COMMENT ON VIEW public.vw_jornada_alem_do_contratado IS
  'Clientes com mais encontros contratuais do que o produto prevê (extras não contam).';
