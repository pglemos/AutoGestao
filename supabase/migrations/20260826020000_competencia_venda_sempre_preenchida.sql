-- Competência da venda deixa de poder nascer nula.
--
-- Regra da metodologia: a venda pertence ao mês em que aconteceu. Não existe
-- venda sem competência — é dado incompleto, não uma categoria válida. Uma
-- venda sem competência não entra em ranking, meta, comissão nem no realizado
-- do plano estratégico, e some sem nenhum aviso.
--
-- O buraco estava aqui: a RPC só propagava competência quando alguém informava
-- (`IF v_competencia_efetiva IS NOT NULL`). O CRM não informa — o payload do
-- evento nunca teve `data_competencia` —, então toda venda marcada como ganha
-- sem preenchimento manual nascia órfã. Em agosto/2026 isso atingiu 14% das
-- vendas.
--
-- A cadeia de fallback termina em `data_evento` (a data real do fato) e, por
-- último, na data de hoje: qualquer uma delas é melhor que nulo, porque nulo
-- significa "a venda não existe para o negócio".
create or replace function public.atualizar_etapa_oportunidade_crm(
  p_oportunidade_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_result jsonb;
  v_competencia date := NULLIF(p_payload->>'data_competencia', '')::date;
  v_sale_date date := NULLIF(p_payload->>'sale_date', '')::date;
  v_oportunidade_competencia date;
  v_oportunidade_sale_date date;
  v_evento_id uuid;
  v_evento_data date;
  v_competencia_efetiva date;
BEGIN
  v_result := public.atualizar_etapa_oportunidade_crm_legacy(p_oportunidade_id, p_payload);

  IF COALESCE((v_result->>'ok')::boolean, false)
     AND COALESCE(p_payload->>'etapa', '') = 'ganho' THEN

    SELECT o.data_competencia, o.sale_date
      INTO v_oportunidade_competencia, v_oportunidade_sale_date
      FROM public.oportunidades o
     WHERE o.id = p_oportunidade_id;

    SELECT ec.id, ec.data_evento::date
      INTO v_evento_id, v_evento_data
      FROM public.eventos_comerciais ec
     WHERE ec.oportunidade_id = p_oportunidade_id
       AND ec.tipo_evento = 'venda_realizada'
     ORDER BY ec.data_evento DESC NULLS LAST,
              ec.created_at DESC NULLS LAST,
              ec.id DESC
     LIMIT 1;

    -- Sempre resolve: informada > sale_date > competência/sale_date da
    -- oportunidade > data do evento > hoje. Nunca nula.
    v_competencia_efetiva := coalesce(
      v_competencia,
      v_sale_date,
      v_oportunidade_competencia,
      v_oportunidade_sale_date,
      v_evento_data,
      (now() AT TIME ZONE 'America/Sao_Paulo')::date
    );

    UPDATE public.oportunidades
       SET data_competencia = coalesce(data_competencia, v_competencia_efetiva),
           sale_date = coalesce(sale_date, v_sale_date, v_competencia_efetiva)
     WHERE id = p_oportunidade_id;

    IF v_evento_id IS NOT NULL THEN
      UPDATE public.eventos_comerciais ec
         SET data_competencia = coalesce(ec.data_competencia, v_competencia_efetiva)
       WHERE ec.id = v_evento_id;
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;
