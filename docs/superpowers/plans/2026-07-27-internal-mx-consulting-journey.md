# Consulting Autonomy Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a Consultoria compartilhada com jornada, modal central, Aula e Visão Geral, Entrega, Evidências, participantes, progresso real de vídeo, Google Meet, antecipação e confidencialidade PMR/PMR Plus/PPA.

**Architecture:** O frontend consumirá um snapshot seguro por loja e RPCs transacionais para progresso, entrega, participantes, evidências e antecipação. Estruturas existentes de clientes, visitas, aulas, evidências e agenda serão reutilizadas. Cinco tabelas portuguesas e aditivas armazenarão somente os estados ausentes: progresso efetivo de aula, itens de entrega, participantes do encontro e solicitações/histórico de antecipação.

**Tech Stack:** React 19, TypeScript 5.8, Radix Dialog/Tabs/Progress, Supabase PostgreSQL 17/RLS/RPC/Realtime/Storage, YouTube IFrame Player API quando aplicável, Bun Test, Testing Library, Playwright.

## Global Constraints

- Texto da interface: `Próximo passo`, não `Próximo encontro` no card de orientação.
- Clique no encontro abre modal central, não drawer lateral.
- Abas finais: `Aula e Visão Geral`, `Entrega`, `Evidências`.
- Não existe aba `Ações` nem aba separada `Progresso`.
- `Assistir aula` abre a aula real.
- Aula obrigatória conclui somente com pelo menos 90% de segundos efetivamente reproduzidos.
- Avançar a posição do vídeo não aumenta segundos efetivamente reproduzidos.
- Progresso salva a cada cinco segundos e em pause, troca de aba, fechamento, saída e ended.
- Aula concluída atualiza Entrega, mas não conclui o encontro.
- Participantes obrigatórios possuem confirmação persistida por encontro.
- Google Meet usa somente `google_meet_link` real.
- Somente o próximo encontro elegível pode ser antecipado, salvo liberação interna.
- Solicitação em análise pode ser cancelada pelo solicitante; revisão é exclusiva dos perfis internos autorizados.
- PMR Plus preserva histórico e não reinicia progresso.
- PPA completo é restrito a Dono/sócio autorizado, Consultor e perfis internos MX; delegação não libera conteúdo estratégico.
- Reutilizar `evidencias_visita`, `universidade_aulas`, `eventos_agenda_consultoria`, `clientes_consultoria` e `visitas_consultoria`.
- Não criar tabelas em inglês duplicando o domínio português.
- Não expor `visitas_consultoria` diretamente a papéis de loja; usar RPC segura.
- Evidências usam Storage e `evidencias_visita`, sem segunda tabela de arquivos.
- Nenhuma alteração de tema global neste plano.

---

## Mapa de arquivos

### Banco, segurança e tipos

- Create: `supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql`
- Create: `src/lib/consulting-journey-migration.test.ts`
- Create: `supabase/tests/consulting_journey_rls.test.sql`
- Modify: `src/types/database.generated.ts`

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
- Create: `src/features/consulting-journey/components/ParticipantDialog.test.tsx`

### Wrappers e evidência

- Modify: `src/pages/owner/Consultoria.jsx`
- Modify: `src/features/internal-mx-planning/InternalConsultingPage.tsx`
- Modify: `src/features/dashboard-loja/hooks/useOwnerConsultingProgram.ts`
- Modify: `src/features/planning-workspace/usePlanningRealtime.ts`
- Modify: `src/features/planning-workspace/usePlanningRealtime.test.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`
- Create: `src/test/consulting-journey-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/consulting-journey.md`

---

### Task 1: Especificar regras puras

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

- [ ] **Step 2: escrever RED de Entrega**

```ts
expect(calculateDeliveryProgress([
  { required: true, status: 'completed' },
  { required: true, status: 'pending' },
  { required: false, status: 'pending' },
])).toEqual({ completedRequired: 1, totalRequired: 2, percentage: 50 })
```

- [ ] **Step 3: escrever RED de antecipação e PPA**

Cover:

```text
aula obrigatória pendente bloqueia;
item obrigatório pendente bloqueia;
participante obrigatório não confirmado bloqueia;
evidência obrigatória ausente bloqueia;
solicitação ativa bloqueia nova solicitação;
perfil interno pode revisar;
Dono não aprova a própria solicitação;
Gerente delegado vê ação, mas não PPA completo.
```

- [ ] **Step 4: executar RED**

Run: `bun test src/features/consulting-journey/consultingJourneyRules.test.ts`

- [ ] **Step 5: implementar tipos**

