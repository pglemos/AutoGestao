-- Cancelamento de vendas oficiais sem oportunidade materializada.
--
-- O read model oficial é `eventos_comerciais`: algumas vendas históricas têm
-- apenas o fato `venda_realizada` e não possuem `oportunidade_id`. A RPC
-- anterior só aceitava a oportunidade, então essas linhas não tinham ação de
-- cancelamento na operação de gerente/dono/Admin MX.
--
-- A venda original permanece imutável. O cancelamento é um fato compensatório
-- ligado por `evento_origem_id`; os agregados oficiais passam a descontar esse
-- par tanto para oportunidades quanto para vendas órfãs.

BEGIN;

ALTER TABLE public.eventos_comerciais
  ADD COLUMN IF NOT EXISTS evento_origem_id uuid
    REFERENCES public.eventos_comerciais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_comerciais_evento_origem
  ON public.eventos_comerciais (evento_origem_id)
  WHERE evento_origem_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eventos_comerciais_cancelamento_origem
  ON public.eventos_comerciais (evento_origem_id)
  WHERE tipo_evento = 'venda_cancelada'
    AND evento_origem_id IS NOT NULL;

COMMENT ON COLUMN public.eventos_comerciais.evento_origem_id IS
  'Fato comercial original compensado por este evento. Usado para ligar venda_cancelada a venda_realizada sem editar o histórico.';

