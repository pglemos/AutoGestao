-- Liga o Plano Estratégico nos produtos de consultoria publicados.
--
-- Todos os seis produtos já têm `indicator_package_version_id` apontando para uma
-- versão de pacote, e a versão canônica tem 50 indicadores. Mas
-- `usa_plano_estrategico` estava false em todos, então a resolução
-- produto → pacote → roster do cliente recusava com PRODUTO_NAO_USA_PLANO para
-- os 52 clientes ativos. A ponte existia e estava desligada por uma flag.
--
-- Só produtos publicados e com pacote vinculado são afetados: ligar a flag num
-- produto sem pacote trocaria uma recusa clara (PRODUTO_NAO_USA_PLANO) por outra
-- menos óbvia (PRODUTO_SEM_PACOTE), sem ganho.

BEGIN;

UPDATE public.programas_visita_consultoria
SET usa_plano_estrategico = true,
    updated_at = now()
WHERE status = 'publicado'
  AND indicator_package_version_id IS NOT NULL
  AND usa_plano_estrategico IS DISTINCT FROM true;

COMMIT;

-- DOWN
-- UPDATE public.programas_visita_consultoria
-- SET usa_plano_estrategico = false, updated_at = now()
-- WHERE status = 'publicado' AND indicator_package_version_id IS NOT NULL;
