import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TabNavPill, type TabNavPillItem } from "@/components/molecules/TabNavPill";
import * as React from "react";
import { Zap } from "lucide-react";

afterEach(() => {
  cleanup();
});

const TABS: TabNavPillItem[] = [
  { key: "diario", label: "Diário" },
  { key: "semanal", label: "Semanal" },
  { key: "mensal", label: "Mensal" },
  { key: "ajustes", label: "Ajustes", badge: 3 },
];

describe("TabNavPill", () => {
  test("renderiza o tablist nomeado e preserva os atributos ARIA existentes", () => {
    render(<TabNavPill tabs={TABS} activeTab="diario" onTabChange={() => {}} aria-label="Período da rotina" />);

    expect(screen.getByRole("tablist", { name: "Período da rotina" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Diário" }).getAttribute("role")).toBe("tab");
    expect(screen.getByRole("tab", { name: "Diário" }).getAttribute("aria-selected")).toBe("true");
  });

  test("preserva mobileLabel, ícone e badge por aba", () => {
    render(
      <TabNavPill
        tabs={[
          { key: "resumo", label: "Resumo Executivo", mobileLabel: "Resumo", icon: Zap },
          { key: "ajustes", label: "Ajustes", badge: 3 },
        ]}
        activeTab="resumo"
        onTabChange={() => {}}
      />
    );

    const resumo = screen.getByRole("tab", { name: /resumo/i });
    expect(resumo.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("3")).toBeDefined();
  });

  test("FASE J: roving tabindex — apenas a aba ativa está na ordem de tabulação", () => {
    render(<TabNavPill tabs={TABS} activeTab="diario" onTabChange={() => {}} />);

    expect(screen.getByRole("tab", { name: "Diário" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("tab", { name: /Ajustes/ }).getAttribute("tabindex")).toBe("-1");
  });

  test("FASE J: setas direcionais movem a seleção e o foco (roving, controlled)", () => {
    function Harness() {
      const [active, setActive] = React.useState<string>("diario");
      return <TabNavPill tabs={TABS} activeTab={active as never} onTabChange={setActive} />;
    }
    render(<Harness />);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Diário" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Semanal" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Semanal" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Semanal" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Diário" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Semanal" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Diário" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Semanal" }), { key: "End" });
    expect(screen.getByRole("tab", { name: /Ajustes/ })).toHaveFocus();
    expect(screen.getByRole("tab", { name: /Ajustes/ }).getAttribute("aria-selected")).toBe("true");
  });

  test("FASE J: entrada por Tab só cai na aba ativa (demais -1)", () => {
    const { container } = render(<TabNavPill tabs={TABS} activeTab="mensal" onTabChange={() => {}} />);

    const tabIndexes = Array.from(container.querySelectorAll('[role="tab"]')).map(
      (el) => el.getAttribute("tabindex")
    );
    expect(tabIndexes.filter((v) => v === "0").length).toBe(1);
    expect(tabIndexes.filter((v) => v === "-1").length).toBe(TABS.length - 1);
  });

  test("preserva o clique com mouse (controlled)", () => {
    let selected = "";
    const { rerender } = render(
      <TabNavPill tabs={TABS} activeTab="diario" onTabChange={(key) => { selected = key; }} />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Mensal" }));
    expect(selected).toBe("mensal");

    rerender(<TabNavPill tabs={TABS} activeTab="mensal" onTabChange={(key) => { selected = key; }} />);
    expect(screen.getByRole("tab", { name: "Mensal" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Diário" }).getAttribute("tabindex")).toBe("-1");
  });
});
