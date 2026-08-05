-- Hierarquia matriz ↔ filial em public.lojas
--
-- Motivação: o produto trata cada unidade como uma loja solta. A tela de
-- administração da loja oferece "Gerenciar filiais", mas não existia como
-- registrar que uma unidade pertence a uma matriz — a migration
-- 20260804200000_owner_network_cockpit já documentava a ausência de
-- `parent_id` como limitação conhecida.
--
-- Decisões:
-- 1. Hierarquia de UM nível só. Matriz é `parent_loja_id IS NULL`; filial
--    aponta para uma matriz. Filial de filial é bloqueada por trigger.
-- 2. `ON DELETE SET NULL`: excluir a matriz promove as filiais a matriz em vez
--    de apagar unidades com histórico de vendas.
-- 3. Escrita continua exclusiva das RPCs admin (área interna MX) — a coluna é
--    apenas mais um campo aceito no payload.

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS parent_loja_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lojas_parent_loja_id_fkey'
  ) THEN
    ALTER TABLE public.lojas
      ADD CONSTRAINT lojas_parent_loja_id_fkey
      FOREIGN KEY (parent_loja_id) REFERENCES public.lojas (id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lojas_parent_nao_autorreferencia'
  ) THEN
    ALTER TABLE public.lojas
      ADD CONSTRAINT lojas_parent_nao_autorreferencia
      CHECK (parent_loja_id IS NULL OR parent_loja_id <> id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_lojas_parent_loja_id
  ON public.lojas (parent_loja_id)
  WHERE parent_loja_id IS NOT NULL;

COMMENT ON COLUMN public.lojas.parent_loja_id IS
  'Matriz desta unidade. NULL = a própria loja é matriz. Hierarquia limitada a um nível (trigger lojas_valida_hierarquia).';

-- Um nível só: o pai precisa ser matriz, e quem já tem filiais não pode virar
-- filial. CHECK não consegue consultar outras linhas, então vai de trigger.
CREATE OR REPLACE FUNCTION public.lojas_valida_hierarquia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.parent_loja_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_loja_id = NEW.id THEN
    RAISE EXCEPTION 'Uma loja não pode ser filial de si mesma.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = NEW.parent_loja_id) THEN
    RAISE EXCEPTION 'Matriz informada não existe.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lojas
     WHERE id = NEW.parent_loja_id
       AND parent_loja_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A loja indicada como matriz já é filial de outra unidade.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lojas
     WHERE parent_loja_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Esta loja já é matriz de outras unidades e não pode virar filial.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.lojas_valida_hierarquia() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_lojas_valida_hierarquia ON public.lojas;
CREATE TRIGGER trg_lojas_valida_hierarquia
  BEFORE INSERT OR UPDATE OF parent_loja_id ON public.lojas
  FOR EACH ROW
  EXECUTE FUNCTION public.lojas_valida_hierarquia();

-- RPC de criação passa a aceitar `parent_loja_id` no payload.
CREATE OR REPLACE FUNCTION public.admin_create_store(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_store_id uuid;
  v_store_name text := upper(trim(coalesce(p_payload->>'name', '')));
  v_manager_email text := nullif(lower(trim(coalesce(p_payload->>'manager_email', ''))), '');
  v_partners jsonb := coalesce(p_payload->'partners', '[]'::jsonb);
  v_parent_id uuid := nullif(trim(coalesce(p_payload->>'parent_loja_id', '')), '')::uuid;
BEGIN
  SELECT role
    INTO v_caller_role
    FROM public.usuarios
   WHERE id = v_caller_id
     AND active = true;

  IF NOT public.eh_area_interna_mx(v_caller_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Apenas a área interna MX pode criar lojas.');
  END IF;

  IF v_store_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nome da loja é obrigatório.');
  END IF;

  IF jsonb_typeof(v_partners) IS DISTINCT FROM 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sócios da loja devem ser enviados como lista.');
  END IF;

  INSERT INTO public.lojas (
    name,
    manager_email,
    legal_name,
    cnpj,
    address,
    administrative_phone,
    partners,
    parent_loja_id,
    active,
    source_mode
  ) VALUES (
    v_store_name,
    v_manager_email,
    nullif(trim(coalesce(p_payload->>'legal_name', '')), ''),
    nullif(trim(coalesce(p_payload->>'cnpj', '')), ''),
    nullif(trim(coalesce(p_payload->>'address', '')), ''),
    nullif(trim(coalesce(p_payload->>'administrative_phone', '')), ''),
    v_partners,
    v_parent_id,
    true,
    'native_app'
  )
  RETURNING id INTO v_store_id;

  -- Criar/Vincular registro em clientes_consultoria para permitir agendamentos na Agenda MX.
  -- ON CONFLICT (slug) linka um cliente ja existente (ex.: importado antes da loja)
  -- em vez de descartar o insert quando o slug ja existe sem loja vinculada.
  INSERT INTO public.clientes_consultoria (
    name,
    slug,
    status,
    primary_store_id,
    created_by,
    current_visit_step
  ) VALUES (
    v_store_name,
    lower(regexp_replace(v_store_name, '[^a-zA-Z0-9]+', '-', 'g')),
    'ativo',
    v_store_id,
    v_caller_id,
    0
  )
  ON CONFLICT (slug) DO UPDATE SET
    primary_store_id = coalesce(public.clientes_consultoria.primary_store_id, EXCLUDED.primary_store_id);

  INSERT INTO public.regras_entrega_loja (
    store_id,
    matinal_recipients,
    weekly_recipients,
    monthly_recipients,
    timezone,
    active,
    updated_by
  ) VALUES (
    v_store_id,
    CASE WHEN v_manager_email IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_manager_email] END,
    CASE WHEN v_manager_email IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_manager_email] END,
    CASE WHEN v_manager_email IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_manager_email] END,
    'America/Sao_Paulo',
    true,
    v_caller_id
  )
  ON CONFLICT (store_id) DO UPDATE SET
    matinal_recipients = EXCLUDED.matinal_recipients,
    weekly_recipients = EXCLUDED.weekly_recipients,
    monthly_recipients = EXCLUDED.monthly_recipients,
    timezone = EXCLUDED.timezone,
    active = EXCLUDED.active,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  INSERT INTO public.regras_metas_loja (
    store_id,
    monthly_goal,
    individual_goal_mode,
    include_venda_loja_in_store_total,
    include_venda_loja_in_individual_goal,
    bench_lead_agd,
    bench_agd_visita,
    bench_visita_vnd,
    projection_mode,
    updated_by
  ) VALUES (
    v_store_id,
    coalesce(nullif(p_payload->>'monthly_goal', '')::integer, 0),
    'even',
    true,
    false,
    20,
    60,
    33,
    'calendar',
    v_caller_id
  )
  ON CONFLICT (store_id) DO UPDATE SET
    monthly_goal = EXCLUDED.monthly_goal,
    individual_goal_mode = EXCLUDED.individual_goal_mode,
    include_venda_loja_in_store_total = EXCLUDED.include_venda_loja_in_store_total,
    include_venda_loja_in_individual_goal = EXCLUDED.include_venda_loja_in_individual_goal,
    bench_lead_agd = EXCLUDED.bench_lead_agd,
    bench_agd_visita = EXCLUDED.bench_agd_visita,
    bench_visita_vnd = EXCLUDED.bench_visita_vnd,
    projection_mode = EXCLUDED.projection_mode,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  INSERT INTO public.benchmarks_loja (
    store_id,
    lead_to_agend,
    agend_to_visit,
    visit_to_sale,
    updated_by
  ) VALUES (
    v_store_id,
    20,
    60,
    33,
    v_caller_id
  )
  ON CONFLICT (store_id) DO UPDATE SET
    lead_to_agend = EXCLUDED.lead_to_agend,
    agend_to_visit = EXCLUDED.agend_to_visit,
    visit_to_sale = EXCLUDED.visit_to_sale,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object('id', v_store_id)
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

