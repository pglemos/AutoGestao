-- Módulo Administrador MX — Consultoria MX: metodologia por produto e editor de encontro.
--
-- Porta a rota /consultoria-mx do Base44 (mx-admin-flow). Reaproveita a
-- estrutura já existente — product = programas_visita_consultoria e a jornada
-- estrutural = etapas_modelo_visita_consultoria / tempos_encontro_produto — e
-- adiciona o conteúdo metodológico versionado POR ENCONTRO:
--
-- 1. versoes_metodologia_produto  — versão metodológica do produto (rascunho,
--    em revisão, publicada, substituída, arquivada). Uma publicada por produto.
-- 2. conteudo_encontro            — objetivo/resultado/participantes do encontro.
-- 3. guia_consultor_encontro      — orientação interna do consultor (não vai ao dono).
-- 4. entregas_encontro            — entregas padrão do encontro.
-- 5. evidencias_encontro          — requisitos de evidência do encontro.
-- 6. biblioteca_materiais         — biblioteca de materiais reutilizáveis (upload).
-- 7. conteudo_referencia_encontro — vínculo de conteúdo (vídeo/aula/arquivo) ao encontro.
-- 8. modelos_relatorio            — modelos de relatório reutilizáveis.
-- 9. vinculo_modelo_relatorio_encontro — modelo de relatório por encontro.
-- 10. vinculo_plano_acao_encontro  — plano padrão (template) por encontro.
-- 11. logs_auditoria_consultoria_mx — trilha de alterações da rota (escrita pelo app).
--
-- Tudo é material interno MX: RLS com as duas policies restritas a
-- eh_area_interna_mx(), REVOKE ALL FROM PUBLIC e GRANT só para authenticated.

CREATE TABLE IF NOT EXISTS public.versoes_metodologia_produto (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key               text NOT NULL REFERENCES public.programas_visita_consultoria(program_key) ON DELETE CASCADE,
  product_name              text,
  product_version_number    integer,
  methodology_version_number text NOT NULL,
  status                    text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'em_revisao', 'publicado', 'substituido', 'arquivado')),
  effective_from            date,
  effective_until           date,
  change_summary            text,
  encounters_configured     integer NOT NULL DEFAULT 0 CHECK (encounters_configured >= 0),
  encounters_pending        integer NOT NULL DEFAULT 0 CHECK (encounters_pending >= 0),
  videos_count              integer NOT NULL DEFAULT 0 CHECK (videos_count >= 0),
  files_count               integer NOT NULL DEFAULT 0 CHECK (files_count >= 0),
  report_templates_count    integer NOT NULL DEFAULT 0 CHECK (report_templates_count >= 0),
  created_by                uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  reviewed_by               uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  published_by              uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  published_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_key, methodology_version_number),
  CHECK (status <> 'publicado' OR published_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.conteudo_encontro (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id      uuid NOT NULL REFERENCES public.versoes_metodologia_produto(id) ON DELETE CASCADE,
  visit_number                integer NOT NULL CHECK (visit_number >= 0),
  objective                   text,
  reason                      text,
  expected_result             text,
  required_participant_roles  text,
  recommended_participant_roles text,
  prerequisites               text,
  client_observation          text,
  owner_visibility            boolean NOT NULL DEFAULT true,
  can_be_anticipated          boolean NOT NULL DEFAULT false,
  status                      text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status IN ('nao_iniciado', 'em_configuracao', 'com_pendencia', 'pronto_revisao', 'publicado')),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (methodology_version_id, visit_number)
);

CREATE TABLE IF NOT EXISTS public.guia_consultor_encontro (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id uuid NOT NULL REFERENCES public.versoes_metodologia_produto(id) ON DELETE CASCADE,
  visit_number           integer NOT NULL CHECK (visit_number >= 0),
  internal_objective     text,
  preparation_instructions text,
  data_to_review         text,
  suggested_questions    text,
  facilitation_script    text,
  attention_points       text,
  required_decisions     text,
  completion_criteria    text,
  post_meeting_guidance  text,
  methodological_notes   text,
  preparation_checklist  jsonb NOT NULL DEFAULT '[]'::jsonb,
  status                 text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status IN ('nao_iniciado', 'em_configuracao', 'pronto_revisao', 'publicado')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (methodology_version_id, visit_number)
);