```ts
export type ConsultingProgramKey = 'pmr' | 'pmr_plus' | 'ppa' | string
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed'
export type DeliveryItemStatus = 'pending' | 'in_progress' | 'completed' | 'reopened'
export type EvidenceStatus = 'pending' | 'sent' | 'under_review' | 'approved' | 'returned'
export type AnticipationStatus = 'draft' | 'under_review' | 'approved' | 'date_adjustment_requested' | 'rejected' | 'cancelled'

export type ConsultingParticipant = {
  id: string
  visitId: string
  participantKey: string
  userId: string | null
  name: string
  roleLabel: string | null
  required: boolean
  confirmed: boolean
  confirmedAt: string | null
  note: string | null
}
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
- Produces: cinco tabelas portuguesas e RPCs de snapshot, progresso, entrega, participantes, antecipação e evidências.

- [ ] **Step 1: escrever teste RED do contrato SQL**

```ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const path = 'supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql'

test('cria apenas estruturas portuguesas ausentes', () => {
  const sql = readFileSync(path, 'utf8')
  for (const table of [
    'consultoria_progresso_aula',
    'consultoria_itens_entrega',
    'consultoria_participantes_encontro',
    'consultoria_solicitacoes_antecipacao',
    'consultoria_historico_antecipacao',
  ]) expect(sql).toContain(`public.${table}`)

  for (const forbidden of ['consulting_lessons', 'lesson_progress', 'meeting_preparations', 'anticipation_requests']) {
    expect(sql).not.toContain(forbidden)
  }
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/lib/consulting-journey-migration.test.ts`

- [ ] **Step 3: criar progresso de aula**

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

- [ ] **Step 4: criar itens de entrega**

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

- [ ] **Step 5: criar participantes do encontro**

```sql
CREATE TABLE IF NOT EXISTS public.consultoria_participantes_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  participant_key text NOT NULL,
  user_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  participant_name text NOT NULL,
  role_label text,
  required boolean NOT NULL DEFAULT true,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id, participant_key)
);
```

`participant_key` must be deterministic: `user:<uuid>` for system users or `contact:<normalized identifier>` for external participants.

- [ ] **Step 6: criar antecipação e histórico**

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

- [ ] **Step 7: criar índices e publicar Realtime**

Required:

```text
progress by store/user/lesson;
delivery by visit/status/sort_order;
participants by visit/required/confirmed;
one active anticipation request per visit using partial unique index;
anticipation by store/status/created_at.
```

Add all five tables to `supabase_realtime` only when absent.

- [ ] **Step 8: implementar `save_consulting_lesson_progress`**

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
) RETURNS jsonb
```

Rules:

```text
authorize internal MX or user linked to store;
clamp delta to 0..10 seconds per call;
never derive played seconds from position;
cap played at duration;
calculate percentage;
set completed_at only at >=90%;
complete linked lesson delivery item;
do not complete visit.
```

- [ ] **Step 9: implementar snapshot e Entrega**

RPCs:

```text
get_consulting_journey_workspace(p_store_id uuid) returns jsonb;
set_consulting_delivery_item_status(p_item_id uuid, p_status text, p_note text) returns jsonb;
assign_consulting_delivery_item(p_item_id uuid, p_responsible_user_id uuid) returns jsonb.
```

The snapshot returns program, journey, safe visit details, lesson/materials, delivery items, participants, evidence metadata, next step, Meet link and active anticipation. PPA is redacted server-side for unauthorized roles.

- [ ] **Step 10: implementar participantes**

RPC:

```text
confirm_consulting_participant(
  p_participant_id uuid,
  p_confirmed boolean,
  p_note text
) returns jsonb.
```

Rules:

```text
linked owner or internal role may confirm;
actor/date are recorded;
required confirmations feed delivery progress;
confirmation does not mark attendance or visit completion;
attendance remains in aula_presencas after the meeting.
```

- [ ] **Step 11: implementar antecipação completa**

RPCs:

```text
request_consulting_anticipation(
  p_visit_id uuid,
  p_reason text,
  p_modality text,
  p_proposed_dates jsonb,
  p_notes text,
  p_participants_confirmed boolean
) returns jsonb;

review_consulting_anticipation(
  p_request_id uuid,
  p_status text,
  p_approved_scheduled_at timestamptz,
  p_review_note text
) returns jsonb;

cancel_consulting_anticipation(
  p_request_id uuid
) returns jsonb.
```

Request validation:

```text
exactly three distinct future proposed dates;
all required delivery items complete;
all required participants confirmed;
required evidence sent/approved per template;
no critical pending item;
previous visit completed/validated when applicable;
visit is next eligible unless internal override;
no active request;
program active;
allowed modality.
```

