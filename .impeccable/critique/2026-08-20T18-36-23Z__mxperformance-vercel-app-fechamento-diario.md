---
target: "https://mxperformance.vercel.app/fechamento-diario"
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-20T18-36-23Z
slug: mxperformance-vercel-app-fechamento-diario
---
# Crítica Impeccable — /fechamento-diario

## Design Health Score

| # | Heurística | Score | Evidência principal |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Autosave, etapa, progresso e resumo são visíveis; no mobile a barra sticky cobre conteúdo e o estado finalizável aparece com 0%. |
| 2 | Match System / Real World | 2/4 | Showroom, Carteira e Internet são familiares, mas D+1/Amanhã e os rótulos de cadastro divergem. |
| 3 | User Control and Freedom | 3/4 | Voltar, Cancelar, confirmação, histórico e Regularizar ajudam; indicadores mobile não são acionáveis. |
| 4 | Consistency and Standards | 2/4 | Shell consistente, porém data duplicada, Fechamento vs Fechamento Diário, Novo Cliente vs Novo Registro e notificações de QA quebram o padrão. |
| 5 | Error Prevention | 2/4 | Há confirmação destrutiva, mas FINALIZAR FECHAMENTO DO DIA chega ao modal com 0% e etapas incompletas. |
| 6 | Recognition Rather Than Recall | 3/4 | Labels, progresso e exemplos ajudam; regras críticas ficam em um modal longo e usam termos diferentes. |
| 7 | Flexibility and Efficiency | 2/4 | Autosave ajuda, mas o fluxo mobile tem cerca de 2.803 px, sem âncoras, e a barra sticky interfere no conteúdo. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Desktop polido, mas há alertas, data duplicada, cards extensos, tabela comprimida e ajuda longa. |
| 9 | Error Recovery | 3/4 | Histórico de 7 dias, Regularizar e Não, voltar são bons; faltam validações inline e contexto de pendências. |
| 10 | Help and Documentation | 3/4 | Saiba mais e o histórico explicam regras reais, mas o modal tem sete blocos e contradiz a terminologia da tela. |
| **Total** |  | **25/40** | **Saúde intermediária: a operação é utilizável, mas confiança e segurança de conclusão precisam de trabalho.** |

## Veredito de especificidade

**LLM — médio-alto, com perda na execução.** O fechamento por canais, score 70% + 30%, data operacional, histórico de regularização e linguagem de loja automotiva são autoria clara da MX; não parecem um template de CRM genérico. A especificidade se dilui pela deriva de termos, pelo conteúdo `[TESTE QA]` exposto e por escolhas visuais genéricas (Inter em todo o texto, cards com bordas/sombras repetidos).

**Evidência determinística/browser.** Como o alvo é uma URL, o `detect.mjs` de CLI foi pulado conforme o playbook. O detector avaliado em página retornou 27 achados em desktop (22 entradas: 18 visíveis, 4 ocultas) e 22 em mobile (18 entradas: 15 visíveis, 3 ocultas). As regras mais frequentes foram `gpt-thin-border-wide-shadow` (8 por viewport), `layout-transition` (3), `cramped-padding` (2 desktop/3 mobile), `clipped-overflow-container` (2), `nested-cards` (3 desktop/2 mobile), além de `text-overflow`, `line-length`, `low-contrast`, `edge-flush-cards`, `tight-leading`, `overused-font` e `kicker-above-heading`.

Os achados mais acionáveis são o rótulo da sidebar truncado como `MÓDULO COM...`, linhas longas no alerta de fechamento pendente, contraste 4,2:1 no bloco verde `#cadastrar-venda-agendamentos`, e o conteúdo de data duplicado/truncado no mobile. As regras de borda/sombra, `overflow-hidden` do shell e transições responsivas são em grande parte falsos positivos ou decisões intencionais do design system.

## Impressão geral

A página transmite uma rotina comercial real e é relativamente clara no desktop. No celular — o cenário crítico do vendedor entre atendimentos — a primeira viewport mostra mais ruído que ação: alerta, duas datas, progresso comprimido e uma barra sticky que pode cobrir o formulário. O maior risco é de confiança: o CTA irreversível parece disponível antes de o usuário ter concluído o ritual.

## O que está funcionando

- A hierarquia desktop (header, alerta, progresso, etapa, resumo e CTA) permite localizar o próximo passo rapidamente.
- Autosave, histórico/Regularizar e a confirmação destrutiva dão boas saídas para recuperação e auditoria.
- O score e os empty states explicam a lógica comercial da MX, em vez de só apresentarem campos vazios.

