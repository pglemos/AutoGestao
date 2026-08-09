-- ============================================================================
-- Migration: 20260808120000_mentor_plano_ataque_delta.sql
-- Delta:     docs/mentor-comercial/PRODUCT_DELTA_2026-08-07_PLANO_ATAQUE.md
--
-- ESCOPO (aditivo):
--   1. vehicle_model_catalog — catálogo mestre de modelos (delta §9).
--   2. carteira_campanhas    — targeting_kind + targeting_config (delta §5.1).
--   3. carteira_missao_itens — eligibility_reason + dedupe por oportunidade
--                              (delta §5.2, §22.3, §27).
--   4. oportunidades         — preco_interesse_min/max, catalog_model_id,
--                              classification_source (delta §15, §17).
--   5. veiculos_estoque      — catalog_model_id + classification_source
--                              (delta §13, §15).
--
-- Seed do catálogo: curadoria manual 2026-08-08, categoria conforme dado
-- público das montadoras (delta §9.2). Fonte e versão registradas em cada
-- linha; não inventar categoria fora deste seed.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VEHICLE MODEL CATALOG (delta §9)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_model_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL CHECK (length(trim(brand)) BETWEEN 1 AND 80),
  model text NOT NULL CHECK (length(trim(model)) BETWEEN 1 AND 120),
  normalized_brand text NOT NULL,
  normalized_model text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  category public.crm_categoria_veiculo NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'carro' CHECK (vehicle_type IN ('carro', 'moto', 'utilitario')),
  year_from integer CHECK (year_from IS NULL OR year_from BETWEEN 1900 AND 2100),
  year_to integer CHECK (year_to IS NULL OR year_to BETWEEN 1900 AND 2100),
  market text NOT NULL DEFAULT 'BR',
  active boolean NOT NULL DEFAULT true,
  source text NOT NULL,
  source_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (year_from IS NULL OR year_to IS NULL OR year_from <= year_to)
);

COMMENT ON TABLE public.vehicle_model_catalog IS
  'Catalogo mestre de modelos de veiculos (delta §9). Fonte e versao registradas por linha; categoria nunca inventada.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicle_model_catalog_norm
  ON public.vehicle_model_catalog (normalized_brand, normalized_model);

CREATE INDEX IF NOT EXISTS idx_vehicle_model_catalog_norm_model
  ON public.vehicle_model_catalog (normalized_model)
  WHERE active;

CREATE INDEX IF NOT EXISTS idx_vehicle_model_catalog_category
  ON public.vehicle_model_catalog (category)
  WHERE active;

ALTER TABLE public.vehicle_model_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vehicle_model_catalog FROM PUBLIC, anon, authenticated;

-- Leitura: qualquer usuario com papel em loja ou area interna (catalogo e
-- mestre global; vendedor precisa para cadastrar veiculo e sugerir match).
DROP POLICY IF EXISTS vehicle_model_catalog_read ON public.vehicle_model_catalog;
CREATE POLICY vehicle_model_catalog_read
  ON public.vehicle_model_catalog
  FOR SELECT TO authenticated
  USING (
    user_has_role(ARRAY['admin_mx'::text, 'master'::text, 'consultant'::text])
    OR EXISTS (
      SELECT 1 FROM public.vinculos_loja vl
      WHERE vl.user_id = auth.uid() AND vl.store_id IS NOT NULL
    )
  );

-- Escrita: somente area interna (admin/master/consultant). Seed e extensoes
-- sao governados, nao editaveis por vendedor.
DROP POLICY IF EXISTS vehicle_model_catalog_write ON public.vehicle_model_catalog;
CREATE POLICY vehicle_model_catalog_write
  ON public.vehicle_model_catalog
  FOR INSERT TO authenticated
  WITH CHECK (user_has_role(ARRAY['admin_mx'::text, 'master'::text, 'consultant'::text]));

DROP POLICY IF EXISTS vehicle_model_catalog_update ON public.vehicle_model_catalog;
CREATE POLICY vehicle_model_catalog_update
  ON public.vehicle_model_catalog
  FOR UPDATE TO authenticated
  USING (user_has_role(ARRAY['admin_mx'::text, 'master'::text, 'consultant'::text]))
  WITH CHECK (user_has_role(ARRAY['admin_mx'::text, 'master'::text, 'consultant'::text]));

