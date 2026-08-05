-- Autosave do fechamento diário: controle otimista de versão do rascunho.
--
-- Problema: o rascunho passa a ser gravado automaticamente a cada alteração.
-- Sem versionamento, duas abas/dispositivos do mesmo vendedor sobrescrevem-se
-- silenciosamente e uma resposta atrasada pode reverter um dado mais novo.
--
-- Solução: `draft_revision` server-owned em lancamentos_diarios. O cliente
-- informa a revisão que conhece (`expected_draft_revision`) e o servidor
-- recusa a gravação se ela não for a corrente, devolvendo DRAFT_VERSION_CONFLICT.
-- Clientes antigos que não enviam o campo continuam funcionando (rollout).
--
-- Forward-only, aditiva e idempotente.

-- 1. Colunas de versionamento do rascunho -----------------------------------

ALTER TABLE public.lancamentos_diarios
  ADD COLUMN IF NOT EXISTS draft_revision bigint NOT NULL DEFAULT 0;

ALTER TABLE public.lancamentos_diarios
  ADD COLUMN IF NOT EXISTS last_draft_saved_at timestamptz NULL;

COMMENT ON COLUMN public.lancamentos_diarios.draft_revision IS
  'Revisão server-owned do fechamento. Incrementada a cada gravação via submit_checkin. O cliente nunca escolhe o valor: apenas informa a revisão que conhece em expected_draft_revision.';

COMMENT ON COLUMN public.lancamentos_diarios.last_draft_saved_at IS
  'Horário do último salvamento automático de rascunho. NULL em linhas que nunca passaram por autosave.';

-- 2. pg_notify não pode tratar rascunho como check-in novo -------------------
-- NEW_CHECKIN alimenta a rotina do gerente. Com autosave, o trigger dispararia
-- a cada tecla e anunciaria como check-in algo que ainda é rascunho.

CREATE OR REPLACE FUNCTION public.notify_manager_on_checkin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_store_name text;
  v_seller_name text;
BEGIN
  IF coalesce(NEW.submission_status, 'draft') = 'draft' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_seller_name
    FROM public.usuarios
   WHERE id = NEW.seller_user_id;

  SELECT name INTO v_store_name
    FROM public.lojas
   WHERE id = NEW.store_id;

  PERFORM pg_notify(
    'manager_routine_events',
    json_build_object(
      'event_type', 'NEW_CHECKIN',
      'store_id', NEW.store_id,
      'seller_id', NEW.seller_user_id,
      'seller_name', v_seller_name,
      'store_name', v_store_name,
      'date', NEW.reference_date,
      'timestamp', now()
    )::text
  );

  RETURN NEW;
END;
$function$;

-- 3. submit_checkin com controle otimista ------------------------------------
-- Base: definição viva em produção (pg_get_functiondef em 2026-08-05), que já
-- inclui P0-02 (visitas por canal) e a data operacional endurecida. As únicas
-- mudanças são o bloco de revisão, o incremento e o retorno ampliado.

