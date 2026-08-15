-- Módulo Administrador MX — indicadores: fórmulas e overrides por cliente.
--
-- Fecha os gaps de paridade com o Base44 (CreateIndicatorWizard, ParametersTab,
-- ClientParametersDrawer, saveClientParameterOverride):
--   1. catalogo_metricas_consultoria passa a guardar a expressão de fórmula e o
--      modo de cálculo, para o wizard publicar indicadores calculados.
--   2. overrides_parametros_cliente guarda a personalização de parâmetro por
--      cliente com justificativa obrigatória — espelho da entidade
--      ClientStrategicParameterOverride (que não existia no banco MX).

ALTER TABLE public.catalogo_metricas_consultoria
  ADD COLUMN IF NOT EXISTS formula_expression text,
  ADD COLUMN IF NOT EXISTS target_calculation_mode text NOT NULL DEFAULT 'MANUAL';

ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_calc_mode_check;
ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_calc_mode_check
  CHECK (target_calculation_mode IN ('MANUAL', 'CALCULATED_LOCKED', 'CALCULATED_ADJUSTABLE'));

CREATE TABLE IF NOT EXISTS public.overrides_parametros_cliente (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  parameter_set_id   uuid REFERENCES public.conjuntos_parametros_consultoria(id) ON DELETE CASCADE,
  metric_key         text NOT NULL CHECK (length(trim(metric_key)) > 0),
  reference_year     integer NOT NULL CHECK (reference_year BETWEEN 2000 AND 2100),
  month              integer CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),
  override_value     numeric NOT NULL,
  default_value_snapshot numeric,
  reason             text NOT NULL CHECK (length(trim(reason)) > 0),
  status             text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
  created_by         uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT overrides_parametro_escopo_check CHECK (
    (month IS NULL) OR (month BETWEEN 1 AND 12)
  )
);

CREATE INDEX IF NOT EXISTS idx_overrides_parametros_cliente_client
  ON public.overrides_parametros_cliente (client_id, reference_year, metric_key);

-- Um override ativo por cliente/parâmetro/ano/escopo, para não haver conflito
-- de precedência (mês vence ano; reaplicar encerra os anteriores na aplicação).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_overrides_parametro_cliente_ativo
  ON public.overrides_parametros_cliente (client_id, metric_key, reference_year, month)
  WHERE status = 'ativo';

ALTER TABLE public.overrides_parametros_cliente ENABLE ROW LEVEL SECURITY;

-- Personalização de parâmetro é material interno MX: leitura e escrita só para
-- a área interna (mesmo padrão das demais tabelas do módulo Administrador).
DO $$
DECLARE
  t text := 'overrides_parametros_cliente';
BEGIN
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
END $$;

REVOKE ALL ON public.overrides_parametros_cliente FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.overrides_parametros_cliente TO authenticated;

COMMENT ON COLUMN public.catalogo_metricas_consultoria.formula_expression IS
  'Expressão de fórmula mensal com IND("CODIGO") e PAR("CODIGO"), quando calculado.';
COMMENT ON COLUMN public.catalogo_metricas_consultoria.target_calculation_mode IS
  'Modo de cálculo da meta: MANUAL, CALCULATED_LOCKED ou CALCULATED_ADJUSTABLE.';
COMMENT ON TABLE public.overrides_parametros_cliente IS
  'Personalização de parâmetro por cliente com justificativa obrigatória (override).';
