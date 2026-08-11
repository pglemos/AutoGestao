# Inventário Route × Role — MX Gestão Preditiva

Gerado: 2026-08-11T15:16:29.474Z | Fontes: src/App.tsx, src/lib/auth/routeAccess.ts, src/lib/auth/capabilities.ts

Perfis: administrador_geral, administrador_mx, consultor_mx, dono, gerente, vendedor

## Matriz (105 rotas)

| Path | Tipo | Layer | Rule | Capability | Redirect/Alias | Switch | adm_geral | adm_mx | consultor | dono | gerente | vendedor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/login` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/forgot-password` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/reset-password` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/pre-cadastro/:storeSlug` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/privacy` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/terms` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/dono/*` | route | STANDARD_CANVAS | `/dono/*` | — | OwnerLegacyPathRedirect |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/` | route | AUTH_LEGAL_PUBLIC | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
| `/settings` | route | STANDARD_CANVAS | `/settings` | view_configurations | /configuracoes |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/plano-estrategico` | route | STANDARD_CANVAS | `/plano-estrategico` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/plano-acao` | route | STANDARD_CANVAS | `/plano-acao` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/decisoes` | route | STANDARD_CANVAS | `/decisoes` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/departamentos` | route | STANDARD_CANVAS | `/departamentos` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/departamentos/comercial` | route | STANDARD_CANVAS | `/departamentos/*` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/departamentos/marketing` | route | STANDARD_CANVAS | `/departamentos/*` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/departamentos/produto-e-estoque` | route | STANDARD_CANVAS | `/departamentos/*` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/departamentos/pessoas-rh` | route | STANDARD_CANVAS | `/departamentos/*` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/departamentos/financeiro` | route | STANDARD_CANVAS | `/departamentos/*` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/departamentos/operacoes` | route | STANDARD_CANVAS | `/departamentos/*` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/mercado` | route | STANDARD_CANVAS | `/mercado` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/team` | route | STANDARD_CANVAS | `/team` | manage_team | TeamAliasRedirect |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/equipe` | route | STANDARD_CANVAS | `/equipe` | manage_team | TeamAliasRedirect |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/meu-dia` | route | REDIRECT | `/meu-dia` | — | /home |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/home` | route | STANDARD_CANVAS | `/home` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/minha-remuneracao` | route | REDIRECT | `/minha-remuneracao` | — | /home |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/lancamento-diario` | route | REDIRECT | `/lancamento-diario` | — | /terminal-mx |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/fechamento-diario` | route | STANDARD_CANVAS | `/fechamento-diario` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/terminal-mx` | route | STANDARD_CANVAS | `/vendedor/terminal-mx` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/terminal-mx` | route | STANDARD_CANVAS | `/terminal-mx` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/liberacao-fechamento` | route | STANDARD_CANVAS | `/liberacao-fechamento` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/carteira-clientes` | route | STANDARD_CANVAS | `/carteira-clientes` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/carteira` | route | REDIRECT | `/carteira` | — | /carteira-clientes |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/carteira` | route | REDIRECT | `/vendedor/carteira` | — | /carteira-clientes |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/mentor-comercial` | route | REDIRECT | `/mentor-comercial` | — | /carteira-clientes |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/mentor-comercial` | route | REDIRECT | `/vendedor/mentor-comercial` | — | /carteira-clientes |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/funil` | route | REDIRECT | `/funil` | — | /meu-funil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/minha-meta` | route | REDIRECT | `/minha-meta` | — | /meu-funil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/minha-meta` | route | REDIRECT | `/vendedor/minha-meta` | — | /meu-funil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/meu-funil` | route | STANDARD_CANVAS | `/meu-funil` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/funil-comercial` | route | STANDARD_CANVAS | `/funil-comercial` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/central-execucao` | route | STANDARD_CANVAS | `/central-execucao` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/rotina-do-dia` | route | REDIRECT | `/rotina-do-dia` | — | /central-execucao |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/rotina-do-dia` | route | REDIRECT | `/vendedor/rotina-do-dia` | — | /central-execucao |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/central-de-execucao` | route | STANDARD_CANVAS | `/central-de-execucao` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/relatorios-vendedor` | route | STANDARD_CANVAS | `/relatorios-vendedor` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/relatorios` | route | STANDARD_CANVAS | `/relatorios` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/feedback` | route | REDIRECT | `/feedback` | — | /devolutivas |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/feedbacks` | route | REDIRECT | `/feedbacks` | — | /desenvolvimento?tab=feedback |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/funil` | route | REDIRECT | `/vendedor/funil` | — | /meu-funil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/meu-funil` | route | REDIRECT | `/vendedor/meu-funil` | — | /meu-funil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/feedback` | route | REDIRECT | `/vendedor/feedback` | — | /desenvolvimento?tab=feedback |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/devolutivas` | route | REDIRECT | `/vendedor/devolutivas` | — | /desenvolvimento?tab=feedback |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/desenvolvimento` | route | REDIRECT | `/vendedor/desenvolvimento` | — | /desenvolvimento |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/treinamentos` | route | REDIRECT | `/vendedor/treinamentos` | — | /universidade-mx |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/universidade-mx` | route | REDIRECT | `/vendedor/universidade-mx` | — | /universidade-mx |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/configuracoes` | route | REDIRECT | `/vendedor/configuracoes` | — | /configuracoes |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/funil-vendas` | route | STANDARD_CANVAS | `/funil-vendas` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/metas` | route | STANDARD_CANVAS | `/metas` | — | /meta-loja |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/falar-consultor` | route | STANDARD_CANVAS | `/falar-consultor` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/organograma` | route | STANDARD_CANVAS | `/organograma` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/banco-talentos` | route | STANDARD_CANVAS | `/banco-talentos` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/ajuda` | route | STANDARD_CANVAS | `/ajuda` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/ranking` | route | STANDARD_CANVAS | `/ranking` | view_ranking | — |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/classificacao` | route | STANDARD_CANVAS | `/classificacao` | view_ranking | — |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/universidade-mx` | route | STANDARD_CANVAS | `/universidade-mx` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/treinamentos` | route | STANDARD_CANVAS | `/treinamentos` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/desenvolvimento` | route | STANDARD_CANVAS | `/desenvolvimento` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/devolutivas` | route | STANDARD_CANVAS | `/devolutivas` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/notificacoes` | route | STANDARD_CANVAS | `/notificacoes` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/perfil` | route | STANDARD_CANVAS | `/perfil` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/meu-perfil` | route | REDIRECT | `/meu-perfil` | — | /perfil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/meu-perfil-vendedor` | route | REDIRECT | `/meu-perfil-vendedor` | — | /perfil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/vendedor/perfil` | route | REDIRECT | `/vendedor/perfil` | — | /perfil |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/rotina-equipe` | route | STANDARD_CANVAS | `/rotina-equipe` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/minha-equipe` | route | STANDARD_CANVAS | `/minha-equipe` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/meta-loja` | route | STANDARD_CANVAS | `/meta-loja` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/mentor` | route | STANDARD_CANVAS | `/mentor` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/feedbacks-pdis` | route | STANDARD_CANVAS | `/feedbacks-pdis` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/lojas/:storeSlug/consultor-ia` | route | STANDARD_CANVAS | `/lojas/:storeSlug/consultor-ia` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/lojas/:storeSlug/filiais` | route | STANDARD_CANVAS | `/lojas/:storeSlug/filiais` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/lojas/:storeSlug` | route | STANDARD_CANVAS | `/lojas/:storeSlug` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/lojas/:storeSlug/equipe` | route | STANDARD_CANVAS | `/lojas/:storeSlug/*` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/consultor-ia` | route | STANDARD_CANVAS | `/consultor-ia` | — | ConsultorIaAliasRedirect |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/pdi` | route | STANDARD_CANVAS | `/pdi` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/pdi/:id/print` | route | PRINT | `/pdi/:id/print` | print_pdi | — |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/minhas-lojas` | route | STANDARD_CANVAS | `/minhas-lojas` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/rotina` | route | STANDARD_CANVAS | `/rotina` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/painel` | route | STANDARD_CANVAS | `/painel` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/lojas` | route | STANDARD_CANVAS | `/lojas` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/simulacao` | route | STANDARD_CANVAS | `/simulacao` | simulate_role | — |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/simulacao/:simulationRole` | route | STANDARD_CANVAS | `/simulacao/*` | simulate_role | — |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/agenda` | route | STANDARD_CANVAS | `/agenda` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/consultoria` | route | STANDARD_CANVAS | `/consultoria` | — | — | ✓ | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/produtos` | route | STANDARD_CANVAS | `/produtos` | view_products | — |  | DENY | DENY | DENY | DENY | DENY | DENY |
| `/configuracoes` | route | STANDARD_CANVAS | `/configuracoes` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/configuracoes/remuneracao` | route | STANDARD_CANVAS | `/configuracoes/remuneracao` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/configuracoes/operacional` | route | STANDARD_CANVAS | `/configuracoes/operacional` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/configuracoes/consultoria-pmr` | route | STANDARD_CANVAS | `/configuracoes/consultoria-pmr` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/configuracoes/reprocessamento` | route | STANDARD_CANVAS | `/configuracoes/reprocessamento` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/relatorio-matinal` | route | STANDARD_CANVAS | `/relatorio-matinal` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/relatorios/performance-vendas` | route | STANDARD_CANVAS | `/relatorios/performance-vendas` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/relatorios/performance-vendedor` | route | STANDARD_CANVAS | `/relatorios/performance-vendedor` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/auditoria` | route | STANDARD_CANVAS | `/auditoria` | — | — |  | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `/*` | route | CATCHALL | — | — | — |  | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE | NO_RULE |
