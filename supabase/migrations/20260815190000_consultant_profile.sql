-- Perfil do consultor MX — paridade com ConsultantProfileModal do Base44.
--
-- Hoje só existe `usuarios` (nome, e-mail, papel) e `atribuicoes_consultoria`
-- (carteira). Faltava o que a MX usa para escalar a jornada: papel interno,
-- situação (afastado/férias), capacidade em horas e as qualificações que
-- dizem quais produtos e quais encontros aquele consultor pode conduzir.

CREATE TABLE IF NOT EXISTS public.perfil_consultor_mx (
  user_id              uuid PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  papel_interno        text NOT NULL DEFAULT 'consultor_mx'
                       CHECK (papel_interno IN ('consultor_mx', 'consultor_especialista', 'coordenador_consultoria', 'administrador_mx')),
  situacao             text NOT NULL DEFAULT 'ativo'
                       CHECK (situacao IN ('ativo', 'afastado', 'ferias', 'inativo')),
  cidade               text,
  capacidade_online    numeric(5,2) CHECK (capacidade_online IS NULL OR capacidade_online >= 0),
  capacidade_presencial numeric(5,2) CHECK (capacidade_presencial IS NULL OR capacidade_presencial >= 0),
  observacoes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Produtos que o consultor está habilitado a conduzir.
CREATE TABLE IF NOT EXISTS public.qualificacoes_produto_consultor (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  program_key  text NOT NULL REFERENCES public.programas_visita_consultoria(program_key) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_key)
);

-- Especialidade por encontro: sem linha aqui, o consultor conduz o produto
-- inteiro; com linhas, só os encontros listados.
CREATE TABLE IF NOT EXISTS public.qualificacoes_encontro_consultor (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  program_key  text NOT NULL REFERENCES public.programas_visita_consultoria(program_key) ON DELETE CASCADE,
  visit_number integer NOT NULL CHECK (visit_number >= 1),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_key, visit_number)
);

CREATE INDEX IF NOT EXISTS idx_qualif_produto_user ON public.qualificacoes_produto_consultor (user_id);
CREATE INDEX IF NOT EXISTS idx_qualif_encontro_user ON public.qualificacoes_encontro_consultor (user_id, program_key);
CREATE INDEX IF NOT EXISTS idx_perfil_consultor_situacao ON public.perfil_consultor_mx (situacao);

ALTER TABLE public.perfil_consultor_mx ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualificacoes_produto_consultor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualificacoes_encontro_consultor ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['perfil_consultor_mx', 'qualificacoes_produto_consultor', 'qualificacoes_encontro_consultor'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_select ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_select ON public.%I FOR SELECT TO authenticated USING (public.eh_area_interna_mx())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_write ON public.%I FOR ALL TO authenticated USING (public.eh_area_interna_mx()) WITH CHECK (public.eh_area_interna_mx())', t, t);
  END LOOP;
END $$;

REVOKE ALL ON public.perfil_consultor_mx FROM PUBLIC;
REVOKE ALL ON public.qualificacoes_produto_consultor FROM PUBLIC;
REVOKE ALL ON public.qualificacoes_encontro_consultor FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_consultor_mx TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualificacoes_produto_consultor TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualificacoes_encontro_consultor TO authenticated;

COMMENT ON TABLE public.perfil_consultor_mx IS
  'Perfil interno do consultor MX: papel, situação, cidade e capacidade em horas.';
COMMENT ON TABLE public.qualificacoes_produto_consultor IS
  'Produtos que o consultor pode conduzir.';
COMMENT ON TABLE public.qualificacoes_encontro_consultor IS
  'Encontros específicos que o consultor pode conduzir dentro de um produto.';
