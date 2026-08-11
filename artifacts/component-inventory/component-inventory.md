# Inventario Componentes — Fase D (04.001-04.017)
Gerado: 2026-08-11T15:21:33Z

## 04.001 Familias em src/components/ui/ (31 modulos shadcn)
HelpTooltip.tsx
InfoTooltip.jsx
PageHeader.jsx
StatCard.jsx
alert-dialog.jsx
alert.jsx
badge.jsx
button.jsx
checkbox.jsx
command.jsx
dialog.jsx
dropdown-menu.jsx
input-otp.jsx
input.jsx
label.jsx
popover.jsx
progress.jsx
select.jsx
separator.jsx
sheet.jsx
skeleton.jsx
slider.jsx
switch.jsx
tabs.jsx
textarea.jsx
toast.jsx
toaster.jsx
toggle.jsx
tooltip.jsx
ui-primitives.d.ts
use-toast.jsx

## 04.002 Consumo de primitivos (arquivos importers, excl. tests/stories)
button : 119
dialog : 80
input : 55
select : 49
skeleton : 1
sheet : 11
tooltip : 4
popover : 3
tabs : 3

## 04.004 Duplicacoes por perfil
Skeleton: 33 arquivos usam <Skeleton>, 1 importa ui/skeleton (resto custom: RankingSkeleton, FeedbackLoadingSkeleton, PerformanceLoadingSkeleton, MxSkeleton)
Modal custom: src/components/organisms/Modal.tsx + molecules/ModalTrigger.tsx + 40 refs <Modal
DialogContent: 2 arquivos

## 04.005 DialogContent/Modal
- ui/dialog.jsx (Radix) 80 importers; Modal.tsx custom 40 refs

## 04.006 Drawers/vaul
Sheet (Radix): 11 importers; 3 arquivos com SheetContent/SheetTrigger

## 04.008 Tabs
ui/tabs: 3; TabsList/Trigger (Radix): 12; tabs custom role=tab: 1

## 04.013 Skeleton/empty/loading/error
Skeleton 33; empty-states: DashboardEmptyStates.tsx e demais por feature

## 04.016 Hardcodes numericos em classes Tailwind (contagem bruta)
- w-[Npx]/h-[Npx]/max-w-[Npx]/min-w-[Npx]: 194 ocorrencias
- z-[N]: 29 ocorrencias (picos: z-[200] ModoAtaqueView, z-[150] CheckinHeader, z-[140] CheckinForm, z-[101] Modal, z-[90] AgendaHeader, z-[180] ContentSuggestionDialog)
- rounded-[Npx]: dominante em manager/daily-closing (12px/16px/8px)
- gaps/paddings px: 1 ocorrencia apenas (bom sinal de tokens)

## Complemento (varredura explorador, 04.001-04.017)

### 04.003/04.004 Duplicadas reais (fora de base44-reference)
- EvidenceTab.jsx (owner/actionplan/board × owner/consulting)
- UpcomingDeadlines.jsx (owner/actionplan/calendar × owner/actionplan)
- index.tsx (design/motion × organisms/AgendaCalendar)
- 129 nomes duplicados no total, mas quase todos = src/base44-reference/ (snapshot de referencia) — EXCLUIR de contagens reais.

### 04.002 Headers
- PageHeader: 23 arquivos | boudary Header: 33 | HeaderBar: 0

### 04.010 Page headers locais
- CheckinHeader, StoreFeedbackHeader, etc. — 23 consumidores de PageHeader + variantes locais

### 04.011/04.012 Tables
- <table em 62 arquivos/70 occ; DataGrid.tsx + organisms/index.ts; Table components nomeados: DRETable, DataGrid, TimeGrid, MonthGrid, SkeltonTable

### 04.014 Toast/providers concorrentes
- toast(: 47 files/144 occ; useToast: 46; sonner: 5/12; react-hot-toast: 2/2 -> pelo menos 2 APIs concorrentes

### 04.015 Tooltip/popover/dropdown
- DropdownMenu: 9 files/248 occ; Popover: 10/102; role=menu: 3

### 04.016 Hex literals (fora de tokens e base44-reference)
- 796 ocorrencias / 119 distintos; top: #526B7A×110, #00A89D×84, #DFE0E1×81, #005BFF×62, #071822×58, #F7F8F8×41, #1fcb6e×22, #FFFFFF×20, #22C55E×19, #EF4343×17
- Pior arquivo: CheckinCrmSection.tsx (120), index.css (99), CheckinForm.tsx (99), CheckinHeader.tsx (88)

### 04.013 Empty/loading/error/skeleton
- Central MX: MxEmptyState/MxLoadingState/MxErrorState/MxSkeleton (MxModuleVisualPrimitives)
- Owner: EmptyState.jsx, Skeleton.jsx/CardSkeleton
- Feature-custom: RankingSkeleton, FeedbackLoadingSkeleton, PerformanceLoadingSkeleton, LojasLoadingSkeleton, ManagerDataErrorState, SkeletonTable/Card/Chart/Stats/List