CREATE OR REPLACE FUNCTION public.cancelar_venda(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_oportunidade_text text := nullif(trim(p_payload->>'oportunidade_id'), '');
  v_evento_text text := nullif(trim(p_payload->>'evento_id'), '');
  v_motivo text := nullif(trim(coalesce(p_payload->>'motivo', '')), '');
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  v_oportunidade_id uuid;
  v_evento_id uuid;
  v_evento_origem public.eventos_comerciais%ROWTYPE;
  v_op public.oportunidades%ROWTYPE;
  v_store_id uuid;
  v_seller_id uuid;
  v_cliente_id uuid;
  v_evento_cancelamento_id uuid;
  v_evento_data timestamptz;
  v_evento_competencia date;
  v_is_privileged boolean;
  v_is_vendedor_mesmo_mes boolean := false;
  v_marcador text := '[ENCERRADO:venda_cancelada]';
  v_agendamentos_encerrados integer := 0;
  v_proxima_acao_limpa integer := 0;
  v_tem_outra_ativa boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  IF v_oportunidade_text IS NULL AND v_evento_text IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Venda (oportunidade_id ou evento_id) é obrigatória.'
    );
  END IF;

  IF v_oportunidade_text IS NOT NULL AND v_oportunidade_text !~* v_uuid_pattern THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Identificador de oportunidade inválido.');
  END IF;
  IF v_evento_text IS NOT NULL AND v_evento_text !~* v_uuid_pattern THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Identificador de evento inválido.');
  END IF;

  v_oportunidade_id := CASE WHEN v_oportunidade_text IS NULL THEN NULL ELSE v_oportunidade_text::uuid END;
  v_evento_id := CASE WHEN v_evento_text IS NULL THEN NULL ELSE v_evento_text::uuid END;

  IF v_motivo IS NULL OR length(v_motivo) < 10 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Motivo do cancelamento é obrigatório (mínimo 10 caracteres).'
    );
  END IF;

  -- Primeiro resolve o evento sem bloqueá-lo. Se ele estiver ligado a uma
  -- oportunidade, o bloqueio definitivo segue a mesma ordem do caminho por
  -- oportunidade: oportunidade -> evento. Isso evita deadlock entre as duas
  -- formas de chamada durante cliques/retries concorrentes.
  IF v_evento_id IS NOT NULL THEN
    SELECT *
      INTO v_evento_origem
      FROM public.eventos_comerciais ec
     WHERE ec.id = v_evento_id
       AND ec.tipo_evento = 'venda_realizada';

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
    END IF;

    IF v_oportunidade_id IS NOT NULL
       AND v_evento_origem.oportunidade_id IS DISTINCT FROM v_oportunidade_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'A oportunidade não pertence ao evento informado.');
    END IF;

    v_oportunidade_id := coalesce(v_oportunidade_id, v_evento_origem.oportunidade_id);
  END IF;

  IF v_oportunidade_id IS NOT NULL THEN
    SELECT *
      INTO v_op
      FROM public.oportunidades o
     WHERE o.id = v_oportunidade_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
    END IF;

    IF v_op.etapa::text <> 'ganho' OR v_op.cancelada_em IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Venda não está em estado cancelável.');
    END IF;

    IF v_evento_id IS NOT NULL THEN
      SELECT *
        INTO v_evento_origem
        FROM public.eventos_comerciais ec
       WHERE ec.id = v_evento_id
         AND ec.tipo_evento = 'venda_realizada'
       FOR UPDATE;
    ELSE
      SELECT *
        INTO v_evento_origem
        FROM public.eventos_comerciais ec
       WHERE ec.oportunidade_id = v_op.id
         AND ec.tipo_evento = 'venda_realizada'
       ORDER BY (ec.data_competencia IS NOT NULL) DESC,
                ec.data_evento DESC NULLS LAST,
                ec.created_at DESC NULLS LAST,
                ec.id DESC
       LIMIT 1
       FOR UPDATE;
    END IF;

    v_store_id := coalesce(v_op.loja_id, v_evento_origem.loja_id);
    v_seller_id := coalesce(v_op.seller_user_id, v_evento_origem.seller_user_id);
    v_cliente_id := coalesce(v_op.cliente_id, v_evento_origem.cliente_id);
    v_evento_data := coalesce(v_evento_origem.data_evento, v_op.closed_at, now());
    v_evento_competencia := coalesce(
      v_evento_origem.data_competencia,
      v_op.data_competencia,
      v_op.sale_date,
      (v_evento_data AT TIME ZONE 'America/Sao_Paulo')::date
    );
  ELSE
    -- Venda oficial órfã: o próprio evento é o registro que deve ser
    -- bloqueado e compensado. Não se cria oportunidade sintética.
    SELECT *
      INTO v_evento_origem
      FROM public.eventos_comerciais ec
     WHERE ec.id = v_evento_id
       AND ec.tipo_evento = 'venda_realizada'
     FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
    END IF;

    v_store_id := v_evento_origem.loja_id;
    v_seller_id := v_evento_origem.seller_user_id;
    v_cliente_id := v_evento_origem.cliente_id;
    v_evento_data := v_evento_origem.data_evento;
    v_evento_competencia := coalesce(
      v_evento_origem.data_competencia,
      (v_evento_data AT TIME ZONE 'America/Sao_Paulo')::date
    );
  END IF;

  -- A coluna de origem garante idempotência para órfãs. O vínculo por
  -- oportunidade cobre eventos de cancelamento antigos, gravados antes desta
  -- migration, e também impede recancelamento em estado inconsistente.
  IF EXISTS (
    SELECT 1
      FROM public.eventos_comerciais ec
     WHERE ec.tipo_evento = 'venda_cancelada'
       AND (
         (v_evento_origem.id IS NOT NULL AND ec.evento_origem_id = v_evento_origem.id)
         OR (
           v_oportunidade_id IS NOT NULL
           AND ec.oportunidade_id = v_oportunidade_id
           AND ec.agendamento_id IS NULL
         )
       )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não está em estado cancelável.');
  END IF;

  v_is_privileged := public.eh_area_interna_mx(v_caller_id)
    OR public.is_manager_of(v_store_id)
    OR public.is_owner_of(v_store_id);

  IF v_oportunidade_id IS NOT NULL THEN
    v_is_vendedor_mesmo_mes := v_seller_id = v_caller_id
      AND v_op.closed_at IS NOT NULL
      AND date_trunc('month', v_op.closed_at) = date_trunc('month', now());
  ELSE
    -- Para o legado sem oportunidade, a competência/data do fato substitui o
    -- closed_at que não existe nesse registro.
    v_is_vendedor_mesmo_mes := v_seller_id = v_caller_id
      AND date_trunc('month', v_evento_competencia) = date_trunc('month', now()::date);
  END IF;

  IF NOT (v_is_privileged OR v_is_vendedor_mesmo_mes) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Sem permissão para cancelar esta venda (vendedor só pode cancelar vendas do mesmo mês).'
    );
  END IF;

  IF v_oportunidade_id IS NOT NULL THEN
    UPDATE public.oportunidades
       SET etapa = 'cancelada',
           cancelada_em = now(),
           cancelada_por = v_caller_id,
           motivo_cancelamento = v_motivo,
           updated_at = now(),
           updated_by = v_caller_id
     WHERE id = v_oportunidade_id;
  END IF;

  INSERT INTO public.eventos_comerciais (
    cliente_id,
    oportunidade_id,
    loja_id,
    seller_user_id,
    tipo_evento,
    canal,
    data_evento,
    data_competencia,
    origem_modulo,
    observacao,
    created_by,
    evento_origem_id
  ) VALUES (
    v_cliente_id,
    v_oportunidade_id,
    v_store_id,
    v_seller_id,
    'venda_cancelada',
    v_evento_origem.canal,
    now(),
    v_evento_competencia,
    'crm',
    v_motivo,
    v_caller_id,
    v_evento_origem.id
  )
  RETURNING id INTO v_evento_cancelamento_id;

  IF v_oportunidade_id IS NOT NULL THEN
    -- Agendamentos abertos da venda cancelada. Fatos consumados continuam
    -- intactos; os demais recebem marcador auditável e perdem a próxima ação.
    WITH encerrados AS (
      UPDATE public.agendamentos a
         SET observacoes = v_marcador || ' ' || v_motivo
                           || coalesce(' | ' || nullif(a.observacoes, ''), ''),
             proxima_acao = NULL,
             updated_at = now(),
             updated_by = v_caller_id
       WHERE a.oportunidade_id = v_op.id
         AND a.status IN ('confirmado', 'aguardando')
         AND coalesce(a.observacoes, '') NOT LIKE v_marcador || '%'
      RETURNING a.id, a.cliente_id, a.loja_id, a.seller_user_id
    ), eventos AS (
      INSERT INTO public.eventos_comerciais (
        cliente_id,
        oportunidade_id,
        agendamento_id,
        loja_id,
        seller_user_id,
        tipo_evento,
        observacao,
        origem_modulo,
        created_by
      )
      SELECT e.cliente_id,
             v_op.id,
             e.id,
             e.loja_id,
             e.seller_user_id,
             'venda_cancelada',
             v_marcador || ' agendamento encerrado: ' || v_motivo,
             'crm',
             v_caller_id
        FROM encerrados e
      RETURNING 1
    )
    SELECT count(*) INTO v_agendamentos_encerrados FROM eventos;

    SELECT EXISTS (
      SELECT 1
        FROM public.oportunidades o
       WHERE o.cliente_id = v_op.cliente_id
         AND o.id <> v_op.id
         AND o.etapa::text NOT IN ('ganho', 'perdido', 'cancelada')
    ) INTO v_tem_outra_ativa;

    IF NOT v_tem_outra_ativa THEN
      UPDATE public.clientes c
         SET proxima_acao = NULL,
             proxima_acao_em = NULL,
             updated_at = now()
       WHERE c.id = v_op.cliente_id
         AND (c.proxima_acao IS NOT NULL OR c.proxima_acao_em IS NOT NULL);
      GET DIAGNOSTICS v_proxima_acao_limpa = ROW_COUNT;
    END IF;
  END IF;

  INSERT INTO public.d1_audit_log (
    usuario_id, cliente_id, tipo_alteracao, valor_anterior, valor_novo
  ) VALUES (
    v_caller_id, v_cliente_id::text, 'cancelamento_venda', 'ganho', 'cancelada'
  );

  IF v_store_id IS NOT NULL THEN
    PERFORM public.consolidate_store_target_plan(
      v_store_id,
      coalesce(v_evento_competencia, (now() AT TIME ZONE 'America/Sao_Paulo')::date)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'oportunidade_id', v_oportunidade_id,
    'evento_id', v_evento_cancelamento_id,
    'evento_origem_id', v_evento_origem.id,
    'agendamentos_encerrados', v_agendamentos_encerrados,
    'proxima_acao_limpa', v_proxima_acao_limpa > 0
  ));
