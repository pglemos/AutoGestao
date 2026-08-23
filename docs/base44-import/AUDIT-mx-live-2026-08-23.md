# AUDIT MX live vs Base44 — 2026-08-23

Fonte MX: `http://127.0.0.1:3457/` (sessão Admin SynVolt já autenticada).  
Inventário Base44: `docs/base44-import/AUDIT-base44-live-2026-08-23.md`.  
Evidência: `visual-evidence/agent-browser/mx-live-2026-08-23/`.  
Nota ferramenta: `cursor-ide-browser` não manteve abas (create→navigate falhou); navegação/snapshots via Chrome DevTools MCP (browser Cursor/CDP).

Legenda MX: **OK** | **FALTA** | **ERRADO** | **PARCIAL** | **N/A**

---

## Shell / navegação

| Item Base44 | MX | Nota |
|-------------|----|------|
| Grupo OPERAÇÃO MX | OK | Presente |
| Início (`/`) | PARCIAL | MX usa `/painel` (redirect `/`→home/painel) |
| Clientes MX | OK | `/clientes` |
| Consultoria | PARCIAL | Label **Consultoria MX** → `/consultoria` |
| Equipe MX | OK | `/equipe` |
| Universidade MX | PARCIAL | Rota `/universidade-mx` (não `/universidade`) |
| Agenda em Operação | PARCIAL | MX tem Agenda em Operação; Base44 junta Notificações e Agenda em Plataforma |
| PRODUTO E METODOLOGIA | OK | Grupo presente |
| Produtos de Consultoria | OK | `/produtos` |
| Plano Estratégico | PARCIAL | `/plano-estrategico` (Base44 `/indicadores`) |
| Planos de Ação | PARCIAL | `/plano-acao` (Base44 `/planos-acao`) |
| Consultoria MX (produto) | FALTA | Em Base44 item separado; no MX só sob Operação |
| Scores e Alertas | OK | `/scores` |
| Benchmark e Mercado | FALTA | Ausente na sidebar admin |
| Ranking / Devolutivas / Desenvolvimento | N/A | Extras MX (não no inventário Base44) |
| PLATAFORMA E GOVERNANÇA | PARCIAL | Grupo existe; itens divergem |
| Dados e Conciliação | FALTA | Ausente |
| Notificações e Agenda | PARCIAL | Notificações `/notificacoes` (badge 99+); Agenda separada |
| Suporte e Incidentes | OK | `/suporte` |
| Segurança e Auditoria | FALTA | Ausente na sidebar |
| Relatórios / PMR / Config | N/A | Extras MX |
| SIMULAÇÃO Vendedor/Gerente/Dono | N/A | Extra MX útil p/ paridade |
| TopBar busca + sino + avatar AD | PARCIAL | Avatar SynVolt Admin; sino via Notificações 99+; busca global não auditada |

---

## Início / Panorama (`/painel`)

| Item Base44 | MX | Nota |
|-------------|----|------|
| Título panorama operacional | OK | “Panorama Operacional MX” |
| KPI Clientes Ativos | ERRADO | Card existe; valor **43** igual a Implantação/Bloqueios — contagem incoerente |
| KPI Em Implantação | ERRADO | **43** (mesma base que Ativos) |
| KPI Prontos para Ativar | OK | Card existe; valor **0** |
| KPI Com Bloqueios | ERRADO | **43** — parece duplicar carteira inteira |
| Widget Carteira + Ver todos | OK | Carteira (43) + Ver todos |
| Cadastros Pendentes | PARCIAL | “Cadastros Recebidos”; vazio OK |
| Alertas Ativos | OK | Alertas/bloqueios operacionais |
| Ações Rápidas (Novo/Validar/Produto/Auditoria) | PARCIAL | “Acesso Rápido aos Domínios” (não mesmos 4 CTAs Base44) |
| Dados demo MX VEÍCULOS TESTE 4 | FALTA | Carteira real (ACERTT, AG…); sem clientes demo Base44 |

---

## Clientes MX (`/clientes`)

