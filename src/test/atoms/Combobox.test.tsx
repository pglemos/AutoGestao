import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Combobox } from "@/components/atoms/Combobox";
import * as React from "react";

afterEach(() => {
  cleanup();
});

const OPTIONS = [
  { value: "vendas", label: "Vendas" },
  { value: "crm", label: "CRM" },
  { value: "marketing", label: "Marketing" },
];

describe("Combobox (FASE L — 12.004)", () => {
  test("renderiza trigger com role combobox e valor selecionado", () => {
    render(<Combobox label="Selecionar área" value="crm" onValueChange={() => {}} options={OPTIONS} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("CRM")).toBeInTheDocument();
  });

  test("abre a lista ao clicar e filtra por busca", async () => {
    render(<Combobox label="Selecionar área" value={undefined} onValueChange={() => {}} options={OPTIONS} />);

    const trigger = screen.getByRole("combobox", { name: "Selecionar área" });
    await act(async () => {
      fireEvent.click(trigger);
    });
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Selecionar área" })).toHaveAttribute("data-state", "open"),
    );

    const input = screen.getByPlaceholderText("Buscar...") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "mar" } });
    });

    await waitFor(() => expect(screen.getByText("Marketing")).toBeInTheDocument());
    expect(screen.queryByText("Vendas")).not.toBeInTheDocument();
  });

  test("seleciona item e notifica onValueChange", async () => {
    let selected: string | undefined;
    const onChange = (value: string) => { selected = value };
    render(<Combobox label="Selecionar área" value={selected} onValueChange={onChange} options={OPTIONS} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("combobox", { name: "Selecionar área" }));
    });
    await waitFor(() => expect(screen.getByText("Vendas")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("Vendas"));
    });
    expect(selected).toBe("vendas");
  });

  test("mostra estado vazio quando não há correspondência", async () => {
    render(<Combobox label="Selecionar área" value={undefined} onValueChange={() => {}} options={OPTIONS} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("combobox", { name: "Selecionar área" }));
    });
    await waitFor(() => expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument());
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "zzz" } });
    });

    expect(screen.getByText("Nenhum resultado encontrado.")).toBeInTheDocument();
  });
});
