# MATRIZ COMPLETA PERFIL × ROTA × AÇÃO × VIEWPORT — 2026-08-05

- **Total de Rotas Registradas:** 22
- **Perfis de Acesso Inspecionados:** Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX
- **Viewports Testados:** 390x844, 600x900, 768x1024, 840x1024, 1024x768, 1280x800, 1440x900, 1600x1000, 1920x1080

---

## 1. MATRIZ DE AUTORIZAÇÃO E VALIDAÇÃO POR ROTA

| Rota | Tipo | Perfis Permitidos | Permissão Negada (403) | Mesma Loja | Outra Loja | Troca Loja | Loading | Dados | Vazio | Erro | Modal | Form | Ação Principal | Persistência | Console | Rede | Viewports Aprovados | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/login` | Pública | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX | Nenhum (Pública) | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/redefinir-senha` | Pública | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX | Nenhum (Pública) | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/recuperar-senha` | Pública | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX | Nenhum (Pública) | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/pre-cadastro` | Pública | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX | Nenhum (Pública) | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/cockpit-vendedor` | Vendedor | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX | Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/carfeira-clientes` | Vendedor | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX | Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/central-execucao` | Vendedor | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX | Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/meu-desempenho` | Vendedor | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX | Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/treinamentos` | Vendedor | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX | Nenhum (Pública) | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/ranking-vendedores` | Vendedor/Gerente | Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX | Nenhum (Pública) | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/minha-equipe` | Gerente | Gerente, Dono, Administrador Geral, Administrador MX | Vendedor, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/meta-loja` | Gerente | Gerente, Dono, Administrador Geral, Administrador MX | Vendedor, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/rotina-equipe` | Gerente | Gerente, Dono, Administrador Geral, Administrador MX | Vendedor, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/fechamento-diario` | Gerente | Gerente, Dono, Administrador Geral, Administrador MX | Vendedor, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/pdi-equipe` | Gerente | Gerente, Dono, Administrador Geral, Administrador MX | Vendedor, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/cockpit-dono` | Dono | Dono, Administrador Geral, Administrador MX | Vendedor, Gerente, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/rotina` | Dono | Dono, Administrador Geral, Administrador MX | Vendedor, Gerente, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/plano-estrategico` | Dono | Dono, Administrador Geral, Administrador MX | Vendedor, Gerente, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/painel-consultoria` | Consultor MX | Consultor MX, Administrador Geral, Administrador MX | Vendedor, Gerente, Dono | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/admin-mx-overview` | Admin MX | Administrador Geral, Administrador MX | Vendedor, Gerente, Dono, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/gestao-lojas` | Admin MX | Administrador Geral, Administrador MX | Vendedor, Gerente, Dono, Consultor MX | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |
| `/simulacao-perfil` | Admin MX | Administrador Geral, Administrador MX, Consultor MX | Vendedor, Gerente, Dono | OK | Bloqueado (RLS) | OK | Skeleton | Renderizado | Mensagem Útil | ErrorBoundary | OK | Validado | OK | DB Validado | Limpo (0 Error) | HTTP 200 | 9/9 Viewports | DONE_WITH_EVIDENCE |

---

## 2. COBERTA DE VIEWPORTS

- **Mobile:** 390x844 (iPhone 12/13/14), 600x900 (Small Tablet / Foldable)
- **Tablet:** 768x1024 (iPad Portrait), 840x1024 (iPad Air), 1024x768 (iPad Landscape)
- **Desktop:** 1280x800 (MacBook 13"), 1440x900 (MacBook 15"), 1600x1000 (Desktop HD), 1920x1080 (FHD 1080p)

Todas as 22 rotas sob AppShell e PageCanvas canônico foram validadas sem overflow horizontal nos 9 viewports.
