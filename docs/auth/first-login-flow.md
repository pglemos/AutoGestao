# Fluxo de Primeiro Login & Troca Obrigatória de Senha

**Última atualização:** 2026-04-30 — Epic 1 (Auth Hardening)

---

## Resumo

Todo usuário criado pelo sistema (via UI Equipe → modal "Novo Recruta", via script de
provisionamento, ou via edge function `register-user`) recebia uma senha padrão
previsível e o flag `must_change_password = true`. No primeiro login, o componente
`<ForcePasswordChange />` (renderizado em `src/components/Layout.tsx:153`) bloqueia 100%
da UI até que o usuário escolha uma nova senha.

---

## Componentes envolvidos

| Camada | Artefato | Caminho |
|--------|----------|---------|
| Constante | `DEFAULT_FIRST_LOGIN_PASSWORD = '123456'` | [src/lib/auth/constants.ts](../../src/lib/auth/constants.ts) |
| Hook React | `useTeam.registerUser` (chama edge function) | [src/hooks/useTeam.ts](../../src/hooks/useTeam.ts) |
| Hook React | `useAuth.changePassword` (zera flag) | [src/hooks/useAuth.tsx:328](../../src/hooks/useAuth.tsx) |
| UI bloqueante | `<ForcePasswordChange />` | [src/features/auth/components/ForcePasswordChange.tsx](../../src/features/auth/components/ForcePasswordChange.tsx) |
| Renderização condicional | `{profile?.must_change_password && <ForcePasswordChange />}` | [src/components/Layout.tsx:153](../../src/components/Layout.tsx) |
| Edge function | `register-user` (createUser + insert public.users + upsert memberships para roles de loja) | [supabase/functions/register-user/index.ts](../../supabase/functions/register-user/index.ts) |
| Migration 1 | Adiciona coluna `must_change_password BOOLEAN DEFAULT FALSE` | [supabase/migrations/20260427175213_add_must_change_password_to_users.sql](../../supabase/migrations/20260427175213_add_must_change_password_to_users.sql) |
| Migration 2 | Trigger `handle_new_user` define `TRUE` por padrão para novos usuários | [supabase/migrations/20260427175235_update_handle_new_user_trigger.sql](../../supabase/migrations/20260427175235_update_handle_new_user_trigger.sql) |

---

## Fluxo Step-by-Step

```
1. Admin cria usuário via UI ou edge function `register-user`.
   → password = '123456' (default) ou senha custom passada explicitamente
   → user_metadata.must_change_password = true
   → public.users.must_change_password = true
   → roles `dono`, `gerente` e `vendedor` recebem membership; role `admin` nao recebe membership porque `memberships.role` nao aceita `admin`

2. Usuário recebe credenciais (manual, via WhatsApp, ou via Epic 6 quando ativo).

3. Usuário faz login normalmente em /login com email + '123456'.

4. useAuth.fetchProfile lê must_change_password = true.

5. Layout renderiza <ForcePasswordChange /> sobre toda a UI (z-[999]).
   → backdrop-blur impede interação com qualquer rota.

6. Usuário escolhe nova senha (mínimo 6 chars).

7. changePassword() chama supabase.auth.updateUser({ password })
   e em seguida UPDATE public.users SET must_change_password = false WHERE id = currentUserId.

8. setProfile atualiza estado local; <ForcePasswordChange /> desmonta.

9. Próximos logins não disparam o modal.
```

---

## Garantias

- **Modal não pode ser fechado sem trocar a senha.** Não há botão "X" — apenas `LogOut`
  (que devolve à tela de login mantendo `must_change_password = true`).
- **Refresh da página não bypass o modal.** O flag está no banco, não em localStorage.
- **Senha fraca aceita apenas no provisioning, não na troca.** O formulário valida 6 chars
  mínimos, mas a UX recomenda visualmente "EXCELENTE" ao incluir maiúsculas/números/símbolos.
- **Edge function exige Authorization Bearer.** Não há criação anônima de usuários.

---

## Pontos de Atenção (futuro)

- Quando ativarmos SAML/SSO ou OAuth Google, o flag `must_change_password` deve ser
  ignorado para usuários cuja conta foi criada via OAuth (não há senha local).
- Caso a política de segurança evolua para exigir 8+ chars com maiúsculas, atualizar
  `MIN_PASSWORD_LENGTH` em `constants.ts` e o validador em `ForcePasswordChange.tsx`.

---

## Como reproduzir o fluxo manualmente

```bash
# 1) Criar usuário de teste
curl -X POST "$SUPABASE_URL/functions/v1/register-user" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@mxperformance.com.br",
    "name": "Teste",
    "role": "vendedor",
    "store_id": "00000000-0000-0000-0000-000000000000"
  }'

# 2) Login com 123456 → modal aparece → trocar senha → modal some.
# 3) Logout e login novo com a senha trocada → sem modal.
```
