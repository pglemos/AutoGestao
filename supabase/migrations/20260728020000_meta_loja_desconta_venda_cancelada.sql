-- Migration: 20260728020000_meta_loja_desconta_venda_cancelada.sql
--
-- `consolidate_store_target_plan` alimenta store_target_plans.realized, que é
-- a fonte de "PROGRESSO DA META" na Meta da Loja, do ritmo necessário e da
-- projeção. Ela contava eventos 'venda_realizada' brutos, sem descontar os
-- cancelamentos — o próprio comentário da função diz estar "alinhada com
-- vendedor_performance_oficial", mas não copiou o filtro de cancelada que
-- aquela RPC já tem.
--
-- Efeito medido em produção (MX CONSULTORIA, julho/2026): 12 vendas contadas
-- contra 10 reais. Duas vendas canceladas inflavam a meta da loja inteira.
--
-- Alteração cirúrgica: apenas o LEFT JOIN e o filtro. Nenhuma assinatura,
-- coluna ou permissão muda.

CREATE OR REPLACE FUNCTION public.consolidate_store_target_plan(p_store_id uuid, p_reference_date date DEFAULT NULL::date)
 RETURNS SETOF store_target_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  target_reference_date date := COALESCE(p_reference_date, timezone('America/Sao_Paulo',now())::date);
  month_start date := date_trunc('month',target_reference_date)::date;
  month_end date := (date_trunc('month',target_reference_date) + interval '1 month - 1 day')::date;
  monthly_goal_value numeric(12,4);
  configured_ratio numeric(12,4) := 3;
  projection_mode_value text := 'calendar';
  realized_value numeric(12,4) := 0;
  month_gap_value numeric(12,4);
  projected_sales_value numeric(12,4);
  proportional_goal_value numeric(12,4);
  business_days_total_value integer := 0;
  business_days_elapsed_value integer := 0;
  business_days_remaining_value integer := 0;
  history_start_value date;
  history_sales_value numeric(12,4) := 0;
  history_appointments_value numeric(12,4) := 0;
  history_visits_value numeric(12,4) := 0;
  appointments_per_sale_value numeric(12,4);
  operational_basis_value text;
  horizon_key text;
  horizon_start_value date;
  horizon_end_value date;
  horizon_days_value integer;
  required_sales_value numeric(12,4);
  required_pace_value numeric(12,4);
  operational_need_value numeric(12,4);
  pace_label_value text;
  focus_message_value text;
  calculated_source_hash text;
  latest_source_hash text;
  next_version integer;
  existing_row public.store_target_plans;
  inserted_row public.store_target_plans;
