# Estouro de cota (cached egress) — diagnóstico e correção para o plano gratuito

**Data:** 2026-08-06 · **Projeto:** `fbhcmzzgwjdgkctlfvbo` (MX GESTAO PREDITIVA)
**Sintoma:** `rest` e `auth` respondendo HTTP 402 — `exceed_cached_egress_quota`. `db` segue `ACTIVE_HEALTHY`.

## 1. Causa raiz medida

Dois buckets **públicos** de avatar guardavam a foto exatamente como saiu da câmera:

| Bucket | Público | Objetos | Total | Média | Maior |
|---|---|---|---|---|---|
| `pre-cadastro-avatares` | sim | 90 | **107 MB** | 1,2 MB | 3,2 MB |
| `perfis_usuario` | sim | 1 | 419 kB | 419 kB | 419 kB |

87 usuários têm `avatar_url` apontando para o bucket público. Bucket público é servido pelo CDN — **toda leitura conta como cached egress**.

O que consumia a cota:

1. **Foto de 1–3 MB para exibir 40 px.** Telas de ranking, live floor, equipe e relatório da manhã listam a equipe inteira: uma carga completa puxava ~105 MB. Cerca de 47 aberturas dessas telas consomem os 5 GB do plano gratuito.
2. **Sem `loading="lazy"`.** O navegador baixava inclusive os avatares fora da tela.
3. **Cache-buster na URL.** `uploadUserAvatar` devolvia `...publicUrl?t=${Date.now()}`, e o caminho já era único por upload — o query param só servia para reduzir a eficácia do cache do CDN.
4. **Nenhum teto no bucket:** aceitava 5 MB por arquivo.

Descartados como causa principal (medidos): banco inteiro tem 64 MB; maior tabela 4,3 MB; cron roda no máximo a cada 30 min; 31 tabelas publicadas no realtime, das quais o app assina 17 — sem assinante não há egress.

## 2. Correções aplicadas

| Correção | Onde | Efeito |
|---|---|---|
| Redução para 256 px / JPEG 0,82 antes do upload | `src/lib/image-downscale.ts`, usado em `uploadUserAvatar` e no pré-cadastro | ~1,2 MB → ~25 KB por avatar |
| `cacheControl` de 1 ano e fim do `?t=` | `src/lib/avatar.ts` | CDN passa a reaproveitar de verdade |
| `loading="lazy"` + `decoding="async"` | atom `Avatar` + 5 pontos que renderizam foto em lista | avatar fora da tela não é baixado |
| Teto de 512 KB e allowlist de MIME nos buckets públicos | migration `20260806120000` (**aplicada**) | upload gordo é recusado pelo servidor |
| Piso de 15 s entre refetches do funil | `team-funnel-realtime.ts` | o realtime novo deixa de reler 6 meses de eventos a cada INSERT |

## 3. Passivo recomprimido — executado em 2026-08-06

Depois de o proprietário subir o plano (org saiu de `free` para `pro`) e os cinco
serviços voltarem a `healthy`, o script rodou com backup obrigatório dos originais.

| Bucket | Antes | Depois |
|---|---|---|
| `pre-cadastro-avatares` (90 objetos) | 107 MB | **735 kB** |
| `perfis_usuario` (1 objeto) | 419 kB | **8 kB** |
| **Total** | **107,5 MB** | **743 kB** — −99,3% |

Maior objeto: de 3,2 MB para 13 kB. Leitura pública conferida: `HTTP 200`,
10 kB, `content-type: image/jpeg`, `cache-control: public, max-age=31536000`.

Um arquivo não pôde ser processado (`libpng read error` — PNG corrompido na
origem) e foi mantido intacto, como o script prevê.

Originais preservados fora do repositório antes da regravação (108 MB, 90
arquivos). A regravação é in-place e o script agora **exige** `--backup-dir`
junto de `--apply`.

```bash
npm i -D sharp
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompress-storage-avatars.mjs
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompress-storage-avatars.mjs --apply --backup-dir=/caminho
```

## 4. Voltar ao plano gratuito

Com o passivo em 743 kB e o teto de 512 KB por arquivo, a conta de egress
deixa de ser dominada por imagem. Antes de rebaixar o plano, confira no painel
o consumo do ciclo corrente: o valor já gasto neste ciclo não é devolvido pela
correção — o efeito aparece no ciclo seguinte.

## 5. Observação sobre reincidência

O teto de 512 KB no bucket é a garantia de que isto não volta mesmo que alguém suba direto pela API. A redução no cliente é a primeira linha; o teto no servidor é a rede de proteção.
