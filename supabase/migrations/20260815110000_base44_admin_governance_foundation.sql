-- Base44 Admin Convergence
-- Adiciona somente os domínios de governança/versionamento ausentes no modelo
-- canônico atual. As instâncias operacionais continuam em clientes_consultoria,
-- usuarios, lojas, visitas_consultoria, planos_acao e catalogo_indicadores_planejamento.

BEGIN;

CREATE TABLE IF NOT EXISTS public.versoes_programa_consultoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key text NOT NULL REFERENCES public.programas_visita_consultoria(program_key) ON UPDATE CASCADE ON DELETE RESTRICT,
  version_number text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','publicado','suspenso','arquivado')),
  change_summary text,
  effective_from date,
  effective_until date,
  created_by uuid,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_key, version_number)
);

CREATE INDEX IF NOT EXISTS versoes_programa_consultoria_program_status_idx
  ON public.versoes_programa_consultoria(program_key, status);

CREATE TABLE IF NOT EXISTS public.consultores_mx_perfil (
  user_id uuid PRIMARY KEY REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  city text,
  state text CHECK (state IS NULL OR state ~ '^[A-Z]{2}$'),
  availability_status text NOT NULL DEFAULT 'disponivel' CHECK (availability_status IN ('disponivel','atencao','comprometida','sobrecarga','indisponivel')),
  online_available_hours numeric(8,2),
  in_person_available_hours numeric(8,2),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (online_available_hours IS NULL OR online_available_hours >= 0),
  CHECK (in_person_available_hours IS NULL OR in_person_available_hours >= 0)
);

CREATE TABLE IF NOT EXISTS public.consultores_mx_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
  program_version_id uuid NOT NULL REFERENCES public.versoes_programa_consultoria(id) ON UPDATE CASCADE ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  qualification_level text NOT NULL DEFAULT 'responsavel' CHECK (qualification_level IN ('em_formacao','apoio','responsavel','validador')),
  valid_from date,
  valid_until date,
  granted_by uuid,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','expirado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_version_id)
);

CREATE TABLE IF NOT EXISTS public.consultores_mx_encontros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
  program_version_id uuid NOT NULL REFERENCES public.versoes_programa_consultoria(id) ON UPDATE CASCADE ON DELETE CASCADE,
  encounter_template_id uuid NOT NULL REFERENCES public.etapas_modelo_visita_consultoria(id) ON UPDATE CASCADE ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  qualification_level text NOT NULL DEFAULT 'responsavel' CHECK (qualification_level IN ('em_formacao','apoio','responsavel','validador')),
  valid_from date,
  valid_until date,
  granted_by uuid,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','expirado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_version_id, encounter_template_id)
);

CREATE INDEX IF NOT EXISTS consultores_mx_encontros_lookup_idx
  ON public.consultores_mx_encontros(program_version_id, encounter_template_id, enabled, status);

CREATE TABLE IF NOT EXISTS public.pacotes_indicadores_estrategicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.versoes_pacote_indicadores_estrategicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.pacotes_indicadores_estrategicos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  program_version_id uuid NOT NULL REFERENCES public.versoes_programa_consultoria(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  version_number text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','publicado','arquivado')),
  change_summary text,
  created_by uuid,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS versoes_pacote_indicadores_one_published_idx
  ON public.versoes_pacote_indicadores_estrategicos(program_version_id)
  WHERE status = 'publicado';

CREATE TABLE IF NOT EXISTS public.itens_pacote_indicadores_estrategicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_version_id uuid NOT NULL REFERENCES public.versoes_pacote_indicadores_estrategicos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  indicator_code text NOT NULL REFERENCES public.catalogo_indicadores_planejamento(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  included boolean NOT NULL DEFAULT true,
  mandatory boolean NOT NULL DEFAULT false,
  source_type text NOT NULL DEFAULT 'selecionado' CHECK (source_type IN ('selecionado','dependencia')),
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_version_id, indicator_code)
);

