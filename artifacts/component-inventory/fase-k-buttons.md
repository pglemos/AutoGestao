# Inventário FASE K — Buttons e Icon Buttons (11.001/11.002/11.005)
Gerado: 2026-08-14 (sliva FASE K, slice bounded)

## 11.001 — Sistemas de Button encontrados

| Sistema | Arquivo | Importers | Papel |
|---|---|---|---|
| atoms/Button (canônico) | `src/components/atoms/Button.tsx` | 171 | Família única de ações (Base44/Dono) |
| ui/button (legado shadcn) | `src/components/ui/button.jsx` | 92 | Button antigo shadcn, fora do contrato |
| atoms/IconButton | `src/components/atoms/IconButton.tsx` | 2 | Icon-only com `label` obrigatório |
| Custom | `OwnerFilterButton.jsx`, `NotificationBellButton.tsx` | — | Triggers específicos de feature |

Raw `<button>`: 255 arquivos (241 prod), 59 com `aria-label`, ~9 icon-only-looking.

## 11.002 — Variants reais em uso (atoms/Button, enclosing element = Button)

| variant | usos |
|---|---|
| outline | 104 |
| ghost | 81 |
| secondary | 51 |
| primary | 19 |
| danger | 11 |
| success | 1 |
| warning | 1 |
| info | 1 |
| whatsapp | 1 |
| brand | 1 |
| mx-elite | 0 |

## 11.005 — Duplicatas eliminadas

- `brand` == `primary` (byte-idêntico). 1 consumidor migrado: `MeuPerfilVendedor.container.tsx`.
- `secondary` == `outline` (byte-idêntico). 59 sites migrados → `outline` (37 + 22, via
  `scripts/fase-k-migrate-secondary.mjs` + `-secondary2.mjs`).
- `mx-elite` removido (0 consumidores). Story `Elite` e opções `secondary`/`mx-elite` removidas de
  `src/components/atoms/_stories/Button.stories.tsx`.

Contrato: `src/test/atoms/button-variants-contract.test.ts` — variantes canônicas
`primary,outline,ghost,success,warning,info,danger,whatsapp` (8), sem duplicata visual
(RED→GREEN, 4 testes).

## Pendências da FASE K (próximas slices)

- ui/button legado (92 importers) → migrar para atoms/Button.
- 11.006–11.015: loading/disabled/focus/hover, icon-only aria-label, tooltip, lint de overrides, migração total.
