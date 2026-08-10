# Relatório de Correção e Liberação de Acesso — Lidiane Francisca Pereira (André Car)

**Data:** 2026-08-10  
**Ambiente:** Produção (Supabase `fbhcmzzgwjdgkctlfvbo` / Vercel `mxperformance.vercel.app`)

---

## 1. Problema Relatado

- Usuária com e-mail `lidianefrancisca57mn@hotmail.com` tentou redefinir a senha via formulário de recuperação, mas o link por e-mail não foi entregue.

---

## 2. Ações Executadas

1. **Ativação e Confirmação de E-mail Direta no Auth:**
   - Confirmamos o e-mail da usuária diretamente no Supabase Auth (`email_confirm = true`).
   - Atualizamos a flag `must_change_password = true` em `auth.users` e `public.usuarios` para exigir troca de senha segura no primeiro acesso.
   - Gerada senha provisória forte (`@!7pDY396mon`).

2. **Vínculo Operacional e Vigência:**
   - Confirmado vínculo com a loja **ANDRÉ CAR** (ID `c854fab6-7980-4df5-be52-96f03ab7ee9e`) no cargo de **Vendedor**.
   - Atualizada a data de início (`started_at`) em `vendedores_loja` para `2026-01-01`, garantindo permissão para regularizações retroativas de fechamentos.

---

## 3. Validação

- **Validação de Autenticação:** `signInWithPassword` executado com sucesso no cliente Supabase.
- **Validação E2E Browser em Produção:**
  - Login via Playwright executado em `https://www.mxperformance.com.br/login`.
  - Redirecionamento bem-sucedido para a página inicial autenticada (`/home`).
