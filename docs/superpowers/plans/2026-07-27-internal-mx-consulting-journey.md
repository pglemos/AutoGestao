# Consulting Autonomy Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a Consultoria compartilhada com jornada, modal central, Aula e Visão Geral, Entrega, Evidências, progresso real de vídeo, Google Meet, antecipação e confidencialidade PMR/PMR Plus/PPA.

**Architecture:** O frontend consumirá um snapshot seguro por loja e RPCs transacionais para progresso, entrega e antecipação. Estruturas existentes de clientes, visitas, aulas, evidências e agenda serão reutilizadas. Quatro tabelas portuguesas e aditivas armazenarão apenas os estados ausentes: progresso efetivo de aula, itens de entrega e solicitações/histórico de antecipação.

**Tech Stack:** React 19, TypeScript 5.8, Radix Dialog/Tabs/Progress, Supabase PostgreSQL 17/RLS/RPC/Realtime/Storage, YouTube IFrame Player API quando aplicável, Bun Test, Testing Library, Playwright.

## Global Constraints

- Texto da interface: `Próximo passo`, não `Próximo encontro` no card de orientação.
- Clique no encontro abre modal central, não drawer lateral.
- Abas finais do modal: `Aula e Visão Geral`, `Entrega`, `Evidências`.
- Não existe aba `Ações` nem aba separada `Progresso`.
- `Assistir aula` abre a aula real.
- Aula obrigatória conclui somente com pelo menos 90% de segundos efetivamente reproduzidos.
- Avançar a posição do vídeo não aumenta segundos efetivamente reproduzidos.
- Progresso salva a cada cinco segundos e em pause, troca de aba, fechamento, saída e ended.
- Aula concluída atualiza Entrega, mas não conclui o encontro.
- Google Meet usa somente `google_meet_link` real.
- Somente o próximo encontro elegível pode ser antecipado, salvo liberação interna.
- PMR Plus preserva histórico e não reinicia progresso.
- PPA completo é restrito a Dono/sócio autorizado, Consultor e perfis internos MX; delegação não libera conteúdo estratégico.
- Reutilizar `evidencias_visita`, `universidade_aulas`, `eventos_agenda_consultoria`, `clientes_consultoria` e `visitas_consultoria`.
- Não criar tabelas em inglês duplicando o domínio português.
- Não expor `visitas_consultoria` diretamente a papéis de loja; usar RPC segura.
- Tema global permanece fora deste plano.

---

## Mapa de arquivos

### Banco, segurança e tipos

- Create: `supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql`
- Create: `src/lib/consulting-journey-migration.test.ts`
- Modify: `src/types/database.generated.ts`
- Create: `supabase/tests/consulting_journey_rls.test.sql`

### Domínio e dados

- Create: `src/features/consulting-journey/consultingJourney.types.ts`
- Create: `src/features/consulting-journey/consultingJourneyRules.ts`
- Create: `src/features/consulting-journey/consultingJourneyRepository.ts`
- Create: `src/features/consulting-journey/useConsultingJourney.ts`
- Create: `src/features/consulting-journey/consultingJourneyRules.test.ts`
- Create: `src/features/consulting-journey/consultingJourneyRepository.test.ts`
- Create: `src/features/consulting-journey/useConsultingJourney.test.tsx`

### Interface

- Create: `src/features/consulting-journey/ConsultingJourneyWorkspace.tsx`
- Create: `src/features/consulting-journey/ConsultingJourneyWorkspace.test.tsx`
- Create: `src/features/consulting-journey/components/ConsultingJourneyTimeline.tsx`
- Create: `src/features/consulting-journey/components/ConsultingMeetingDialog.tsx`
- Create: `src/features/consulting-journey/components/LessonOverviewTab.tsx`
- Create: `src/features/consulting-journey/components/DeliveryTab.tsx`
- Create: `src/features/consulting-journey/components/EvidenceTab.tsx`
- Create: `src/features/consulting-journey/components/ConsultingVideoPlayer.tsx`
- Create: `src/features/consulting-journey/components/ConsultingVideoPlayer.test.tsx`
- Create: `src/features/consulting-journey/components/AnticipationDialog.tsx`
- Create: `src/features/consulting-journey/components/AnticipationReviewDialog.tsx`
- Create: `src/features/consulting-journey/components/ParticipantDialog.tsx`

### Wrappers e evidência