Review rules:

```text
only internal MX roles;
requester cannot review own request;
approved requires approved date;
approval updates the same visit scheduled_at and agenda/Meet integration;
all state changes append history;
cancel only while under_review and by requester/internal role.
```

- [ ] **Step 12: implementar evidências sobre estrutura existente**

RPCs or existing secure operations must cover:

```text
create_consulting_evidence_metadata;
replace_consulting_evidence_metadata;
remove_consulting_evidence when allowed;
resubmit_consulting_evidence;
review_consulting_evidence.
```

Files use the existing Supabase Storage bucket/policy. Metadata stays in `evidencias_visita`. Do not create a second evidence table.

- [ ] **Step 13: RLS and grants**

```text
revoke direct INSERT/UPDATE/DELETE from authenticated on the five new tables;
reads through safe RPC when direct SELECT would expose internal content;
revoke all RPC execution from PUBLIC/anon;
grant execute to authenticated;
internal roles manage all stores;
owner/store role can read safe snapshot and mutate own allowed records;
owner cannot approve anticipation;
Gerente/Vendedor never receive full PPA.
```

- [ ] **Step 14: pgTAP**

Test:

```text
anon denied;
user outside store denied;
owner can read safe snapshot and save own progress;
owner can confirm participants and request/cancel anticipation;
owner cannot review anticipation;
internal roles can manage all stores;
PPA redaction for gerente;
played delta clamped;
90% completes lesson only;
seek does not complete;
three future dates required;
duplicate active request blocked.
```

- [ ] **Step 15: local validation and commit**

```bash
supabase db reset
bun test src/lib/consulting-journey-migration.test.ts
supabase test db supabase/tests/consulting_journey_rls.test.sql
git add supabase/migrations/20260727170000_consultoria_autonomia_assistida.sql src/lib/consulting-journey-migration.test.ts supabase/tests/consulting_journey_rls.test.sql
git commit -m "feat(consulting): persist autonomy journey state"
```

---

### Task 3: Regenerar tipos e criar repositório

**Files:**
- Modify: `src/types/database.generated.ts`
- Create: `src/features/consulting-journey/consultingJourneyRepository.ts`
- Create: `src/features/consulting-journey/consultingJourneyRepository.test.ts`

**Interfaces:**
- Produces: repositório tipado com leitura e todas as mutações aprovadas.

- [ ] **Step 1: regenerar tipos**

```bash
npm run gen:db-types
npm run verify:db-types
```

- [ ] **Step 2: escrever RED do mapping**

```ts
test('mapeia próximo passo, participantes e Meet sem expor registros internos', async () => {
  const repository = createConsultingJourneyRepository(fakeSupabase(rpcPayload))
  const result = await repository.load({ storeId: 'store-1' })
  expect(result.nextStep.meetLink).toBe('https://meet.google.com/abc-defg-hij')
  expect(result.program.visits).toHaveLength(12)
  expect(result.program.visits[0].participants[0].required).toBe(true)
})
```

- [ ] **Step 3: testar todos os métodos**

Repository methods:

```text
load;
saveLessonProgress;
updateDeliveryItem;
assignDeliveryItem;
confirmParticipant;
uploadEvidence;
replaceEvidence;
removeEvidence;
resubmitEvidence;
reviewEvidence;
requestAnticipation;
reviewAnticipation;
cancelAnticipation.
```

- [ ] **Step 4: implementar com cliente injetável**

```ts
export function createConsultingJourneyRepository(client = supabase): ConsultingJourneyRepository { /* typed methods */ }
export const consultingJourneyRepository = createConsultingJourneyRepository()
```

Storage upload flow:

```text
validate file type/size;
upload to deterministic store/client/visit path;
call metadata RPC;
remove newly uploaded object if metadata transaction fails;
replace object only after new metadata succeeds;
never expose service-role key to browser.
```

- [ ] **Step 5: GREEN e commit**

```bash
bun test src/features/consulting-journey/consultingJourneyRepository.test.ts
npm run typecheck
git add src/types/database.generated.ts src/features/consulting-journey/consultingJourneyRepository.ts src/features/consulting-journey/consultingJourneyRepository.test.ts
git commit -m "feat(consulting): add typed journey repository"
```

---

### Task 4: Criar controller e Realtime

**Files:**
- Create: `src/features/consulting-journey/useConsultingJourney.ts`
- Create: `src/features/consulting-journey/useConsultingJourney.test.tsx`
- Modify: `src/features/planning-workspace/usePlanningRealtime.ts`
- Modify: `src/features/planning-workspace/usePlanningRealtime.test.tsx`

