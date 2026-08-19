-- Ciclo do plano estratégico: rascunho → em_validacao → publicado → revisado.
--
-- As metas existem em `valores_indicadores_planejamento`, por loja, sem status e
-- sem noção de publicação. Faltava a entidade que responde se um plano está
-- publicado, quem publicou e quando — e que impede um plano pela metade de valer
-- como meta oficial para o Dono.
--
-- O ciclo é por CLIENTE e ano, não por loja: é o cliente que contrata o produto,
-- e é por isso que a consolidação entre unidades faz sentido. `planejamentos_estrategicos`
-- não serve para isto: guarda documentos de diagnóstico gerados, com payload e
-- comparação de mercado, e um cliente acumula vários por ano.
--
-- `package_version_id` congela qual versão do pacote gerou o roster. Sem esse
-- registro, uma nova versão do pacote deixa os planos existentes desalinhados sem
-- que nada perceba.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ciclos_plano_estrategico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  version_number integer NOT NULL DEFAULT 1,
  package_version_id uuid REFERENCES public.pacotes_indicadores_versoes(id),
  revised_from_id uuid REFERENCES public.ciclos_plano_estrategico(id),
  published_at timestamptz,
  published_by uuid REFERENCES public.usuarios(id),
  created_by uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ciclos_plano_estrategico_year_check CHECK (year BETWEEN 2020 AND 2100),
  CONSTRAINT ciclos_plano_estrategico_status_check
    CHECK (status IN ('rascunho', 'em_validacao', 'publicado', 'revisado')),
  -- Publicado sem carimbo de quem e quando seria um plano oficial sem responsável.
  CONSTRAINT ciclos_plano_estrategico_published_stamp_check
    CHECK (status <> 'publicado' OR (published_at IS NOT NULL AND published_by IS NOT NULL))
);

-- Um ciclo vigente por cliente e ano. Ciclos revisados ficam no histórico, e é o
-- índice parcial que permite guardá-los sem colidir.
CREATE UNIQUE INDEX IF NOT EXISTS ciclos_plano_estrategico_vigente_uidx
  ON public.ciclos_plano_estrategico (client_id, year)
  WHERE status <> 'revisado';

CREATE INDEX IF NOT EXISTS ciclos_plano_estrategico_client_idx
  ON public.ciclos_plano_estrategico (client_id, year DESC);

ALTER TABLE public.ciclos_plano_estrategico ENABLE ROW LEVEL SECURITY;

-- A área interna MX administra o ciclo. O cliente enxerga apenas o que já foi
-- publicado: rascunho e validação são trabalho em curso da consultoria.
DROP POLICY IF EXISTS ciclos_plano_estrategico_interna_all ON public.ciclos_plano_estrategico;
CREATE POLICY ciclos_plano_estrategico_interna_all
  ON public.ciclos_plano_estrategico
  FOR ALL
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

DROP POLICY IF EXISTS ciclos_plano_estrategico_cliente_select ON public.ciclos_plano_estrategico;
CREATE POLICY ciclos_plano_estrategico_cliente_select
  ON public.ciclos_plano_estrategico
  FOR SELECT
  USING (status = 'publicado' AND public.pode_acessar_cliente_consultoria(client_id));

REVOKE ALL ON TABLE public.ciclos_plano_estrategico FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ciclos_plano_estrategico TO authenticated;

COMMENT ON TABLE public.ciclos_plano_estrategico IS
  'Ciclo anual do plano estratégico por cliente. Publicar torna as metas oficiais para o Dono.';
COMMENT ON COLUMN public.ciclos_plano_estrategico.package_version_id IS
  'Versão do pacote de indicadores que gerou o roster deste ciclo.';
COMMENT ON COLUMN public.ciclos_plano_estrategico.revised_from_id IS
  'Ciclo que originou esta revisão. Plano publicado não volta a rascunho: revisa-se criando outro.';

COMMIT;

-- DOWN
-- DROP TABLE IF EXISTS public.ciclos_plano_estrategico;