## Problemas prioritários

### [P0] Finalização disponível em estado incompleto

**Por que importa:** com Showroom em 0%, 0% de progresso e etapas ainda não confirmadas, `FINALIZAR FECHAMENTO DO DIA` abriu uma confirmação de ação irreversível. Isso permite erro operacional ou faz o vendedor desconfiar do sistema.

**Correção:** desabilitar o CTA até o checklist estar completo; se produção zero for um caso válido, criar uma ação explícita e separada de `Registrar produção zero`, com confirmação e resumo próprios.

**Comando sugerido:** `$impeccable harden`.

### [P1] Primeira viewport mobile não orienta nem protege

**Por que importa:** em 390×844 a data operacional aparece duas vezes e truncada, os quatro passos ficam comprimidos, o conteúdo chega a aproximadamente 2.803 px e `Rascunho salvo...` cobre parte do formulário durante o scroll.

**Correção:** manter uma única data; transformar o progresso em uma faixa legível com etapa atual e contador; reservar espaço real para a barra sticky ou removê-la do modo mobile; adicionar âncoras/avanço para o próximo passo.

**Comando sugerido:** `$impeccable adapt` e `$impeccable layout`.

### [P1] Dados de QA e notificações duplicadas aparecem em produção

**Por que importa:** `[TESTE QA] dedup-debug`, fixtures de cobrança e duplicatas quebram a credibilidade do produto e o menu de notificações chega a iniciar fora da viewport (x≈-37) no mobile.

**Correção:** remover/segregar fixtures e dedup-debug do dataset de produção, reconciliar o contador `9+` com os itens realmente visíveis e ancorar o popover dentro da viewport.

**Comando sugerido:** `$impeccable harden`.

### [P2] Modelo mental e nomenclatura não são únicos

**Por que importa:** `D+1`/`Amanhã`, `Novo Cliente`/`Novo Registro`, `Cadastrar Novo Cliente`/`Cadastrar Venda/Agendamentos` e `Fechamento`/`Fechamento Diário` exigem que o vendedor memorize equivalências.

**Correção:** definir um glossário de produto e reutilizar exatamente os mesmos termos no header, etapas, modal, CTAs e histórico; explicar a regra D+1 junto do campo, sem depender de sete blocos em um modal.

**Comando sugerido:** `$impeccable clarify` e `$impeccable distill`.

### [P2] Tabela e contraste perdem acabamento em larguras reais

**Por que importa:** em 1440×900 a coluna `STATUS` aparece como `STA` e `AÇÕES` fica comprimida; o bloco verde medido em 4,2:1 fica abaixo do alvo AA de 4,5:1.

**Correção:** aplicar layout de tabela responsivo com scroll explícito ou converter linhas vazias/estreitas em cards; ajustar o verde para atingir contraste AA e corrigir o truncamento da sidebar.

**Comando sugerido:** `$impeccable audit` e `$impeccable layout`.

## Personas e sinais de risco

- **Vendedor em fechamento pelo celular:** primeira viewport sem contador, scroll longo, barra sticky cobrindo campos e CTA final cedo demais elevam abandono e erro.
- **Vendedor novo/primeiro acesso:** termos divergentes e modal de pontuação extenso exigem conhecimento prévio; a diferença entre corrigir ontem e registrar hoje não fica imediata.
- **Gerente/supervisor:** usa histórico e pendências, mas notificações de QA, duplicatas e cabeçalhos truncados reduzem confiança na auditoria.

## Observações menores

- Header mobile diz `Fechamento Diário`, enquanto o H1 diz `Fechamento`.
- Tabs são acionáveis no desktop, mas os indicadores mobile parecem apenas decorativos.
- O contador `9+` não corresponde claramente ao conjunto visível de notificações.
- `Saiba mais` abre conteúdo maior que a tarefa imediata.
- Ícones principais têm nomes acessíveis adequados (`Abrir notificações`, `Abrir perfil`, `Fechar`).
- A interação observada alterou Showroom e voltou a 0 após reload; nenhum cliente foi criado e o fechamento não foi submetido.

## Perguntas para orientar a próxima rodada

- O fechamento em 0% é um caso operacional válido? Se sim, ele deve ser uma ação explícita de produção zero, separada da finalização normal?
- Qual prioridade vem primeiro: proteger a conclusão (P0), reorganizar o mobile (P1) ou limpar notificações/dados de QA (P1)?
- Você quer corrigir todos os pontos desta crítica ou começar pelos três de maior impacto?