| Item Base44 | MX | Nota |
|-------------|----|------|
| Subtítulo N clientes | OK | “43 clientes na carteira.” |
| CTA + Novo Cliente | OK | “Novo cliente” |
| Cards Ativos / Implantação / Prontos / Configuração | PARCIAL | Mesmos 4 cards; números Ativos=Implantação=43 inconsistentes |
| Busca nome/cidade | OK | Nome, cidade ou CNPJ |
| Filtro Todos os status | OK | Inclui status granulares extras |
| Colunas CLIENTE STATUS FASE ONBOARDING RESPONSÁVEL AÇÕES | OK | Mesmo conjunto |
| Status pills (Config / Ativo Implantação / Suspenso) | PARCIAL | Quase todos “Ativo em Implantação”; Suspenso/Config raros na amostra |
| Fase Não definida / Sobrevivência / Crescimento | PARCIAL | Quase todos “Não definida”; VB tem “Estruturação” |
| Onboarding Concluído | ERRADO | Quase todos **Etapa 1/7** (não “Concluído”) |
| Linha demo Lagoa Santa / Mariane | FALTA | Sem MX VEÍCULOS TESTE 4 |
| Abrir ficha por clique | OK | AG → `/clientes/ag-automoveis` |

---

## Detalhe cliente AG AUTOMÓVEIS

| Item Base44 / pedido | MX | Nota |
|----------------------|----|------|
| Abas Empresa/lojas | OK | “Empresa e lojas” — 3 lojas (Matriz + 2 filiais) |
| Abas Pessoas | OK | “Pessoas e acessos” — 22 usuários; alerta Dono Master |
| Plano (estratégico/ação) | PARCIAL | Cards na Visão geral + aba “Planejamento e ações”; PE **Rascunho**, 0 metas publicadas / 45 pendentes; PA **0 planos** |
| Abas extras MX | N/A | Visão geral, Programa, Implantação, Módulos, Dados |
| CTAs onboarding / sync / PA / consultoria | OK | Presentes |
| KPIs Status/Lojas/Pessoas/Prontidão | OK | Ativos, 3, 22, 6/12; 2 impeditivos |

---

## Plano Estratégico (`/plano-estrategico`)

| Item Base44 | MX | Nota |
|-------------|----|------|
| Label sidebar Plano Estratégico | OK | |
| Abas Catálogo / Parâmetros / Planos por Cliente / Histórico | OK | Nomes curtos (“Catálogo”, “Parâmetros”) |
| CTAs Editar Ordem · Criar Demo · Parâmetros · Criar Indicador | OK | |
| Contadores 46/45 · 19/18 · 28/27 · 12 · 13 · 9 arq. | PARCIAL | MX: **45** · **18** · **27** · **12** · **13** · **17** arquivados |
| Filtros/pills (Digitáveis, Calculáveis, Dono, etc.) | OK | Alinhados |
| Tabela Comercial 22 + SALES_* | OK | Ordem, código, meta calc/manual, Dono, Publicado |
| Vendas Total calculado; canais manual | OK | Confirmado no catálogo |

---

## Planos de Ação (`/plano-acao`)

| Item Base44 | MX | Nota |
|-------------|----|------|
| Título + metodologia | OK | “Planos de Ação e Playbooks” |
| CTAs Aplicar / Histórico / Criar Plano Padrão | OK | |
| Abas Padrão · Sugestões · Aplicações · Histórico | PARCIAL | + aba extra “Planos da rede” |
| Cards departamento + totais | PARCIAL | 7 publicados / 45 indicadores / 1 rascunho (Base44: 1 plano / 46 / 6 rascunho — dataset diferente) |
| Filtros busca/depto/indicador/status/disp/prio/resp | OK | Indicador disabled até depto |
| Tabela Plano · Depto · Indicador · Ações · Prioridade · Resp. | PARCIAL | Colunas extras SUG/APL/STATUS/VERSÃO |

---

## Dono /home período M-1

| Item | MX | Nota |
|------|----|------|
| Simulação Dono | OK | `/simulacao/dono` → `/home` Módulo Executivo |
| Seletor período | OK | Dialog Loja + Período |
| M-1 (Julho/2026 vs hoje 23/08) | OK | Default **Julho/2026**; opções Trimestre/Ano/Personalizado |
| Aceite P0 mesma célula Admin↔Dono (cliente VEÍCULOS TESTE 4) | FALTA | Simulação em **MX CONSULTORIA**, não AG; PE AG sem metas publicadas |

---

## Limitações

- `cursor-ide-browser` não manteve abas; auditoria via Chrome DevTools MCP + PNGs Playwright em `visual-evidence/agent-browser/mx-live-2026-08-23/`.
- Aba “Planejamento e ações” confirmada; conteúdo além dos cards da Visão geral não esgotado.
- Senha de login **não** registrada em artefatos.
