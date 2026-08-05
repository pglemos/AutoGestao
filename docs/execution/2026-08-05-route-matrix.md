# MATRIZ COMPLETA DE ROTAS (RETIFICADA) — 2026-08-05

> **Status:** `PENDING_PLAYWRIGHT — ROTAS MAPEADAS, EXECUÇÃO NAVEGACIONAL 1.188 CENÁRIOS PENDENTE`  
> **SHA Atual:** `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3`  
> **Nota:** `TESTED_LOCAL_ONLY` removido — nenhuma execução Playwright real foi realizada.  
> A rota `/carfeira-clientes` (typo) foi corrigida para `/carteira-clientes`.

---

| Rota Real | Nome Módulo | Perfis Permitidos | Status Typo | Estado de Validação |
|---|---|---|---|---|
| `/login` | Autenticação | Público / Todos | OK | `PENDING_PLAYWRIGHT` |
| `/redefinir-senha` | Autenticação | Público / Todos | OK | `PENDING_PLAYWRIGHT` |
| `/recuperar-senha` | Autenticação | Público / Todos | OK | `PENDING_PLAYWRIGHT` |
| `/pre-cadastro` | Cadastro | Público / Todos | OK | `PENDING_PLAYWRIGHT` |
| `/cockpit-vendedor` | Vendedor | Vendedor, Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/carteira-clientes` | Vendedor (CRM) | Vendedor, Gerente, Dono, Admin | **CORRIGIDO — era /carfeira-clientes** | `PENDING_PLAYWRIGHT` |
| `/central-execucao` | Vendedor (Central) | Vendedor, Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/meu-desempenho` | Vendedor | Vendedor, Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/treinamentos` | Universidade MX | Todos | OK | `PENDING_PLAYWRIGHT` |
| `/ranking-vendedores` | Ranking | Todos | OK | `PENDING_PLAYWRIGHT` |
| `/minha-equipe` | Gerente | Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/meta-loja` | Gerente | Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/rotina-equipe` | Gerente | Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/fechamento-diario` | Gerente | Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/pdi-equipe` | Gerente | Gerente, Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/cockpit-dono` | Dono | Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/rotina` | Dono | Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/plano-estrategico` | Dono | Dono, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/painel-consultoria` | Consultoria | Consultor MX, Admin | OK | `PENDING_PLAYWRIGHT` |
| `/admin-mx-overview` | Admin MX | Admin MX, Admin Geral | OK | `PENDING_PLAYWRIGHT` |
| `/gestao-lojas` | Admin MX | Admin MX, Admin Geral | OK | `PENDING_PLAYWRIGHT` |
| `/simulacao-perfil` | Admin MX | Admin MX, Admin Geral, Consultor | OK | `PENDING_PLAYWRIGHT` |