- Modify: `src/pages/owner/Consultoria.jsx`
- Modify: `src/features/internal-mx-planning/InternalConsultingPage.tsx`
- Modify: `src/features/dashboard-loja/hooks/useOwnerConsultingProgram.ts`
- Modify: `src/test/internal-mx-planning-pages.test.ts`
- Create: `src/test/consulting-journey-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/consulting-journey.md`

---

### Task 1: Especificar regras puras de progresso, entrega e antecipação

**Files:**
- Create: `src/features/consulting-journey/consultingJourney.types.ts`
- Create: `src/features/consulting-journey/consultingJourneyRules.ts`
- Create: `src/features/consulting-journey/consultingJourneyRules.test.ts`

**Interfaces:**
- Produces: `calculateLessonProgress`, `calculateDeliveryProgress`, `getAnticipationEligibility`, `canViewPpaContent`.

- [ ] **Step 1: escrever testes RED de vídeo**

```ts
import { describe, expect, test } from 'bun:test'
import { calculateLessonProgress } from './consultingJourneyRules'

describe('calculateLessonProgress', () => {
  test('conclui com 90% efetivamente reproduzidos', () => {
    expect(calculateLessonProgress({ playedSeconds: 540, durationSeconds: 600 })).toEqual({ percentage: 90, completed: true })
  })
  test('não conclui por posição avançada', () => {
    expect(calculateLessonProgress({ playedSeconds: 30, durationSeconds: 600, positionSeconds: 590 }).completed).toBe(false)
  })
})
```

- [ ] **Step 2: escrever testes RED de Entrega**

```ts
expect(calculateDeliveryProgress([
  { required: true, status: 'completed' },
  { required: true, status: 'pending' },
  { required: false, status: 'pending' },
])).toEqual({ completedRequired: 1, totalRequired: 2, percentage: 50 })
```

- [ ] **Step 3: escrever testes RED de antecipação e PPA**

Cover:

```text
aula obrigatória pendente bloqueia;
item obrigatório pendente bloqueia;
participante obrigatório não confirmado bloqueia;
evidência obrigatória ausente bloqueia;
solicitação ativa bloqueia nova solicitação;
perfil interno pode revisar;
gerente delegado vê ação, mas não PPA completo.
```

- [ ] **Step 4: executar RED**

Run: `bun test src/features/consulting-journey/consultingJourneyRules.test.ts`

- [ ] **Step 5: implementar tipos e funções puras**

Core types:

```ts
export type ConsultingProgramKey = 'pmr' | 'pmr_plus' | 'ppa' | string
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed'
export type DeliveryItemStatus = 'pending' | 'in_progress' | 'completed' | 'reopened'
export type EvidenceStatus = 'pending' | 'sent' | 'under_review' | 'approved' | 'returned'
export type AnticipationStatus = 'draft' | 'under_review' | 'approved' | 'date_adjustment_requested' | 'rejected' | 'cancelled'
```

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/consulting-journey/consultingJourneyRules.test.ts
git add src/features/consulting-journey/consultingJourney.types.ts src/features/consulting-journey/consultingJourneyRules.ts src/features/consulting-journey/consultingJourneyRules.test.ts
git commit -m "feat(consulting): add autonomy journey rules"
```

---

### Task 2: Criar migration aditiva e RPCs seguras

**Files:**
- Create: `supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql`
- Create: `src/lib/consulting-journey-migration.test.ts`
- Create: `supabase/tests/consulting_journey_rls.test.sql`

**Interfaces:**
- Produces: `consultoria_progresso_aula`, `consultoria_itens_entrega`, `consultoria_solicitacoes_antecipacao`, `consultoria_historico_antecipacao` and five RPCs.

- [ ] **Step 1: escrever teste RED do contrato SQL**

```ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const path = 'supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql'

