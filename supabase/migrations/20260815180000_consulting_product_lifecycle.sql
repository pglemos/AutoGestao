-- Produtos de consultoria — ciclo de vida, capacidade e módulos padrão.
--
-- Paridade com /produtos do Base44: o produto tem rascunho → publicado →
-- arquivado, versão, faixa de encontros presenciais e uma matriz de módulos
-- herdada pelos clientes. Hoje programas_visita_consultoria só tinha nome,
-- total de visitas e um booleano de ativo.

ALTER TABLE public.programas_visita_consultoria
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado',
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS modalidade text,
  ADD COLUMN IF NOT EXISTS min_presenciais integer,
  ADD COLUMN IF NOT EXISTS max_presenciais integer,
  ADD COLUMN IF NOT EXISTS usa_plano_estrategico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.programas_visita_consultoria
  DROP CONSTRAINT IF EXISTS programas_visita_status_check;
ALTER TABLE public.programas_visita_consultoria
  ADD CONSTRAINT programas_visita_status_check
  CHECK (status IN ('rascunho', 'publicado', 'arquivado'));

ALTER TABLE public.programas_visita_consultoria
  DROP CONSTRAINT IF EXISTS programas_visita_presenciais_check;
ALTER TABLE public.programas_visita_consultoria
  ADD CONSTRAINT programas_visita_presenciais_check
  CHECK (
    min_presenciais IS NULL
    OR max_presenciais IS NULL
    OR max_presenciais >= min_presenciais
  );

-- Matriz de módulos padrão do produto: o que o cliente herda ao contratar.
CREATE TABLE IF NOT EXISTS public.modulos_produto_consultoria (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key   text NOT NULL REFERENCES public.programas_visita_consultoria(program_key) ON DELETE CASCADE,
  module_key    text NOT NULL,
  label         text NOT NULL,
  incluido      boolean NOT NULL DEFAULT true,
  obrigatorio   boolean NOT NULL DEFAULT false,
  etapa         text,
  visibilidade  text NOT NULL DEFAULT 'dono' CHECK (visibilidade IN ('dono', 'gerente', 'interno')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_key, module_key)
);

-- Tempo por encontro do produto (online e presencial), base da capacidade.
CREATE TABLE IF NOT EXISTS public.tempos_encontro_produto (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key    text NOT NULL REFERENCES public.programas_visita_consultoria(program_key) ON DELETE CASCADE,
  visit_number   integer NOT NULL CHECK (visit_number >= 1),
  horas_online   numeric(5,2) CHECK (horas_online IS NULL OR horas_online >= 0),
  horas_presencial numeric(5,2) CHECK (horas_presencial IS NULL OR horas_presencial >= 0),
  origem         text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'planilha', 'padrao')),
  observacao     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_key, visit_number)
);

CREATE INDEX IF NOT EXISTS idx_modulos_produto_program ON public.modulos_produto_consultoria (program_key);
CREATE INDEX IF NOT EXISTS idx_tempos_encontro_program ON public.tempos_encontro_produto (program_key, visit_number);

ALTER TABLE public.modulos_produto_consultoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tempos_encontro_produto ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['modulos_produto_consultoria', 'tempos_encontro_produto'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_select ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_select ON public.%I FOR SELECT TO authenticated USING (public.eh_area_interna_mx())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_write ON public.%I FOR ALL TO authenticated USING (public.eh_area_interna_mx()) WITH CHECK (public.eh_area_interna_mx())', t, t);
  END LOOP;
END $$;

REVOKE ALL ON public.modulos_produto_consultoria FROM PUBLIC;
REVOKE ALL ON public.tempos_encontro_produto FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modulos_produto_consultoria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tempos_encontro_produto TO authenticated;

COMMENT ON TABLE public.modulos_produto_consultoria IS
  'Matriz de módulos padrão de um produto — herdada pelos clientes na contratação.';
COMMENT ON TABLE public.tempos_encontro_produto IS
  'Horas online e presenciais previstas por encontro do produto (base de capacidade).';