CREATE TABLE IF NOT EXISTS public.modelos_planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  department text NOT NULL,
  primary_indicator_code text REFERENCES public.catalogo_indicadores_planejamento(code) ON UPDATE CASCADE ON DELETE SET NULL,
  problem text NOT NULL,
  objective text,
  when_to_apply text,
  default_priority text NOT NULL DEFAULT 'medium' CHECK (default_priority IN ('low','medium','high','critical')),
  default_responsible_role text,
  default_deadline_days integer CHECK (default_deadline_days IS NULL OR default_deadline_days >= 0),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','publicado','suspenso','arquivado')),
  current_version integer NOT NULL DEFAULT 0,
  application_count integer NOT NULL DEFAULT 0 CHECK (application_count >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.versoes_modelos_planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.modelos_planos_acao(id) ON UPDATE CASCADE ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','publicado','arquivado')),
  improvement_direction text,
  effectiveness_indicator_code text REFERENCES public.catalogo_indicadores_planejamento(code) ON UPDATE CASCADE ON DELETE SET NULL,
  evidence_required boolean NOT NULL DEFAULT false,
  suggestion_triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_count integer NOT NULL DEFAULT 0 CHECK (action_count >= 0),
  total_weight_basis_points integer NOT NULL DEFAULT 0 CHECK (total_weight_basis_points BETWEEN 0 AND 10000),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS versoes_modelos_planos_acao_one_published_idx
  ON public.versoes_modelos_planos_acao(template_id)
  WHERE status = 'publicado';

CREATE TABLE IF NOT EXISTS public.itens_modelo_plano_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.versoes_modelos_planos_acao(id) ON UPDATE CASCADE ON DELETE CASCADE,
  item_order integer NOT NULL CHECK (item_order > 0),
  action_title text NOT NULL,
  execution_how text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  responsible_role text,
  participant_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  deadline_days integer CHECK (deadline_days IS NULL OR deadline_days >= 0),
  evidence_required boolean NOT NULL DEFAULT false,
  completion_criteria text,
  weight_basis_points integer NOT NULL CHECK (weight_basis_points BETWEEN 0 AND 10000),
  support_material jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_version_id, item_order)
);