-- RPC de edição passa a aceitar `parent_loja_id` (inclusive null explícito para
-- desvincular a filial da matriz).
CREATE OR REPLACE FUNCTION public.admin_update_store(p_store_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_active boolean;
BEGIN
  SELECT role
    INTO v_caller_role
    FROM public.usuarios
   WHERE id = v_caller_id
     AND active = true;

  IF NOT public.eh_area_interna_mx(v_caller_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Apenas a área interna MX pode editar lojas.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = p_store_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Loja não encontrada.');
  END IF;

  v_active := CASE
    WHEN p_payload ? 'active' THEN (p_payload->>'active')::boolean
    ELSE NULL
  END;

  UPDATE public.lojas
     SET name = CASE WHEN p_payload ? 'name' THEN upper(trim(p_payload->>'name')) ELSE name END,
         manager_email = CASE WHEN p_payload ? 'manager_email' THEN nullif(lower(trim(coalesce(p_payload->>'manager_email', ''))), '') ELSE manager_email END,
         legal_name = CASE WHEN p_payload ? 'legal_name' THEN nullif(trim(coalesce(p_payload->>'legal_name', '')), '') ELSE legal_name END,
         cnpj = CASE WHEN p_payload ? 'cnpj' THEN nullif(trim(coalesce(p_payload->>'cnpj', '')), '') ELSE cnpj END,
         address = CASE WHEN p_payload ? 'address' THEN nullif(trim(coalesce(p_payload->>'address', '')), '') ELSE address END,
         administrative_phone = CASE WHEN p_payload ? 'administrative_phone' THEN nullif(trim(coalesce(p_payload->>'administrative_phone', '')), '') ELSE administrative_phone END,
         partners = CASE WHEN p_payload ? 'partners' THEN coalesce(p_payload->'partners', '[]'::jsonb) ELSE partners END,
         parent_loja_id = CASE WHEN p_payload ? 'parent_loja_id' THEN nullif(trim(coalesce(p_payload->>'parent_loja_id', '')), '')::uuid ELSE parent_loja_id END,
         active = coalesce(v_active, active),
         updated_at = now()
   WHERE id = p_store_id;

  IF v_active IS FALSE THEN
    UPDATE public.vendedores_loja
       SET is_active = false,
           ended_at = coalesce(ended_at, current_date)
     WHERE store_id = p_store_id
       AND is_active = true;

    UPDATE public.vinculos_loja
       SET is_active = false,
           ended_at = coalesce(ended_at, current_date)
     WHERE store_id = p_store_id
       AND is_active = true;
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('id', p_store_id));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

-- DOWN (manual):
-- drop trigger if exists trg_lojas_valida_hierarquia on public.lojas;
-- drop function if exists public.lojas_valida_hierarquia();
-- alter table public.lojas drop constraint if exists lojas_parent_nao_autorreferencia;
-- alter table public.lojas drop constraint if exists lojas_parent_loja_id_fkey;
-- drop index if exists public.idx_lojas_parent_loja_id;
-- alter table public.lojas drop column if exists parent_loja_id;
-- (as RPCs admin_create_store/admin_update_store voltam à versão anterior)