test('cria somente estruturas portuguesas ausentes', () => {
  const sql = readFileSync(path, 'utf8')
  for (const table of ['consultoria_progresso_aula', 'consultoria_itens_entrega', 'consultoria_solicitacoes_antecipacao', 'consultoria_historico_antecipacao']) {
    expect(sql).toContain(`public.${table}`)
  }
  expect(sql).not.toContain('consulting_lessons')
  expect(sql).not.toContain('lesson_progress')
  expect(sql).not.toContain('meeting_preparations')
})
```

- [ ] **Step 2: executar e confirmar RED**

Run: `bun test src/lib/consulting-journey-migration.test.ts`

- [ ] **Step 3: criar tabelas aditivas**

The migration must create:

```sql
CREATE TABLE IF NOT EXISTS public.consultoria_progresso_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.universidade_aulas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  position_seconds integer NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  played_seconds integer NOT NULL DEFAULT 0 CHECK (played_seconds >= 0),
  percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  started_at timestamptz,
  last_played_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, lesson_id, user_id)
);
```

```sql
CREATE TABLE IF NOT EXISTS public.consultoria_itens_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.universidade_aulas(id) ON DELETE SET NULL,
  evidence_id uuid REFERENCES public.evidencias_visita(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('lesson','participant','document','data','material','task','evidence')),
  title text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','reopened')),
  responsible_user_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  due_at timestamptz,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE IF NOT EXISTS public.consultoria_solicitacoes_antecipacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'under_review' CHECK (status IN ('draft','under_review','approved','date_adjustment_requested','rejected','cancelled')),
  reason text NOT NULL,
  modality text NOT NULL,
  proposed_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  participants_confirmed boolean NOT NULL DEFAULT false,
  delivery_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  previous_scheduled_at timestamptz,
  approved_scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE IF NOT EXISTS public.consultoria_historico_antecipacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.consultoria_solicitacoes_antecipacao(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  previous_status text,
  next_status text NOT NULL,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: criar índices e Realtime**

Indexes:

```text
progress by store/user/lesson;
delivery by visit/status/sort_order;
one active anticipation request per visit using partial unique index;
anticipation by store/status/created_at.
```

Add all four tables to `supabase_realtime` only if not already published.

- [ ] **Step 5: implementar `save_consulting_lesson_progress`**

The SECURITY DEFINER RPC must:

```text
authorize internal MX or a user linked to the store;
clamp played delta to 0..10 seconds per call;
never derive played_seconds from position_seconds;
cap played_seconds at duration_seconds;
calculate percentage;
set completed_at only when percentage >= 90;
return position_seconds, played_seconds, percentage, completed_at.
```

Signature:

```sql
public.save_consulting_lesson_progress(
  p_store_id uuid,
  p_client_id uuid,
  p_visit_id uuid,
  p_lesson_id uuid,
  p_position_seconds integer,
  p_duration_seconds integer,
  p_played_delta_seconds integer
)
```

- [ ] **Step 6: implementar RPCs restantes**

```text
get_consulting_journey_workspace(p_store_id uuid) returns jsonb;
set_consulting_delivery_item_status(p_item_id uuid, p_status text, p_note text) returns jsonb;
request_consulting_anticipation(p_visit_id uuid, p_reason text, p_modality text, p_proposed_dates jsonb, p_notes text, p_participants_confirmed boolean) returns jsonb;
review_consulting_anticipation(p_request_id uuid, p_status text, p_approved_scheduled_at timestamptz, p_review_note text) returns jsonb.
```

`get_consulting_journey_workspace` must redact PPA content for unauthorized roles and return only delegated action summaries.

- [ ] **Step 7: RLS and grants**

```text
REVOKE direct INSERT/UPDATE/DELETE from authenticated on the four tables;
GRANT SELECT only where safe, otherwise expose reads through RPC;
GRANT EXECUTE on RPCs to authenticated;
REVOKE all RPC execution from PUBLIC/anon;
use eh_area_interna_mx, user_is_master_loja, tem_papel_loja and is_owner_of for authorization;
internal roles can review anticipation; owner can request/cancel but cannot approve own request.
```

- [ ] **Step 8: pgTAP and local validation**

Test:

```text
anon denied;
vendedor outside store denied;
owner linked to store can read safe snapshot and save own progress;
owner cannot approve anticipation;
internal roles can read/manage all stores;
PPA redaction for gerente;
played delta is clamped;
90% completes;
seek does not complete.
```

Run:

```bash
supabase db reset
bun test src/lib/consulting-journey-migration.test.ts
supabase test db supabase/tests/consulting_journey_rls.test.sql
```

- [ ] **Step 9: commit**

```bash
git add supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql src/lib/consulting-journey-migration.test.ts supabase/tests/consulting_journey_rls.test.sql
git commit -m "feat(consulting): persist autonomy journey state"
```

---

### Task 3: Regenerar tipos e criar o repositório

**Files:**
- Modify: `src/types/database.generated.ts`
- Create: `src/features/consulting-journey/consultingJourneyRepository.ts`
- Create: `src/features/consulting-journey/consultingJourneyRepository.test.ts`

**Interfaces:**
- Produces: `consultingJourneyRepository` with `load`, `saveLessonProgress`, `updateDeliveryItem`, `requestAnticipation`, `reviewAnticipation`, `cancelAnticipation`.

- [ ] **Step 1: regenerar tipos**

```bash
npm run gen:db-types
npm run verify:db-types
```

- [ ] **Step 2: escrever testes RED do mapping RPC → domínio**

```ts
test('mapeia próximo encontro como nextStep sem perder o meet link', async () => {
  const repository = createConsultingJourneyRepository(fakeSupabase(rpcPayload))
  const result = await repository.load({ storeId: 'store-1' })
  expect(result.nextStep.meetLink).toBe('https://meet.google.com/abc-defg-hij')
  expect(result.program.visits).toHaveLength(12)
})
```

- [ ] **Step 3: testar payload de progresso**

```ts
await repository.saveLessonProgress({
  storeId: 'store-1', clientId: 'client-1', visitId: 'visit-1', lessonId: 'lesson-1',
  positionSeconds: 120, durationSeconds: 600, playedDeltaSeconds: 5,
})
expect(fakeRpc).toHaveBeenCalledWith('save_consulting_lesson_progress', expect.objectContaining({ p_played_delta_seconds: 5 }))
```

- [ ] **Step 4: implementar repositório com cliente injetável**

```ts
export function createConsultingJourneyRepository(client = supabase) { /* typed methods */ }
export const consultingJourneyRepository = createConsultingJourneyRepository()
```

- [ ] **Step 5: GREEN e commit**

```bash
bun test src/features/consulting-journey/consultingJourneyRepository.test.ts
npm run typecheck
git add src/types/database.generated.ts src/features/consulting-journey/consultingJourneyRepository.ts src/features/consulting-journey/consultingJourneyRepository.test.ts
git commit -m "feat(consulting): add typed journey repository"
```

---

### Task 4: Criar hook de jornada e Realtime

**Files:**
- Create: `src/features/consulting-journey/useConsultingJourney.ts`
- Create: `src/features/consulting-journey/useConsultingJourney.test.tsx`

**Interfaces:**
- Consumes: planning workspace, repository, rules and `usePlanningRealtime`.
- Produces: journey state and mutation handlers.

- [ ] **Step 1: escrever testes RED**

Cover:

```text
sem storeId não consulta;
load maps error/loading/empty;
openMeeting selects visit and opens dialog;
lesson progress updates local snapshot;
completion marks linked delivery lesson item;
completion does not mark visit completed;
request anticipation refreshes nextStep and timeline;
Realtime consulting scope reconciles once per burst.
```

- [ ] **Step 2: executar RED**

Run: `bun test src/features/consulting-journey/useConsultingJourney.test.tsx`

- [ ] **Step 3: implementar signature**

```ts
export function useConsultingJourney(options?: {
  repository?: ConsultingJourneyRepository
}): ConsultingJourneyController
```

Expose:

```text
snapshot, loading, refreshing, error, reload;
selectedVisit, meetingDialogOpen, activeTab;
openMeeting, closeMeeting, setActiveTab;
saveLessonProgress, updateDeliveryItem;
requestAnticipation, reviewAnticipation, cancelAnticipation;
openActionPlanFromContext.
```

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/consulting-journey/useConsultingJourney.test.tsx
git add src/features/consulting-journey/useConsultingJourney.ts src/features/consulting-journey/useConsultingJourney.test.tsx
git commit -m "feat(consulting): add shared journey controller"
```

---

### Task 5: Implementar player com progresso efetivo

**Files:**
- Create: `src/features/consulting-journey/components/ConsultingVideoPlayer.tsx`
- Create: `src/features/consulting-journey/components/ConsultingVideoPlayer.test.tsx`

**Interfaces:**
- Produces: `ConsultingVideoPlayer` with provider adapter and progress callback.

- [ ] **Step 1: escrever testes RED com player fake**

```text
starts at saved position;
while playing, five timer ticks submit playedDeltaSeconds=5;
seek from 10 to 590 does not submit 580 seconds;
pause flushes pending delta;
tab close/unmount flushes pending delta;
ended flushes and keeps completed state;
replay does not clear completedAt.
```

- [ ] **Step 2: executar RED**

Run: `bun test src/features/consulting-journey/components/ConsultingVideoPlayer.test.tsx`

- [ ] **Step 3: implementar provider interface**

```ts
export type ConsultingPlayerAdapter = {
  play(): void
  pause(): void
  seekTo(seconds: number): void
  getCurrentTime(): number
  getDuration(): number
  isPlaying(): boolean
  destroy(): void
}
```

Use YouTube IFrame API only for YouTube URLs. Native HTML5 video uses the same adapter contract.

- [ ] **Step 4: implementar accumulator**

Only accumulate wall-clock seconds while `isPlaying()` is true. Flush maximum 5 seconds on interval and remaining partial seconds on lifecycle events. Never use seek distance as played delta.

- [ ] **Step 5: accessibility**

Provide title, transcript/material links when available, keyboard controls, visible focus and status text in addition to progress color.

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/consulting-journey/components/ConsultingVideoPlayer.test.tsx
npm run typecheck
git add src/features/consulting-journey/components/ConsultingVideoPlayer.tsx src/features/consulting-journey/components/ConsultingVideoPlayer.test.tsx
git commit -m "feat(consulting): track effective lesson playback"
```

---

### Task 6: Construir modal central e três abas

**Files:**
- Create: `src/features/consulting-journey/components/ConsultingMeetingDialog.tsx`
- Create: `src/features/consulting-journey/components/LessonOverviewTab.tsx`
- Create: `src/features/consulting-journey/components/DeliveryTab.tsx`
- Create: `src/features/consulting-journey/components/EvidenceTab.tsx`
- Create: `src/features/consulting-journey/components/ParticipantDialog.tsx`
- Create: `src/features/consulting-journey/components/ConsultingMeetingDialog.test.tsx`

**Interfaces:**
- Consumes: selected visit and controller handlers.
- Produces: accessible central dialog.

- [ ] **Step 1: escrever teste RED das abas**

```tsx
renderMeetingDialog()
expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Aula e Visão Geral', 'Entrega', 'Evidências'])
expect(screen.queryByRole('tab', { name: 'Ações' })).not.toBeInTheDocument()
expect(screen.queryByRole('tab', { name: 'Progresso' })).not.toBeInTheDocument()
```

- [ ] **Step 2: testar Aula e Visão Geral**

Expect player first, then files/materials, visit number/title/program/phase/pillar, modality/date/consultant/participants/status/objective/result and anticipation status. No empty player block when no video.

- [ ] **Step 3: testar Entrega**

Each item shows required/optional, status, responsible, due date and note. Actions: start, complete, comment, assign, reopen, upload file/link when allowed.

- [ ] **Step 4: testar Evidências**

Support file/image/spreadsheet/PDF/link/text/note, statuses, view, replace, remove when allowed, resend and feedback.

- [ ] **Step 5: implementar modal**

Use Radix Dialog with:

```text
max width around 1100 px desktop;
max height 90vh;
internal scrolling;
focus trap;
Escape/close;
full screen at 390 px;
journey remains mounted behind the dialog.
```

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/consulting-journey/components/ConsultingMeetingDialog.test.tsx
npm run typecheck
git add src/features/consulting-journey/components
git commit -m "feat(consulting): add central meeting workspace"
```

---

### Task 7: Implementar antecipação e revisão interna

**Files:**
- Create: `src/features/consulting-journey/components/AnticipationDialog.tsx`
- Create: `src/features/consulting-journey/components/AnticipationReviewDialog.tsx`
- Create: `src/features/consulting-journey/components/AnticipationDialog.test.tsx`

**Interfaces:**
- Produces: request/cancel flow for store roles and review flow for internal roles.

- [ ] **Step 1: escrever testes RED de bloqueio**

```text
button disabled when blockers exist;
blocker list names each missing required item;
optional items do not block;
active request prevents duplicate;
only next eligible visit can be requested.
```

- [ ] **Step 2: escrever teste RED do formulário**

Fields:

```text
encontro;
data atual;
motivo;
modalidade;
três opções de data futura;
observações;
confirmação de participantes.
```

- [ ] **Step 3: escrever teste RED da revisão**

Internal role can choose `approved`, `date_adjustment_requested` or `rejected`; approval requires approved date; request owner cannot review own request.

- [ ] **Step 4: implementar e executar GREEN**

```bash
bun test src/features/consulting-journey/components/AnticipationDialog.test.tsx
```

- [ ] **Step 5: commit**

```bash
git add src/features/consulting-journey/components/AnticipationDialog.tsx src/features/consulting-journey/components/AnticipationReviewDialog.tsx src/features/consulting-journey/components/AnticipationDialog.test.tsx
git commit -m "feat(consulting): add anticipation workflow"
```

---

### Task 8: Montar jornada e wrappers de Dono/interno

**Files:**
- Create: `src/features/consulting-journey/ConsultingJourneyWorkspace.tsx`
- Create: `src/features/consulting-journey/ConsultingJourneyWorkspace.test.tsx`
- Create: `src/features/consulting-journey/components/ConsultingJourneyTimeline.tsx`
- Modify: `src/pages/owner/Consultoria.jsx`
- Modify: `src/features/internal-mx-planning/InternalConsultingPage.tsx`
- Modify: `src/features/dashboard-loja/hooks/useOwnerConsultingProgram.ts`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

**Interfaces:**
- Produces: same journey data with role-specific actions and redaction.

- [ ] **Step 1: escrever teste RED do workspace**

Expect:

```text
three independent progress bars;
Comece por aqui opens the correct lesson;
card label Próximo passo;
Meet button only for valid link;
click journey visit opens central dialog;
blocked visit hides lesson/checklist;
PMR Plus displays Continuação do PMR;
PPA is redacted for unauthorized role.
```

- [ ] **Step 2: implementar timeline**

Each visit shows at most two compact status labels from the approved catalog. Avoid overlapping labels. Use buttons with accessible names.

- [ ] **Step 3: implement workspace**

Structure:

```text
header and program badge;
three progress readings;
Comece por aqui / Próximo passo;
journey timeline;
program details and support;
ConsultingMeetingDialog;
AnticipationDialog / ReviewDialog.
```

- [ ] **Step 4: convert owner page to wrapper**

The Owner wrapper mounts `PlanningWorkspaceProvider shell="owner"` and `ConsultingJourneyWorkspace`. Remove the old placeholder journey and labels `Próximo encontro`.

- [ ] **Step 5: convert internal page to wrapper**

The internal wrapper remains inside `InternalMxPlanningShell` and renders the same workspace with global capabilities.

- [ ] **Step 6: keep summary hook backward-compatible**

`useOwnerConsultingProgram` may delegate to the new repository and return its existing summary shape so dashboard cards outside this route do not regress.

- [ ] **Step 7: tests and commit**

```bash
bun test src/features/consulting-journey src/features/dashboard-loja/hooks/useOwnerConsultingProgram.test.ts src/test/internal-mx-planning-pages.test.ts
npm run typecheck
git add src/features/consulting-journey src/pages/owner/Consultoria.jsx src/features/internal-mx-planning/InternalConsultingPage.tsx src/features/dashboard-loja/hooks/useOwnerConsultingProgram.ts src/test/internal-mx-planning-pages.test.ts
git commit -m "refactor(consulting): share autonomy journey workspace"
```

---

### Task 9: Validar segurança, fluxo e responsividade

**Files:**
- Create: `src/test/consulting-journey-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/consulting-journey.md`

**Interfaces:**
- Produces: evidência funcional, visual and database-level.

- [ ] **Step 1: criar E2E autenticado**

Scenarios:

```text
partial playback resumes;
seek to end does not complete;
90% effective playback completes lesson;
lesson completion updates delivery only;
delivery item starts/completes/reopens;
evidence uploads/replaces/resends and shows feedback;
anticipation blockers list exact pending items;
eligible request persists and updates Próximo passo;
internal role approves/requests adjustment/rejects;
owner cannot approve own request;
Meet opens real link;
PMR Plus preserves history;
Gerente sees delegated action but not PPA content;
internal role sees complete PPA.
```

- [ ] **Step 2: execute all gates**

```bash
supabase db reset
supabase test db supabase/tests/consulting_journey_rls.test.sql
bun test src/features/consulting-journey src/lib/consulting-journey-migration.test.ts
npx playwright test src/test/consulting-journey-shared.playwright.ts
npm run verify:db-types
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: record evidence**

Include RPC names, RLS matrix, test user roles without credentials, visit/lesson IDs, screenshots at 1440/1024/768/390, and zero blocking console/runtime errors.

- [ ] **Step 4: commit**

```bash
git add src/test/consulting-journey-shared.playwright.ts docs/qa/evidence/internal-mx-functional/consulting-journey.md
git commit -m "test(consulting): verify autonomy journey and security"
```
