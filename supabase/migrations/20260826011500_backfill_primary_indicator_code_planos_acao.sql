-- Backfill do vínculo de indicador dos planos padrão da metodologia.
--
-- Os 6 planos seed guardavam o código canônico Base44 em `indicador`
-- (`SALES_TOTAL`) e ficavam com `primary_indicator_code` nulo — sem a FK para
-- `catalogo_indicadores_planejamento`, que é o vínculo usado para medir a
-- eficácia do plano. O catálogo persistido usa outro vocabulário, minúsculo
-- (`sales_total`, `preparation_cost`, `stock_over_90_rate`).
--
-- Mesma tradução que `resolvePlanningIndicatorCode` faz no cadastro novo.
-- Idempotente: só preenche onde está nulo e o alvo existe no catálogo.
with mapa(origem, alvo) as (values
  ('SALES_TOTAL','sales_total'),
  ('TOTAL_EXPENSE','total_expense'),
  ('LEADS_RECEIVED','leads_received'),
  ('AVERAGE_PREPARATION_COST','preparation_cost'),
  ('EMPLOYEE_COUNT','employee_count'),
  ('INVENTORY_OVER_90_PERCENTAGE','stock_over_90_rate')
)
update public.planos_acao_templates t
set primary_indicator_code = m.alvo,
    updated_at = now()
from mapa m
where t.primary_indicator_code is null
  and m.origem = t.indicador
  and exists (select 1 from public.catalogo_indicadores_planejamento c where c.code = m.alvo);
