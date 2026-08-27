# As 53 vulnerabilidades do Dependabot — 2026-08-27

O push de hoje trouxe o aviso do GitHub: 53 vulnerabilidades (2 críticas,
27 altas, 19 moderadas, 5 baixas). Fui verificar. O número local é outro.

## `npm audit` contra este lockfile

```
info 0 · low 0 · moderate 0 · high 1 · critical 0 · total 1
```

Uma. `xlsx` (SheetJS 0.18.5), com dois avisos: Prototype Pollution e ReDoS.
`fixAvailable: false` — a SheetJS saiu do registro público do npm e a versão
publicada lá parou em 0.18.5.

A diferença para os 53 do GitHub não foi investigada a fundo: o Dependabot
conta por alerta e inclui árvore de desenvolvimento e advisories que o
`npm audit` deste lockfile não reproduz. Quem quiser o número exato tem que
abrir a aba de segurança do repositório — não tenho acesso autenticado a ela
nesta sessão.

## Por que a alta não é exposição

Duas verificações:

**1. `xlsx` não vai para o navegador.** Já está em `devDependencies`, e os
únicos importadores são scripts de linha de comando:
`scripts/mentor-rules-extract.mjs`, `validate_admin_master_full_e2e.mjs`,
`import_cronograma_2026_mx.ts`, `consultoria_importar_fechamento_mensal.ts`.
Todos rodam contra planilhas que a própria MX fornece. Prototype pollution e
ReDoS num parser exigem entrada hostil; aqui não há.

**2. A leitura de planilha no app NÃO usa a SheetJS.** O bundle tem um
`xlsx-reader`, e ele é `src/lib/xlsx-reader.ts` — parser próprio, sobre
`fflate`. Único consumidor: `MetasRealizadosTab.tsx:874`, por import dinâmico.

Ou seja: a biblioteca vulnerável nunca toca arquivo de usuário, e o caminho
que toca arquivo de usuário não usa a biblioteca vulnerável.

## O parser próprio, já que ele lê upload

`readXlsxTable` monta cada registro com `record[name] = ...`, onde `name` vem
da linha de cabeçalho do arquivo enviado. Isso parece prototype pollution.
Não é — verificado empiricamente:

```
Object.prototype poluido?         false
coluna __proto__ virou own prop?  false
registro: {"constructor":"x","Nome":"ok"}
```

Atribuir uma **string** a `__proto__` num objeto literal é no-op: não cria
propriedade própria nem troca o protótipo. Como as células viram sempre
string ou número (`row[index] ?? ''`), não há vetor.

O efeito real é outro e é pequeno: uma coluna chamada literalmente
`__proto__` desaparece em silêncio. Não mexi nisso — trocar por
`Object.create(null)` fecharia o caso, mas objeto sem protótipo quebra
qualquer consumidor que chame `.hasOwnProperty` nele, e o ganho aqui é
uma coluna que ninguém nomeia assim numa planilha de indicadores.

## Conclusão

Nada a corrigir em código por conta deste aviso. O que fica é operacional:
o `xlsx` seguirá aparecendo em scanner enquanto for dependência, porque não
existe versão corrigida no npm. Se o ruído incomodar, o caminho é instalar a
SheetJS do CDN oficial nos scripts — decisão de infraestrutura, não de
segurança do produto.
