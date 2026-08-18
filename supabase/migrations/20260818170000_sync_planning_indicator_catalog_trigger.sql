-- Sincroniza `catalogo_metricas_consultoria` -> `catalogo_indicadores_planejamento`.
--
-- 20260818160000 semeou os 46 códigos que faltavam, mas foi um seed pontual:
-- um indicador criado depois voltaria a falhar com "Indicador estratégico
-- inválido." ao salvar meta. Este trigger mantém os dois catálogos alinhados.
--
-- Regra de propriedade: o trigger só cria e mantém linhas marcadas com
-- `metadata->>'origem' = 'catalogo_metricas_consultoria'`. As 45 linhas
-- originais da Central MX — inclusive os 4 códigos que existem nos dois
-- catálogos — nunca são tocadas, para que a métrica não sobrescreva o rótulo
-- ou a categoria de quem chegou primeiro.
--
-- DELETE não remove do catálogo de planejamento: `valores_indicadores_planejamento`
-- e `historico_valores_indicadores_planejamento` têm FK com ON DELETE RESTRICT,
-- e apagar destruiria metas já lançadas. A linha é desativada.

-- ---------------------------------------------------------------------------
-- Mapeamento de área de negócio -> departamento (imutável, reusável)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mapear_area_metrica_para_departamento(p_area text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_area
    WHEN 'Vendas'          THEN 'comercial'
    WHEN 'Funil'           THEN 'comercial'
    WHEN 'CRM'             THEN 'comercial'
    WHEN 'Estoque'         THEN 'produto'
    WHEN 'Troca'           THEN 'produto'
    WHEN 'Financeiro'      THEN 'financeiro'
    WHEN 'Marketing'       THEN 'marketing'
    WHEN 'Equipe'          THEN 'rh'
    WHEN 'Desenvolvimento' THEN 'rh'
    ELSE 'operacional'
  END;
$$;

COMMENT ON FUNCTION public.mapear_area_metrica_para_departamento(text) IS
  'Traduz a área de negócio de catalogo_metricas_consultoria para o vocabulário '
  'de departamento aceito por catalogo_indicadores_planejamento.';

-- ---------------------------------------------------------------------------
-- Trigger de sincronização
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sincronizar_indicador_planejamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departamento text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Desativa em vez de apagar: metas já lançadas dependem do código via FK.
    UPDATE public.catalogo_indicadores_planejamento
       SET active = false, updated_at = now()
     WHERE code = OLD.metric_key
       AND metadata->>'origem' = 'catalogo_metricas_consultoria';
    RETURN OLD;
  END IF;

  v_departamento := public.mapear_area_metrica_para_departamento(NEW.area);

  INSERT INTO public.catalogo_indicadores_planejamento AS destino (
    code, label, category, unit, sort_order, active, metadata,
    department_code, dimension, target_direction
  )
  VALUES (
    NEW.metric_key,
    NEW.label,
    v_departamento,
    NEW.value_type,
    COALESCE(NEW.sort_order, 100),
    COALESCE(NEW.active, true),
    jsonb_build_object(
      'origem', 'catalogo_metricas_consultoria',
      'area_original', NEW.area,
      'sincronizado_em', now()
    ),
    v_departamento,
    NULL,
    CASE NEW.direction WHEN 'increase' THEN 'higher' WHEN 'decrease' THEN 'lower' END
  )
  ON CONFLICT (code) DO UPDATE
     SET label            = EXCLUDED.label,
         category         = EXCLUDED.category,
         unit             = EXCLUDED.unit,
         sort_order       = EXCLUDED.sort_order,
         active           = EXCLUDED.active,
         department_code  = EXCLUDED.department_code,
         target_direction = EXCLUDED.target_direction,
         metadata         = EXCLUDED.metadata,
         updated_at       = now()
   -- Só atualiza o que este trigger criou; linhas da Central MX ficam intactas.
   WHERE destino.metadata->>'origem' = 'catalogo_metricas_consultoria';

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sincronizar_indicador_planejamento() IS
  'Trigger-only (SECURITY DEFINER). Espelha catalogo_metricas_consultoria em '
  'catalogo_indicadores_planejamento para que a tela Metas e realizados consiga '
  'salvar. Só cria/atualiza linhas de metadata->>origem = catalogo_metricas_consultoria.';

REVOKE ALL ON FUNCTION public.sincronizar_indicador_planejamento() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincronizar_indicador_planejamento() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sincronizar_indicador_planejamento() TO service_role;

REVOKE ALL ON FUNCTION public.mapear_area_metrica_para_departamento(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mapear_area_metrica_para_departamento(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mapear_area_metrica_para_departamento(text) TO service_role;

DROP TRIGGER IF EXISTS trg_sincronizar_indicador_planejamento ON public.catalogo_metricas_consultoria;
CREATE TRIGGER trg_sincronizar_indicador_planejamento
  AFTER INSERT OR UPDATE OR DELETE ON public.catalogo_metricas_consultoria
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_indicador_planejamento();

-- ---------------------------------------------------------------------------
-- Reconciliação: cobre qualquer métrica criada entre o seed e este trigger.
-- ---------------------------------------------------------------------------
INSERT INTO public.catalogo_indicadores_planejamento (
  code, label, category, unit, sort_order, active, metadata,
  department_code, dimension, target_direction
)
SELECT
  metrica.metric_key,
  metrica.label,
  public.mapear_area_metrica_para_departamento(metrica.area),
  metrica.value_type,
  COALESCE(metrica.sort_order, 100),
  COALESCE(metrica.active, true),
  jsonb_build_object(
    'origem', 'catalogo_metricas_consultoria',
    'area_original', metrica.area,
    'sincronizado_em', now()
  ),
  public.mapear_area_metrica_para_departamento(metrica.area),
  NULL,
  CASE metrica.direction WHEN 'increase' THEN 'higher' WHEN 'decrease' THEN 'lower' END
FROM public.catalogo_metricas_consultoria AS metrica
ON CONFLICT (code) DO NOTHING;
