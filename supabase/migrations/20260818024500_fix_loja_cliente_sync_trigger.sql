-- Corrige a sincronização Loja -> Cliente Consultoria introduzida em 20260817190000.
--
-- Problemas corrigidos:
-- 1. ON CONFLICT (primary_store_id) era incompatível com o índice UNIQUE parcial
--    clientes_consultoria_one_active_per_store_uidx e quebrava INSERT/UPDATE em lojas.
-- 2. lojas.structure_type usa matriz/filial, enquanto clientes_consultoria.structure_type
--    usa LOJA_UNICA/REDE. Esses conceitos não podem ser copiados diretamente.
-- 3. A função SECURITY DEFINER de trigger estava executável por PUBLIC/anon/authenticated.
--
-- Estratégia:
-- - atualizar primeiro o cliente já ligado à loja;
-- - se não houver, reaproveitar um cliente inativo/não arquivado sem loja com mesmo slug;
-- - somente então criar um novo registro;
-- - preservar structure_type do cliente, que pertence ao domínio do cliente;
-- - trigger permanece invocável internamente pelo PostgreSQL, sem RPC pública.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_loja_to_cliente_consultoria_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_slug text;
BEGIN
  v_slug := NULLIF(
    trim(
      both '-'
      FROM lower(
        regexp_replace(
          coalesce(NULLIF(NEW.slug, ''), NEW.name),
          '[^a-zA-Z0-9]+',
          '-',
          'g'
        )
      )
    ),
    ''
  );

  IF v_slug IS NULL THEN
    v_slug := 'loja-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  -- Caminho normal: a loja já tem um cliente vinculado. Priorizamos o ativo
  -- caso exista histórico, sem pressupor UNIQUE(primary_store_id) global.
  SELECT c.id
    INTO v_client_id
  FROM public.clientes_consultoria c
  WHERE c.primary_store_id = NEW.id
  ORDER BY
    CASE
      WHEN lower(coalesce(c.status, '')) IN ('ativo', 'ativa', 'active') THEN 0
      ELSE 1
    END,
    c.updated_at DESC NULLS LAST,
    c.created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- Compatibilidade com cadastros legados: se uma loja acabou de ser criada e
  -- já existe cliente não arquivado com o mesmo slug, ligamos esse cadastro em
  -- vez de criar uma segunda identidade concorrente.
  IF v_client_id IS NULL THEN
    SELECT c.id
      INTO v_client_id
    FROM public.clientes_consultoria c
    WHERE c.primary_store_id IS NULL
      AND c.slug = v_slug
      AND lower(coalesce(c.status, '')) <> 'arquivado'
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_client_id IS NOT NULL THEN
    UPDATE public.clientes_consultoria c
    SET
      name = NEW.name,
      legal_name = NEW.legal_name,
      cnpj = NEW.cnpj,
      product_name = COALESCE(NEW.product_name, c.product_name, 'Consultoria PMR'),
      status = COALESCE(
        NEW.status,
        CASE WHEN NEW.active THEN 'ativo' ELSE 'inativo' END
      ),
      notes = NEW.notes,
      primary_store_id = NEW.id,
      current_visit_step = COALESCE(NEW.current_visit_step, c.current_visit_step, 0),
      modality = COALESCE(NEW.modality, c.modality, 'Presencial'),
      program_template_key = COALESCE(
        NEW.program_template_key,
        c.program_template_key,
        'pmr_7'
      ),
      -- O slug do cliente é URL estável. Só o preenchemos quando ainda não existe.
      slug = COALESCE(NULLIF(c.slug, ''), v_slug),
      -- structure_type é deliberadamente preservado no cliente. Na loja ele
      -- representa matriz/filial; no cliente representa LOJA_UNICA/REDE.
      business_phase = NEW.business_phase,
      implementation_owner_id = NEW.implementation_owner_id,
      contract_start_date = NEW.contract_start_date,
      contract_end_date = NEW.contract_end_date,
      onboarding_step = LEAST(
        GREATEST(COALESCE(NEW.onboarding_step, c.onboarding_step, 1), 1),
        7
      ),
      onboarding_completed = COALESCE(
        NEW.onboarding_completed,
        c.onboarding_completed,
        false
      ),
      suspended_at = NEW.suspended_at,
      suspended_reason = NEW.suspended_reason,
      activated_at = NEW.activated_at,
      scheduled_activation_at = NEW.scheduled_activation_at,
      updated_at = now()
    WHERE c.id = v_client_id;

    RETURN NEW;
  END IF;

  -- Slug globalmente único: um registro arquivado com o mesmo slug não deve ser
  -- reativado implicitamente. Nesse caso criamos uma URL distinta e rastreável.
  IF EXISTS (
    SELECT 1
    FROM public.clientes_consultoria c
    WHERE c.slug = v_slug
  ) THEN
    v_slug := v_slug || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  INSERT INTO public.clientes_consultoria (
    name,
    legal_name,
    cnpj,
    product_name,
    status,
    notes,
    primary_store_id,
    current_visit_step,
    modality,
    program_template_key,
    slug,
    business_phase,
    implementation_owner_id,
    contract_start_date,
    contract_end_date,
    onboarding_step,
    onboarding_completed,
    suspended_at,
    suspended_reason,
    activated_at,
    scheduled_activation_at,
    updated_at
  ) VALUES (
    NEW.name,
    NEW.legal_name,
    NEW.cnpj,
    COALESCE(NEW.product_name, 'Consultoria PMR'),
    COALESCE(
      NEW.status,
      CASE WHEN NEW.active THEN 'ativo' ELSE 'inativo' END
    ),
    NEW.notes,
    NEW.id,
    COALESCE(NEW.current_visit_step, 0),
    COALESCE(NEW.modality, 'Presencial'),
    COALESCE(NEW.program_template_key, 'pmr_7'),
    v_slug,
    NEW.business_phase,
    NEW.implementation_owner_id,
    NEW.contract_start_date,
    NEW.contract_end_date,
    LEAST(GREATEST(COALESCE(NEW.onboarding_step, 1), 1), 7),
    COALESCE(NEW.onboarding_completed, false),
    NEW.suspended_at,
    NEW.suspended_reason,
    NEW.activated_at,
    NEW.scheduled_activation_at,
    now()
  );

  RETURN NEW;
END;
$$;

-- Função de trigger SECURITY DEFINER não é endpoint RPC. O executor do trigger
-- não precisa de EXECUTE concedido ao papel da sessão.
REVOKE ALL ON FUNCTION public.sync_loja_to_cliente_consultoria_fn()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_loja_to_cliente_consultoria_fn()
  TO service_role;

COMMENT ON FUNCTION public.sync_loja_to_cliente_consultoria_fn() IS
  'Sincroniza Loja para Cliente Consultoria sem depender de UNIQUE global em primary_store_id; preserva a semântica LOJA_UNICA/REDE e não expõe execução RPC.';

COMMIT;

-- DOWN
-- Não restaurar a versão anterior: ela é operacionalmente inválida
-- (ON CONFLICT sem constraint compatível) e reabre EXECUTE para anon/authenticated.
-- Em caso de regressão, corrigir por nova migration forward-only.
