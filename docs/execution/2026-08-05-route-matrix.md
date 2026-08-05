# MATRIZ COMPLETA DE ROTAS (RETIFICADA) — 2026-08-05

- **Status:** `REEXECUÇÃO DA MATRIZ COMPLETA (1.188 EXECUÇÕES) PENDENTE`
- **SHA:** `fa3ab02ea355a1a05ce2e7004168d6abe1b22a25`

---

| Rota Real | Nome Módulo | Perfis Permitidos | Status Typo | Estado de Validação |
|---|---|---|---|---|
| `/login` | Autenticação | Público / Todos | OK | `TESTED_LOCAL_ONLY` |
| `/redefinir-senha` | Autenticação | Público / Todos | OK | `TESTED_LOCAL_ONLY` |
| `/recuperar-senha` | Autenticação | Público / Todos | OK | `TESTED_LOCAL_ONLY` |
| `/pre-cadastro` | Cadastro | Público / Todos | OK | `TESTED_LOCAL_ONLY` |
| `/cockpit-vendedor` | Vendedor | Vendedor, Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/carteira-clientes` | Vendedor (CRM) | Vendedor, Gerente, Dono, Admin | **Corrigido (estava /carfeira-clientes)** | `TESTED_LOCAL_ONLY` |
| `/central-execucao` | Vendedor (Central) | Vendedor, Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/meu-desempenho` | Vendedor | Vendedor, Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/treinamentos` | Universidade MX | Todos | OK | `TESTED_LOCAL_ONLY` |
| `/ranking-vendedores` | Ranking | Todos | OK | `TESTED_LOCAL_ONLY` |
| `/minha-equipe` | Gerente | Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/meta-loja` | Gerente | Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/rotina-equipe` | Gerente | Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/fechamento-diario` | Gerente | Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/pdi-equipe` | Gerente | Gerente, Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/cockpit-dono` | Dono | Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/rotina` | Dono | Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/plano-estrategico` | Dono | Dono, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/painel-consultoria` | Consultoria | Consultor MX, Admin | OK | `TESTED_LOCAL_ONLY` |
| `/admin-mx-overview` | Admin MX | Admin MX, Admin Geral | OK | `TESTED_LOCAL_ONLY` |
| `/gestao-lojas` | Admin MX | Admin MX, Admin Geral | OK | `TESTED_LOCAL_ONLY` |
| `/simulacao-perfil` | Admin MX | Admin MX, Admin Geral, Consultor | OK | `TESTED_LOCAL_ONLY` |
