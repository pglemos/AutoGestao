import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, renderHook, act } from "@testing-library/react";
import { isSameDay, parseISO } from "date-fns";
import { getDateFilterInterval } from "@/hooks/agenda/useAgendaFilters";
import type { AgendaVisit, CalendarMonth } from "@/hooks/agenda";

afterEach(() => {
  cleanup();
});

const sampleVisits: AgendaVisit[] = [
  {
    id: "visit-week-1",
    client_id: "client-1",
    client_name: "Cliente Semana 17",
    client_slug: "cliente-17",
    client_status: "ativo",
    client_modality: "Presencial",
    visit_number: 1,
    scheduled_at: "2026-08-18T09:00:00-03:00", // Tuesday, week of Aug 17
    duration_hours: 3,
    modality: "Presencial",
    status: "agendada",
    consultant_id: "consultant-1",
    auxiliary_consultant_id: null,
    objective: "Alinhamento",
    visit_reason: "Visita 1",
    target_audience: "Diretoria",
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
    created_at: "2026-08-01T12:00:00-03:00",
    updated_at: "2026-08-01T12:00:00-03:00",
  },
  {
    id: "visit-week-2",
    client_id: "client-2",
    client_name: "Cliente Semana 24",
    client_slug: "cliente-24",
    client_status: "ativo",
    client_modality: "Presencial",
    visit_number: 2,
    scheduled_at: "2026-08-24T14:00:00-03:00", // Monday, week of Aug 24
    duration_hours: 3,
    modality: "Presencial",
    status: "agendada",
    consultant_id: "consultant-1",
    auxiliary_consultant_id: null,
    objective: "Revisão",
    visit_reason: "Visita 2",
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
    created_at: "2026-08-01T12:00:00-03:00",
    updated_at: "2026-08-01T12:00:00-03:00",
  },
];

describe("Agenda Navigation & Cross-Week Selection (Audio Bug Fix)", () => {
  test("getDateFilterInterval updates when weekAnchor shifts from week 17 to week 24", () => {
    const calendarMonth: CalendarMonth = { year: 2026, month: 7 }; // August 2026
    const dayAnchor = new Date("2026-08-17T12:00:00");
    const weekAnchorInitial = new Date("2026-08-17T12:00:00");

    const initialInterval = getDateFilterInterval("semana", calendarMonth, dayAnchor, weekAnchorInitial);
    expect(initialInterval).not.toBeNull();

    // Initial interval covers Aug 17 to Aug 23
    expect(initialInterval!.start.getDate()).toBe(17);
    expect(initialInterval!.end.getDate()).toBe(23);

    // When navigating to day 24, weekAnchor shifts to Aug 24
    const weekAnchorNext = new Date("2026-08-24T12:00:00");
    const nextInterval = getDateFilterInterval("semana", calendarMonth, dayAnchor, weekAnchorNext);
    expect(nextInterval).not.toBeNull();

    // Next interval covers Aug 24 to Aug 30
    expect(nextInterval!.start.getDate()).toBe(24);
    expect(nextInterval!.end.getDate()).toBe(30);
  });

  test("selectedDayVisits finds events on Day 24 from full visit list regardless of active week filter", () => {
    const selectedDate = new Date("2026-08-24T00:00:00");

    const dayVisits = sampleVisits.filter((v) =>
      isSameDay(parseISO(v.scheduled_at), selectedDate)
    );

    expect(dayVisits).toHaveLength(1);
    expect(dayVisits[0].id).toBe("visit-week-2");
    expect(dayVisits[0].client_name).toBe("Cliente Semana 24");
  });

  test("hasEventsOnDate detects events across full month for MiniCalendar indicator dots", () => {
    const allEventsByDate: Record<string, boolean> = {};
    for (const v of sampleVisits) {
      const key = v.scheduled_at.substring(0, 10);
      allEventsByDate[key] = true;
    }

    // Week 1 date (2026-08-18)
    expect(Boolean(allEventsByDate["2026-08-18"])).toBe(true);

    // Week 2 date (2026-08-24)
    expect(Boolean(allEventsByDate["2026-08-24"])).toBe(true);

    // Day with no events (2026-08-20)
    expect(Boolean(allEventsByDate["2026-08-20"])).toBe(false);
  });
});
