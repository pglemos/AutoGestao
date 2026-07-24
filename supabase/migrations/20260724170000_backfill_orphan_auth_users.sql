-- Backfill de auth.users sem linha correspondente em public.usuarios.
--
-- Achado na auditoria de 2026-07-24: 101 contas de um import antigo
-- (2026-04-09) existem em auth.users mas nunca ganharam linha em
-- public.usuarios. Nenhuma delas jamais logou nem tem vinculos_loja, mas
-- qualquer tentativa futura de login/recuperacao de senha por esses e-mails
-- cai no guard de "perfil invalido" (useAuthProfile/useAuthActions) sem
-- criar o perfil — mesma classe de bug corrigida parcialmente pelo commit
-- 385d5f29 (que so cobre as Edge Functions de convite, nao o login direto).
--
-- Reaproveita a mesma logica de public.handle_new_user (trigger
-- on_auth_user_created) para manter os dois caminhos consistentes.

BEGIN;

INSERT INTO public.usuarios (id, email, name, role, must_change_password)
SELECT
  u.id,
  u.email,
  COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'usuario'),
  'vendedor',
  true
FROM auth.users u
LEFT JOIN public.usuarios pu ON pu.id = u.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- DOWN (manual, se necessario reverter):
-- DELETE FROM public.usuarios
-- WHERE must_change_password = true
--   AND created_at >= '2026-07-24'
--   AND id IN (SELECT id FROM auth.users WHERE created_at BETWEEN '2026-04-09' AND '2026-04-10');
