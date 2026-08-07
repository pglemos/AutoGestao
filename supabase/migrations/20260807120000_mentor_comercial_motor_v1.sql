-- Mentor Comercial — Motor de Regras Determinístico V1
--
-- Fonte das regras: rules/mentor-comercial/v1/ (extraído de
-- Mentor_Comercial_Motor_Regras_v1.xlsx, sha256 3268de23…).
--
-- PRINCÍPIO: não criar um segundo CRM. As estruturas existentes continuam sendo a
-- autoridade das entidades que já representam; esta migration é ADITIVA.
--
--   Client              -> public.clientes                (já existe, inalterada)
--   CommercialOpportunity -> public.oportunidades          (recebe colunas do Mentor)
--   OpportunityAction   -> public.execution_actions        (já existe, fila canônica)
--   OpportunityHistory  -> public.eventos_comerciais       (já existe, tem oportunidade_id)
--   CadenceState        -> public.cadencia_estado_cliente  (recebe oportunidade_id)
--   AttackMission       -> public.carteira_missoes         (já existe)
--   AttackMissionItem   -> public.carteira_missao_itens    (recebe oportunidade_id)
--
-- Só são criadas tabelas para conceitos que NENHUMA estrutura atual representa:
-- os catálogos mestre da matriz, as pendências complementares, os snapshots de
-- score e a configuração comercial por loja.
--
-- Nada é dropado, renomeado, truncado ou atualizado em massa.

-- ============================================================================
-- 1. CATÁLOGOS MESTRE
-- ============================================================================
-- Versionados por `rule_version` para que uma v2 possa coexistir com a v1 sem
-- reescrever histórico. `source_sha256` amarra a linha ao arquivo que a gerou.

CREATE TABLE IF NOT EXISTS public.mentor_status_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version text NOT NULL DEFAULT 'v1',
  status_code text NOT NULL,
  channel text NOT NULL,
  family text NOT NULL,
  label text NOT NULL,
  definition text,
  origin text,
  responsible text NOT NULL,
  temperature text,
  objective text NOT NULL,
  next_step text NOT NULL,
  cadence_ref text,
  script_ref text,
  potential text,
  central_rule text,
  active_in_portfolio text,
  mentor_guidance text,
  main_results text,
  notes text,
  source_sha256 text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_status_definitions_code
  ON public.mentor_status_definitions (rule_version, status_code);
CREATE INDEX IF NOT EXISTS idx_mentor_status_definitions_family
  ON public.mentor_status_definitions (rule_version, family);

COMMENT ON TABLE public.mentor_status_definitions IS
  'Catálogo oficial dos status comerciais (aba 02 Status). Resolução de status vem daqui, nunca de if encadeado em componente.';
COMMENT ON COLUMN public.mentor_status_definitions.cadence_ref IS
  'Coluna polimórfica da fonte: ou é uma referência CAD-*, ou uma diretiva de modo (Central, Sem cadência, Derivada pela data, ...). Não é FK.';

CREATE TABLE IF NOT EXISTS public.mentor_cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version text NOT NULL DEFAULT 'v1',
  cadence_code text NOT NULL,
  name text NOT NULL,
  objective text,
  attempts_label text,
  day_pattern text,
  application text,
  interruption_condition text,
  final_condition text,
  source_sha256 text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_cadences_code
  ON public.mentor_cadences (rule_version, cadence_code);

COMMENT ON COLUMN public.mentor_cadences.attempts_label IS
  'Texto da fonte. Nem sempre numérico: CAD-11 = "Variável", CAD-13 = "Marcos".';

CREATE TABLE IF NOT EXISTS public.mentor_cadence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version text NOT NULL DEFAULT 'v1',
  cadence_code text NOT NULL,
  attempt_label text NOT NULL,
  step_order integer NOT NULL,
  offset_label text NOT NULL,
  objective text,
  notes text,
  source_sha256 text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_cadence_steps_order
  ON public.mentor_cadence_steps (rule_version, cadence_code, step_order);

COMMENT ON COLUMN public.mentor_cadence_steps.offset_label IS
  'Offset textual da fonte: D0, D+13, D-2, 12m, "Dia útil", "Configuração", "Data programada". Offset desconhecido nunca vira zero.';