BEGIN
  IF caller_id IS NOT NULL
     AND NOT public.eh_administrador_mx(caller_id)
     AND NOT public.is_manager_of(p_store_id)
     AND NOT public.is_owner_of(p_store_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.vendedores_loja vl
       WHERE vl.store_id = p_store_id
         AND vl.seller_user_id = caller_id
         AND vl.is_active = true
         AND vl.started_at <= target_reference_date
         AND (vl.ended_at IS NULL OR vl.ended_at >= target_reference_date)
     ) THEN
    RAISE EXCEPTION 'Usuário sem escopo nesta loja.' USING ERRCODE='42501';
  END IF;

  SELECT rml.monthly_goal, rml.appointments_per_sale, COALESCE(rml.projection_mode,'calendar')
  INTO monthly_goal_value, configured_ratio, projection_mode_value
  FROM public.regras_metas_loja rml
  WHERE rml.store_id = p_store_id;

  IF NOT FOUND THEN
    monthly_goal_value := NULL;
    configured_ratio := 3;
    projection_mode_value := 'calendar';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE public.is_store_operational_date(p_store_id,d::date))::integer,
    COUNT(*) FILTER (
      WHERE d::date <= target_reference_date
        AND public.is_store_operational_date(p_store_id,d::date)
    )::integer,
    COUNT(*) FILTER (
      WHERE d::date >= target_reference_date
        AND public.is_store_operational_date(p_store_id,d::date)
    )::integer
  INTO business_days_total_value,business_days_elapsed_value,business_days_remaining_value
  FROM generate_series(month_start,month_end,interval '1 day') d;

  -- Fonte alinhada com vendedor_performance_oficial: vendas realizadas (CRM),
  -- não fechamento diário. Evita divergência entre a Meta da Loja e a
  -- Contribuição da Equipe quando o checkin do dia ainda não foi enviado.
  SELECT COUNT(*)::numeric
  INTO realized_value
  FROM public.eventos_comerciais ec
  LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
  WHERE ec.loja_id = p_store_id
    AND ec.tipo_evento = 'venda_realizada'
    -- O cancelamento preserva o evento 'venda_realizada' original (histórico
    -- imutável) e acrescenta um 'venda_cancelada'. Sem descontar o par aqui, a
    -- meta, o ritmo e a projeção da loja seguiam contando a venda revertida.
    -- Mesmo filtro de vendedor_performance_oficial, com o qual esta contagem
    -- declara estar alinhada.
    AND o.etapa IS DISTINCT FROM 'cancelada'
    AND COALESCE(ec.data_competencia, timezone('America/Sao_Paulo', ec.data_evento)::date)
      BETWEEN month_start AND target_reference_date;

  proportional_goal_value := CASE
    WHEN monthly_goal_value IS NOT NULL AND business_days_total_value > 0
      THEN monthly_goal_value * business_days_elapsed_value / business_days_total_value
    ELSE NULL
  END;
  month_gap_value := CASE
    WHEN monthly_goal_value IS NULL THEN NULL
    ELSE GREATEST(monthly_goal_value-realized_value,0)
  END;
  projected_sales_value := CASE
    WHEN business_days_elapsed_value > 0
      THEN realized_value / business_days_elapsed_value * business_days_total_value
    ELSE 0
  END;

  history_start_value := target_reference_date - 29;
  SELECT
    COALESCE(SUM(ld.vnd_porta_prev_day+ld.vnd_cart_prev_day+ld.vnd_net_prev_day),0)::numeric,
    COALESCE(SUM(ld.agd_cart_today+ld.agd_net_today),0)::numeric,
    COALESCE(SUM(ld.visit_prev_day),0)::numeric
  INTO history_sales_value,history_appointments_value,history_visits_value
  FROM public.lancamentos_diarios ld
  WHERE ld.store_id=p_store_id
    AND ld.metric_scope='daily'
    AND ld.reference_date BETWEEN history_start_value AND target_reference_date
    AND (
      ld.submission_status='on_time'
      OR EXISTS (
        SELECT 1 FROM public.solicitacoes_correcao_lancamento scr
        WHERE scr.checkin_id=ld.id AND scr.status='approved'
      )
    );

  IF history_sales_value > 0 AND history_appointments_value > 0 THEN
    appointments_per_sale_value := history_appointments_value/history_sales_value;
    operational_basis_value := 'historico_30_dias_agendamentos';
  ELSE
    history_start_value := target_reference_date - 89;
    SELECT
      COALESCE(SUM(ld.vnd_porta_prev_day+ld.vnd_cart_prev_day+ld.vnd_net_prev_day),0)::numeric,
      COALESCE(SUM(ld.agd_cart_today+ld.agd_net_today),0)::numeric,
      COALESCE(SUM(ld.visit_prev_day),0)::numeric
    INTO history_sales_value,history_appointments_value,history_visits_value
    FROM public.lancamentos_diarios ld
    WHERE ld.store_id=p_store_id
      AND ld.metric_scope='daily'
      AND ld.reference_date BETWEEN history_start_value AND target_reference_date
      AND (
        ld.submission_status='on_time'
        OR EXISTS (
          SELECT 1 FROM public.solicitacoes_correcao_lancamento scr
          WHERE scr.checkin_id=ld.id AND scr.status='approved'
        )
      );

    IF history_sales_value > 0 AND history_appointments_value > 0 THEN
      appointments_per_sale_value := history_appointments_value/history_sales_value;
      operational_basis_value := 'historico_90_dias_agendamentos';
    ELSIF history_sales_value > 0 AND history_visits_value > 0 THEN
      appointments_per_sale_value := history_visits_value/history_sales_value;
      operational_basis_value := 'historico_90_dias_atendimentos';
    ELSE
      appointments_per_sale_value := configured_ratio;
      operational_basis_value := 'fallback_configurado';
    END IF;
  END IF;

  FOR horizon_key IN
    SELECT unnest(ARRAY['hoje','esta_semana','esta_dezena','este_mes']::text[])
  LOOP
    horizon_start_value := target_reference_date;
    horizon_end_value := CASE horizon_key
      WHEN 'hoje' THEN target_reference_date
      WHEN 'esta_semana' THEN target_reference_date + ((6-EXTRACT(DOW FROM target_reference_date)::integer+7)%7)
      WHEN 'esta_dezena' THEN CASE
        WHEN EXTRACT(DAY FROM target_reference_date)::integer <= 10
          THEN make_date(EXTRACT(YEAR FROM target_reference_date)::integer,EXTRACT(MONTH FROM target_reference_date)::integer,10)
        WHEN EXTRACT(DAY FROM target_reference_date)::integer <= 20
          THEN make_date(EXTRACT(YEAR FROM target_reference_date)::integer,EXTRACT(MONTH FROM target_reference_date)::integer,20)
        ELSE month_end
      END
      ELSE month_end
    END;

    SELECT COUNT(*) FILTER (
      WHERE public.is_store_operational_date(p_store_id,d::date)
    )::integer
    INTO horizon_days_value
    FROM generate_series(horizon_start_value,horizon_end_value,interval '1 day') d;

    IF monthly_goal_value IS NULL OR monthly_goal_value <= 0 THEN
      required_sales_value := NULL;
      required_pace_value := NULL;
      operational_need_value := NULL;
      pace_label_value := NULL;
      focus_message_value := 'Meta ainda não cadastrada.';
    ELSE
      required_sales_value := CASE
        WHEN horizon_key='este_mes' THEN month_gap_value
        WHEN business_days_remaining_value > 0
          THEN LEAST(
            month_gap_value,
            CEIL(month_gap_value*horizon_days_value/business_days_remaining_value)
          )
        ELSE month_gap_value
      END;
      required_pace_value := CASE
        WHEN horizon_days_value > 0 THEN required_sales_value/horizon_days_value
        ELSE 0
      END;
      operational_need_value := CEIL(required_sales_value*appointments_per_sale_value);
      pace_label_value := CASE
        WHEN required_sales_value <= 0 THEN 'Objetivo atingido'
        WHEN required_pace_value > 0 AND required_pace_value < 1 THEN
          '1 venda a cada ' || trim(to_char(ROUND(1/required_pace_value,1),'FM999990D0')) || ' dias úteis'
        ELSE trim(to_char(ROUND(required_pace_value,1),'FM999990D0')) ||
          CASE WHEN ROUND(required_pace_value,1)=1
            THEN ' venda por dia útil'
            ELSE ' vendas por dia útil'
          END
      END;
      focus_message_value := CASE
        WHEN required_sales_value <= 0 THEN CASE horizon_key
          WHEN 'hoje' THEN 'Objetivo de hoje atingido. Proteja a agenda e antecipe o próximo objetivo.'
          WHEN 'esta_semana' THEN 'Objetivo da semana atingido. Mantenha o ritmo para garantir a meta mensal.'
          WHEN 'esta_dezena' THEN 'Objetivo da dezena atingido. Mantenha consistência até o fechamento.'
          ELSE 'Meta do mês atingida. Sustente o resultado e antecipe oportunidades.'
        END
        WHEN horizon_key='hoje' THEN 'Foco de hoje: elevar a agenda e proteger as negociações prioritárias.'
        WHEN horizon_key='esta_semana' THEN 'Foco da semana: distribuir a necessidade pelos dias úteis restantes.'
        WHEN horizon_key='esta_dezena' THEN 'Foco da dezena: recuperar o ritmo sem transferir todo o déficit para o fim do mês.'
        ELSE 'Foco do mês: manter o ritmo necessário até o fechamento da meta mensal.'
      END;
    END IF;

    calculated_source_hash := md5(concat_ws('|',
      p_store_id::text,target_reference_date::text,horizon_key,
      horizon_start_value::text,horizon_end_value::text,
      COALESCE(monthly_goal_value::text,'null'),realized_value::text,
      COALESCE(required_sales_value::text,'null'),
      COALESCE(required_pace_value::text,'null'),
      COALESCE(appointments_per_sale_value::text,'null'),
      business_days_total_value::text,business_days_elapsed_value::text,
      business_days_remaining_value::text,operational_basis_value,projection_mode_value
    ));

    SELECT stp.source_hash
    INTO latest_source_hash
    FROM public.store_target_plans stp
    WHERE stp.store_id=p_store_id
      AND stp.reference_date=target_reference_date
      AND stp.horizon=horizon_key
    ORDER BY stp.version DESC
    LIMIT 1;

    IF latest_source_hash = calculated_source_hash THEN
      SELECT * INTO existing_row
      FROM public.store_target_plans stp
      WHERE stp.store_id=p_store_id
        AND stp.reference_date=target_reference_date
        AND stp.horizon=horizon_key
      ORDER BY stp.version DESC
      LIMIT 1;
      RETURN NEXT existing_row;
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(stp.version),0)+1
    INTO next_version
    FROM public.store_target_plans stp
    WHERE stp.store_id=p_store_id
      AND stp.reference_date=target_reference_date
      AND stp.horizon=horizon_key;

    INSERT INTO public.store_target_plans (
      store_id,reference_date,horizon,period_start,period_end,version,
      monthly_goal,realized,required_sales,required_pace,appointments_per_sale,
      operational_need,focus_message,business_days_elapsed,business_days_remaining,
      business_days_total,proportional_goal,monthly_gap,projected_sales,pace_label,
      operational_basis,source_hash,source_payload
    ) VALUES (
      p_store_id,target_reference_date,horizon_key,horizon_start_value,horizon_end_value,next_version,
      monthly_goal_value,realized_value,required_sales_value,required_pace_value,
      appointments_per_sale_value,operational_need_value,focus_message_value,
      business_days_elapsed_value,business_days_remaining_value,business_days_total_value,
      proportional_goal_value,month_gap_value,projected_sales_value,pace_label_value,
      operational_basis_value,calculated_source_hash,
      jsonb_build_object(
        'projection_mode',projection_mode_value,
        'historical_window_start',history_start_value,
        'historical_sales',history_sales_value,
        'historical_appointments',history_appointments_value,
        'historical_visits',history_visits_value
      )
    ) RETURNING * INTO inserted_row;

    RETURN NEXT inserted_row;
  END LOOP;

  RETURN;
EXCEPTION WHEN others THEN
  PERFORM public.log_rpc_error(
    'consolidate_store_target_plan',SQLSTATE,SQLERRM,caller_id,
    jsonb_build_object('store_id',p_store_id,'reference_date',target_reference_date)
  );
  RAISE;
END;
$function$
;