END;
$function$;

REVOKE ALL ON FUNCTION public.cancelar_venda(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_venda(jsonb) TO authenticated;

COMMENT ON FUNCTION public.cancelar_venda(jsonb) IS
  'Cancela venda por oportunidade_id ou evento_id. Mantém venda_realizada imutável e grava venda_cancelada ligada por evento_origem_id; gerente, dono e área interna MX podem cancelar qualquer data dentro do seu escopo.';

-- Fonte única de vendas ativas: além da oportunidade cancelada, elimina uma
-- venda órfã quando existir seu evento compensatório primário. Eventos de
-- encerramento de agendamento não são confundidos com o cancelamento da venda.
-- Os consumidores já alinhados a esta fonte incluem
-- `vendedor_performance_oficial`, `admin_store_live_overview` e
-- `consolidate_store_target_plan`; esta migration atualiza também os dois
-- agregadores que ainda consultavam `eventos_comerciais` diretamente.
CREATE OR REPLACE FUNCTION public.vendas_oficiais_deduplicadas_periodo(
  p_start_date date,
  p_end_date date,
  p_store_id uuid DEFAULT NULL,
  p_seller_id uuid DEFAULT NULL
)
RETURNS TABLE (
  evento_id uuid,
  oportunidade_id uuid,
  seller_user_id uuid,
  store_id uuid,
  competencia date,
  valor_negociado numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH candidates AS (
    SELECT ec.id AS evento_id,
           ec.oportunidade_id,
           ec.seller_user_id,
           ec.loja_id AS store_id,
           public.venda_competencia_canonica(
             ec.data_competencia,
             o.data_competencia,
             o.sale_date
           ) AS competencia,
           coalesce(
             o.valor_negociado,
             CASE
               WHEN trim(coalesce(ec.metadata->>'valor_negociado', '')) ~ '^[0-9]+(\.[0-9]+)?$'
                 THEN (ec.metadata->>'valor_negociado')::numeric
               WHEN trim(coalesce(ec.metadata->>'valor_venda', '')) ~ '^[0-9]+(\.[0-9]+)?$'
                 THEN (ec.metadata->>'valor_venda')::numeric
               ELSE NULL
             END,
             0
           )::numeric AS valor_negociado,
           (ec.data_competencia IS NOT NULL) AS tem_competencia_evento,
           ec.data_evento,
           ec.created_at
      FROM public.eventos_comerciais ec
      LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
     WHERE ec.tipo_evento = 'venda_realizada'
       AND o.etapa IS DISTINCT FROM 'cancelada'
       AND NOT EXISTS (
         SELECT 1
           FROM public.eventos_comerciais cancelamento
          WHERE cancelamento.tipo_evento = 'venda_cancelada'
            AND cancelamento.agendamento_id IS NULL
            AND (
              cancelamento.evento_origem_id = ec.id
              OR (
                ec.oportunidade_id IS NOT NULL
                AND cancelamento.oportunidade_id = ec.oportunidade_id
              )
            )
       )
       AND (p_store_id IS NULL OR ec.loja_id = p_store_id)
       AND (p_seller_id IS NULL OR ec.seller_user_id = p_seller_id)
       AND public.venda_competencia_canonica(
             ec.data_competencia,
             o.data_competencia,
             o.sale_date
           ) BETWEEN p_start_date AND p_end_date
  ), ranked AS (
    SELECT c.*,
           row_number() OVER (
             PARTITION BY coalesce(c.oportunidade_id, c.evento_id)
             ORDER BY c.tem_competencia_evento DESC,
                      c.data_evento DESC NULLS LAST,
                      c.created_at DESC NULLS LAST,
                      c.evento_id DESC
           ) AS occurrence_number
      FROM candidates c
  )
  SELECT r.evento_id,
         r.oportunidade_id,
         r.seller_user_id,
         r.store_id,
         r.competencia,
         r.valor_negociado
    FROM ranked r
   WHERE r.occurrence_number = 1;
$function$;

COMMENT ON FUNCTION public.vendas_oficiais_deduplicadas_periodo(date, date, uuid, uuid) IS
  'Fonte interna de vendas oficiais: competência evento -> oportunidade -> sale_date, sem canceladas por oportunidade ou evento_origem_id, sem competência e sem duplicar oportunidade.';

REVOKE ALL ON FUNCTION public.vendas_oficiais_deduplicadas_periodo(date, date, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- Painel global: usa a mesma fonte que ranking, meta, performance e overview.
CREATE OR REPLACE FUNCTION public.get_resumo_rede_periodo(
  p_start_date date,
  p_end_date date,
  p_scope text DEFAULT 'daily'::text
)
RETURNS TABLE(store_id uuid, sales bigint, leads bigint, agd bigint, vis bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scope public.checkin_scope := coalesce(nullif(p_scope, ''), 'daily')::public.checkin_scope;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = 'P0001';
  END IF;

  IF NOT public.eh_area_interna_mx() THEN
    RAISE EXCEPTION 'forbidden_global_read' USING errcode = 'P0001';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'invalid_date_range' USING errcode = '22007';
  END IF;

  IF (p_end_date - p_start_date) > 366 THEN
    RAISE EXCEPTION 'date_range_too_large' USING errcode = '22023';
  END IF;

  RETURN QUERY
    WITH sales_by_store AS (
      SELECT v.store_id,
             count(*)::bigint AS sales
        FROM public.vendas_oficiais_deduplicadas_periodo(
          p_start_date, p_end_date, NULL, NULL
        ) v
       GROUP BY v.store_id
    ),
    activity_by_store AS (
      SELECT l.store_id,
             coalesce(sum(coalesce(l.leads_prev_day, 0)), 0)::bigint AS leads,
             coalesce(sum(coalesce(l.agd_net_today, 0) + coalesce(l.agd_cart_today, 0)), 0)::bigint AS agd,
             coalesce(sum(coalesce(l.visit_prev_day, 0)), 0)::bigint AS vis
        FROM public.lancamentos_diarios l
       WHERE l.metric_scope = v_scope
         AND l.reference_date BETWEEN p_start_date AND p_end_date
       GROUP BY l.store_id
    )
    SELECT coalesce(s.store_id, a.store_id) AS store_id,
           coalesce(s.sales, 0) AS sales,
           coalesce(a.leads, 0) AS leads,
           coalesce(a.agd, 0) AS agd,
           coalesce(a.vis, 0) AS vis
      FROM sales_by_store s
      FULL OUTER JOIN activity_by_store a ON a.store_id = s.store_id
     ORDER BY coalesce(s.store_id, a.store_id);
EXCEPTION
  WHEN others THEN
    PERFORM public.log_rpc_error(
      'get_resumo_rede_periodo',
      SQLSTATE,
      SQLERRM,
      v_caller_id,
      jsonb_build_object('start', p_start_date, 'end', p_end_date, 'scope', p_scope)
    );
    RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_resumo_rede_periodo(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resumo_rede_periodo(date, date, text) TO authenticated;

-- O cockpit do Dono já é um wrapper criado em
-- `20260824163327_ranking_vendas_competencia_canonica.sql`. Ele preserva o
-- escopo de `get_owner_network_cockpit_legacy` e delega a coluna de vendas para
-- `patch_network_cockpit_sales`, que chama `get_vendas_oficiais_periodo`.
-- Como essa função pública consulta `vendas_oficiais_deduplicadas_periodo`, a
-- substituição acima atualiza o cockpit sem reconstituir SQL por texto. Isso
-- também mantém a migration aplicável quando a função já estiver no formato de
-- wrapper (o formato vigente).

REVOKE ALL ON FUNCTION public.get_owner_network_cockpit(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owner_network_cockpit(date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- DOWN (forward-only; os fatos de cancelamento não devem ser apagados).
-- Reverter o comportamento exige restaurar as definições anteriores de
-- cancelar_venda, vendas_oficiais_deduplicadas_periodo, get_resumo_rede_periodo
-- e get_owner_network_cockpit, mantendo evento_origem_id e seus índices para
-- preservar o histórico já gravado.