CREATE TABLE IF NOT EXISTS public.mentor_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version text NOT NULL DEFAULT 'v1',
  script_code text NOT NULL,
  area text,
  attempt_label text,
  objective text,
  body text NOT NULL,
  source_sha256 text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_scripts_code
  ON public.mentor_scripts (rule_version, script_code);

COMMENT ON COLUMN public.mentor_scripts.body IS
  'Texto verbatim da fonte, incluindo quebras CRLF e placeholders {var}. Normalização é responsabilidade da apresentação, nunca do catálogo.';

CREATE TABLE IF NOT EXISTS public.mentor_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version text NOT NULL DEFAULT 'v1',
  family text NOT NULL,
  from_status_or_context text NOT NULL,
  result text NOT NULL,
  to_status text NOT NULL,
  decision_notes text,
  is_wildcard boolean NOT NULL DEFAULT false,
  source_sha256 text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_transitions_identity
  ON public.mentor_transitions (rule_version, family, from_status_or_context, result);
CREATE INDEX IF NOT EXISTS idx_mentor_transitions_lookup
  ON public.mentor_transitions (rule_version, result, family);

COMMENT ON TABLE public.mentor_transitions IS
  'Regras de transição (aba 06). A origem pode ser rótulo exato, contexto amplo ou curinga "Qualquer". Precedência: exato > contexto > curinga.';

-- ============================================================================
-- 2. COLUNAS DO MENTOR EM public.oportunidades
-- ============================================================================
-- Todas nullable: oportunidade existente não é reclassificada automaticamente.
-- `needs_mentor_classification` marca o que precisa de decisão humana (§35).

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS channel_entry text,
  ADD COLUMN IF NOT EXISTS channel_sale text,
  ADD COLUMN IF NOT EXISTS detailed_origin text,
  ADD COLUMN IF NOT EXISTS opportunity_type text,
  ADD COLUMN IF NOT EXISTS trade_interest boolean,
  ADD COLUMN IF NOT EXISTS financing_interest boolean,
  ADD COLUMN IF NOT EXISTS current_status_code text,
  ADD COLUMN IF NOT EXISTS previous_status_code text,
  ADD COLUMN IF NOT EXISTS return_status_code text,
  ADD COLUMN IF NOT EXISTS status_family text,
  ADD COLUMN IF NOT EXISTS current_responsible text,
  ADD COLUMN IF NOT EXISTS temperature text,
  ADD COLUMN IF NOT EXISTS current_objective text,
  ADD COLUMN IF NOT EXISTS current_next_step text,
  ADD COLUMN IF NOT EXISTS cadence_code text,
  ADD COLUMN IF NOT EXISTS current_cadence_step integer,
  ADD COLUMN IF NOT EXISTS current_script_code text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz,
  ADD COLUMN IF NOT EXISTS appointment_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_date date,
  ADD COLUMN IF NOT EXISTS potential text,
  ADD COLUMN IF NOT EXISTS mentor_score integer,
  ADD COLUMN IF NOT EXISTS mentor_score_class text,
  ADD COLUMN IF NOT EXISTS mentor_score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS priority_index integer,
  ADD COLUMN IF NOT EXISTS priority_class text,
  ADD COLUMN IF NOT EXISTS needs_mentor_classification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mentor_rule_version text,
  ADD COLUMN IF NOT EXISTS mentor_updated_at timestamptz;

