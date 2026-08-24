---
target: src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-24T03-46-32Z
slug: eira-clientes-pages-carteiraclientesbase44page-tsx
---
Method: dual-agent (A: f1dbaffb-69fe-4002-9da6-0cbbb44ba83c · B: 798bf15a-f1f9-4c58-9a2b-dc381435a87f)

#### Design Health Score

| # | Heuristic | Score | Key Finding / Issue |
|---|-----------|:-----:|---------------------|
| 1 | Visibility of System Status | **3/4** | Rastreamento em tempo real do progresso no `ExecucaoMissao` e `ModoAtaque`; detecção automática de retorno do WhatsApp via `visibilitychange`. |
| 2 | Match System / Real World | **4/4** | **Autenticidade impecável no domínio automotivo.** Vocabulário fiel à concessionária: avaliação de usado, bônus de troca, simulação de financiamento, veículos que chegaram, indicação 30d, recompra 1 ano. |
| 3 | User Control and Freedom | **3/4** | Excelentes rotas de saída (*Pausar Modo Ataque*, *Cancelar Venda*, *Ignorar Retorno*). O encadeamento de modais no retorno do WhatsApp ainda gera sensação de "esteira rolante". |
| 4 | Consistency and Standards | **2/4** | Coexistência de duas árvores de componentes (legado Base44 em `src/components/carteira/*` vs novo domínio em `src/features/mentor-comercial/ui/*`) gerando divergências sutis de dialogs e tokens. |
| 5 | Error Prevention | **3/4** | Máscaras monetárias estritas, formatação de telefone BR, bloqueio determinístico quando faltam variáveis de script, prevenção contra confirmação de venda sem veículo/valor. |
| 6 | Recognition Rather Than Recall | **3/4** | Contexto do cliente (Nome, Veículo, Próximo Passo, Objetivo) fixado no topo de drawers e modais. Scripts 100% determinísticos prontos para envio. |
| 7 | Flexibility and Efficiency | **3/4** | `ModoAtaque` oferece sprint de alta produtividade; link direto para WhatsApp Web/App; busca multidimensional (placa, veículo, fone, nome). Faltam atalhos de teclado (hotkeys 1-9 para desfechos). |
| 8 | Aesthetic and Minimalist Design | **2/4** | **Sobrecarga de ruído visual no card de cliente.** `ClienteCard` renderiza até 14 tokens/chips simultâneos (Avatar, Canal, Veículo, 3 Chips de Evento, Temperatura, Prioridade, Score, Situação, Objetivo, Explicação, 2 botões). |
| 9 | Error Recovery | **3/4** | Explicações claras em caso de bloqueio (`descreverBloqueio` detalha ausência de dados na matriz oficial). Toasts não-destrutivos preservam formulários preenchidos. |
| 10 | Help and Documentation | **3/4** | Orientação contextual de alto nível: *Por que este score?*, *Por que está aqui?*, e explicações inline transformam o vendedor novato em consultor de elite. |
| **Total** | | **29/40** | **Good (72.5%)** |

---

#### Design Specificity Verdict

- **Avaliação de Design (LLM)**: O módulo possui **altíssima especificidade automotiva**. Não é um CRM genérico de "deals/leads"; é um copiloto de rotina comercial para consultores de vendas de veículos. Ele operacionaliza o ciclo de vida real do showroom: recepção de porta, avaliação de seminovos, aprovação de financiamento bancário, cruzamento de estoque novo com compradores quentes (`VeiculosChegaram`), pós-venda de indicação em 30 dias e recompra programada em 365 dias. A mentoria é 100% determinística (sem alucinação de IA), fornecendo um único próximo passo recomendado e scripts pré-validados.
- **Varredura Determinística (Detector CLI & Evidências)**: 0 anti-patterns encontrados. 100% de conformidade com as 38 regras automatizadas do Impeccable (sem *side-tabs* artificiais, sem paletas de IA neon, sem transições destrutivas de layout, contrastes WCAG AA entre 4.65:1 e 18.2:1).
- **Evidências Visuais e Browser**: Validação com `agent-browser` (`visual-evidence/agent-browser/carteira-clientes-impeccable-final-route-a11y-2026-08-20T20-03-53/summary.json`) confirmada com status `passed`, 0 violações de acessibilidade, alvos de toque de 44px (`min-h-11`) e suporte responsivo a desktop (`1440x900`) e mobile (`390x844`).

---

#### Overall Impression
O módulo é uma ferramenta comercial extraordinariamente potente e profunda em regras de negócio automotivas, que elimina a "paralisia da tela em branco" do vendedor. O principal gargalo atual é a **densidade cognitiva**: o excesso de micro-badges disputando atenção nos cards e a sucessão encadeada de modais após o retorno do WhatsApp.

---

