-- Operações administrativas transacionais da Opção B.
-- A Edge Function continua responsável pelo Supabase Auth; o estado público
-- (usuário, vínculo, vendedor e auditoria) confirma ou reverte como uma única
-- transação PostgreSQL.

BEGIN;

CREATE TABLE IF NOT EXISTS public.internal_mx_admin_rate_limits (
  actor_id uuid NOT NULL,
  action text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, action)
);

ALTER TABLE public.internal_mx_admin_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.internal_mx_admin_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.internal_mx_admin_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.internal_mx_consume_admin_rate_limit(
  p_actor_id uuid,
  p_action text,
  p_max_attempts integer DEFAULT 30,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_actor_id IS NULL
     OR coalesce(length(trim(p_action)), 0) = 0
     OR p_max_attempts < 1
     OR p_max_attempts > 500
     OR p_window_seconds < 1
     OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid_rate_limit_request' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = p_actor_id
      AND u.active = true
      AND u.role IN ('administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.internal_mx_admin_rate_limits AS limits (
    actor_id,
    action,
    attempt_count,
    window_started_at,
    updated_at
  ) VALUES (
    p_actor_id,
    trim(p_action),
    1,
    now(),
    now()
  )
  ON CONFLICT (actor_id, action) DO UPDATE
  SET attempt_count = CASE
        WHEN limits.window_started_at < now() - make_interval(secs => p_window_seconds) THEN 1
        ELSE limits.attempt_count + 1
      END,
      window_started_at = CASE
        WHEN limits.window_started_at < now() - make_interval(secs => p_window_seconds) THEN now()
        ELSE limits.window_started_at
      END,
      updated_at = now()
  RETURNING attempt_count INTO v_count;

  RETURN v_count <= p_max_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.internal_mx_consume_admin_rate_limit(uuid,text,integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_mx_consume_admin_rate_limit(uuid,text,integer,integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.internal_mx_role_id(p_legacy_role text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id
  FROM public.roles r
  WHERE r.code = CASE lower(trim(p_legacy_role))
    WHEN 'administrador_geral' THEN 'admin_mx'
    WHEN 'administrador_mx' THEN 'admin_mx'
    WHEN 'consultor_mx' THEN 'consultant'
    WHEN 'dono' THEN 'master'
    WHEN 'gerente' THEN 'sales_manager'
    WHEN 'vendedor' THEN 'seller'
    ELSE '__invalid__'
  END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.internal_mx_role_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_mx_role_id(text) TO service_role;

CREATE OR REPLACE FUNCTION public.internal_mx_finalize_registered_user(
  p_actor_id uuid,
  p_user_id uuid,
  p_email text,
  p_name text,
  p_role text,
  p_store_id uuid DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_started_at date DEFAULT NULL,
  p_ended_at date DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_closing_month_grace boolean DEFAULT false,
  p_is_venda_loja boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text;
  v_role text := lower(trim(p_role));
  v_role_id uuid;
  v_result public.usuarios%ROWTYPE;
BEGIN
  SELECT u.role INTO v_actor_role
  FROM public.usuarios u
  WHERE u.id = p_actor_id AND u.active = true
  FOR SHARE;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor') THEN
    RAISE EXCEPTION 'invalid_role' USING ERRCODE = '22023';
  END IF;

  IF v_actor_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx') THEN
    NULL;
  ELSIF v_actor_role = 'dono' AND v_role IN ('gerente', 'vendedor')
        AND public.tem_papel_loja(p_store_id, ARRAY['dono'], p_actor_id) THEN
    NULL;
  ELSIF v_actor_role = 'gerente' AND v_role = 'vendedor'
        AND public.tem_papel_loja(p_store_id, ARRAY['gerente'], p_actor_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
     AND (p_store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = p_store_id)) THEN
    RAISE EXCEPTION 'store_required' USING ERRCODE = '23502';
  END IF;

  v_role_id := public.internal_mx_role_id(v_role);
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'canonical_role_not_found' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.usuarios (
    id, email, name, role, role_id, phone, active,
    must_change_password, is_venda_loja, updated_at
  ) VALUES (
    p_user_id,
    lower(trim(p_email)),
    upper(trim(p_name)),
    v_role,
    v_role_id,
    nullif(trim(p_phone), ''),
    true,
    true,
    coalesce(p_is_venda_loja, false),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      role_id = EXCLUDED.role_id,
      phone = EXCLUDED.phone,
      active = true,
      must_change_password = true,
      is_venda_loja = EXCLUDED.is_venda_loja,
      updated_at = now()
  RETURNING * INTO v_result;

  IF v_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx') THEN
    UPDATE public.vinculos_loja
    SET is_active = false,
        ended_at = coalesce(ended_at, current_date)
    WHERE user_id = p_user_id AND is_active = true;

    UPDATE public.vendedores_loja
    SET is_active = false,
        ended_at = coalesce(ended_at, current_date),
        updated_at = now()
    WHERE seller_user_id = p_user_id AND is_active = true;
  ELSE
    INSERT INTO public.vinculos_loja (user_id, store_id, role, is_active, ended_at)
    VALUES (p_user_id, p_store_id, v_role, true, NULL)
    ON CONFLICT (user_id, store_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_active = true,
        ended_at = NULL;

    IF v_role = 'vendedor' THEN
      INSERT INTO public.vendedores_loja (
        store_id, seller_user_id, started_at, ended_at,
        is_active, closing_month_grace, updated_at
      ) VALUES (
        p_store_id,
        p_user_id,
        coalesce(p_started_at, current_date),
        p_ended_at,
        coalesce(p_is_active, true),
        coalesce(p_closing_month_grace, false),
        now()
      )
      ON CONFLICT (store_id, seller_user_id) DO UPDATE
      SET started_at = EXCLUDED.started_at,
          ended_at = EXCLUDED.ended_at,
          is_active = EXCLUDED.is_active,
          closing_month_grace = EXCLUDED.closing_month_grace,
          updated_at = now();
    END IF;
  END IF;

  INSERT INTO public.internal_mx_admin_audit (
    actor_id, actor_role, action, entity_type, entity_id, store_id,
    before_data, after_data, metadata
  ) VALUES (
    p_actor_id,
    v_actor_role,
    'create',
    'usuario',
    p_user_id,
    p_store_id,
    NULL,
    to_jsonb(v_result),
    jsonb_build_object('membership_created', p_store_id IS NOT NULL)
  );

  RETURN to_jsonb(v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.internal_mx_finalize_registered_user(uuid,uuid,text,text,text,uuid,text,date,date,boolean,boolean,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_mx_finalize_registered_user(uuid,uuid,text,text,text,uuid,text,date,date,boolean,boolean,boolean)
  TO service_role;

CREATE OR REPLACE FUNCTION public.internal_mx_apply_global_user_mutation(
  p_actor_id uuid,
  p_action text,
  p_user_id uuid,
  p_updates jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text;
  v_action text := lower(trim(p_action));
  v_before public.usuarios%ROWTYPE;
  v_after public.usuarios%ROWTYPE;
  v_role text;
  v_role_id uuid;
  v_store_id uuid;
  v_previous_store_id uuid;
  v_ended_at date := coalesce(nullif(p_updates->>'ended_at', '')::date, current_date);
BEGIN
  SELECT u.role INTO v_actor_role
  FROM public.usuarios u
  WHERE u.id = p_actor_id
    AND u.active = true
    AND u.role IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
  FOR SHARE;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_before
  FROM public.usuarios
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_action = 'force_password_change' THEN
    UPDATE public.usuarios
    SET must_change_password = true,
        updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_after;

  ELSIF v_action = 'deactivate' THEN
    UPDATE public.vinculos_loja
    SET is_active = false,
        ended_at = coalesce(ended_at, current_date)
    WHERE user_id = p_user_id AND is_active = true;

    UPDATE public.vendedores_loja
    SET is_active = false,
        ended_at = coalesce(ended_at, current_date),
        updated_at = now()
    WHERE seller_user_id = p_user_id AND is_active = true;

    UPDATE public.usuarios
    SET active = false,
        updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_after;

  ELSIF v_action = 'update' THEN
    v_role := lower(trim(coalesce(nullif(p_updates->>'role', ''), v_before.role)));
    IF v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor') THEN
      RAISE EXCEPTION 'invalid_role' USING ERRCODE = '22023';
    END IF;

    v_role_id := public.internal_mx_role_id(v_role);
    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'canonical_role_not_found' USING ERRCODE = '23503';
    END IF;

    v_store_id := nullif(p_updates->>'store_id', '')::uuid;
    v_previous_store_id := nullif(p_updates->>'previous_store_id', '')::uuid;

    IF v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
       AND (v_store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = v_store_id)) THEN
      RAISE EXCEPTION 'store_required' USING ERRCODE = '23502';
    END IF;

    UPDATE public.usuarios
    SET email = CASE WHEN p_updates ? 'email' THEN lower(trim(p_updates->>'email')) ELSE email END,
        name = CASE WHEN p_updates ? 'name' THEN upper(trim(p_updates->>'name')) ELSE name END,
        phone = CASE WHEN p_updates ? 'phone' THEN nullif(trim(p_updates->>'phone'), '') ELSE phone END,
        role = v_role,
        role_id = v_role_id,
        active = CASE WHEN p_updates ? 'active' THEN (p_updates->>'active')::boolean ELSE active END,
        is_venda_loja = CASE WHEN p_updates ? 'is_venda_loja' THEN (p_updates->>'is_venda_loja')::boolean ELSE is_venda_loja END,
        updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_after;

    IF v_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx') THEN
      UPDATE public.vinculos_loja
      SET is_active = false,
          ended_at = coalesce(ended_at, v_ended_at)
      WHERE user_id = p_user_id AND is_active = true;

      UPDATE public.vendedores_loja
      SET is_active = false,
          ended_at = coalesce(ended_at, v_ended_at),
          updated_at = now()
      WHERE seller_user_id = p_user_id AND is_active = true;
    ELSE
      IF v_previous_store_id IS NOT NULL AND v_previous_store_id IS DISTINCT FROM v_store_id THEN
        UPDATE public.vinculos_loja
        SET is_active = false,
            ended_at = coalesce(ended_at, v_ended_at)
        WHERE user_id = p_user_id
          AND store_id = v_previous_store_id
          AND is_active = true;

        UPDATE public.vendedores_loja
        SET is_active = false,
            ended_at = coalesce(ended_at, v_ended_at),
            updated_at = now()
        WHERE seller_user_id = p_user_id
          AND store_id = v_previous_store_id
          AND is_active = true;
      END IF;

      INSERT INTO public.vinculos_loja (user_id, store_id, role, is_active, ended_at)
      VALUES (p_user_id, v_store_id, v_role, true, NULL)
      ON CONFLICT (user_id, store_id) DO UPDATE
      SET role = EXCLUDED.role,
          is_active = true,
          ended_at = NULL;

      IF v_role = 'vendedor' THEN
        INSERT INTO public.vendedores_loja (
          store_id, seller_user_id, started_at, ended_at,
          is_active, closing_month_grace, updated_at
        ) VALUES (
          v_store_id,
          p_user_id,
          coalesce(nullif(p_updates->>'started_at', '')::date, current_date),
          nullif(p_updates->>'ended_at', '')::date,
          CASE WHEN p_updates ? 'is_active' THEN (p_updates->>'is_active')::boolean
               WHEN p_updates ? 'active' THEN (p_updates->>'active')::boolean
               ELSE true END,
          CASE WHEN p_updates ? 'closing_month_grace' THEN (p_updates->>'closing_month_grace')::boolean ELSE false END,
          now()
        )
        ON CONFLICT (store_id, seller_user_id) DO UPDATE
        SET started_at = EXCLUDED.started_at,
            ended_at = EXCLUDED.ended_at,
            is_active = EXCLUDED.is_active,
            closing_month_grace = EXCLUDED.closing_month_grace,
            updated_at = now();
      ELSE
        UPDATE public.vendedores_loja
        SET is_active = false,
            ended_at = coalesce(ended_at, v_ended_at),
            updated_at = now()
        WHERE seller_user_id = p_user_id AND is_active = true;
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.internal_mx_admin_audit (
    actor_id, actor_role, action, entity_type, entity_id, store_id,
    before_data, after_data, metadata
  ) VALUES (
    p_actor_id,
    v_actor_role,
    v_action,
    'usuario',
    p_user_id,
    v_store_id,
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('reason', p_reason)
  );

  RETURN to_jsonb(v_after);
END;
$$;

REVOKE ALL ON FUNCTION public.internal_mx_apply_global_user_mutation(uuid,text,uuid,jsonb,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_mx_apply_global_user_mutation(uuid,text,uuid,jsonb,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.internal_mx_global_user_delete_preflight(
  p_actor_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blockers jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = p_actor_id
      AND active = true
      AND role IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  WITH counts AS (
    SELECT 'lancamentos_diarios'::text AS table_name, 'seller_user_id'::text AS column_name, count(*)::bigint AS ref_count
      FROM public.lancamentos_diarios WHERE seller_user_id = p_user_id
    UNION ALL SELECT 'clientes', 'seller_user_id', count(*) FROM public.clientes WHERE seller_user_id = p_user_id
    UNION ALL SELECT 'oportunidades', 'seller_user_id', count(*) FROM public.oportunidades WHERE seller_user_id = p_user_id
    UNION ALL SELECT 'agendamentos', 'seller_user_id', count(*) FROM public.agendamentos WHERE seller_user_id = p_user_id
    UNION ALL SELECT 'atendimentos', 'seller_user_id', count(*) FROM public.atendimentos WHERE seller_user_id = p_user_id
    UNION ALL SELECT 'seller_routine_snapshots', 'seller_user_id', count(*) FROM public.seller_routine_snapshots WHERE seller_user_id = p_user_id
    UNION ALL SELECT 'manager_routine_snapshots', 'manager_user_id', count(*) FROM public.manager_routine_snapshots WHERE manager_user_id = p_user_id
    UNION ALL SELECT 'pdis', 'seller_id', count(*) FROM public.pdis WHERE seller_id = p_user_id
    UNION ALL SELECT 'pdis', 'manager_id', count(*) FROM public.pdis WHERE manager_id = p_user_id
    UNION ALL SELECT 'devolutivas', 'seller_id', count(*) FROM public.devolutivas WHERE seller_id = p_user_id
    UNION ALL SELECT 'devolutivas', 'manager_id', count(*) FROM public.devolutivas WHERE manager_id = p_user_id
    UNION ALL SELECT 'planos_acao', 'responsavel_id', count(*) FROM public.planos_acao WHERE responsavel_id = p_user_id
  )
  SELECT coalesce(
    jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'count', ref_count))
      FILTER (WHERE ref_count > 0),
    '[]'::jsonb
  ) INTO v_blockers
  FROM counts;

  RETURN v_blockers;
END;
$$;

REVOKE ALL ON FUNCTION public.internal_mx_global_user_delete_preflight(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_mx_global_user_delete_preflight(uuid,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.internal_mx_record_hard_deleted_user(
  p_actor_id uuid,
  p_actor_role text,
  p_user_id uuid,
  p_before_data jsonb,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  IF lower(trim(p_actor_role)) NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.internal_mx_admin_audit (
    actor_id, actor_role, action, entity_type, entity_id,
    before_data, after_data, metadata
  ) VALUES (
    p_actor_id,
    lower(trim(p_actor_role)),
    'hard_delete',
    'usuario',
    p_user_id,
    p_before_data,
    NULL,
    jsonb_build_object('reason', p_reason)
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.internal_mx_record_hard_deleted_user(uuid,text,uuid,jsonb,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_mx_record_hard_deleted_user(uuid,text,uuid,jsonb,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.internal_mx_apply_store_team_mutation(
  p_actor_id uuid,
  p_action text,
  p_user_id uuid,
  p_store_id uuid,
  p_previous_store_id uuid DEFAULT NULL,
  p_updates jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text;
  v_action text := lower(trim(p_action));
  v_before public.usuarios%ROWTYPE;
  v_after public.usuarios%ROWTYPE;
  v_current_role text;
  v_next_role text;
  v_role_id uuid;
  v_previous_store_id uuid := coalesce(p_previous_store_id, p_store_id);
  v_ended_at date := coalesce(nullif(p_updates->>'ended_at', '')::date, current_date);
BEGIN
  SELECT u.role INTO v_actor_role
  FROM public.usuarios u
  WHERE u.id = p_actor_id AND u.active = true
  FOR SHARE;

  IF v_actor_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_actor_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx') THEN
    IF p_actor_id = p_user_id THEN
      RAISE EXCEPTION 'self_mutation_forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT public.tem_papel_loja(p_store_id, ARRAY[v_actor_role], p_actor_id) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF v_previous_store_id IS DISTINCT FROM p_store_id THEN
      RAISE EXCEPTION 'cross_store_move_forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_before
  FROM public.usuarios
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT vl.role INTO v_current_role
  FROM public.vinculos_loja vl
  WHERE vl.user_id = p_user_id
    AND vl.store_id = v_previous_store_id
    AND vl.is_active = true
  FOR UPDATE;

  v_current_role := coalesce(v_current_role, v_before.role);

  IF v_actor_role = 'gerente' AND v_current_role <> 'vendedor' THEN
    RAISE EXCEPTION 'manager_scope_forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_actor_role = 'dono' AND v_current_role = 'dono' THEN
    RAISE EXCEPTION 'owner_scope_forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_action = 'delete' THEN
    UPDATE public.vendedores_loja
    SET is_active = false,
        ended_at = coalesce(ended_at, current_date),
        updated_at = now()
    WHERE store_id = p_store_id AND seller_user_id = p_user_id;

    UPDATE public.vinculos_loja
    SET is_active = false,
        ended_at = coalesce(ended_at, current_date)
    WHERE store_id = p_store_id AND user_id = p_user_id;

    UPDATE public.usuarios u
    SET active = EXISTS (
          SELECT 1 FROM public.vinculos_loja active_link
          WHERE active_link.user_id = p_user_id AND active_link.is_active = true
        ),
        updated_at = now()
    WHERE u.id = p_user_id
    RETURNING * INTO v_after;

  ELSIF v_action = 'update' THEN
    v_next_role := lower(trim(coalesce(nullif(p_updates->>'role', ''), 'vendedor')));
    IF v_next_role NOT IN ('dono', 'gerente', 'vendedor') THEN
      RAISE EXCEPTION 'invalid_store_role' USING ERRCODE = '22023';
    END IF;
    IF v_actor_role = 'gerente' AND v_next_role <> 'vendedor' THEN
      RAISE EXCEPTION 'manager_scope_forbidden' USING ERRCODE = '42501';
    END IF;
    IF v_actor_role = 'dono' AND v_next_role = 'dono' THEN
      RAISE EXCEPTION 'owner_scope_forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = p_store_id) THEN
      RAISE EXCEPTION 'store_not_found' USING ERRCODE = 'P0002';
    END IF;

    v_role_id := public.internal_mx_role_id(v_next_role);

    UPDATE public.usuarios
    SET email = CASE WHEN p_updates ? 'email' THEN lower(trim(p_updates->>'email')) ELSE email END,
        name = CASE WHEN p_updates ? 'name' THEN upper(trim(p_updates->>'name')) ELSE name END,
        phone = CASE WHEN p_updates ? 'phone' THEN nullif(trim(p_updates->>'phone'), '') ELSE phone END,
        role = v_next_role,
        role_id = v_role_id,
        active = CASE WHEN p_updates ? 'active' THEN (p_updates->>'active')::boolean ELSE true END,
        is_venda_loja = CASE WHEN p_updates ? 'is_venda_loja' THEN (p_updates->>'is_venda_loja')::boolean ELSE is_venda_loja END,
        updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_after;

    IF v_previous_store_id IS DISTINCT FROM p_store_id THEN
      UPDATE public.vinculos_loja
      SET is_active = false,
          ended_at = coalesce(ended_at, v_ended_at)
      WHERE user_id = p_user_id AND store_id = v_previous_store_id;

      UPDATE public.vendedores_loja
      SET is_active = false,
          ended_at = coalesce(ended_at, v_ended_at),
          updated_at = now()
      WHERE seller_user_id = p_user_id AND store_id = v_previous_store_id;
    END IF;

    INSERT INTO public.vinculos_loja (user_id, store_id, role, is_active, ended_at)
    VALUES (p_user_id, p_store_id, v_next_role, true, NULL)
    ON CONFLICT (user_id, store_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_active = true,
        ended_at = NULL;

    IF v_next_role = 'vendedor' THEN
      INSERT INTO public.vendedores_loja (
        store_id, seller_user_id, started_at, ended_at,
        is_active, closing_month_grace, updated_at
      ) VALUES (
        p_store_id,
        p_user_id,
        coalesce(nullif(p_updates->>'started_at', '')::date, current_date),
        nullif(p_updates->>'ended_at', '')::date,
        CASE WHEN p_updates ? 'is_active' THEN (p_updates->>'is_active')::boolean
             WHEN p_updates ? 'active' THEN (p_updates->>'active')::boolean
             ELSE true END,
        CASE WHEN p_updates ? 'closing_month_grace' THEN (p_updates->>'closing_month_grace')::boolean ELSE false END,
        now()
      )
      ON CONFLICT (store_id, seller_user_id) DO UPDATE
      SET started_at = EXCLUDED.started_at,
          ended_at = EXCLUDED.ended_at,
          is_active = EXCLUDED.is_active,
          closing_month_grace = EXCLUDED.closing_month_grace,
          updated_at = now();
    ELSE
      UPDATE public.vendedores_loja
      SET is_active = false,
          ended_at = coalesce(ended_at, v_ended_at),
          updated_at = now()
      WHERE seller_user_id = p_user_id AND is_active = true;
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.internal_mx_admin_audit (
    actor_id, actor_role, action, entity_type, entity_id, store_id,
    before_data, after_data, metadata
  ) VALUES (
    p_actor_id,
    v_actor_role,
    v_action || '_store_user',
    'usuario',
    p_user_id,
    p_store_id,
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('previous_store_id', v_previous_store_id)
  );

  RETURN to_jsonb(v_after);
END;
$$;

REVOKE ALL ON FUNCTION public.internal_mx_apply_store_team_mutation(uuid,text,uuid,uuid,uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_mx_apply_store_team_mutation(uuid,text,uuid,uuid,uuid,jsonb)
  TO service_role;

COMMIT;

-- DOWN
-- Revogar e remover as funções transacionais e a tabela de rate limit. Não
-- remover entradas já gravadas em internal_mx_admin_audit.
