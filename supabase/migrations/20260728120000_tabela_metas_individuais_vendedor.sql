-- Cria a tabela public.metas para armazenar metas individuais por vendedor
-- quando regras_metas_loja.individual_goal_mode = 'custom'.
-- Dono/gerente da loja e admin MX podem cadastrar/editar.
-- Cada linha representa a meta de UM vendedor em UM mês/ano.

CREATE TABLE IF NOT EXISTS public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year >= 2020),
  target numeric(12,2) NOT NULL CHECK (target >= 0),
  updated_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id, month, year)
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.trg_metas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_metas_updated_at ON public.metas;
CREATE TRIGGER trg_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.trg_metas_updated_at();

-- RLS: leitura — quem pode ver a meta de um vendedor
-- admin MX vê tudo, dono/gerente vê da loja, vendedor vê a própria
DROP POLICY IF EXISTS metas_select ON public.metas;
CREATE POLICY metas_select ON public.metas FOR SELECT TO authenticated USING (
  public.eh_area_interna_mx(auth.uid())
  OR public.tem_papel_loja(store_id, ARRAY['dono', 'gerente'])
  OR user_id = auth.uid()
);

-- RLS: escrita — só dono/gerente da loja e admin MX
DROP POLICY IF EXISTS metas_insert ON public.metas;
CREATE POLICY metas_insert ON public.metas FOR INSERT TO authenticated WITH CHECK (
  public.eh_area_interna_mx(auth.uid())
  OR public.tem_papel_loja(store_id, ARRAY['dono', 'gerente'])
);

DROP POLICY IF EXISTS metas_update ON public.metas;
CREATE POLICY metas_update ON public.metas FOR UPDATE TO authenticated USING (
  public.eh_area_interna_mx(auth.uid())
  OR public.tem_papel_loja(store_id, ARRAY['dono', 'gerente'])
);

DROP POLICY IF EXISTS metas_delete ON public.metas;
CREATE POLICY metas_delete ON public.metas FOR DELETE TO authenticated USING (
  public.eh_area_interna_mx(auth.uid())
  OR public.tem_papel_loja(store_id, ARRAY['dono', 'gerente'])
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_metas_store_user_month
  ON public.metas (store_id, user_id, month, year);

CREATE INDEX IF NOT EXISTS idx_metas_user_month
  ON public.metas (user_id, month, year);

NOTIFY pgrst, 'reload schema';