#### What's Working
1. **Motor de Cruzamento de Estoque em Tempo Real (`VeiculosChegaram`)**: Alerta o vendedor imediatamente quando um carro recém-chegado no pátio bate com o perfil ou busca de um lead da carteira — uma das funcionalidades mais geradoras de receita do produto.
2. **Mentoria Comercial Determinística com 77 Matrizes**: Substitui anotações soltas por uma diretriz clara (*Mentor recomenda*), objetivo definido e script oficial sem fricção.
3. **Ambiente de Foco "Modo Ataque"**: Interface em tela cheia com barra de progresso, cronômetro e execução em lote que transforma a rotina de prospecção matinal em uma experiência dinâmica e envolvente.

---

#### Priority Issues

- **[P1] Poluição Visual e Disputa de Foco no `ClienteCard`**
  - *Por que importa*: Vendedores no showroom precisam bater o olho no card e decidir o que fazer em 3 segundos. Com 14 badges/caixas simultâneas (temperatura, prioridade, score, evento, situação, objetivo, recomendação), a fadiga visual leva a ignorar leads.
  - *Correção*: Consolidar metadados em uma hierarquia rígida de 3 níveis: **[1. Quem & Carro] → [2. Recomendação do Mentor] → [3. Ação Principal]**. Ocultar explicações secundárias por padrão no mobile.
  - *Comando sugerido*: `/impeccable distill`

- **[P1] Encadeamento Excessivo de Modais no Retorno do WhatsApp**
  - *Por que importa*: Ao retornar do WhatsApp, o app abre automaticamente o `RetornoWhatsAppModal` (9 opções), que ao registrar aciona o `ProximaOportunidadeModal`, que sugere o `ModoAtaque` ou abre outro `WhatsAppRoteiro`. O vendedor se sente preso em um túnel de popups.
  - *Correção*: Substituir o modal bloqueante por uma barra flutuante inferior (*bottom sheet / snackbar*) de registro rápido que não sequestre a tela e permita continuar navegando livremente.
  - *Comando sugerido*: `/impeccable clarify`

- **[P2] Sobrecarga de Memória Operacional no Registro de Desfecho (9 Botões)**
  - *Por que importa*: Viola a regra de ouro da memória de trabalho (≤ 4 opções simultâneas). Nove cards coloridos simultâneos causam hesitação no momento do pós-contato.
  - *Correção*: Agrupar os 9 desfechos em 3 macro-categorias claras: **1. Avanço Comercial** (*Agendou, Vendeu, Proposta*); **2. Sem Contato / Retentativa** (*Não Atendeu, Não Respondeu, Remarcar*); **3. Encerramento** (*Perdeu Interesse, Outro*).
  - *Comando sugerido*: `/impeccable layout`

- **[P2] Bifurcação Arquitetural de Componentes de UI**
  - *Por que importa*: A convivência entre a pasta `src/components/carteira/*` (Base44) e `src/features/mentor-comercial/ui/*` cria pequenas variações de comportamento entre drawers, modais centralizados e tokens de cor.
  - *Correção*: Unificar a renderização na suíte moderna `src/features/mentor-comercial/ui/` (`ExecuteNextStepPanel`, `FichaOportunidade`, `GuidedStatusUpdate`).
  - *Comando sugerido*: `/impeccable polish`

---

#### Persona Red Flags

- **Alex (Vendedor de Alta Performance)**:
  - *Red Flags*: Ausência de atalhos de teclado (ex.: teclas `1` a `9` para desfechos rápidos, `/` para focar busca, `Enter` para enviar WhatsApp); bloqueio por modais sequenciais após cada mensagem; impossibilidade de disparar 5 confirmações de visita simultâneas em lote matinal.
- **Jordan (Consultor Recém-Contratado / Júnior)**:
  - *Red Flags*: Confusão entre "Score Comercial" (qualidade de conduta do vendedor em 5 pilares) e "Prioridade" (urgência do lead), ambos exibidos com valores até 100 na ficha; hesitação diante de 86 nomenclaturas técnicas de situação.
- **Casey (No Salão de Vendas pelo Celular)**:
  - *Red Flags*: O formulário de novo cliente e edição na ficha possui campos densos em 2 colunas com alvos de seleção que exigem as duas mãos enquanto caminha com o cliente no pátio da loja.

---

#### Minor Observations
1. O seletor de tom no `ScriptIA.jsx` (*Consultivo, Direto, Leve, Áudio*) é ilustrativo, pois os scripts são 100% determinísticos pela matriz oficial — pode gerar expectativa de variação de texto que não ocorre.
2. O parser de data rápida no `AlterarProximoPasso.jsx` (onde digitar `"30"` preenche automaticamente o dia 30 do mês corrente) é um acelerador brilhante e super prático.

---

#### Questions to Consider
1. *"E se o registro de desfecho pós-WhatsApp fosse feito em 1 toque através de uma barra rápida inferior com os 3 resultados mais frequentes da loja ('Agendou Visita', 'Não Respondeu', 'Vendeu')?"*
2. *"E se o card do cliente no celular mostrasse apenas a ação recomendada e o motivo de urgência, escondendo os 6 selos secundários até que o card seja tocado?"*
3. *"Como poderíamos introduzir atalhos de teclado no Modo Ataque desktop para que vendedores experientes registrem 20 contatos em menos de 5 minutos sem tirar a mão do teclado?"*
