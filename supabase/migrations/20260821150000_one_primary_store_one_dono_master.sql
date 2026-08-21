-- Defesa em profundidade pra duas invariantes que a aplicação já garante na
-- escrita (commits 5fe19f35 e e679778e), mas que o banco não impedia:
--
-- 1. no máximo uma loja "principal" (is_primary=true) por cliente em
--    unidades_cliente_consultoria — a race de duplo clique que criou GoCars e
--    VB VEÍCULOS MULTIMARCAS duplicados só foi barrada no frontend
--    (submittingRef); sem índice, outra corrida (duas abas, retry de rede,
--    novo caminho de escrita futuro) recria o mesmo estado.
-- 2. no máximo um Dono Master (is_dono_master=true) por cliente em
--    acessos_cliente_consultoria — mesma classe de proteção, pro item 10/17
--    de "Pessoas e Acessos" do doc de correção Base44 ("não permitir dois
--    Masters vigentes simultaneamente").
--
-- Ambas checadas contra o estado atual antes de criar o índice: zero clientes
-- violam qualquer uma das duas hoje (a duplicidade de lojas foi reparada por
-- UPDATE antes desta migration, sem apagar nenhuma linha).

CREATE UNIQUE INDEX IF NOT EXISTS unidades_cliente_consultoria_one_primary_idx
  ON public.unidades_cliente_consultoria (client_id)
  WHERE is_primary;

CREATE UNIQUE INDEX IF NOT EXISTS acessos_cliente_consultoria_one_dono_master_idx
  ON public.acessos_cliente_consultoria (client_id)
  WHERE is_dono_master;

-- Down (comentado):
-- DROP INDEX IF EXISTS public.acessos_cliente_consultoria_one_dono_master_idx;
-- DROP INDEX IF EXISTS public.unidades_cliente_consultoria_one_primary_idx;
