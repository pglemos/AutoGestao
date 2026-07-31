# Achado visual: /agenda não tem título de página

> Medido em 2026-07-31, sessão real de `administrador_geral`, viewport 1280×720.

## Evidência

```json
{"h1":["julho de 2026"],
 "eyebrow":["Filtros","Atualizar","Painel Lateral","julho 2026","Agendadas","Em Andamento"]}
```

O único `h1` do documento é **o mês corrente do calendário**. A tela não declara
seu próprio nome em lugar nenhum do conteúdo principal.

## Por que é defeito, e não preferência

O §28 exige que o título comece na mesma linha estrutural das páginas equivalentes,
e §21 exige ordem lógica de headings. Todas as outras rotas internas abrem com
`MxModuleHeader` (eyebrow + título + descrição): "CRM de Consultoria",
"Desenvolvimento", "Ranking Global". A Agenda quebra esse padrão duas vezes:

1. quem chega pela navegação não vê confirmação textual de onde está;
2. um leitor de tela que navega por headings ouve "julho de 2026" como título da
   página — o mês é o conteúdo, não a identidade da tela.

## Correção proposta (não aplicada)

Adicionar `MxModuleHeader` com eyebrow "Consultoria", título "Agenda MX" e descrição
curta, e rebaixar o mês do calendário para `h2`. Não apliquei porque a Agenda é a
tela de mais alta densidade do módulo de consultoria e inserir um header ocupa
altura vertical acima da grade — é decisão de produto sobre densidade, não correção
mecânica.

## Impacto no teste

`agenda-filters.playwright.ts` esperava o texto "Agenda MX" e falhava: o texto não
existe na tela. A asserção passou a ancorar em `main#main-content` e no controle
"Filtros". Se o header for adicionado, vale voltar a afirmar o título.
