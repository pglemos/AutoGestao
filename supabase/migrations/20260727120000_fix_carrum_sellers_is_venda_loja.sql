-- Corrige is_venda_loja dos vendedores da loja Carrum que estavam
-- incorretamente marcados como "venda loja", impedindo a exibição
-- no módulo do dono (OwnerRoutineView filtra !is_venda_loja).

UPDATE public.usuarios
SET is_venda_loja = false
WHERE id IN (
  'a502f7f4-0e81-46c6-97fc-fe6dbd0eb90d',
  '1a6aa936-cf21-46de-8b13-975340f4646f',
  'c17ae8ce-da22-4c7a-bcdd-2805a978746c',
  'fba64a48-f206-432e-b7f4-d2367ad3965d'
);