DROP POLICY IF EXISTS vehicle_model_catalog_delete ON public.vehicle_model_catalog;
CREATE POLICY vehicle_model_catalog_delete
  ON public.vehicle_model_catalog
  FOR DELETE TO authenticated
  USING (user_has_role(ARRAY['admin_mx'::text, 'master'::text, 'consultant'::text]));

-- Seed curado (delta §9.2). Normalizacao: NFD, lowercase, hifen->espaco.
-- Fonte: curadoria manual 2026-08-08, categoria conforme dado publico das
-- montadoras. source_version identifica o conjunto exato; nao e catalogo
-- completo — complementos exigem revisao (mesma fonte/versao).
INSERT INTO public.vehicle_model_catalog
  (brand, model, normalized_brand, normalized_model, aliases, category, vehicle_type, source, source_version)
VALUES
  ('Chevrolet', 'Onix', 'chevrolet', 'onix', ARRAY['onix'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Hyundai', 'HB20', 'hyundai', 'hb20', ARRAY['hb20'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Volkswagen', 'Polo', 'volkswagen', 'polo', ARRAY['polo'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Volkswagen', 'Gol', 'volkswagen', 'gol', ARRAY['gol'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Fiat', 'Argo', 'fiat', 'argo', ARRAY['argo'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Renault', 'Kwid', 'renault', 'kwid', ARRAY['kwid'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Renault', 'Sandero', 'renault', 'sandero', ARRAY['sandero'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Toyota', 'Yaris Hatch', 'toyota', 'yaris hatch', ARRAY['yaris hatch', 'yaris hatchback'], 'hatch', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Toyota', 'Corolla', 'toyota', 'corolla', ARRAY['corolla'], 'sedan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Honda', 'Civic', 'honda', 'civic', ARRAY['civic'], 'sedan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Nissan', 'Sentra', 'nissan', 'sentra', ARRAY['sentra'], 'sedan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Volkswagen', 'Virtus', 'volkswagen', 'virtus', ARRAY['virtus'], 'sedan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Fiat', 'Cronos', 'fiat', 'cronos', ARRAY['cronos'], 'sedan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Chevrolet', 'Cruze', 'chevrolet', 'cruze', ARRAY['cruze'], 'sedan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Hyundai', 'HB20S', 'hyundai', 'hb20s', ARRAY['hb20s', 'hb20 sedan'], 'sedan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Volkswagen', 'T-Cross', 'volkswagen', 't-cross', ARRAY['t cross', 'tcross'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Chevrolet', 'Tracker', 'chevrolet', 'tracker', ARRAY['tracker'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Hyundai', 'Creta', 'hyundai', 'creta', ARRAY['creta'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Renault', 'Duster', 'renault', 'duster', ARRAY['duster'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Jeep', 'Renegade', 'jeep', 'renegade', ARRAY['renegade'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Jeep', 'Compass', 'jeep', 'compass', ARRAY['compass'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Toyota', 'Corolla Cross', 'toyota', 'corolla cross', ARRAY['corolla cross', 'corolla xrs', 'cross'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Honda', 'HR-V', 'honda', 'hr-v', ARRAY['hrv', 'hr v'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Nissan', 'Kicks', 'nissan', 'kicks', ARRAY['kicks'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Fiat', 'Pulse', 'fiat', 'pulse', ARRAY['pulse'], 'suv', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Toyota', 'Hilux', 'toyota', 'hilux', ARRAY['hilux'], 'picape', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Chevrolet', 'S10', 'chevrolet', 's10', ARRAY['s10', 's-10'], 'picape', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Ford', 'Ranger', 'ford', 'ranger', ARRAY['ranger'], 'picape', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Fiat', 'Toro', 'fiat', 'toro', ARRAY['toro'], 'picape', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Fiat', 'Strada', 'fiat', 'strada', ARRAY['strada'], 'picape', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Chevrolet', 'Spin', 'chevrolet', 'spin', ARRAY['spin'], 'minivan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Fiat', 'Doblò', 'fiat', 'doblo', ARRAY['doblo', 'doblò'], 'minivan', 'carro', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Renault', 'Kangoo', 'renault', 'kangoo', ARRAY['kangoo'], 'utilitario', 'utilitario', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Citroën', 'Partner', 'citroen', 'partner', ARRAY['partner'], 'utilitario', 'utilitario', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Honda', 'CG 160', 'honda', 'cg 160', ARRAY['cg 160', 'cg160', 'cg 160 fan'], 'moto', 'moto', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Honda', 'Biz 125', 'honda', 'biz 125', ARRAY['biz', 'biz 125'], 'moto', 'moto', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Honda', 'Titan 160', 'honda', 'titan 160', ARRAY['titan', 'titan 160'], 'moto', 'moto', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Honda', 'XRE 300', 'honda', 'xre 300', ARRAY['xre', 'xre 300'], 'moto', 'moto', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Yamaha', 'Factor 150', 'yamaha', 'factor 150', ARRAY['factor', 'factor 150'], 'moto', 'moto', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01'),
  ('Yamaha', 'Fazer 250', 'yamaha', 'fazer 250', ARRAY['fazer', 'fazer 250', 'fz25'], 'moto', 'moto', 'curadoria-manual-2026-08-08', 'curated-2026-08-08-01');

-- ============================================================================
-- 2. CARTEIRA_CAMPANHAS — targeting (delta §5.1)
-- ============================================================================

ALTER TABLE public.carteira_campanhas
  ADD COLUMN IF NOT EXISTS targeting_kind text NOT NULL DEFAULT 'carteira'
    CHECK (targeting_kind IN ('carteira', 'trade_interest', 'financing', 'vehicle_match')),
  ADD COLUMN IF NOT EXISTS targeting_config jsonb;

COMMENT ON COLUMN public.carteira_campanhas.targeting_kind IS
  'Público da campanha (delta §7.1): carteira | trade_interest | financing | vehicle_match. Comportamento legado = carteira.';

COMMENT ON COLUMN public.carteira_campanhas.targeting_config IS
  'Parâmetros do público, ex.: {"segment": "approved"} para financing (delta §7.2).';

-- ============================================================================
-- 3. CARTEIRA_MISSAO_ITENS — dedupe por oportunidade + motivo (delta §5.2, §27)
-- ============================================================================

ALTER TABLE public.carteira_missao_itens
  ADD COLUMN IF NOT EXISTS eligibility_reason jsonb;

COMMENT ON COLUMN public.carteira_missao_itens.oportunidade_id IS
  'Oportunidade de origem do item (delta §22.3). Nula quando o item nao vincula a uma oportunidade.';

COMMENT ON COLUMN public.carteira_missao_itens.eligibility_reason IS
  'Snapshot determinístico do motivo de elegibilidade no momento da criacao (delta §5.2).';

-- Substitui o UNIQUE (missao_id, cliente_id) por dois índices parciais
-- (delta §27): dedupe por oportunidade quando houver, por cliente quando nao.
-- Rows existentes (oportunidade_id nulo) continuam cobertas pelo parcial.
DROP INDEX IF EXISTS ux_carteira_missao_item_cliente;

CREATE UNIQUE INDEX IF NOT EXISTS ux_carteira_missao_item_cliente_sem_oportunidade
  ON public.carteira_missao_itens (missao_id, cliente_id)
  WHERE oportunidade_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_carteira_missao_item_oportunidade
  ON public.carteira_missao_itens (missao_id, oportunidade_id)
  WHERE oportunidade_id IS NOT NULL;

-- ============================================================================
-- 4. OPORTUNIDADES — faixa de preco + catalogo (delta §15, §17)
-- ============================================================================

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS preco_interesse_min numeric CHECK (preco_interesse_min IS NULL OR preco_interesse_min >= 0),
  ADD COLUMN IF NOT EXISTS preco_interesse_max numeric CHECK (preco_interesse_max IS NULL OR preco_interesse_max >= 0),
  ADD COLUMN IF NOT EXISTS catalog_model_id uuid,
  ADD COLUMN IF NOT EXISTS classification_source text CHECK (classification_source IS NULL OR classification_source IN ('catalog', 'manual', 'migration'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_catalog_model_fkey') THEN
    ALTER TABLE public.oportunidades
      ADD CONSTRAINT oportunidades_catalog_model_fkey
      FOREIGN KEY (catalog_model_id) REFERENCES public.vehicle_model_catalog (id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_preco_intervalo_check;
ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_preco_intervalo_check
  CHECK (preco_interesse_max IS NULL OR preco_interesse_min IS NULL OR preco_interesse_max >= preco_interesse_min);

COMMENT ON COLUMN public.oportunidades.preco_interesse_min IS
  'Faixa inferior de interesse do cliente (delta §15). Nunca sobrescreve texto original de veiculo_interesse.';

COMMENT ON COLUMN public.oportunidades.preco_interesse_max IS
  'Faixa superior de interesse do cliente; limite superior aberto quando nulo (delta §19.2).';

COMMENT ON COLUMN public.oportunidades.catalog_model_id IS
  'Modelo resolvido via vehicle_model_catalog; nulo quando ambiguo ou inexistente (delta §9.3).';

COMMENT ON COLUMN public.oportunidades.classification_source IS
  'Origem da classificacao: catalog | manual | migration (delta §13).';

CREATE INDEX IF NOT EXISTS idx_oportunidades_catalog_model
  ON public.oportunidades (catalog_model_id)
  WHERE catalog_model_id IS NOT NULL;

-- ============================================================================
-- 5. VEICULOS_ESTOQUE — catalogo + origem (delta §13, §15)
-- ============================================================================

ALTER TABLE public.veiculos_estoque
  ADD COLUMN IF NOT EXISTS catalog_model_id uuid,
  ADD COLUMN IF NOT EXISTS classification_source text CHECK (classification_source IS NULL OR classification_source IN ('catalog', 'manual', 'migration'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'veiculos_estoque_catalog_model_fkey') THEN
    ALTER TABLE public.veiculos_estoque
      ADD CONSTRAINT veiculos_estoque_catalog_model_fkey
      FOREIGN KEY (catalog_model_id) REFERENCES public.vehicle_model_catalog (id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON COLUMN public.veiculos_estoque.catalog_model_id IS
  'Modelo resolvido via vehicle_model_catalog; nulo quando ambiguo ou inexistente (delta §9.3).';

COMMENT ON COLUMN public.veiculos_estoque.classification_source IS
  'Origem da classificacao: catalog | manual | migration (delta §13).';

CREATE INDEX IF NOT EXISTS idx_veiculos_estoque_catalog_model
  ON public.veiculos_estoque (catalog_model_id)
  WHERE catalog_model_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_veiculos_estoque_categoria
  ON public.veiculos_estoque (categoria)
  WHERE categoria IS NOT NULL;

-- ============================================================================
-- 6. RPC CARTEIRA_INICIAR_MISSAO — itens com oportunidade + dedupe (delta
--    §22.3, §27). O ON CONFLICT (missao_id, cliente_id) original quebraria
--    após a troca do índice único pelos parciais; usamos ON CONFLICT DO
--    NOTHING (cobre ambos os índices parciais) e aceitamos `itens` com
--    oportunidade_id/eligibility_reason no payload. Comportamento legado
--    (somente clientes_ids) é preservado.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.carteira_iniciar_missao(
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store_id uuid;
  v_missao_id uuid;
  v_existing_id uuid;
  v_client_id uuid;
  v_oportunidade_id uuid;
  v_eligibility jsonb;
  v_item jsonb;
  v_order integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  SELECT vl.store_id INTO v_store_id
  FROM public.vinculos_loja vl
  WHERE vl.user_id = v_user
    AND vl.is_active = true
  ORDER BY vl.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem vínculo ativo com loja.';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.carteira_missoes
    WHERE seller_user_id = v_user
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'replayed', true, 'missao_id', v_existing_id);
    END IF;
  END IF;

  INSERT INTO public.carteira_missoes (
    loja_id,
    seller_user_id,
    tipo_missao,
    status,
    total_clientes,
    clientes_ids,
    iniciada_em,
    idempotency_key,
    metadata,
    updated_by
  ) VALUES (
    v_store_id,
    v_user,
    COALESCE(NULLIF(p_payload->>'tipo_missao', ''), 'Missão comercial'),
    COALESCE(NULLIF(p_payload->>'status', ''), 'Preparando'),
    COALESCE((p_payload->>'total_clientes')::integer, jsonb_array_length(COALESCE(p_payload->'clientes_ids', '[]'::jsonb))),
    ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'clientes_ids', '[]'::jsonb))),
    COALESCE(NULLIF(p_payload->>'iniciada_em', '')::timestamptz, now()),
    p_idempotency_key,
    COALESCE(p_payload->'metadata', '{}'::jsonb),
    v_user
  )
  RETURNING id INTO v_missao_id;

  -- Modo novo (delta §22.3): itens com cliente/oportunidade/motivo.
  IF jsonb_typeof(p_payload->'itens') = 'array' AND jsonb_array_length(p_payload->'itens') > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'itens') LOOP
      v_client_id := NULLIF(v_item->>'cliente_id', '')::uuid;
      v_oportunidade_id := NULLIF(v_item->>'oportunidade_id', '')::uuid;
      v_eligibility := v_item->'eligibility_reason';

      IF v_client_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Escopo: oportunidade precisa pertencer à loja do vendedor.
      IF v_oportunidade_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.oportunidades o
          WHERE o.id = v_oportunidade_id AND o.loja_id = v_store_id
        ) THEN
          RAISE EXCEPTION 'Oportunidade fora do escopo da loja do vendedor.';
        END IF;

        INSERT INTO public.carteira_missao_itens (
          missao_id, cliente_id, oportunidade_id, eligibility_reason, ordem
        ) VALUES (
          v_missao_id, v_client_id, v_oportunidade_id,
          CASE WHEN v_eligibility IS NULL OR jsonb_typeof(v_eligibility) <> 'object'
            THEN '{}'::jsonb ELSE v_eligibility END,
          v_order
        )
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO public.carteira_missao_itens (missao_id, cliente_id, eligibility_reason, ordem)
        VALUES (
          v_missao_id, v_client_id,
          CASE WHEN v_eligibility IS NULL OR jsonb_typeof(v_eligibility) <> 'object'
            THEN '{}'::jsonb ELSE v_eligibility END,
          v_order
        )
        ON CONFLICT DO NOTHING;
      END IF;

      v_order := v_order + 1;
    END LOOP;
  ELSE
    -- Modo legado: somente clientes_ids (dedupe cobrado pelos índices parciais).
    FOR v_client_id IN
      SELECT value::uuid
      FROM jsonb_array_elements_text(COALESCE(p_payload->'clientes_ids', '[]'::jsonb))
    LOOP
      INSERT INTO public.carteira_missao_itens (missao_id, cliente_id, ordem)
      VALUES (v_missao_id, v_client_id, v_order)
      ON CONFLICT DO NOTHING;
      v_order := v_order + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'replayed', false, 'missao_id', v_missao_id);
END;
$$;

-- v2 continua como wrapper de segurança (escopo + idempotência). A validação
-- de oportunidades agora também cobre `itens`, preservando o hardening.
CREATE OR REPLACE FUNCTION public.carteira_iniciar_missao_v2(
  p_payload jsonb,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store_id uuid;
  v_client_ids uuid[];
  v_existing_id uuid;
  v_scoped_key text;
  v_payload jsonb;
  v_opportunity_ids uuid[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.';
  END IF;
  IF jsonb_typeof(COALESCE(p_payload->'clientes_ids', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'clientes_ids deve ser uma lista.';
  END IF;

  SELECT vl.store_id INTO v_store_id
  FROM public.vinculos_loja vl
  WHERE vl.user_id = v_user
    AND vl.is_active = true
    AND lower(vl.role) IN ('vendedor', 'seller')
  ORDER BY vl.created_at DESC NULLS LAST
  LIMIT 1;

  SELECT COALESCE(array_agg(client_id ORDER BY client_id), '{}'::uuid[])
  INTO v_client_ids
  FROM (
    SELECT DISTINCT value::uuid AS client_id
    FROM jsonb_array_elements_text(COALESCE(p_payload->'clientes_ids', '[]'::jsonb))
  ) ids;

  IF v_store_id IS NULL OR cardinality(v_client_ids) = 0 THEN
    RAISE EXCEPTION 'Missão requer loja e ao menos um cliente.';
  END IF;

  IF (
    SELECT count(*) FROM public.clientes c
    WHERE c.id = ANY(v_client_ids)
      AND c.seller_user_id = v_user
      AND c.loja_id = v_store_id
  ) <> cardinality(v_client_ids) THEN
    RAISE EXCEPTION 'Cliente de missão inválido ou fora do escopo do vendedor.';
  END IF;

  -- Validação de oportunidades em itens (delta §22.3): mesma loja do vendedor.
  IF jsonb_typeof(p_payload->'itens') = 'array' THEN
    SELECT COALESCE(array_agg(DISTINCT value::uuid), '{}'::uuid[])
    INTO v_opportunity_ids
    FROM jsonb_array_elements(p_payload->'itens') AS itens
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN NULLIF(itens->>'oportunidade_id', '') IS NULL THEN '[]'::jsonb
           ELSE to_jsonb(ARRAY[itens->>'oportunidade_id']) END
    ) AS value;

    IF cardinality(v_opportunity_ids) > 0 AND (
      SELECT count(*) FROM public.oportunidades o
      WHERE o.id = ANY(v_opportunity_ids) AND o.loja_id = v_store_id
    ) <> cardinality(v_opportunity_ids) THEN
      RAISE EXCEPTION 'Oportunidade de missão inválida ou fora do escopo da loja.';
    END IF;
  END IF;

  v_scoped_key := v_user::text || ':' || p_idempotency_key;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('carteira:mission:' || v_user::text || ':' || array_to_string(v_client_ids, ','), 0)
  );

  SELECT m.id INTO v_existing_id
  FROM public.carteira_missoes m
  WHERE m.seller_user_id = v_user
    AND m.loja_id = v_store_id
    AND m.status IN ('Preparando', 'Enviando mensagens', 'Respondendo clientes', 'Pausada', 'Aguardando respostas')
    AND ARRAY(SELECT value FROM unnest(m.clientes_ids) value ORDER BY value) = v_client_ids
  ORDER BY m.updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true, 'missao_id', v_existing_id);
  END IF;

  v_payload := jsonb_set(p_payload, '{clientes_ids}', to_jsonb(v_client_ids), true);
  v_payload := jsonb_set(v_payload, '{total_clientes}', to_jsonb(cardinality(v_client_ids)), true);
  RETURN public.carteira_iniciar_missao(v_payload, v_scoped_key);
END;
$$;

-- ============================================================================
-- 7. RPC CARTEIRA_SALVAR_CAMPANHA — targeting (delta §5.1, §7.2, §22.1).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.carteira_salvar_campanha(
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_acting_seller_user_id uuid DEFAULT NULL,
  p_acting_store_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_context record;
  v_id uuid;
  v_existing_id uuid;
  v_tipo text := lower(NULLIF(trim(p_payload->>'tipo'), ''));
  v_titulo text := NULLIF(trim(p_payload->>'titulo'), '');
  v_targeting_kind text := COALESCE(NULLIF(p_payload->>'targeting_kind', ''), 'carteira');
  v_targeting_config jsonb := COALESCE(p_payload->'targeting_config', '{}'::jsonb);
  v_segment text;
BEGIN
  SELECT * INTO v_context
  FROM public.carteira_contexto_vendedor(p_acting_seller_user_id, p_acting_store_id);
  IF v_context.store_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem vínculo ativo com loja.';
  END IF;
  IF v_tipo NOT IN ('campanha', 'feirao', 'desconto', 'bonus_troca') THEN
    RAISE EXCEPTION 'Tipo de campanha inválido.';
  END IF;
  IF v_titulo IS NULL OR length(v_titulo) < 3 THEN
    RAISE EXCEPTION 'Título da campanha é obrigatório.';
  END IF;
  IF v_targeting_kind NOT IN ('carteira', 'trade_interest', 'financing', 'vehicle_match') THEN
    RAISE EXCEPTION 'targeting_kind inválido.';
  END IF;
  IF v_targeting_kind = 'financing' THEN
    v_segment := v_targeting_config->>'segment';
    IF v_segment IS NULL OR v_segment NOT IN ('all', 'approved', 'approved_with_conditions', 'rejected', 'pending', 'new_simulation') THEN
      RAISE EXCEPTION 'Campanha de financiamento exige targeting_config.segment válido.';
    END IF;
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.carteira_campanhas
    WHERE created_by = v_context.user_id AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'replayed', true, 'campanha_id', v_existing_id);
    END IF;
  END IF;
  INSERT INTO public.carteira_campanhas (
    loja_id, created_by, tipo, titulo, descricao, valor_desconto,
    bonus_troca, inicio_em, fim_em, status, idempotency_key,
    targeting_kind, targeting_config
  ) VALUES (
    v_context.store_id,
    v_context.user_id,
    v_tipo,
    v_titulo,
    NULLIF(trim(p_payload->>'descricao'), ''),
    NULLIF(p_payload->>'valor_desconto', '')::numeric,
    NULLIF(p_payload->>'bonus_troca', '')::numeric,
    COALESCE(NULLIF(p_payload->>'inicio_em', '')::date, CURRENT_DATE),
    NULLIF(p_payload->>'fim_em', '')::date,
    'ativa',
    p_idempotency_key,
    v_targeting_kind,
    v_targeting_config
  )
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'replayed', false, 'campanha_id', v_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.carteira_iniciar_missao(jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.carteira_iniciar_missao_v2(jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.carteira_salvar_campanha(jsonb, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.carteira_iniciar_missao(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.carteira_iniciar_missao_v2(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.carteira_salvar_campanha(jsonb, text, uuid, uuid) TO authenticated;

-- ============================================================================

COMMIT;
