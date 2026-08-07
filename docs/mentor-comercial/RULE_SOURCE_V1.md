# RULE_SOURCE_V1 — Fonte oficial da matriz do Mentor Comercial

## Arquivo fonte

| Campo | Valor |
|---|---|
| Arquivo | `Mentor_Comercial_Motor_Regras_v1.xlsx` |
| Local no repositório | `rules/mentor-comercial/v1/source/` |
| SHA256 | `3268de238076e64f0f0189e96033ea3c423c6afe93d276b700fe750915d7be8e` |
| Versão da regra | `v1` |

As três cópias encontradas em `~/Downloads` são byte-idênticas (mesmo SHA256), portanto não há
ambiguidade sobre qual é a fonte.

## Comandos

```bash
npm run mentor:rules:extract    # regenera os catálogos JSON a partir do XLSX
npm run mentor:rules:check      # falha se os JSON divergirem do XLSX
npm run mentor:rules:validate   # valida integridade referencial da matriz
```

## Contagens extraídas (verificadas contra o prompt mestre)

| Aba | Catálogo | Registros | Referência esperada |
|---|---|---:|---:|
| 01 Canais | `channels.json` | 3 | 3 |
| 02 Status | `statuses.json` | 86 | 86 |
| 03 Cadências | `cadences.json` | 13 | 13 |
| 04 Passos_Cadência | `cadence-steps.json` | 57 | 57 |
| 05 Scripts | `scripts.json` | 77 | 77 |
| 06 Transições | `transitions.json` | 52 | 52 |
| 07 Score_Prioridade | `score-priority.json` | 31 | — |
| 08 Plano_Ataque | `attack-missions.json` | 15 | — |
| Listas | `lists.json` | 86 | — |
| 09 Teste_Clientes | `test-clients.json` | 100 | — |
| 10 Integrações | `integrations.json` | 18 | — |
| 11 Testes_Cenários | `acceptance-scenarios.json` | 15 | 15 |

Todas as contagens de referência do prompt mestre foram confirmadas na planilha atual.

## Fidelidade do texto

Verificado contra o XML cru do XLSX (`xl/sharedStrings.xml`):

- As quebras de linha dentro das células são **CRLF (`\r\n`)** literais — 149 pares exatos.
  SheetJS (usado na extração) preserva `\r\n`; openpyxl normaliza para `\n`. A extração está
  fiel à fonte.
- Consequência para o renderer de scripts (TASK 16): o catálogo guarda `\r\n` verbatim. Qualquer
  normalização para exibição/WhatsApp deve acontecer na camada de apresentação, nunca no catálogo.
- Placeholders encontrados nos 77 scripts: **exatamente os 15 oficiais**, nenhum extra, nenhum
  ausente — `{nome}` `{vendedor}` `{loja}` `{veiculo}` `{nomeIndicador}` `{motivoRealDoContato}`
  `{resumoNecessidade}` `{opcao1}` `{opcao2}` `{data}` `{hora}` `{valorAvaliacao}`
  `{listaPendencias}` `{tipoDecisor}` `{dataRetorno}`.

## Descobertas estruturais que afetam o motor

### 1. `Cadência` (aba 02 Status) é uma coluna polimórfica

Dos 28 valores distintos, apenas 13 são referências `CAD-*`. Os demais são **diretivas de modo**,
não cadências:

```
Automática · Ação imediata · Ação no mesmo dia · Central · Central de Execução · Derivada ·
Derivada pela data · Hoje · Imediata · Mesmo dia · Sem ação · Sem ação imediata · Sem cadência ·
Verificação periódica · Verificação única
```

O motor deve tratar esses valores como "sem cadência ativa", com o modo correspondente. Tratá-los
como referência quebrada produziria 40+ falsas órfãs.

### 2. Transições referenciam status por RÓTULO e por CONTEXTO

A coluna `Status/Contexto de origem` mistura rótulos exatos de status com **contextos mais amplos**
(`Negociação ativa`, `Proposta enviada`, `Valor apresentado`, …). Isso não é defeito: confirma a
regra de precedência do prompt (§28):

1. status exato
2. contexto/família
3. `Qualquer`

Todos os **52 destinos** (`Novo status sugerido`) resolvem para rótulo de status conhecido.
20 origens são contextos e não rótulos — resolvidos pelo nível 2 da precedência.

### 3. Famílias de transição são um agrupamento mais amplo que as famílias de status