**Interfaces:**
- Produces: `ConsultingJourneyController`.

- [ ] **Step 1: atualizar fontes Realtime**

```ts
consulting: [
  'clientes_consultoria',
  'visitas_consultoria',
  'evidencias_visita',
  'eventos_agenda_consultoria',
  'solicitacoes_consultoria',
  'consultoria_progresso_aula',
  'consultoria_itens_entrega',
  'consultoria_participantes_encontro',
  'consultoria_solicitacoes_antecipacao',
]
```

- [ ] **Step 2: escrever RED do controller**

Cover:

```text
sem storeId não consulta;
loading/error/empty;
openMeeting selects visit and opens modal;
lesson progress updates snapshot;
completion updates lesson item, not visit;
participant confirmation updates eligibility;
evidence mutation refreshes only consulting scope;
request/cancel/review anticipation updates next step;
Realtime burst reconciles once.
```

- [ ] **Step 3: implementar assinatura**

```ts
export function useConsultingJourney(options?: {
  repository?: ConsultingJourneyRepository
}): ConsultingJourneyController
```

Expose snapshot, load state, selected visit, dialog/tab state and every repository mutation.

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/consulting-journey/useConsultingJourney.test.tsx src/features/planning-workspace/usePlanningRealtime.test.tsx
git add src/features/consulting-journey/useConsultingJourney.ts src/features/consulting-journey/useConsultingJourney.test.tsx src/features/planning-workspace/usePlanningRealtime.ts src/features/planning-workspace/usePlanningRealtime.test.tsx
git commit -m "feat(consulting): add shared journey controller"
```

---

### Task 5: Implementar player com progresso efetivo

**Files:**
- Create: `src/features/consulting-journey/components/ConsultingVideoPlayer.tsx`
- Create: `src/features/consulting-journey/components/ConsultingVideoPlayer.test.tsx`

**Interfaces:**
- Produces: `ConsultingVideoPlayer`, `ConsultingPlayerAdapter`.

- [ ] **Step 1: escrever RED com player fake**

```text
starts at saved position;
five timer ticks submit delta=5;
seek from 10 to 590 submits zero played seconds;
pause flushes pending delta;
tab change/unmount flushes;
ended flushes and preserves completed state;
replay does not clear completedAt.
```

- [ ] **Step 2: implementar adapter**

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

Use YouTube IFrame API only for YouTube URLs; native video uses the same contract.

- [ ] **Step 3: implementar accumulator**

Accumulate wall-clock seconds only while playing. Flush at most 5 seconds per interval and the remaining partial interval on lifecycle events. Never calculate delta from seek distance.

- [ ] **Step 4: accessibility and GREEN**

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
- Create: `src/features/consulting-journey/components/ParticipantDialog.test.tsx`
- Create: `src/features/consulting-journey/components/ConsultingMeetingDialog.test.tsx`

**Interfaces:**
- Produces: modal central acessível com participantes persistidos.

- [ ] **Step 1: escrever RED das abas**

```tsx
renderMeetingDialog()
expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Aula e Visão Geral', 'Entrega', 'Evidências'])
expect(screen.queryByRole('tab', { name: 'Ações' })).not.toBeInTheDocument()
expect(screen.queryByRole('tab', { name: 'Progresso' })).not.toBeInTheDocument()
```

- [ ] **Step 2: testar Aula e Visão Geral**

Player first, files/materials below, visit/program/phase/pillar/modality/date/consultant/participants/status/objective/result/anticipation. Hide player block if no video.

- [ ] **Step 3: testar participantes**

```text
required badge;
confirmation persisted;
unconfirm/reconfirm when allowed;
note and actor/date;
confirmation changes anticipation blockers;
does not mark attendance.
```

- [ ] **Step 4: testar Entrega**

Each item shows requirement, status, responsible, due date and note. Actions: start, complete, comment, assign, reopen and upload/link when allowed.

- [ ] **Step 5: testar Evidências**

Support file/image/spreadsheet/PDF/link/text/note, statuses, view, replace, remove when allowed, resend and feedback.

- [ ] **Step 6: implementar modal**

```text
Radix Dialog;
max-width ~1100 px desktop;
max-height 90vh;
internal scroll;
focus trap and Escape;
full screen mobile;
journey remains mounted behind.
```

- [ ] **Step 7: GREEN e commit**

```bash
bun test src/features/consulting-journey/components/ConsultingMeetingDialog.test.tsx src/features/consulting-journey/components/ParticipantDialog.test.tsx
npm run typecheck
git add src/features/consulting-journey/components
git commit -m "feat(consulting): add central meeting workspace"
```

---

### Task 7: Implementar antecipação e revisão

**Files:**
- Create: `src/features/consulting-journey/components/AnticipationDialog.tsx`
- Create: `src/features/consulting-journey/components/AnticipationReviewDialog.tsx`
- Create: `src/features/consulting-journey/components/AnticipationDialog.test.tsx`

**Interfaces:**
- Produces: request/cancel flow for store roles and review flow for internal roles.

- [ ] **Step 1: escrever RED de bloqueios**

```text
button disabled with blockers;
blocker list names each item;
optional items do not block;
unconfirmed required participant blocks;
active request blocks duplicate;
only next eligible visit can be requested.
```

- [ ] **Step 2: escrever RED do formulário**

Fields:

```text
encontro;
data atual;
motivo;
modalidade;
exactly three future dates;
observações;
confirmation of participants.
```

- [ ] **Step 3: escrever RED de cancel/review**

```text
requester can cancel under_review;
requester cannot cancel approved/rejected;
internal role can approve/request adjustment/reject;
requester cannot review own request;
approval requires date.
```

- [ ] **Step 4: implementar, GREEN and commit**

```bash
bun test src/features/consulting-journey/components/AnticipationDialog.test.tsx
git add src/features/consulting-journey/components/AnticipationDialog.tsx src/features/consulting-journey/components/AnticipationReviewDialog.tsx src/features/consulting-journey/components/AnticipationDialog.test.tsx
git commit -m "feat(consulting): add anticipation workflow"
```

---

### Task 8: Montar jornada e wrappers

**Files:**
- Create: `src/features/consulting-journey/ConsultingJourneyWorkspace.tsx`
- Create: `src/features/consulting-journey/ConsultingJourneyWorkspace.test.tsx`
- Create: `src/features/consulting-journey/components/ConsultingJourneyTimeline.tsx`
- Modify: `src/pages/owner/Consultoria.jsx`
- Modify: `src/features/internal-mx-planning/InternalConsultingPage.tsx`
- Modify: `src/features/dashboard-loja/hooks/useOwnerConsultingProgram.ts`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

**Interfaces:**
- Produces: same journey data with role-specific actions/redaction.

- [ ] **Step 1: escrever RED do workspace**

Expect:

```text
three independent progress readings;
Comece por aqui opens correct lesson;
card says Próximo passo;
Meet appears only for valid link;
journey visit opens central dialog;
blocked visit hides lesson/checklist;
PMR Plus says Continuação do PMR;
PPA is redacted for unauthorized role.
```

- [ ] **Step 2: implementar timeline**

Each visit shows at most two compact status labels; no overlap. Use accessible buttons.

- [ ] **Step 3: implementar workspace**

```text
header/program badge;
three progress readings;
Comece por aqui / Próximo passo;
journey timeline;
program details/support;
meeting dialog;
anticipation request/review dialogs.
```

- [ ] **Step 4: converter página do Dono**

Mount `PlanningWorkspaceProvider shell="owner"` and shared workspace. Remove placeholder journey and every visible `Próximo encontro` label from this page.

- [ ] **Step 5: converter página interna**

Keep `InternalMxPlanningShell`, render the same workspace with global capabilities.

- [ ] **Step 6: manter resumo backward-compatible**

`useOwnerConsultingProgram` may delegate to the new repository but must preserve its current summary shape for dashboard consumers.

- [ ] **Step 7: GREEN e commit**

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
- Produces: evidência funcional, visual e de banco.

- [ ] **Step 1: criar E2E autenticado**

Scenarios:

```text
partial playback resumes;
seek to end does not complete;
90% effective playback completes lesson;
lesson completion updates delivery only;
participant confirmation persists and updates blockers;
delivery item starts/completes/reopens;
evidence uploads/replaces/resends and shows feedback;
anticipation blockers list exact items;
eligible request persists and updates Próximo passo;
requester cancels under_review;
internal role approves/requests adjustment/rejects;
owner cannot review own request;
Meet opens real link;
PMR Plus preserves history;
Gerente sees delegated action but not PPA content;
internal role sees complete PPA.
```

- [ ] **Step 2: executar gates**

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

- [ ] **Step 3: registrar evidência**

Include RPCs, RLS matrix, roles without credentials, visit/lesson IDs, screenshots 1440/1024/768/390 and zero blocking console/runtime errors.

- [ ] **Step 4: commit**

```bash
git add src/test/consulting-journey-shared.playwright.ts docs/qa/evidence/internal-mx-functional/consulting-journey.md
git commit -m "test(consulting): verify autonomy journey and security"
```
