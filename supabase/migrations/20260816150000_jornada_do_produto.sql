-- Jornada do cliente derivada da versão do produto.
--
-- A especificação pede duas automações: gerar a jornada a partir da versão do
-- produto e impedir ultrapassar as visitas contratadas.
--
-- A segunda NÃO vira bloqueio agora, de propósito: 24 dos 41 clientes com
-- jornada já têm encontro além do total do produto vinculado (`pmr_7`, de 7
-- encontros, com clientes chegando a 13). Um trigger rígido travaria operação
-- real e legítima. O que entra é a *detecção* — a inconsistência fica visível
-- na Visão 360 — e o bloqueio passa a ser possível depois que os clientes
-- forem remapeados para o catálogo correto.

/**
 * Cria os encontros que faltam para o cliente conforme o total de visitas do
 * produto contratado. Idempotente e aditiva: nunca apaga nem renumera encontro
 * existente — o histórico de execução é do consultor, não do gerador.
 */
CREATE OR REPLACE FUNCTION public.gerar_jornada_cliente(p_client_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_product text;
  v_modality text;
  v_criadas integer := 0;
  v_numero integer;
  -- scheduled_at é NOT NULL sem default: a jornada nasce com data prevista
  -- mensal a partir de hoje, para o consultor reagendar depois.
  v_inicio timestamptz := date_trunc('day', now());
BEGIN
  SELECT p.total_visits, c.product_name, coalesce(c.modality, p.modalidade)
    INTO v_total, v_product, v_modality
    FROM public.clientes_consultoria c
    JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
   WHERE c.id = p_client_id;

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Cliente sem produto contratado: não há jornada a gerar.'
      USING ERRCODE = 'check_violation';
  END IF;

  FOR v_numero IN 1..v_total LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.visitas_consultoria v
       WHERE v.client_id = p_client_id AND v.visit_number = v_numero
    ) THEN
      INSERT INTO public.visitas_consultoria (client_id, visit_number, status, product_name, modality, scheduled_at)
      VALUES (p_client_id, v_numero, 'agendada', v_product, v_modality,
              v_inicio + make_interval(months => v_numero - 1));
      v_criadas := v_criadas + 1;
    END IF;
  END LOOP;

  RETURN v_criadas;
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_jornada_cliente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_jornada_cliente(uuid) TO authenticated;

/**
 * Clientes cuja jornada passou do total contratado. Alimenta a aba
 * "Dados e Integridade" da Visão 360 — hoje isso indica produto mal vinculado,
 * não excesso de execução.
 */
CREATE OR REPLACE VIEW public.vw_jornada_alem_do_contratado AS
SELECT
  c.id                AS client_id,
  c.name              AS client_name,
  c.program_template_key,
  p.total_visits      AS contratadas,
  max(v.visit_number) AS maior_encontro,
  count(v.id)         AS encontros_registrados
FROM public.clientes_consultoria c
JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
JOIN public.visitas_consultoria v ON v.client_id = c.id
GROUP BY c.id, c.name, c.program_template_key, p.total_visits
HAVING max(v.visit_number) > p.total_visits;

REVOKE ALL ON public.vw_jornada_alem_do_contratado FROM PUBLIC;
GRANT SELECT ON public.vw_jornada_alem_do_contratado TO authenticated;

COMMENT ON FUNCTION public.gerar_jornada_cliente(uuid) IS
  'Cria os encontros faltantes do cliente conforme o produto; idempotente e aditiva.';
COMMENT ON VIEW public.vw_jornada_alem_do_contratado IS
  'Clientes com encontro além do total contratado — sintoma de produto mal vinculado.';
