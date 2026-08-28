-- ATENÇÃO (28/08/2026): a parte do GUSTAVO desta migration foi REVERTIDA.
-- GUSTAVO OLIVEIRA e GUSTAVO OLIVEIRA GOMES são duas pessoas da TREND AUTO,
-- não um cadastro duplicado — a heurística de nome errou. Ver
-- 20260828100000_reverte_merge_indevido_gustavo.sql e
-- 20260828100100_estorna_cancelamentos_venda_gustavo_gomes.sql.
-- Anderson (AG AUTOMÓVEIS) e Edier (PROMAC JPA) seguem unificados, confirmados
-- com a operação.

-- Unifica três vendedores que tinham dois cadastros ativos na mesma loja.
--
-- O caso que motivou: na TREND AUTO, GUSTAVO OLIVEIRA vendia por dois logins ao
-- mesmo tempo (12 vendas em um, 4 no outro). Ranking, meta e atingimento
-- mostravam metades da mesma pessoa. AG AUTOMÓVEIS e PROMAC JPA tinham o mesmo
-- padrão, com o cadastro extra ainda sem operação.
--
-- Cadastros vencedores definidos pelo dono da operação em 27/08/2026:
--   TREND AUTO    GUSTAVO  -> gvtrend@outlook.com
--   AG AUTOMÓVEIS ANDERSON -> v8consultoriaveiculos@gmail.com
--   PROMAC JPA    EDIER    -> edier.souza@promac.com.br
--
-- O que esta migration NÃO faz, de propósito:
--   * não apaga nada — o cadastro perdedor fica marcado via merged_into_id
--     (mesma convenção de `guard_merged_user`), e o que não pôde ser movido
--     continua onde está;
--   * não move `seller_routine_snapshots`: são snapshots diários derivados e
--     colidem com os do vencedor nas mesmas datas (26 no Gustavo, 41 no
--     Anderson). Movê-los violaria a unique (seller_user_id, reference_date,
--     version) e não acrescenta informação — a rotina do vencedor já existe;
--   * não move a meta 8/2026 do Gustavo: colide com a do vencedor e as duas são
--     idênticas (target 10, criadas no mesmo instante pela distribuição da
--     loja). Movê-la violaria a unique; apagá-la seria perda desnecessária.
--
-- Reversão: `merged_into_id`/`merged_at`/`merge_reason` registram o vínculo, mas
-- o remapeamento de linhas não é revertido automaticamente. Rode em janela
-- combinada e confira os totais antes/depois.

BEGIN;

CREATE TEMP TABLE _merge_pares (
  nome text,
  perdedor uuid,
  vencedor uuid,
  loja text
) ON COMMIT DROP;

INSERT INTO _merge_pares (nome, perdedor, vencedor, loja)
SELECT
  par.nome,
  (SELECT id FROM public.usuarios WHERE lower(email) = par.email_perdedor),
  (SELECT id FROM public.usuarios WHERE lower(email) = par.email_vencedor),
  par.loja
FROM (VALUES
  ('GUSTAVO OLIVEIRA',       'gustavobirotrendauto@gmail.com', 'gvtrend@outlook.com',              'TREND AUTO'),
  ('ANDERSON DE SOUSA TUPY', 'andersontupy@gmail.com',         'v8consultoriaveiculos@gmail.com',  'AG AUTOMÓVEIS'),
  ('EDIER ARRUDA DE SOUZA',  'edier.junior@yahoo.com.br',      'edier.souza@promac.com.br',        'PROMAC JPA')
) AS par(nome, email_perdedor, email_vencedor, loja);

-- Aborta se algum e-mail não existir mais ou se alguém já tiver sido unificado:
-- melhor falhar inteiro do que unificar metade.
DO $$
DECLARE
  v_faltando integer;
BEGIN
  SELECT count(*) INTO v_faltando
  FROM _merge_pares
  WHERE perdedor IS NULL OR vencedor IS NULL OR perdedor = vencedor;

  IF v_faltando > 0 THEN
    RAISE EXCEPTION 'Pares de merge inválidos: % linha(s) sem cadastro correspondente.', v_faltando;
  END IF;
END $$;

