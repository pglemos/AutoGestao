-- RLS Matrix — public.veiculos_estoque (7 assertions)
BEGIN;
SELECT plan(7);

SELECT rls_matrix.assume('aaaaaaaa-0000-0000-0000-000000000004'::uuid);
SELECT is(rls_matrix.visible_count('public.veiculos_estoque'), 1::bigint, 'vendedor: SELECT estoque da própria loja');
SELECT is(rls_matrix.dml_count($$UPDATE public.veiculos_estoque SET status='reservado' WHERE id='eeeeeeee-0000-0000-0000-000000000002'$$), 1::bigint, 'vendedor criador: UPDATE registro próprio');
SELECT is(rls_matrix.dml_count($$UPDATE public.veiculos_estoque SET loja_id='22222222-2222-2222-2222-222222222222' WHERE id='eeeeeeee-0000-0000-0000-000000000002'$$), 0::bigint, 'vendedor criador: transferência para loja sem vínculo bloqueada');

SAVEPOINT sp_admin; SELECT rls_matrix.assume('aaaaaaaa-0000-0000-0000-000000000001'::uuid);
SELECT is(rls_matrix.dml_count($$INSERT INTO public.veiculos_estoque (loja_id,created_by,marca,modelo,status) VALUES ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','Admin','Interno','disponivel')$$), 1::bigint, 'admin interno: INSERT');
SELECT is(rls_matrix.visible_count('public.veiculos_estoque'), 2::bigint, 'admin interno: SELECT estoque');
ROLLBACK TO SAVEPOINT sp_admin;

SAVEPOINT sp_anon; SELECT rls_matrix.assume_anon();
SELECT is(rls_matrix.visible_count('public.veiculos_estoque'), 0::bigint, 'anon: SELECT bloqueado');
SELECT is(rls_matrix.dml_count($$DELETE FROM public.veiculos_estoque$$), 0::bigint, 'anon: DELETE bloqueado');
ROLLBACK TO SAVEPOINT sp_anon;

SELECT * FROM finish(); ROLLBACK;
