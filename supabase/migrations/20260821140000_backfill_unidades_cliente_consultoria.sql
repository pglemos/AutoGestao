-- criar_matriz_padrao_cliente (20260816170000) só dispara em AFTER INSERT em
-- clientes_consultoria — cobre clientes criados dali pra frente. Os 63
-- clientes que já existiam quando o trigger nasceu nunca ganharam a unidade
-- matriz: 60 deles mostram "Nenhuma unidade cadastrada" na aba Empresa e
-- lojas da Ficha 360, mesmo tendo loja real e ativa em produção com
-- vendedores e vendas rodando.
--
-- Achado tentando aplicar o backfill: `saveClientStore` (StoreFormModal, o
-- fluxo "Adicionar loja") grava `created_by` desde que foi escrito, mas essa
-- coluna nunca existiu em `unidades_cliente_consultoria` — todo clique em
-- "Adicionar loja", pra qualquer cliente, sempre falhava com
-- "column created_by does not exist". Corrige aqui, não só destrava o
-- backfill: destrava a criação de loja pela tela.

BEGIN;

ALTER TABLE public.unidades_cliente_consultoria
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.unidades_cliente_consultoria.created_by IS
  'Usuário MX que cadastrou a unidade (nulo para as criadas pelo backfill/trigger automático).';

INSERT INTO public.unidades_cliente_consultoria (
  client_id, name, is_primary, store_type, status, cnpj, address_street, created_by
)
SELECT
  cc.id,
  l.name,
  true,
  'matriz',
  CASE WHEN l.active THEN 'ativa' ELSE 'inativa' END,
  l.cnpj,
  l.address,
  NULL
FROM public.clientes_consultoria cc
JOIN public.lojas l ON l.id = cc.primary_store_id
WHERE cc.primary_store_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.unidades_cliente_consultoria u WHERE u.client_id = cc.id
  );

COMMIT;
