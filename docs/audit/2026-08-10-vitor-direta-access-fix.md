# Relatório de Correção e Liberação de Acesso — Vitor Gabriel de Oliveira (Direta Veículos)

**Data:** 2026-08-10  
**Ambiente:** Produção (Supabase `fbhcmzzgwjdgkctlfvbo` / Vercel `mxperformance.vercel.app`)

---

## 1. Problemas Identificados

1. **Typos e Desacoplamento no Supabase Auth:**
   - Existia uma conta criada com erro de digitação no e-mail (`vitorgabriel210499@gmail.co`).
   - A conta oficial (`vitorgabriel210499@gmail.com`) não possuía a senha provisória válida atualizada, retornando `"E-mail ou senha inválidos."` ao tentar o login.

2. **Bloqueio de Data Operacional no Fechamento/Regularização:**
   - No registro da tabela `vendedores_loja` (ID `76f71107-6632-4e4a-97f7-f6ab7a3fa0e9`), o campo `started_at` do vendedor Vitor na loja Direta estava configurado como `2026-08-06`.
   - Ao tentar realizar a regularização/fechamento diário de datas retroativas (ex: a terça-feira **04/08/2026**), a RPC `submit_checkin` validava `started_at <= reference_date`. Como `2026-08-06 > 2026-08-04`, o sistema bloqueava a ação com a mensagem:
     > *"Erro ao iniciar regularização: Vendedor não está ativo nesta loja no período informado."*

---

## 2. Ações Executadas

1. **Limpeza e Redefinição de Conta:**
   - Remoção do usuário auth incorreto (`vitorgabriel210499@gmail.co`).
   - Sincronização do usuário oficial `vitorgabriel210499@gmail.com` (ID `73f29046-5eb6-4d78-8cb3-ea91141d80bc`).
   - Atualização de `must_change_password = true` em `auth.users` e `public.usuarios`.
   - Vínculo ativo mantido na loja Direta Veículos (ID `2785bbb1-149e-4569-bc5b-002f11331090`) com a role `vendedor`.

2. **Ajuste de Vigência Histórica:**
   - Atualização de `vendedores_loja.started_at` para `2026-01-01`, permitindo lançamentos e regularizações retroativas de qualquer período em 2026.

---

## 3. Validação

- **Validação de RPC:** `submit_checkin` executado com sucesso para as datas `2026-08-01`, `2026-08-04`, `2026-08-05`, `2026-08-06` e `2026-08-10` (`ok: true`).
- **Validação E2E Browser em Produção:**
  - Login via Playwright em `https://www.mxperformance.com.br/login` com as credenciais de Vitor.
  - Redirecionamento correto para `/home`.
  - Ausência de toasts de erro e liberação completa da rotina de fechamento/regularização.
