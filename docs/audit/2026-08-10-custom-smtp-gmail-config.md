# Relatório de Configuração — Custom SMTP Gmail no Supabase Auth

**Data:** 2026-08-10  
**Ambiente:** Produção (Supabase `fbhcmzzgwjdgkctlfvbo` / Vercel `mxperformance.vercel.app`)

---

## 1. Contexto e Motivação

- Os e-mails de recuperação de senha e redefinição de acesso disparados pelo mailer nativo do Supabase sofriam rejeição/bloqueio em provedores rígidos como Hotmail/Outlook devido a limites de taxa e falta de reputação dos IPs compartilhados padrão.
- Para garantir a entregabilidade de 100% dos e-mails de recuperação, foi configurado o Custom SMTP no Supabase Auth.

---

## 2. Configurações Aplicadas via Supabase Management API

- **Projeto Ref:** `fbhcmzzgwjdgkctlfvbo`
- **Host SMTP:** `smtp.gmail.com`
- **Porta SMTP:** `587` (STARTTLS)
- **Usuário SMTP:** `gestao@mxconsultoria.com.br`
- **E-mail do Remetente:** `gestao@mxconsultoria.com.br`
- **Nome Exibido do Remetente:** `MX Performance`
- **Senha de App:** Senha de aplicativo de 16 caracteres gerada na Conta do Google de `gestao@mxconsultoria.com.br`.

---

## 3. Validação do Disparo

- **Teste de Autenticação TLS:** Conexão `smtp.gmail.com:465/587` validada com retorno `235 2.7.0 Authentication successful`.
- **Teste de Disparo Supabase Auth:** Invocado `resetPasswordForEmail` pelo cliente Supabase. Retorno com sucesso e e-mail entregue via infraestrutura do Gmail.
