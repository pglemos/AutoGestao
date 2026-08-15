-- Módulo Administrador MX — pacote de indicadores versionado (aba Plano Estratégico de /produtos).
--
-- Paridade com o Base44: um produto de consultoria pode vincular um pacote de
-- indicadores padrão (StrategicIndicatorPackage + Version + Item). O cliente que
-- contrata o produto recebe no Plano Estratégico exatamente os indicadores do
-- pacote publicado. O pacote é a identidade estável; a versão é o que se publica
-- e congela; os itens pertencem à versão e carregam snapshots do catálogo
-- (ordem, área, modo de entrada, formato) para não mudar retroativamente.

CREATE TABLE IF NOT EXISTS public.pacotes_indicadores_estrategicos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_key    text NOT NULL UNIQUE CHECK (pacote_key ~ '^[a-z0-9_]+$'),
  nome          text NOT NULL CHECK (length(trim(nome)) > 0),
  descricao     text,
  status        text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'substituido', 'arquivado')),
  current_published_version_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES public.usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.pacotes_indicadores_versoes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id               uuid NOT NULL REFERENCES public.pacotes_indicadores_estrategicos(id) ON DELETE CASCADE,
  versao                  integer NOT NULL CHECK (versao >= 1),
  nome                    text,
  descricao               text,
  status                  text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicada', 'substituida', 'arquivada')),
  catalog_version_snapshot text,
  total_indicadores       integer NOT NULL DEFAULT 0 CHECK (total_indicadores >= 0),
  indicadores_manuais     integer NOT NULL DEFAULT 0 CHECK (indicadores_manuais >= 0),
  indicadores_calculados  integer NOT NULL DEFAULT 0 CHECK (indicadores_calculados >= 0),
  departamentos_count     integer NOT NULL DEFAULT 0 CHECK (departamentos_count >= 0),
  published_at            timestamptz,
  published_by            uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pacote_id, versao),
  CHECK (status <> 'publicada' OR published_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.pacotes_indicadores_itens (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id              uuid NOT NULL REFERENCES public.pacotes_indicadores_versoes(id) ON DELETE CASCADE,
  metric_key              text NOT NULL REFERENCES public.catalogo_metricas_consultoria(metric_key) ON DELETE CASCADE,
  label_snapshot          text,
  area_snapshot           text,
  ordem_snapshot          integer,
  input_mode_snapshot     text CHECK (input_mode_snapshot IN ('manual', 'calculado')),
  formato_snapshot        text,
  direction_snapshot      text,
  inclusion_reason        text NOT NULL DEFAULT 'selecao_direta' CHECK (inclusion_reason IN ('selecao_direta', 'selecao_departamento', 'dependencia_formula')),
  is_required             boolean NOT NULL DEFAULT true,
  dependency_of           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, metric_key)
);

-- Um produto só pode ter um pacote vinculado por vez; a versão publicada do pacote
-- é imutável e vira a base dos planos dos clientes.
ALTER TABLE public.programas_visita_consultoria
  ADD COLUMN IF NOT EXISTS indicator_package_version_id uuid
  REFERENCES public.pacotes_indicadores_versoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pacote_versoes_pacote
  ON public.pacotes_indicadores_versoes (pacote_id, versao DESC);
CREATE INDEX IF NOT EXISTS idx_pacote_itens_version
  ON public.pacotes_indicadores_itens (version_id, metric_key);
CREATE INDEX IF NOT EXISTS idx_pacote_estrategico_status
  ON public.pacotes_indicadores_estrategicos (status)
  WHERE status = 'publicado';

-- Um único pacote publicado é o padrão; o índice parcial torna a regra explícita.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pacote_versao_publicada
  ON public.pacotes_indicadores_versoes (pacote_id)
  WHERE status = 'publicada';

-- Referência circular pacote ↔ versão publicada é resolvida depois da criação.
ALTER TABLE public.pacotes_indicadores_estrategicos
  DROP CONSTRAINT IF EXISTS pacotes_indicadores_estrategicos_current_published_fkey;
ALTER TABLE public.pacotes_indicadores_estrategicos
  ADD CONSTRAINT pacotes_indicadores_estrategicos_current_published_fkey
  FOREIGN KEY (current_published_version_id)
  REFERENCES public.pacotes_indicadores_versoes(id) ON DELETE SET NULL;

ALTER TABLE public.pacotes_indicadores_estrategicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacotes_indicadores_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacotes_indicadores_itens ENABLE ROW LEVEL SECURITY;

-- Pacote de indicadores é material interno MX: leitura e escrita só para a área interna.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pacotes_indicadores_estrategicos', 'pacotes_indicadores_versoes', 'pacotes_indicadores_itens'] LOOP
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

REVOKE ALL ON public.pacotes_indicadores_estrategicos FROM PUBLIC;
REVOKE ALL ON public.pacotes_indicadores_versoes FROM PUBLIC;
REVOKE ALL ON public.pacotes_indicadores_itens FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacotes_indicadores_estrategicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacotes_indicadores_versoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacotes_indicadores_itens TO authenticated;

COMMENT ON TABLE public.pacotes_indicadores_estrategicos IS
  'Pacote de indicadores padrão por produto (identidade estável).';
COMMENT ON TABLE public.pacotes_indicadores_versoes IS
  'Versões do pacote; só a versão publicada pode ser vinculada a produto.';
COMMENT ON TABLE public.pacotes_indicadores_itens IS
  'Indicadores de uma versão com snapshot de ordem, área, modo de entrada e formato.';
COMMENT ON COLUMN public.programas_visita_consultoria.indicator_package_version_id IS
  'Versão publicada do pacote de indicadores vinculada ao produto (base do Plano Estratégico).';
