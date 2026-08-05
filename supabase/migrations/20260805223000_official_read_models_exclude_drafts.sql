-- Read models oficiais não podem contar rascunho.
--
-- Com o autosave, `lancamentos_diarios` passa a ter linhas com
-- submission_status='draft' durante todo o preenchimento. Três views ainda
-- tratavam qualquer linha como produção entregue:
--
--   view_store_daily_production — somava números de rascunho na produção da loja
--   view_daily_team_status      — marcava sem_registro=false para quem só rascunhou
--   view_sem_registro           — deixava de listar quem tem apenas rascunho
--
-- Nenhuma delas é lida pelo app hoje (só aparecem nos tipos gerados), mas são
-- superfície pública do schema: qualquer relatório ou integração que as use
-- passaria a reportar número inflado no dia seguinte ao rollout.
--
-- Forward-only e idempotente: CREATE OR REPLACE VIEW preserva grants.

CREATE OR REPLACE VIEW public.view_store_daily_production AS
SELECT ld.store_id,
    ld.reference_date,
    sum(ld.leads_prev_day) AS total_leads,
    sum(ld.visit_prev_day) AS total_visits,
    sum((ld.agd_cart_today + ld.agd_net_today)) AS total_agendamentos,
    sum(
        CASE
            WHEN COALESCE(u.is_venda_loja, false) THEN
            CASE
                WHEN COALESCE(smr.include_venda_loja_in_store_total, true) THEN ((ld.vnd_porta_prev_day + ld.vnd_cart_prev_day) + ld.vnd_net_prev_day)
                ELSE 0
            END
            ELSE ((ld.vnd_porta_prev_day + ld.vnd_cart_prev_day) + ld.vnd_net_prev_day)
        END) AS total_vendas
   FROM ((public.lancamentos_diarios ld
     JOIN public.usuarios u ON ((u.id = ld.seller_user_id)))
     LEFT JOIN public.regras_metas_loja smr ON ((smr.store_id = ld.store_id)))
  WHERE COALESCE(ld.submission_status, '') <> 'draft'
  GROUP BY ld.store_id, ld.reference_date;

CREATE OR REPLACE VIEW public.view_daily_team_status AS
 WITH reference_clock AS (
         SELECT ((timezone('America/Sao_Paulo'::text, now()))::date - 1) AS reference_date
        )
 SELECT vl.store_id,
    l.name AS store_name,
    vl.seller_user_id AS seller_id,
    u.name AS seller_name,
    rc.reference_date,
    ld.id AS checkin_id,
    (ld.id IS NULL) AS sem_registro,
    ld.submission_status,
    ld.submitted_at,
    ld.submitted_late,
    vl.started_at,
    vl.ended_at,
    vl.closing_month_grace
   FROM ((((public.vendedores_loja vl
     JOIN public.usuarios u ON ((u.id = vl.seller_user_id)))
     JOIN public.lojas l ON ((l.id = vl.store_id)))
     CROSS JOIN reference_clock rc)
     LEFT JOIN public.lancamentos_diarios ld ON (((ld.seller_user_id = vl.seller_user_id) AND (ld.store_id = vl.store_id) AND (ld.reference_date = rc.reference_date) AND (ld.metric_scope = 'daily'::public.checkin_scope) AND (COALESCE(ld.submission_status, '') <> 'draft'))))
  WHERE ((vl.is_active = true) AND (vl.started_at <= rc.reference_date) AND ((vl.ended_at IS NULL) OR (vl.ended_at >= rc.reference_date)));

CREATE OR REPLACE VIEW public.view_sem_registro AS
SELECT vl.store_id,
    vl.seller_user_id,
    CURRENT_DATE AS reference_date,
    vl.started_at,
    vl.closing_month_grace
   FROM (public.vendedores_loja vl
     LEFT JOIN public.lancamentos_diarios ld ON (((ld.seller_user_id = vl.seller_user_id) AND (ld.store_id = vl.store_id) AND (ld.reference_date = CURRENT_DATE) AND (COALESCE(ld.submission_status, '') <> 'draft'))))
  WHERE ((vl.is_active = true) AND (vl.started_at <= CURRENT_DATE) AND ((vl.ended_at IS NULL) OR (vl.ended_at >= CURRENT_DATE)) AND (ld.id IS NULL));

-- DOWN (compensatória, forward-only):
-- Recriar as três views sem o predicado de draft, exatamente como estavam em
-- 2026-08-05 (definições capturadas via information_schema.views antes desta
-- migration). Nenhum dado é alterado por esta migration.