DO $$
BEGIN
  -- Canais metodológicos oficiais são três. O enum legado `canal` continua
  -- intocado (tem 'showroom'); o mapeamento Showroom -> Porta acontece só no
  -- modelo metodológico, sem renomear nada no legado (§37).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_channel_entry_check') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT oportunidades_channel_entry_check
      CHECK (channel_entry IS NULL OR channel_entry IN ('Porta', 'Internet', 'Carteira'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_channel_sale_check') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT oportunidades_channel_sale_check
      CHECK (channel_sale IS NULL OR channel_sale IN ('Porta', 'Internet', 'Carteira'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_mentor_score_range') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT oportunidades_mentor_score_range
      CHECK (mentor_score IS NULL OR (mentor_score >= 0 AND mentor_score <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_priority_index_range') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT oportunidades_priority_index_range
      CHECK (priority_index IS NULL OR (priority_index >= 0 AND priority_index <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_score_class_check') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT oportunidades_score_class_check
      CHECK (mentor_score_class IS NULL OR mentor_score_class IN ('Excelente','Boa','Atenção','Crítica'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_priority_class_check') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT oportunidades_priority_class_check
      CHECK (priority_class IS NULL OR priority_class IN ('Máxima','Alta','Média','Baixa'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oportunidades_responsible_check') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT oportunidades_responsible_check
      CHECK (current_responsible IS NULL OR current_responsible IN ('Vendedor','Cliente','Loja','Financeira','Gestor'));
  END IF;
END
$$;

-- Índices desenhados para o padrão real de consulta da Carteira Ativa:
-- filtrar por vendedor/loja e ordenar por prioridade e próxima ação (§58).
CREATE INDEX IF NOT EXISTS idx_oportunidades_mentor_priority
  ON public.oportunidades (loja_id, seller_user_id, priority_index DESC)
  WHERE needs_mentor_classification = false;

CREATE INDEX IF NOT EXISTS idx_oportunidades_mentor_next_action
  ON public.oportunidades (loja_id, seller_user_id, next_action_at)
  WHERE next_action_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_mentor_status
  ON public.oportunidades (current_status_code)
  WHERE current_status_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_needs_classification
  ON public.oportunidades (loja_id, seller_user_id)
  WHERE needs_mentor_classification = true;

COMMENT ON COLUMN public.oportunidades.needs_mentor_classification IS
  'true = a oportunidade ainda não tem status Mentor com evidência suficiente. Não entra no cálculo de Qualidade da Carteira e mostra "Definir situação atual".';
COMMENT ON COLUMN public.oportunidades.return_status_code IS
  'Status para o qual voltar quando a pendência bloqueante for resolvida (sub-processo de troca/financiamento).';

-- ============================================================================
-- 3. CADÊNCIA PERTENCE À OPORTUNIDADE
-- ============================================================================
-- Hoje o estado de cadência é chaveado por cliente. A metodologia exige que a
-- cadência pertença ao ciclo comercial (§19). Coluna aditiva e nullable: os 239
-- registros existentes continuam válidos e são vinculados depois, com evidência.

ALTER TABLE public.cadencia_estado_cliente
  ADD COLUMN IF NOT EXISTS oportunidade_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cadencia_estado_cliente_oportunidade_fkey') THEN
    ALTER TABLE public.cadencia_estado_cliente
      ADD CONSTRAINT cadencia_estado_cliente_oportunidade_fkey
      FOREIGN KEY (oportunidade_id) REFERENCES public.oportunidades (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_cadencia_estado_oportunidade
  ON public.cadencia_estado_cliente (oportunidade_id)
  WHERE oportunidade_id IS NOT NULL;

-- Uma cadência ativa por oportunidade (§22, invariante 4).
CREATE UNIQUE INDEX IF NOT EXISTS ux_cadencia_ativa_por_oportunidade
  ON public.cadencia_estado_cliente (oportunidade_id)
  WHERE oportunidade_id IS NOT NULL AND status = 'ativo';

ALTER TABLE public.carteira_missao_itens
  ADD COLUMN IF NOT EXISTS oportunidade_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carteira_missao_itens_oportunidade_fkey') THEN
    ALTER TABLE public.carteira_missao_itens
      ADD CONSTRAINT carteira_missao_itens_oportunidade_fkey
      FOREIGN KEY (oportunidade_id) REFERENCES public.oportunidades (id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Missão não duplica item (§22, invariante 7).
CREATE UNIQUE INDEX IF NOT EXISTS ux_carteira_missao_item_cliente
  ON public.carteira_missao_itens (missao_id, cliente_id);

CREATE INDEX IF NOT EXISTS idx_carteira_missao_itens_oportunidade
  ON public.carteira_missao_itens (oportunidade_id)
  WHERE oportunidade_id IS NOT NULL;

-- ============================================================================
-- 4. PENDING FLAGS
-- ============================================================================
-- Pendências complementares NÃO viram status combinatório (§27). O status
-- principal continua um só; as pendências coexistem ao lado dele.

CREATE TABLE IF NOT EXISTS public.mentor_pending_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid NOT NULL REFERENCES public.oportunidades (id) ON DELETE CASCADE,
  loja_id uuid NOT NULL,
  seller_user_id uuid NOT NULL,
  flag_code text NOT NULL,
  blocking boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mentor_pending_flags_status_check CHECK (status IN ('open', 'resolved', 'cancelled')),
  CONSTRAINT mentor_pending_flags_resolved_consistency
    CHECK ((status = 'open' AND resolved_at IS NULL) OR (status <> 'open'))
);

-- A mesma pendência não pode estar aberta duas vezes na mesma oportunidade.
CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_pending_flag_open
  ON public.mentor_pending_flags (oportunidade_id, flag_code)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_mentor_pending_flags_opportunity
  ON public.mentor_pending_flags (oportunidade_id, status);

-- ============================================================================
-- 5. SCORE SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mentor_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid NOT NULL REFERENCES public.oportunidades (id) ON DELETE CASCADE,
  loja_id uuid NOT NULL,
  seller_user_id uuid NOT NULL,
  score integer NOT NULL,
  score_class text NOT NULL,
  breakdown jsonb NOT NULL,
  priority_index integer,
  priority_class text,
  reason text,
  rule_version text NOT NULL DEFAULT 'v1',
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mentor_score_snapshots_score_range CHECK (score >= 0 AND score <= 100),
  CONSTRAINT mentor_score_snapshots_class_check
    CHECK (score_class IN ('Excelente', 'Boa', 'Atenção', 'Crítica'))
);

-- Reprocessar não duplica histórico (§22, invariante 6).
CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_score_snapshot_idempotency
  ON public.mentor_score_snapshots (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_score_snapshots_opportunity
  ON public.mentor_score_snapshots (oportunidade_id, created_at DESC);

-- ============================================================================
-- 6. CONFIGURAÇÃO COMERCIAL POR LOJA
-- ============================================================================
-- Defaults SEGUROS: todo processo opcional nasce DESLIGADO (§33). SLA nasce NULL
-- e NULL significa "não configurado" — nunca 30 minutos presumidos.

CREATE TABLE IF NOT EXISTS public.store_commercial_settings (
  loja_id uuid PRIMARY KEY,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  business_days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6]::smallint[],
  seller_response_sla_minutes integer,
  internal_verification_business_days integer,
  seller_handles_delivery boolean NOT NULL DEFAULT false,
  post_sale_enabled boolean NOT NULL DEFAULT false,
  warranty_followup_enabled boolean NOT NULL DEFAULT false,
  post_sale_d7_enabled boolean NOT NULL DEFAULT false,
  post_sale_d30_enabled boolean NOT NULL DEFAULT false,
  post_sale_d180_enabled boolean NOT NULL DEFAULT false,
  exchange_12_months_enabled boolean NOT NULL DEFAULT false,
  exchange_18_months_enabled boolean NOT NULL DEFAULT false,
  exchange_24_months_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_commercial_settings_sla_positive
    CHECK (seller_response_sla_minutes IS NULL OR seller_response_sla_minutes > 0)
);

COMMENT ON COLUMN public.store_commercial_settings.seller_response_sla_minutes IS
  'NULL = SLA não configurado. Nunca presumir valor e nunca penalizar score por isso; a UI deve exibir "SLA de resposta ainda não configurado".';

-- ============================================================================
-- 7. RLS
-- ============================================================================

ALTER TABLE public.mentor_status_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_cadences          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_cadence_steps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_scripts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_transitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_pending_flags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_score_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_commercial_settings ENABLE ROW LEVEL SECURITY;

-- Catálogos: qualquer autenticado LÊ; ninguém além de admin/área interna ESCREVE.
-- Vendedor não altera status definition, cadência master, scripts nem transições (§53).
DO $$
DECLARE
  catalog_table text;
BEGIN
  FOREACH catalog_table IN ARRAY ARRAY[
    'mentor_status_definitions','mentor_cadences','mentor_cadence_steps',
    'mentor_scripts','mentor_transitions'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_select_authenticated ON public.%1$I', catalog_table
    );
    EXECUTE format(
      'CREATE POLICY %1$s_select_authenticated ON public.%1$I
         FOR SELECT TO authenticated USING (active IS NOT FALSE)', catalog_table
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_write_admin ON public.%1$I', catalog_table
    );
    EXECUTE format(
      'CREATE POLICY %1$s_write_admin ON public.%1$I
         FOR ALL TO authenticated
         USING (public.is_admin() OR public.eh_area_interna_mx(auth.uid()))
         WITH CHECK (public.is_admin() OR public.eh_area_interna_mx(auth.uid()))',
      catalog_table
    );
  END LOOP;
END
$$;

-- Operacionais: escopo do vendedor dono, com visão de gestor/dono da loja.
-- Espelha exatamente o padrão já usado em execution_actions.
DROP POLICY IF EXISTS mentor_pending_flags_operacional ON public.mentor_pending_flags;
CREATE POLICY mentor_pending_flags_operacional ON public.mentor_pending_flags
  FOR ALL TO authenticated
  USING (
    seller_user_id = auth.uid()
    OR public.is_admin()
    OR public.eh_area_interna_mx(auth.uid())
    OR public.is_owner_of(loja_id)
    OR public.is_manager_of(loja_id)
  )
  WITH CHECK (
    seller_user_id = auth.uid()
    OR public.is_admin()
    OR public.eh_area_interna_mx(auth.uid())
    OR public.is_owner_of(loja_id)
    OR public.is_manager_of(loja_id)
  );

-- Snapshot de score é registro de auditoria: lê-se, não se reescreve.
DROP POLICY IF EXISTS mentor_score_snapshots_select ON public.mentor_score_snapshots;
CREATE POLICY mentor_score_snapshots_select ON public.mentor_score_snapshots
  FOR SELECT TO authenticated
  USING (
    seller_user_id = auth.uid()
    OR public.is_admin()
    OR public.eh_area_interna_mx(auth.uid())
    OR public.is_owner_of(loja_id)
    OR public.is_manager_of(loja_id)
  );

DROP POLICY IF EXISTS mentor_score_snapshots_insert ON public.mentor_score_snapshots;
CREATE POLICY mentor_score_snapshots_insert ON public.mentor_score_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_user_id = auth.uid()
    OR public.is_admin()
    OR public.eh_area_interna_mx(auth.uid())
    OR public.is_owner_of(loja_id)
    OR public.is_manager_of(loja_id)
  );

DROP POLICY IF EXISTS store_commercial_settings_select ON public.store_commercial_settings;
CREATE POLICY store_commercial_settings_select ON public.store_commercial_settings
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.eh_area_interna_mx(auth.uid())
    OR public.is_owner_of(loja_id)
    OR public.is_manager_of(loja_id)
    OR EXISTS (
      SELECT 1 FROM public.oportunidades o
       WHERE o.loja_id = store_commercial_settings.loja_id
         AND o.seller_user_id = auth.uid()
    )
  );

-- Configuração comercial é decisão de gestão: vendedor lê, não escreve.
DROP POLICY IF EXISTS store_commercial_settings_write ON public.store_commercial_settings;
CREATE POLICY store_commercial_settings_write ON public.store_commercial_settings
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR public.eh_area_interna_mx(auth.uid())
    OR public.is_owner_of(loja_id)
    OR public.is_manager_of(loja_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.eh_area_interna_mx(auth.uid())
    OR public.is_owner_of(loja_id)
    OR public.is_manager_of(loja_id)
  );

-- ============================================================================
-- 8. GRANTS
-- ============================================================================
-- Segue a remediação de grants já aplicada no projeto: nada para PUBLIC/anon.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mentor_status_definitions','mentor_cadences','mentor_cadence_steps',
    'mentor_scripts','mentor_transitions','mentor_pending_flags',
    'mentor_score_snapshots','store_commercial_settings'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'mentor_pending_flags','mentor_score_snapshots','store_commercial_settings'
  ]
  LOOP
    EXECUTE format('GRANT INSERT, UPDATE ON public.%I TO authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'mentor_status_definitions','mentor_cadences','mentor_cadence_steps',
    'mentor_scripts','mentor_transitions'
  ]
  LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
  END LOOP;
END
$$;

-- ============================================================================
-- 9. updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mentor_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mentor_status_definitions','mentor_cadences','mentor_cadence_steps',
    'mentor_scripts','mentor_transitions','mentor_pending_flags',
    'store_commercial_settings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.mentor_touch_updated_at()', t
    );
  END LOOP;
END
$$;
