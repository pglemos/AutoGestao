# Mentor Comercial — Motor Determinístico v1

Este repositório contém a documentação e os utilitários do **Motor Determinístico v1 do Mentor Comercial** do sistema MX Performance.

---

## 1. Visão Geral

O Mentor Comercial é uma máquina de decisão 100% determinística para gestão de carteira comercial e oportunidades de vendas. Ele avalia o contexto da oportunidade, calcula prioridades e pontuações (scores), recomenda o próximo passo comercial, gera scripts personalizados e gerencia cadências de contato sem necessidade de chamadas a modelos de inteligência artificial em tempo de execução.

### Fonte da Verdade
- **Planilha Fonte**: `Mentor_Comercial_Motor_Regras_v1.xlsx`
- **Checksum SHA-256**: `3268de238076e64f0f0189e96033ea3c423c6afe93d276b700fe750915d7be8e`

---

## 2. Catálogos de Regras

Os catálogos JSON estão localizados em `rules/mentor-comercial/v1/` e contêm a especificação exata extraída da planilha fonte:

1. **`statuses.json`** (86 status): Definição de todos os status comerciais, famílias de status, objetivos e próximos passos padrão.
2. **`cadences.json`** (13 cadências): Regras de cadência de prospecção, qualificação, negociação e acompanhamento.
3. **`cadence_steps.json`** (57 passos): Passos individuais de cada cadência com offsets temporais e canais de contato.
4. **`scripts.json`** (77 scripts): Scripts de abordagem com suporte a placeholders dinâmicos (ex: `{{NOME_CLIENTE}}`, `{{PRIMEIRO_NOME_VENDEDOR}}`).
5. **`transitions.json`** (52 transições): Regras de transição entre status, determinando o fluxo permitido de avanço ou recuo.
6. **`scenarios.json`** (15 cenários): Matriz de cenários de teste sintéticos para validação determinística.
7. **Outras Entidades**: 3 canais de comunicação, 18 integrações ativas e 100 clientes de teste catalogados.

> **Nota sobre SOURCE_BLOCKERs**:  
> Os scripts `INT-Q07`, `INT-N04`, `POR-A04`, `CAR-C07` e `CAR-C08` são declarados na planilha fonte como referências, mas não possuem conteúdo textual definido na origem. O motor trata essas ocorrências de forma defensiva via fallback seguro (`SOURCE_BLOCKED_STATUSES`), garantindo estabilidade e integridade sem constituir erro de software.

---

## 3. Comandos de Pipeline

Os scripts Node.js na pasta `scripts/` gerenciam o ciclo de vida dos catálogos de regras e a verificação de integridade:

### Extração de Regras
Extrai a especificação contida na planilha fonte e atualiza os arquivos JSON em `rules/mentor-comercial/v1/`.
```bash
node scripts/mentor-rules-extract.mjs
```

### Validação de Status no Código Fonte (Guarda Ativa)
Verifica se todo o código TypeScript/React em `src/` faz referência apenas a códigos de status válidos contidos no catálogo `statuses.json`.
```bash
node scripts/mentor-assert-status-codes.mjs
```

### Validação de Integridade e Cenários
Executa a validação dos 15 cenários de simulação determinística e checa a consistência lógica de transições, cadências e scripts.
```bash
node scripts/mentor-rules-validate.mjs
```

### Semeio no Banco de Dados (Seed Idempotente)
Semeia os catálogos nas tabelas correspondentes do Supabase de forma totalmente idempotente. Em execuções subsequentes, insere +0 registros.
```bash
node scripts/mentor-rules-seed.mjs
```

### Relatório de Reconciliação
Gera o relatório factual de reconciliação entre o estado dos dados das oportunidades no Supabase e as regras do motor v1.
```bash
node scripts/mentor-reconcile-report.mjs
```

---

## 4. Rotas da Aplicação

- **Rota Canônica**: `/carteira-clientes`
- **Aliases Suportados**:
  - `/carteira`
  - `/vendedor/carteira`
  - `/mentor-comercial`
  - `/vendedor/mentor-comercial`
