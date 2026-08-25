import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { useAgendaAdminForms } from "@/features/agenda-admin/hooks/useAgendaAdminForms";
import { getSelectableAgendaClients } from "@/features/agenda-admin/modals/VisitaModal";
import type { AgendaClient, AgendaConsultant, AgendaVisit } from "@/hooks/agenda";

afterEach(() => {
  cleanup();
});

const consultants: AgendaConsultant[] = [
  { id: "consultant-1", name: "Joao", email: "joao@example.com" },
];

const visit: AgendaVisit = {
  id: "visit-1",
  client_id: "client-1",
  client_name: "GED Veiculos",
  client_slug: "ged-veiculos",
  client_status: "ativo",
  client_modality: "Presencial",
  visit_number: 6,
  scheduled_at: "2026-05-27T09:00:00-03:00",
  duration_hours: 3,
  modality: "Presencial",
  status: "agendada",
  consultant_id: "consultant-1",
  auxiliary_consultant_id: null,
  objective: "Visita 6/7",
  visit_reason: "Plano de desenvolvimento",
  target_audience: "Gerente",
  product_name: "PMR",
  checklist_data: [],
  feedback_client: null,
  executive_summary: null,
  google_event_id: null,
  google_event_id_central: null,
  google_meet_link: null,
  meta_mensal: null,
  projecao: null,
  leads_mes: null,
  estoque_disponivel: null,
  created_at: "2026-05-26T12:00:00-03:00",
  updated_at: "2026-05-26T12:00:00-03:00",
  consultant: { name: "Joao", email: "joao@example.com" },
};

const ok = async () => ({ error: null });

function AgendaFormsHarness() {
  const [visits, setVisits] = React.useState<AgendaVisit[]>([]);
  const [createdEvent, setCreatedEvent] = React.useState("");
  const forms = useAgendaAdminForms({
    visits,
    consultants,
    canViewAllAgendas: true,
    createVisit: ok,
    updateVisit: ok,
    updateVisitStatus: ok,
    deleteVisit: ok,
    createScheduleEvent: async (payload: unknown) => {
      setCreatedEvent(JSON.stringify(payload));
      return ok();
    },
    updateScheduleEvent: ok,
    deleteScheduleEvent: ok,
    getNextVisitNumber: () => 1,
  });

  return (
    <>
      <button type="button" onClick={() => setVisits([visit])}>Carregar visitas</button>
      <button type="button" onClick={() => forms.handleOpenEditVisit(visit.id)}>Editar visita</button>
      <button type="button" onClick={() => forms.handleOpenBlock(new Date(2026, 5, 23))}>Bloquear dia</button>
      <button
        type="button"
        onClick={() => forms.setEventForm((prev) => ({
          ...prev,
          responsible_user_id: "consultant-1",
          responsible_name: "Joao",
        }))}
      >
        Relacionar consultor
      </button>
      <button type="button" onClick={() => forms.handleSubmitEvent({ preventDefault: () => undefined } as React.FormEvent)}>Salvar evento</button>
      <span data-testid="editing-visit-id">{forms.editingVisitId || "none"}</span>
      <span data-testid="editing-client-id">{forms.scheduleForm.client_id || "none"}</span>
      <span data-testid="event-type">{forms.eventForm.event_type}</span>
      <span data-testid="event-title">{forms.eventForm.title}</span>
      <span data-testid="event-date">{forms.eventForm.starts_at}</span>
      <span data-testid="event-responsible">{forms.eventForm.responsible_user_id || "none"}</span>
      <span data-testid="created-event">{createdEvent}</span>
      {forms.showScheduleModal && <div role="dialog">Editar Visita de Consultoria</div>}
    </>
  );
}

describe("useAgendaAdminForms", () => {
  test("opens edit modal with visits loaded after initial render", () => {
    render(<AgendaFormsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Carregar visitas" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar visita" }));

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByTestId("editing-visit-id")).toHaveTextContent("visit-1");
    expect(screen.getByTestId("editing-client-id")).toHaveTextContent("client-1");
  });

  test("requires a consultant when submitting a manual blocked agenda event without a consulting client", async () => {
    render(<AgendaFormsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Bloquear dia" }));

    expect(screen.getByTestId("event-type")).toHaveTextContent("bloqueio");
    expect(screen.getByTestId("event-title")).toHaveTextContent("Agenda bloqueada");
    expect(screen.getByTestId("event-date")).toHaveTextContent("2026-06-23");

    fireEvent.click(screen.getByRole("button", { name: "Salvar evento" }));
    expect(screen.getByTestId("created-event").textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Relacionar consultor" }));
    expect(screen.getByTestId("event-responsible")).toHaveTextContent("consultant-1");

    fireEvent.click(screen.getByRole("button", { name: "Salvar evento" }));

    await screen.findByText(/"event_type":"bloqueio"/);
    expect(screen.getByTestId("created-event")).toHaveTextContent('"title":"Agenda bloqueada"');
    expect(screen.getByTestId("created-event")).toHaveTextContent('"visit_reason":"Agenda bloqueada"');
    expect(screen.getByTestId("created-event")).toHaveTextContent('"responsible_user_id":"consultant-1"');
    expect(screen.getByTestId("created-event")).not.toHaveTextContent("client_id");
  });

  test("keeps consulting clients selectable even when status is not active", () => {
    const clients: AgendaClient[] = [
      { id: "client-1", name: "Agenda Bloqueada", status: "implantacao", current_visit_step: 0 },
    ];

    expect(getSelectableAgendaClients(clients)).toEqual(clients);
  });

  test("loads and handles fora_do_contrato flag when opening and editing visits", () => {
    const extraVisit: AgendaVisit = {
      ...visit,
      id: "visit-extra",
      fora_do_contrato: true,
    };

    let updatedPayload: any = null;
    let formsRef: any = null;

    function TestExtraVisitHarness() {
      const forms = useAgendaAdminForms({
        visits: [extraVisit],
        clients: [{ id: "client-1", name: "GED Veiculos", status: "ativo", current_visit_step: 6, program_template_key: "pmr_hibrido" }],
        programTotalVisits: { pmr_hibrido: 12 },
        consultants,
        canViewAllAgendas: true,
        createVisit: ok,
        updateVisit: async (payload: any) => {
          updatedPayload = payload;
          return ok();
        },
        updateVisitStatus: ok,
        deleteVisit: ok,
        createScheduleEvent: ok,
        updateScheduleEvent: ok,
        deleteScheduleEvent: ok,
        getNextVisitNumber: () => 7,
      });
      formsRef = forms;
      return (
        <button type="button" onClick={() => forms.handleOpenEditVisit("visit-extra")}>
          Abrir Extra
        </button>
      );
    }

    render(<TestExtraVisitHarness />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Abrir Extra" }));
    });

    expect(formsRef.scheduleForm.fora_do_contrato).toBe(true);

    act(() => {
      formsRef.handleSubmitSchedule({ preventDefault: () => undefined } as React.FormEvent);
    });
    expect(updatedPayload).not.toBeNull();
    expect(updatedPayload.fora_do_contrato).toBe(true);
  });
});