CREATE TABLE IF NOT EXISTS public.aplicacoes_modelo_plano_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_request_id uuid NOT NULL UNIQUE,
  template_version_id uuid NOT NULL REFERENCES public.versoes_modelos_planos_acao(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clientes_consultoria(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  store_id uuid REFERENCES public.lojas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  applied_by uuid,
  status text NOT NULL DEFAULT 'aplicado' CHECK (status IN ('aplicado','parcial','falhou','reconciliado')),
  created_action_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  reconciliation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (client_id IS NOT NULL OR store_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS aplicacoes_modelo_plano_acao_context_idx
  ON public.aplicacoes_modelo_plano_acao(client_id, store_id, applied_at DESC);

CREATE TABLE IF NOT EXISTS public.versoes_metodologia_consultoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_version_id uuid NOT NULL REFERENCES public.versoes_programa_consultoria(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','publicado','arquivado')),
  change_summary text,
  created_by uuid,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_version_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS versoes_metodologia_one_published_idx
  ON public.versoes_metodologia_consultoria(program_version_id)
  WHERE status = 'publicado';

CREATE TABLE IF NOT EXISTS public.conteudos_metodologia_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id uuid NOT NULL REFERENCES public.versoes_metodologia_consultoria(id) ON UPDATE CASCADE ON DELETE CASCADE,
  encounter_template_id uuid NOT NULL REFERENCES public.etapas_modelo_visita_consultoria(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  objective text,
  reason text,
  expected_result text,
  participant_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_observation text,
  owner_visibility text NOT NULL DEFAULT 'visible' CHECK (owner_visibility IN ('visible','blocked','hidden')),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (methodology_version_id, encounter_template_id)
);

CREATE TABLE IF NOT EXISTS public.guias_consultor_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_content_id uuid NOT NULL REFERENCES public.conteudos_metodologia_encontro(id) ON UPDATE CASCADE ON DELETE CASCADE,
  internal_objective text,
  preparation text,
  required_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  script jsonb NOT NULL DEFAULT '[]'::jsonb,
  attention_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  post_meeting_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  methodology_notes text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (methodology_content_id)
);

CREATE TABLE IF NOT EXISTS public.entregas_modelo_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_content_id uuid NOT NULL REFERENCES public.conteudos_metodologia_encontro(id) ON UPDATE CASCADE ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evidencias_modelo_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_content_id uuid NOT NULL REFERENCES public.conteudos_metodologia_encontro(id) ON UPDATE CASCADE ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  evidence_type text NOT NULL DEFAULT 'arquivo',
  required boolean NOT NULL DEFAULT true,
  validation_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conteudos_referencia_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_content_id uuid NOT NULL REFERENCES public.conteudos_metodologia_encontro(id) ON UPDATE CASCADE ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('video','aula','arquivo','link','texto')),
  title text NOT NULL,
  description text,
  reference_url text,
  lesson_id uuid,
  display_order integer NOT NULL DEFAULT 0,
  owner_visible boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.modelos_relatorio_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_content_id uuid NOT NULL REFERENCES public.conteudos_metodologia_encontro(id) ON UPDATE CASCADE ON DELETE CASCADE,
  title text NOT NULL,
  schema_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  instructions text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (methodology_content_id)
);

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'versoes_programa_consultoria',
    'consultores_mx_perfil',
    'consultores_mx_produtos',
    'consultores_mx_encontros',
    'pacotes_indicadores_estrategicos',
    'versoes_pacote_indicadores_estrategicos',
    'itens_pacote_indicadores_estrategicos',
    'modelos_planos_acao',
    'versoes_modelos_planos_acao',
    'itens_modelo_plano_acao',
    'aplicacoes_modelo_plano_acao',
    'versoes_metodologia_consultoria',
    'conteudos_metodologia_encontro',
    'guias_consultor_encontro',
    'entregas_modelo_encontro',
    'evidencias_modelo_encontro',
    'conteudos_referencia_encontro',
    'modelos_relatorio_encontro'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_internal_select', v_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.eh_area_interna_mx(auth.uid()))', v_table || '_internal_select', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_internal_insert', v_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.eh_area_interna_mx(auth.uid()))', v_table || '_internal_insert', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_internal_update', v_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.eh_area_interna_mx(auth.uid())) WITH CHECK (public.eh_area_interna_mx(auth.uid()))', v_table || '_internal_update', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_internal_delete', v_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.eh_area_interna_mx(auth.uid()))', v_table || '_internal_delete', v_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', v_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', v_table);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);
  END LOOP;
END
$$;

COMMENT ON TABLE public.versoes_programa_consultoria IS 'Versionamento estrutural dos programas canônicos de consultoria; não substitui programas_visita_consultoria.';
COMMENT ON TABLE public.modelos_planos_acao IS 'Biblioteca administrativa de Planos Padrão; aplicações geram ações em planos_acao, que permanece a instância operacional canônica.';
COMMENT ON TABLE public.aplicacoes_modelo_plano_acao IS 'Chave idempotente de aplicação de um Plano Padrão a um cliente/loja e relação com as ações canônicas criadas.';
COMMENT ON TABLE public.pacotes_indicadores_estrategicos IS 'Pacote mestre versionável que seleciona indicadores do catálogo canônico por versão de produto.';
COMMENT ON TABLE public.versoes_metodologia_consultoria IS 'Versionamento de conteúdo/metodologia MX ligado à estrutura canônica do produto; não armazena execução de cliente.';

COMMIT;