Status usam 9 famílias (`Venda e Entrega`, `Perda e Futuro`, …); transições usam 11
(`Venda`, `Perda`, `Futuro`, `Garantia`, …). O motor precisa de um mapa família-de-transição →
família-de-status; equiparar as duas listas quebraria o casamento.

### 4. `{n}` é expansão real, quando existe

`SCR-INT-CAD01-T{n}` (status INT-C02) expande em `SCR-INT-CAD01-T1..T6`, e a cadência CAD-01 tem
exatamente 6 tentativas e 6 passos. A equivalência é **provada estruturalmente**, não presumida.
O validator só aceita expansão `{n}` quando o número de scripts casa com o número de passos.

## SOURCE_BLOCKERS — 5 referências órfãs não resolvíveis

A auditoria anterior apontou 6 referências potencialmente órfãs. Revalidadas contra a planilha
atual: **1 resolve por prova estrutural, 5 permanecem órfãs.**

| Status | Script declarado | Situação |
|---|---|---|
| INT-C02 | `SCR-INT-CAD01-T{n}` | **RESOLVIDO** — expande em T1..T6, casa com 6 passos de CAD-01 |
| INT-Q07 | `SCR-REATIVACAO-CAD03-T1` | **SOURCE_BLOCKER** |
| INT-N04 | `SCR-DECISAO-01` | **SOURCE_BLOCKER** |
| POR-A04 | `SCR-POS-VISITA-CAD03-T{n}` | **SOURCE_BLOCKER** |
| CAR-C07 | `SCR-TROCA-FUTURA-01` | **SOURCE_BLOCKER** |
| CAR-C08 | `SCR-POSVENDA-01` | **SOURCE_BLOCKER** |

### Por que cada uma não foi resolvida

Todas foram submetidas ao protocolo do §17 (ID exato → expansão `{n}` → relacionamento em outra
aba → alias documentado → correspondência com prova estrutural).

**Nenhuma das 5 tem qualquer menção nas abas `09 Teste_Clientes`, `10 Integrações` ou
`11 Testes_Cenários`** — não existe evidência cruzada na fonte.

| Status | Candidatos que existem | Por que não é prova |
|---|---|---|
| INT-Q07 → `SCR-REATIVACAO-CAD03-T1` | `SCR-CAR-REATIVACAO-T1..T6` | Candidatos têm `área = Carteira`; o status é canal `Internet`. IDs não coincidem em estrutura. |
| INT-N04 → `SCR-DECISAO-01` | `SCR-DECISAO-CAD03-T1` | Sufixo `-01` (script único) vs `-CAD03-T1` (tentativa de cadência). Além disso o status tem cadência `Ação imediata`, não CAD-03. |
| POR-A04 → `SCR-POS-VISITA-CAD03-T{n}` | `SCR-POS-VISITA-01` | Existe um script base, mas **zero expansões `-T*`**. Mapear `T{n}` para um script único é interpretação, não prova. |
| CAR-C07 → `SCR-TROCA-FUTURA-01` | `SCR-TROCA-12M`, `SCR-TROCA-18M`, `SCR-TROCA-24M` | Três candidatos plausíveis; nenhuma regra na fonte escolhe um deterministicamente. |
| CAR-C08 → `SCR-POSVENDA-01` | `SCR-POSVENDA-D7`, `SCR-POSVENDA-D30`, `SCR-POSVENDA-D180` | Três candidatos plausíveis; mesma ambiguidade. |

Conforme §88, havendo duas ou mais interpretações plausíveis, **não se inventa**. Nenhum ID e
nenhum texto de script foi criado.

### Como o sistema se comporta enquanto o bloqueio existir

- `npm run mentor:rules:validate` **sempre reporta** os 5 bloqueios; eles nunca contam como
  resolvidos e nunca são silenciados.
- O validator detecta se a planilha for corrigida: se `scriptId` de um status bloqueado mudar,
  emite `stale_blocker` exigindo revalidação.
- Nos 5 status afetados o motor deve produzir `scriptReady = false` com o motivo, e a UI deve
  bloquear a abertura do WhatsApp (mesmo tratamento de variável obrigatória ausente, TASK 16).

### Resolução

Exige correção da planilha pelo proprietário da fonte — não é decisão do software. As opções são
criar os 5 scripts com os IDs declarados, ou corrigir os `Script base` dos 5 status para apontar
IDs existentes.
