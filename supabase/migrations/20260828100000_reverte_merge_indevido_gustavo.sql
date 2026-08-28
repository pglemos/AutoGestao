-- Desfaz a unificação indevida dos dois GUSTAVO da TREND AUTO.
--
-- São duas pessoas diferentes: GUSTAVO OLIVEIRA (gvtrend@outlook.com) e
-- GUSTAVO OLIVEIRA GOMES (gustavobirotrendauto@gmail.com). A heurística de
-- nome tratou como duplicata e a operação foi consolidada num cadastro só.
--
-- As linhas movidas são identificáveis sem chute: o UPDATE do merge carimbou
-- `updated_at` em 27/08 03:50 UTC nos clientes e lançamentos, e o resto pendura
-- nesses clientes (oportunidades, eventos, agendamentos) ou nos agendamentos
-- deles (execution_actions). As contagens batem com o inventário de antes do
-- merge: 4 clientes, 4 oportunidades, 4 vendas, 4 agendamentos, 4 ações, 2
-- lançamentos.

BEGIN;

-- Reativa o cadastro arquivado pelo merge. `guard_merged_user` congela
-- merged_* e força active=false em qualquer UPDATE, por isso o gatilho é
-- desligado só aqui dentro.
ALTER TABLE public.usuarios DISABLE TRIGGER USER;

UPDATE public.usuarios
SET active = true, merged_into_id = NULL, merged_at = NULL, merge_reason = NULL
WHERE email = 'gustavobirotrendauto@gmail.com';

ALTER TABLE public.usuarios ENABLE TRIGGER USER;

UPDATE public.vinculos_loja
SET is_active = true, ended_at = NULL
WHERE user_id = (SELECT id FROM public.usuarios WHERE email='gustavobirotrendauto@gmail.com')
  AND ended_at = DATE '2026-08-27';

UPDATE public.vendedores_loja
SET is_active = true, ended_at = NULL
WHERE seller_user_id = (SELECT id FROM public.usuarios WHERE email='gustavobirotrendauto@gmail.com')
  AND ended_at = DATE '2026-08-27';

CREATE TEMP TABLE _gomes AS
SELECT
  (SELECT id FROM public.usuarios WHERE email='gustavobirotrendauto@gmail.com') AS gomes,
  (SELECT id FROM public.usuarios WHERE email='gvtrend@outlook.com') AS oliveira;

CREATE TEMP TABLE _clientes_gomes AS
SELECT c.id
FROM public.clientes c, _gomes g
WHERE c.seller_user_id = g.oliveira
  AND c.updated_at BETWEEN TIMESTAMPTZ '2026-08-27 03:50:00+00' AND TIMESTAMPTZ '2026-08-27 03:51:30+00';

CREATE TEMP TABLE _agendamentos_gomes AS
SELECT a.id FROM public.agendamentos a WHERE a.cliente_id IN (SELECT id FROM _clientes_gomes);

DO $$
DECLARE v_clientes integer;
BEGIN
  SELECT count(*) INTO v_clientes FROM _clientes_gomes;
  IF v_clientes <> 4 THEN
    RAISE EXCEPTION 'Esperava 4 clientes movidos, encontrei %. Abortado para não devolver linha errada.', v_clientes;
  END IF;
END $$;

UPDATE public.clientes c SET seller_user_id = g.gomes
FROM _gomes g WHERE c.id IN (SELECT id FROM _clientes_gomes) AND c.seller_user_id = g.oliveira;
UPDATE public.clientes c SET created_by = g.gomes
FROM _gomes g WHERE c.id IN (SELECT id FROM _clientes_gomes) AND c.created_by = g.oliveira;

UPDATE public.oportunidades o SET seller_user_id = g.gomes
FROM _gomes g WHERE o.cliente_id IN (SELECT id FROM _clientes_gomes) AND o.seller_user_id = g.oliveira;
UPDATE public.oportunidades o SET created_by = g.gomes
FROM _gomes g WHERE o.cliente_id IN (SELECT id FROM _clientes_gomes) AND o.created_by = g.oliveira;

-- Inclui os cancelamentos lançados pelo gestor em 27/08: eles se referem a
-- estas mesmas vendas, então acompanham o vendedor de origem.
UPDATE public.eventos_comerciais e SET seller_user_id = g.gomes
FROM _gomes g WHERE e.cliente_id IN (SELECT id FROM _clientes_gomes) AND e.seller_user_id = g.oliveira;

UPDATE public.agendamentos a SET seller_user_id = g.gomes
FROM _gomes g WHERE a.id IN (SELECT id FROM _agendamentos_gomes) AND a.seller_user_id = g.oliveira;
UPDATE public.agendamentos a SET created_by = g.gomes
FROM _gomes g WHERE a.id IN (SELECT id FROM _agendamentos_gomes) AND a.created_by = g.oliveira;

UPDATE public.execution_actions x SET seller_id = g.gomes
FROM _gomes g WHERE x.source_id IN (SELECT id FROM _agendamentos_gomes) AND x.seller_id = g.oliveira;
UPDATE public.execution_actions x SET created_by = g.gomes
FROM _gomes g WHERE x.source_id IN (SELECT id FROM _agendamentos_gomes) AND x.created_by = g.oliveira;
UPDATE public.execution_actions x SET updated_by = g.gomes
FROM _gomes g WHERE x.source_id IN (SELECT id FROM _agendamentos_gomes) AND x.updated_by = g.oliveira;

UPDATE public.lancamentos_diarios l SET seller_user_id = g.gomes
FROM _gomes g WHERE l.seller_user_id = g.oliveira
  AND l.updated_at BETWEEN TIMESTAMPTZ '2026-08-27 03:50:00+00' AND TIMESTAMPTZ '2026-08-27 03:51:30+00';
UPDATE public.lancamentos_diarios l SET user_id = g.gomes
FROM _gomes g WHERE l.user_id = g.oliveira
  AND l.updated_at BETWEEN TIMESTAMPTZ '2026-08-27 03:50:00+00' AND TIMESTAMPTZ '2026-08-27 03:51:30+00';
UPDATE public.lancamentos_diarios l SET created_by = g.gomes
FROM _gomes g WHERE l.created_by = g.oliveira
  AND l.updated_at BETWEEN TIMESTAMPTZ '2026-08-27 03:50:00+00' AND TIMESTAMPTZ '2026-08-27 03:51:30+00';

COMMIT;