CREATE OR REPLACE FUNCTION public.submit_checkin(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_store_id uuid;
  v_seller_id uuid;
  v_reference_date date;
  v_scope_text text := coalesce(nullif(p_payload->>'metric_scope', ''), 'daily');
  v_scope public.checkin_scope;
  v_now_sp timestamp := timezone('America/Sao_Paulo', now());
  v_official_reference date;
  v_is_internal boolean := false;
  v_can_manage_store boolean := false;
  v_checkin_id uuid;
  v_liberado boolean := false;
  v_liberado_por_id uuid;
  v_liberado_por_nome text;
  v_data_hora_liberacao timestamptz;
  v_disciplina_base numeric;
  v_finalizado_apos_prazo boolean := false;
  v_penalizacao_pp numeric := 0;
  v_disciplina_final numeric;
  -- P0-02: distribuição de visitas por canal
  v_visitas_porta integer;
  v_visitas_cart integer;
  v_visitas_net integer;
  v_has_visitas_canal boolean;
  v_visit_total integer;
  -- Controle otimista de rascunho
  v_status_text text := coalesce(nullif(p_payload->>'submission_status', ''), 'on_time');
  v_is_draft boolean;
  v_expected_revision bigint := nullif(p_payload->>'expected_draft_revision', '')::bigint;
  v_current_revision bigint;
  v_result_revision bigint;
  v_result_updated_at timestamptz;
  v_result_status text;
BEGIN
  IF v_scope_text NOT IN ('daily', 'adjustment', 'historical') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Escopo de check-in inválido.');
  END IF;

  v_scope := v_scope_text::public.checkin_scope;
  v_is_draft := v_status_text = 'draft';

  SELECT role
    INTO v_caller_role
    FROM public.usuarios
   WHERE id = v_caller_id
     AND active = true;

  IF v_caller_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado ou inativo.');
  END IF;

  v_is_internal := v_caller_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx');
  v_store_id := nullif(p_payload->>'store_id', '')::uuid;
  v_seller_id := coalesce(nullif(p_payload->>'seller_user_id', '')::uuid, v_caller_id);
  v_reference_date := nullif(p_payload->>'reference_date', '')::date;

  IF v_store_id IS NULL OR v_seller_id IS NULL OR v_reference_date IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payload de check-in incompleto.');
  END IF;

  -- Antes de 12h, D-1 continua oficial somente enquanto não houver um
  -- fechamento diário realmente submetido para vendedor + loja. Assim que
  -- D-1 é concluído, D0 abre imediatamente, igual ao contexto ativo do React.
  v_official_reference := v_now_sp::date;
  IF extract(hour from v_now_sp) < 12 AND NOT EXISTS (
    SELECT 1
      FROM public.lancamentos_diarios ld
     WHERE ld.seller_user_id = v_seller_id
       AND ld.store_id = v_store_id
       AND ld.reference_date = v_now_sp::date - 1
       AND ld.metric_scope = 'daily'
       AND ld.submitted_at IS NOT NULL
       AND coalesce(ld.submission_status, '') <> 'draft'
       AND (
         coalesce(ld.leads_prev_day, 0) > 0
         OR coalesce(ld.agd_cart_prev_day, 0) > 0
         OR coalesce(ld.agd_net_prev_day, 0) > 0
         OR coalesce(ld.agd_cart_today, 0) > 0
         OR coalesce(ld.agd_net_today, 0) > 0
         OR coalesce(ld.vnd_porta_prev_day, 0) > 0
         OR coalesce(ld.vnd_cart_prev_day, 0) > 0
         OR coalesce(ld.vnd_net_prev_day, 0) > 0
         OR coalesce(ld.visit_prev_day, 0) > 0
         OR nullif(trim(coalesce(ld.zero_reason, '')), '') IS NOT NULL
       )
  ) THEN
    v_official_reference := v_now_sp::date - 1;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.vinculos_loja
     WHERE user_id = v_caller_id
       AND store_id = v_store_id
       AND role IN ('dono', 'gerente')
       AND coalesce(is_active, true) = true
  ) INTO v_can_manage_store;

  IF v_scope_text = 'daily' THEN
    IF v_caller_role <> 'vendedor' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Registro diário é permitido apenas para vendedor.');
    END IF;
    IF v_seller_id <> v_caller_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Registro diário deve ser feito pelo próprio vendedor.');
    END IF;
    IF v_reference_date <> v_official_reference THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Registro diário aceita somente a data operacional ativa.');
    END IF;
  ELSIF v_scope_text = 'historical' THEN
    IF NOT (v_is_internal OR v_can_manage_store OR (v_caller_role = 'vendedor' AND v_seller_id = v_caller_id)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Lançamento histórico é permitido apenas ao próprio vendedor ou à gestão autorizada.');
    END IF;
  ELSIF NOT (v_is_internal OR v_can_manage_store) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ajuste técnico é restrito a gestores e perfis internos MX.');
  END IF;

  IF v_reference_date > v_now_sp::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lançamentos não podem usar data futura.');
  END IF;

  IF NOT v_is_internal AND NOT EXISTS (
    SELECT 1
      FROM public.vinculos_loja
     WHERE user_id = v_seller_id
       AND store_id = v_store_id
       AND coalesce(is_active, true) = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não possui vínculo ativo com a loja.');
  END IF;

  IF NOT v_is_internal AND NOT EXISTS (
    SELECT 1
      FROM public.vendedores_loja
     WHERE seller_user_id = v_seller_id
       AND store_id = v_store_id
       AND coalesce(is_active, true) = true
       AND (started_at IS NULL OR started_at <= v_reference_date)
       AND (ended_at IS NULL OR ended_at >= v_reference_date)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Vendedor não está ativo nesta loja no período informado.');
  END IF;

  -- Trava a linha alvo (quando existe) antes de decidir sobre a revisão. Sem
  -- FOR UPDATE, duas gravações simultâneas poderiam ler a mesma revisão e
  -- ambas se considerarem válidas.
  SELECT ld.draft_revision
    INTO v_current_revision
    FROM public.lancamentos_diarios ld
   WHERE ld.seller_user_id = v_seller_id
     AND ld.store_id = v_store_id
     AND ld.reference_date = v_reference_date
     AND ld.metric_scope = v_scope
   FOR UPDATE;

  IF v_expected_revision IS NOT NULL AND coalesce(v_current_revision, 0) <> v_expected_revision THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'DRAFT_VERSION_CONFLICT',
      'error', 'Este fechamento foi atualizado em outra sessão.',
      'data', jsonb_build_object('server_revision', coalesce(v_current_revision, 0))
    );
  END IF;

  IF v_scope_text = 'daily' AND EXISTS (
    SELECT 1
      FROM public.lancamentos_diarios ld
     WHERE ld.seller_user_id = v_seller_id
       AND ld.store_id = v_store_id
       AND ld.reference_date = v_reference_date
       AND ld.metric_scope = 'daily'
       AND ld.submitted_at IS NOT NULL
       AND coalesce(ld.submission_status, '') <> 'draft'
       AND (
         coalesce(ld.leads_prev_day, 0) > 0
         OR coalesce(ld.agd_cart_prev_day, 0) > 0
         OR coalesce(ld.agd_net_prev_day, 0) > 0
         OR coalesce(ld.agd_cart_today, 0) > 0
         OR coalesce(ld.agd_net_today, 0) > 0
         OR coalesce(ld.vnd_porta_prev_day, 0) > 0
         OR coalesce(ld.vnd_cart_prev_day, 0) > 0
         OR coalesce(ld.vnd_net_prev_day, 0) > 0
         OR coalesce(ld.visit_prev_day, 0) > 0
         OR nullif(trim(coalesce(ld.zero_reason, '')), '') IS NOT NULL
       )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fechamento já concluído para esta data. Use o histórico para solicitar correção.');
  END IF;

  SELECT fl.liberado_por_id, fl.liberado_por_nome, fl.data_hora_liberacao
    INTO v_liberado_por_id, v_liberado_por_nome, v_data_hora_liberacao
    FROM public.fechamento_liberacoes fl
   WHERE fl.vendedor_id = v_seller_id
     AND fl.data_fechamento = v_reference_date
     AND fl.status = 'liberado'
   ORDER BY fl.data_hora_liberacao DESC
   LIMIT 1;

  v_liberado := v_liberado_por_id IS NOT NULL;
  v_disciplina_base := LEAST(100, GREATEST(0, coalesce((p_payload->>'pontuacao_disciplina_base')::numeric, 0)));
  v_finalizado_apos_prazo := v_scope_text IN ('daily', 'historical')
    AND coalesce((p_payload->>'submitted_late')::boolean, false)
    AND v_liberado;
  v_penalizacao_pp := CASE WHEN v_finalizado_apos_prazo THEN 10 ELSE 0 END;
  v_disciplina_final := LEAST(100, GREATEST(0, v_disciplina_base - v_penalizacao_pp));

  -- P0-02: distribuição de visitas por canal. Só grava os 3 campos quando o
  -- client realmente os enviou (chave presente no payload) — caso contrário
  -- ficam NULL ("não rastreado"), nunca 0. Quando presentes, o total
  -- (visit_prev_day) é recalculado a partir deles, não confia no valor
  -- somado enviado pelo client (defesa em profundidade).
  v_has_visitas_canal := (p_payload ? 'visitas_porta_prev_day')
    OR (p_payload ? 'visitas_cart_prev_day')
    OR (p_payload ? 'visitas_net_prev_day');

  IF v_has_visitas_canal THEN
    v_visitas_porta := coalesce((p_payload->>'visitas_porta_prev_day')::integer, 0);
    v_visitas_cart  := coalesce((p_payload->>'visitas_cart_prev_day')::integer, 0);
    v_visitas_net   := coalesce((p_payload->>'visitas_net_prev_day')::integer, 0);
    v_visit_total   := v_visitas_porta + v_visitas_cart + v_visitas_net;
  ELSE
    v_visitas_porta := NULL;
    v_visitas_cart  := NULL;
    v_visitas_net   := NULL;
    v_visit_total   := coalesce((p_payload->>'visit_prev_day')::integer, 0);
  END IF;

  INSERT INTO public.lancamentos_diarios (
    seller_user_id, store_id, reference_date, submitted_at, metric_scope,
    submission_status, submitted_late, edit_locked_at,
    leads_prev_day, leads_net_prev_day, agd_cart_prev_day, agd_net_prev_day,
    agd_cart_today, agd_net_today, vnd_porta_prev_day, vnd_cart_prev_day,
    vnd_net_prev_day, visit_prev_day, visitas_porta_prev_day, visitas_cart_prev_day,
    visitas_net_prev_day, zero_reason, note, created_by, updated_at,
    pontuacao_disciplina_base, pontuacao_disciplina_final,
    finalizado_apos_prazo, penalizacao_atraso_aplicada, percentual_penalizacao_atraso,
    fechamento_liberado, liberado_por_id, liberado_por_nome, data_hora_liberacao,
    draft_revision, last_draft_saved_at
  ) VALUES (
    v_seller_id, v_store_id, v_reference_date,
    coalesce(nullif(p_payload->>'submitted_at', '')::timestamptz, now()),
    v_scope,
    v_status_text,
    coalesce((p_payload->>'submitted_late')::boolean, false),
    nullif(p_payload->>'edit_locked_at', '')::timestamptz,
    coalesce((p_payload->>'leads_prev_day')::integer, 0),
    coalesce((p_payload->>'leads_net_prev_day')::integer, 0),
    coalesce((p_payload->>'agd_cart_prev_day')::integer, 0),
    coalesce((p_payload->>'agd_net_prev_day')::integer, 0),
    coalesce((p_payload->>'agd_cart_today')::integer, 0),
    coalesce((p_payload->>'agd_net_today')::integer, 0),
    coalesce((p_payload->>'vnd_porta_prev_day')::integer, 0),
    coalesce((p_payload->>'vnd_cart_prev_day')::integer, 0),
    coalesce((p_payload->>'vnd_net_prev_day')::integer, 0),
    v_visit_total, v_visitas_porta, v_visitas_cart, v_visitas_net,
    nullif(trim(coalesce(p_payload->>'zero_reason', '')), ''),
    nullif(trim(coalesce(p_payload->>'note', '')), ''),
    v_caller_id, now(), v_disciplina_base, v_disciplina_final,
    v_finalizado_apos_prazo, v_finalizado_apos_prazo, v_penalizacao_pp,
    v_liberado, v_liberado_por_id, v_liberado_por_nome, v_data_hora_liberacao,
    coalesce(v_current_revision, 0) + 1,
    CASE WHEN v_is_draft THEN now() ELSE NULL END
  )
  ON CONFLICT (seller_user_id, store_id, reference_date, metric_scope)
  DO UPDATE SET
    submitted_at = EXCLUDED.submitted_at,
    submission_status = EXCLUDED.submission_status,
    submitted_late = EXCLUDED.submitted_late,
    edit_locked_at = EXCLUDED.edit_locked_at,
    leads_prev_day = EXCLUDED.leads_prev_day,
    leads_net_prev_day = EXCLUDED.leads_net_prev_day,
    agd_cart_prev_day = EXCLUDED.agd_cart_prev_day,
    agd_net_prev_day = EXCLUDED.agd_net_prev_day,
    agd_cart_today = EXCLUDED.agd_cart_today,
    agd_net_today = EXCLUDED.agd_net_today,
    vnd_porta_prev_day = EXCLUDED.vnd_porta_prev_day,
    vnd_cart_prev_day = EXCLUDED.vnd_cart_prev_day,
    vnd_net_prev_day = EXCLUDED.vnd_net_prev_day,
    visit_prev_day = EXCLUDED.visit_prev_day,
    visitas_porta_prev_day = EXCLUDED.visitas_porta_prev_day,
    visitas_cart_prev_day = EXCLUDED.visitas_cart_prev_day,
    visitas_net_prev_day = EXCLUDED.visitas_net_prev_day,
    zero_reason = EXCLUDED.zero_reason,
    note = EXCLUDED.note,
    created_by = EXCLUDED.created_by,
    updated_at = now(),
    pontuacao_disciplina_base = EXCLUDED.pontuacao_disciplina_base,
    pontuacao_disciplina_final = EXCLUDED.pontuacao_disciplina_final,
    finalizado_apos_prazo = EXCLUDED.finalizado_apos_prazo,
    penalizacao_atraso_aplicada = EXCLUDED.penalizacao_atraso_aplicada,
    percentual_penalizacao_atraso = EXCLUDED.percentual_penalizacao_atraso,
    fechamento_liberado = EXCLUDED.fechamento_liberado,
    liberado_por_id = EXCLUDED.liberado_por_id,
    liberado_por_nome = EXCLUDED.liberado_por_nome,
    data_hora_liberacao = EXCLUDED.data_hora_liberacao,
    -- Revisão é server-owned: sempre derivada da linha corrente, nunca do
    -- valor que o cliente mandou.
    draft_revision = lancamentos_diarios.draft_revision + 1,
    last_draft_saved_at = CASE
      WHEN EXCLUDED.submission_status = 'draft' THEN now()
      ELSE lancamentos_diarios.last_draft_saved_at
    END
  WHERE EXCLUDED.metric_scope <> 'daily'
     OR NOT (
       lancamentos_diarios.submitted_at IS NOT NULL
       AND coalesce(lancamentos_diarios.submission_status, '') <> 'draft'
       AND (
         coalesce(lancamentos_diarios.leads_prev_day, 0) > 0
         OR coalesce(lancamentos_diarios.agd_cart_prev_day, 0) > 0
         OR coalesce(lancamentos_diarios.agd_net_prev_day, 0) > 0
         OR coalesce(lancamentos_diarios.agd_cart_today, 0) > 0
         OR coalesce(lancamentos_diarios.agd_net_today, 0) > 0
         OR coalesce(lancamentos_diarios.vnd_porta_prev_day, 0) > 0
         OR coalesce(lancamentos_diarios.vnd_cart_prev_day, 0) > 0
         OR coalesce(lancamentos_diarios.vnd_net_prev_day, 0) > 0
         OR coalesce(lancamentos_diarios.visit_prev_day, 0) > 0
         OR nullif(trim(coalesce(lancamentos_diarios.zero_reason, '')), '') IS NOT NULL
       )
     )
  RETURNING id, draft_revision, updated_at, submission_status
       INTO v_checkin_id, v_result_revision, v_result_updated_at, v_result_status;

  IF v_checkin_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fechamento já concluído para esta data. Use o histórico para solicitar correção.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'id', v_checkin_id,
    'draft_revision', v_result_revision,
    'updated_at', v_result_updated_at,
    'submission_status', v_result_status
  ));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_checkin(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_checkin(jsonb) FROM anon;

-- DOWN (compensatória, forward-only — nunca remove dados):
-- As colunas draft_revision/last_draft_saved_at são aditivas e podem
-- permanecer sem efeito. Para voltar ao comportamento anterior, restaurar o
-- corpo de submit_checkin da migration 20260710180000_p0_02_visitas_canal_split
-- e o corpo de notify_manager_on_checkin sem o guard de draft:
--
-- CREATE OR REPLACE FUNCTION public.submit_checkin(p_payload jsonb) ... (versão anterior)
-- CREATE OR REPLACE FUNCTION public.notify_manager_on_checkin() ... (versão anterior)