-- 1. Operação comercial: o histórico do perdedor passa a pertencer ao vencedor.
UPDATE public.eventos_comerciais e SET seller_user_id = p.vencedor
FROM _merge_pares p WHERE e.seller_user_id = p.perdedor;
UPDATE public.eventos_comerciais e SET created_by = p.vencedor
FROM _merge_pares p WHERE e.created_by = p.perdedor;

UPDATE public.oportunidades o SET seller_user_id = p.vencedor
FROM _merge_pares p WHERE o.seller_user_id = p.perdedor;
UPDATE public.oportunidades o SET created_by = p.vencedor
FROM _merge_pares p WHERE o.created_by = p.perdedor;

UPDATE public.clientes c SET seller_user_id = p.vencedor
FROM _merge_pares p WHERE c.seller_user_id = p.perdedor;
UPDATE public.clientes c SET created_by = p.vencedor
FROM _merge_pares p WHERE c.created_by = p.perdedor;

UPDATE public.agendamentos a SET seller_user_id = p.vencedor
FROM _merge_pares p WHERE a.seller_user_id = p.perdedor;
UPDATE public.agendamentos a SET created_by = p.vencedor
FROM _merge_pares p WHERE a.created_by = p.perdedor;

UPDATE public.execution_actions x SET seller_id = p.vencedor
FROM _merge_pares p WHERE x.seller_id = p.perdedor;
UPDATE public.execution_actions x SET created_by = p.vencedor
FROM _merge_pares p WHERE x.created_by = p.perdedor;
UPDATE public.execution_actions x SET updated_by = p.vencedor
FROM _merge_pares p WHERE x.updated_by = p.perdedor;

UPDATE public.lancamentos_diarios l SET seller_user_id = p.vencedor
FROM _merge_pares p WHERE l.seller_user_id = p.perdedor;
UPDATE public.lancamentos_diarios l SET user_id = p.vencedor
FROM _merge_pares p WHERE l.user_id = p.perdedor;
UPDATE public.lancamentos_diarios l SET created_by = p.vencedor
FROM _merge_pares p WHERE l.created_by = p.perdedor;

UPDATE public.notificacoes n SET recipient_id = p.vencedor
FROM _merge_pares p WHERE n.recipient_id = p.perdedor;

-- 2. Vínculos do cadastro perdedor são encerrados, não movidos: o vencedor já
--    tem vínculo ativo na mesma loja e as tabelas são únicas por (loja, pessoa).
UPDATE public.vinculos_loja v
SET is_active = false,
    ended_at = COALESCE(v.ended_at, CURRENT_DATE)
FROM _merge_pares p
WHERE v.user_id = p.perdedor AND v.is_active;

UPDATE public.vendedores_loja s
SET is_active = false,
    ended_at = COALESCE(s.ended_at, CURRENT_DATE)
FROM _merge_pares p
WHERE s.seller_user_id = p.perdedor AND s.is_active;

-- 3. Marca o cadastro perdedor. `guard_merged_user` congela esses campos e
--    mantém `active = false` em qualquer update posterior.
UPDATE public.usuarios u
SET active = false,
    merged_into_id = p.vencedor,
    merged_at = now(),
    merge_reason = format(
      'Cadastro duplicado da mesma pessoa na loja %s: operação consolidada no cadastro %s em 27/08/2026.',
      p.loja,
      (SELECT email FROM public.usuarios WHERE id = p.vencedor)
    )
FROM _merge_pares p
WHERE u.id = p.perdedor
  AND u.merged_into_id IS NULL;

COMMIT;

-- Conferência sugerida após aplicar (deve listar só os vencedores, com o total
-- somado, e nenhum evento sobrando nos perdedores):
--
-- SELECT u.email, u.active, u.merged_into_id IS NOT NULL AS unificado,
--        (SELECT count(*) FROM public.eventos_comerciais e WHERE e.seller_user_id = u.id) AS eventos
-- FROM public.usuarios u
-- WHERE u.email IN ('gvtrend@outlook.com','gustavobirotrendauto@gmail.com',
--                   'v8consultoriaveiculos@gmail.com','andersontupy@gmail.com',
--                   'edier.souza@promac.com.br','edier.junior@yahoo.com.br');
