import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Field } from "@/components/molecules/Field";
import { Input } from "@/components/atoms/Input";
import { Checkbox } from "@/components/atoms/Checkbox";
import * as React from "react";

afterEach(() => {
  cleanup();
});

describe("Field (FASE L — 12.011/12.017)", () => {
  test("conecta Label via htmlFor e HelperText/FieldError via aria-describedby", () => {
    render(
      <Field
        id="seller-name"
        label="Nome"
        required
        helperText="Como aparece na carteira"
        error="Nome obrigatório"
      >
        {(control) => <Input {...control} />}
      </Field>,
    );

    const input = screen.getByLabelText(/Nome/);
    expect(input).toHaveAttribute("aria-required", "true");
    // Helper e error estão ambos anexados como descrição (12.017).
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const ids = describedBy.split(" ").filter(Boolean);
    expect(ids).toContain("seller-name-helper");
    expect(ids).toContain("seller-name-error");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const helper = document.getElementById("seller-name-helper");
    const error = document.getElementById("seller-name-error");
    expect(helper).toHaveTextContent("Como aparece na carteira");
    expect(error).toHaveTextContent("Nome obrigatório");
    expect(error?.getAttribute("role")).toBe("alert");
  });

  test("sem erro, aria-invalid fica ausente e helper segue como única descrição", () => {
    render(
      <Field id="city" label="Cidade" helperText="Cidade de atuação">
        {(control) => <Input {...control} />}
      </Field>,
    );

    const input = screen.getByLabelText("Cidade");
    expect(input.getAttribute("aria-describedby")).toBe("city-helper");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  test("preserva aria-describedby externo e acrescenta helper/error", () => {
    render(
      <Field id="phone" label="Telefone" error="Inválido" aria-describedby="phone-hint">
        {(control) => <Input {...control} />}
      </Field>,
    );

    const input = screen.getByLabelText(/Telefone/);
    expect(input.getAttribute("aria-describedby")).toBe("phone-hint phone-error");
  });

  test("funciona com controle de escolha (Checkbox) preservando a aria do controle", () => {
    render(
      <Field id="terms" label="Aceito os termos" error="É necessário aceitar" required>
        {(control) => <Checkbox {...control} />}
      </Field>,
    );

    const checkbox = document.getElementById("terms") as HTMLButtonElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute("aria-required")).toBe("true");
    const describedBy = checkbox?.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("terms-error");
    expect(checkbox?.getAttribute("aria-invalid")).toBe("true");
  });

  test("id não informado é gerado e consistente entre label, controle, helper e error", () => {
    render(
      <Field label="Sem id" helperText="Ajuda" error="Erro">
        {(control) => <Input {...control} />}
      </Field>,
    );

    const input = screen.getByLabelText("Sem id");
    const id = input.id;
    expect(id.length).toBeGreaterThan(0);
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain(`${id}-helper`);
    expect(describedBy).toContain(`${id}-error`);
  });
});