CREATE TABLE IF NOT EXISTS public.entregas_encontro (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id uuid NOT NULL REFERENCES public.versoes_metodologia_produto(id) ON DELETE CASCADE,
  visit_number           integer NOT NULL CHECK (visit_number >= 0),
  title                  text NOT NULL CHECK (length(trim(title)) > 0),
  description            text,
  execution_instruction  text,
  required               boolean NOT NULL DEFAULT true,
  recommended_responsible_role text,
  deadline_offset_days   integer NOT NULL DEFAULT 0,
  delivery_moment        text NOT NULL DEFAULT 'DURANTE' CHECK (delivery_moment IN ('ANTES', 'DURANTE', 'DEPOIS')),
  file_allowed           boolean NOT NULL DEFAULT false,
  file_required          boolean NOT NULL DEFAULT false,
  confirmation_required  boolean NOT NULL DEFAULT false,
  display_order          integer NOT NULL DEFAULT 1 CHECK (display_order >= 1),
  status                 text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evidencias_encontro (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id uuid NOT NULL REFERENCES public.versoes_metodologia_produto(id) ON DELETE CASCADE,
  visit_number           integer NOT NULL CHECK (visit_number >= 0),
  name                   text NOT NULL CHECK (length(trim(name)) > 0),
  description            text,
  required               boolean NOT NULL DEFAULT true,
  evidence_type          text NOT NULL DEFAULT 'ARQUIVO'
    CHECK (evidence_type IN ('ARQUIVO','IMAGEM','LINK','PLANILHA','RELATORIO','COMENTARIO','CHECKLIST','INDICADOR','CONFIRMACAO','REUNIAO','OUTRO')),
  recommended_responsible_role text,
  recommended_validator_role text,
  deadline_offset_days   integer NOT NULL DEFAULT 0,
  file_limit             integer NOT NULL DEFAULT 1 CHECK (file_limit >= 0),
  allowed_formats        text,
  client_guidance        text,
  display_order          integer NOT NULL DEFAULT 1 CHECK (display_order >= 1),
  status                 text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.biblioteca_materiais (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL CHECK (length(trim(title)) > 0),
  description       text,
  content_type      text NOT NULL DEFAULT 'FILE'
    CHECK (content_type IN ('VIDEO','YOUTUBE','VIMEO','EXTERNAL_LINK','UNIVERSITY_LESSON','FILE')),
  category          text,
  source_url        text,
  file_asset_name   text,
  file_asset_path   text,
  visibility        text NOT NULL DEFAULT 'OWNER_AND_TEAM'
    CHECK (visibility IN ('INTERNAL_ONLY','OWNER_AND_TEAM','ENCOUNTER_PARTICIPANTS','AUTHORIZED_USERS')),
  program_key       text,
  status            text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','publicado','arquivado')),
  created_by        uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conteudo_referencia_encontro (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id uuid NOT NULL REFERENCES public.versoes_metodologia_produto(id) ON DELETE CASCADE,
  visit_number           integer NOT NULL CHECK (visit_number >= 0),
  biblioteca_material_id uuid REFERENCES public.biblioteca_materiais(id) ON DELETE SET NULL,
  content_type           text NOT NULL DEFAULT 'VIDEO'
    CHECK (content_type IN ('VIDEO','YOUTUBE','VIMEO','EXTERNAL_LINK','UNIVERSITY_LESSON','FILE')),
  title                  text NOT NULL CHECK (length(trim(title)) > 0),
  description            text,
  display_order          integer NOT NULL DEFAULT 1 CHECK (display_order >= 1),
  required               boolean NOT NULL DEFAULT true,
  duration_minutes       integer CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  source_url             text,
  thumbnail_url          text,
  visibility             text NOT NULL DEFAULT 'OWNER_AND_TEAM'
    CHECK (visibility IN ('INTERNAL_ONLY','OWNER_AND_TEAM','ENCOUNTER_PARTICIPANTS','AUTHORIZED_USERS')),
  category               text,
  learning_content_id    uuid REFERENCES public.universidade_aulas(id) ON DELETE SET NULL,
  learning_content_name  text,
  status                 text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','publicado','arquivado')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.modelos_relatorio (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL CHECK (length(trim(name)) > 0),
  description           text,
  product_key           text,
  compatible_encounters text,
  sections              jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions          text,
  version_number        text NOT NULL DEFAULT '1.0',
  status                text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
  created_by            uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  published_by          uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  published_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'publicado' OR published_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.vinculo_modelo_relatorio_encontro (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id uuid NOT NULL REFERENCES public.versoes_metodologia_produto(id) ON DELETE CASCADE,
  visit_number           integer NOT NULL CHECK (visit_number >= 0),
  report_template_id     uuid REFERENCES public.modelos_relatorio(id) ON DELETE SET NULL,
  report_template_name   text,
  report_required        boolean NOT NULL DEFAULT false,
  default_title          text,
  author_role            text,
  validator_role         text,
  publication_deadline_days integer NOT NULL DEFAULT 7 CHECK (publication_deadline_days >= 0),
  visibility             text NOT NULL DEFAULT 'OWNER_AND_TEAM'
    CHECK (visibility IN ('INTERNAL_ONLY','OWNER_AND_TEAM','ENCOUNTER_PARTICIPANTS')),
  attachment_allowed     boolean NOT NULL DEFAULT true,
  attachment_required    boolean NOT NULL DEFAULT false,
  action_plan_creation_allowed boolean NOT NULL DEFAULT true,
  status                 text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (methodology_version_id, visit_number)
);

CREATE TABLE IF NOT EXISTS public.vinculo_plano_acao_encontro (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_version_id uuid NOT NULL REFERENCES public.versoes_metodologia_produto(id) ON DELETE CASCADE,
  visit_number           integer NOT NULL CHECK (visit_number >= 0),
  action_plan_template_version_id uuid REFERENCES public.planos_acao_template_versoes(id) ON DELETE SET NULL,
  action_plan_template_name text,
  recommendation_enabled boolean NOT NULL DEFAULT false,
  display_order          integer NOT NULL DEFAULT 1 CHECK (display_order >= 1),
  status                 text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_auditoria_consultoria_mx (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  user_name    text,
  user_role    text,
  resource     text NOT NULL,
  action       text NOT NULL,
  value_before text,
  value_after  text,
  origin       text NOT NULL DEFAULT 'Consultoria MX',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta da rota.
CREATE INDEX IF NOT EXISTS idx_versoes_metodologia_produto_programa
  ON public.versoes_metodologia_produto (program_key, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_versoes_metodologia_publicada
  ON public.versoes_metodologia_produto (program_key)
  WHERE status = 'publicado';
CREATE INDEX IF NOT EXISTS idx_conteudo_encontro_versao
  ON public.conteudo_encontro (methodology_version_id, visit_number);
CREATE INDEX IF NOT EXISTS idx_guia_consultor_encontro_versao
  ON public.guia_consultor_encontro (methodology_version_id, visit_number);
CREATE INDEX IF NOT EXISTS idx_entregas_encontro_versao
  ON public.entregas_encontro (methodology_version_id, visit_number, display_order);
CREATE INDEX IF NOT EXISTS idx_evidencias_encontro_versao
  ON public.evidencias_encontro (methodology_version_id, visit_number, display_order);
CREATE INDEX IF NOT EXISTS idx_conteudo_referencia_encontro_versao
  ON public.conteudo_referencia_encontro (methodology_version_id, visit_number, display_order);
CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_tipo
  ON public.biblioteca_materiais (content_type, status);
CREATE INDEX IF NOT EXISTS idx_vinculo_modelo_relatorio_encontro_versao
  ON public.vinculo_modelo_relatorio_encontro (methodology_version_id, visit_number);
CREATE INDEX IF NOT EXISTS idx_vinculo_plano_acao_encontro_versao
  ON public.vinculo_plano_acao_encontro (methodology_version_id, visit_number, display_order);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_consultoria_origem
  ON public.logs_auditoria_consultoria_mx (origin, created_at DESC);

-- Bucket de armazenamento para arquivos da biblioteca (upload via app).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'biblioteca-consultoria-mx',
  'biblioteca-consultoria-mx',
  true,
  52428800,
  ARRAY[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'text/csv', 'text/plain',
    'application/zip'
  ]
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS biblioteca_consultoria_mx_upload ON storage.objects;
CREATE POLICY biblioteca_consultoria_mx_upload
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'biblioteca-consultoria-mx'
    AND public.eh_area_interna_mx()
  );

DROP POLICY IF EXISTS biblioteca_consultoria_mx_select ON storage.objects;
CREATE POLICY biblioteca_consultoria_mx_select
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'biblioteca-consultoria-mx'
    AND public.eh_area_interna_mx()
  );

DROP POLICY IF EXISTS biblioteca_consultoria_mx_update ON storage.objects;
CREATE POLICY biblioteca_consultoria_mx_update
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'biblioteca-consultoria-mx'
    AND public.eh_area_interna_mx()
  );

DROP POLICY IF EXISTS biblioteca_consultoria_mx_delete ON storage.objects;
CREATE POLICY biblioteca_consultoria_mx_delete
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'biblioteca-consultoria-mx'
    AND public.eh_area_interna_mx()
  );

-- RLS: leitura e escrita restritas à área interna MX.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'versoes_metodologia_produto',
    'conteudo_encontro',
    'guia_consultor_encontro',
    'entregas_encontro',
    'evidencias_encontro',
    'biblioteca_materiais',
    'conteudo_referencia_encontro',
    'modelos_relatorio',
    'vinculo_modelo_relatorio_encontro',
    'vinculo_plano_acao_encontro',
    'logs_auditoria_consultoria_mx'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_select ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_select ON public.%I FOR SELECT TO authenticated USING (public.eh_area_interna_mx())',
      t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_write ON public.%I FOR ALL TO authenticated USING (public.eh_area_interna_mx()) WITH CHECK (public.eh_area_interna_mx())',
      t, t
    );
  END LOOP;
END $$;

REVOKE ALL ON public.versoes_metodologia_produto FROM PUBLIC;
REVOKE ALL ON public.conteudo_encontro FROM PUBLIC;
REVOKE ALL ON public.guia_consultor_encontro FROM PUBLIC;
REVOKE ALL ON public.entregas_encontro FROM PUBLIC;
REVOKE ALL ON public.evidencias_encontro FROM PUBLIC;
REVOKE ALL ON public.biblioteca_materiais FROM PUBLIC;
REVOKE ALL ON public.conteudo_referencia_encontro FROM PUBLIC;
REVOKE ALL ON public.modelos_relatorio FROM PUBLIC;
REVOKE ALL ON public.vinculo_modelo_relatorio_encontro FROM PUBLIC;
REVOKE ALL ON public.vinculo_plano_acao_encontro FROM PUBLIC;
REVOKE ALL ON public.logs_auditoria_consultoria_mx FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.versoes_metodologia_produto TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudo_encontro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guia_consultor_encontro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas_encontro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidencias_encontro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_materiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudo_referencia_encontro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_relatorio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vinculo_modelo_relatorio_encontro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vinculo_plano_acao_encontro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs_auditoria_consultoria_mx TO authenticated;

COMMENT ON TABLE public.versoes_metodologia_produto IS
  'Versão metodológica de um produto de consultoria; a publicada vale para novas jornadas.';
COMMENT ON TABLE public.conteudo_encontro IS
  'Objetivo, justificativa, resultado esperado e participantes de um encontro na versão metodológica.';
COMMENT ON TABLE public.guia_consultor_encontro IS
  'Orientação interna do consultor para o encontro — não exibida ao dono.';
COMMENT ON TABLE public.entregas_encontro IS
  'Entregas padrão configuradas para o encontro na versão metodológica.';
COMMENT ON TABLE public.evidencias_encontro IS
  'Requisitos de evidência configurados para o encontro na versão metodológica.';
COMMENT ON TABLE public.biblioteca_materiais IS
  'Biblioteca interna de materiais reutilizáveis (arquivos, vídeos, links).';
COMMENT ON TABLE public.conteudo_referencia_encontro IS
  'Vínculo de conteúdo (vídeo/aula/arquivo) a um encontro de uma versão metodológica.';
COMMENT ON TABLE public.modelos_relatorio IS
  'Modelos de relatório reutilizáveis com seções configuráveis.';
COMMENT ON TABLE public.vinculo_modelo_relatorio_encontro IS
  'Modelo de relatório vinculado a um encontro de uma versão metodológica.';
COMMENT ON TABLE public.vinculo_plano_acao_encontro IS
  'Plano padrão (template) disponibilizado ao consultor em um encontro.';
COMMENT ON TABLE public.logs_auditoria_consultoria_mx IS
  'Trilha de alterações da rota Consultoria MX escrita pela própria aplicação.';
