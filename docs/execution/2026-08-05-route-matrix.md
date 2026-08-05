# ROUTE MATRIX — 2026-08-05

| Rota | Perfis Autorizados | Perfis Proibidos | Shell | PageCanvas | Status Teste Local | Status Teste Produção |
|---|---|---|---|---|---|---|
| `/` (Login) | Público | N/A | AuthShell | Canonical | PENDENTE | PENDENTE |
| `/vendedor/*` | Vendedor | Gerente, Dono | AppShell | Canonical | PENDENTE | PENDENTE |
| `/gerente/*` | Gerente | Vendedor | AppShell | Canonical | PENDENTE | PENDENTE |
| `/dono/*` | Dono | Vendedor, Gerente | AppShell | Canonical | PENDENTE | PENDENTE |
| `/admin/*` | Admin Geral, Admin MX | Vendedor, Gerente | AppShell | Canonical | PENDENTE | PENDENTE |
| `/consultor/*` | Consultor MX | Vendedor, Gerente | AppShell | Canonical | PENDENTE | PENDENTE |
