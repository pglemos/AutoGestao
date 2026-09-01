export type ClientDetailDataHealth = "loading" | "error" | "ready";

export type ClientDetailAttentionInput = {
  blockerCount: number;
  warningCount: number;
  overdueVisitCount: number;
  overdueActionCount?: number | null;
  actionPlanError?: boolean;
  missingDataCount?: number | null;
  staleDataCount?: number | null;
  dataHealth: ClientDetailDataHealth;
};

export type ClientDetailAttentionSummary = {
  count: number;
  items: string[];
  detail: string;
};

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Converte sinais de fontes diferentes em uma leitura operacional única.
 * Valores desconhecidos (`null`) não viram falsos zeros enquanto a fonte ainda
 * está carregando ou falhou.
 */
export function buildClientAttentionSummary(
  input: ClientDetailAttentionInput,
): ClientDetailAttentionSummary {
  const overdueActionCount = input.overdueActionCount ?? 0;
  const missingDataCount = input.missingDataCount ?? 0;
  const staleDataCount = input.staleDataCount ?? 0;
  const items: string[] = [];

  if (input.blockerCount > 0)
    items.push(
      countLabel(
        input.blockerCount,
        "bloqueio de ativação",
        "bloqueios de ativação",
      ),
    );
  if (input.warningCount > 0)
    items.push(
      countLabel(
        input.warningCount,
        "ajuste de configuração",
        "ajustes de configuração",
      ),
    );
  if (input.overdueVisitCount > 0)
    items.push(
      countLabel(
        input.overdueVisitCount,
        "encontro atrasado",
        "encontros atrasados",
      ),
    );
  if (overdueActionCount > 0)
    items.push(
      countLabel(overdueActionCount, "ação atrasada", "ações atrasadas"),
    );
  if (input.actionPlanError) items.push("Plano de ação indisponível");
  if (missingDataCount > 0)
    items.push(
      countLabel(
        missingDataCount,
        "fonte sem dados recebidos",
        "fontes sem dados recebidos",
      ),
    );
  if (staleDataCount > 0)
    items.push(
      countLabel(
        staleDataCount,
        "fonte desatualizada",
        "fontes desatualizadas",
      ),
    );
  if (input.dataHealth === "error")
    items.push("Integridade de dados indisponível");

  const count =
    input.blockerCount +
    input.warningCount +
    input.overdueVisitCount +
    overdueActionCount +
    (input.actionPlanError ? 1 : 0) +
    missingDataCount +
    staleDataCount +
    (input.dataHealth === "error" ? 1 : 0);

  const detail = items.length
    ? `${items.slice(0, 2).join(" · ")}${items.length > 2 ? ` · +${items.length - 2} outro${items.length - 2 === 1 ? "" : "s"}` : ""}.`
    : input.dataHealth === "loading"
      ? "Verificando as fontes de dados do cliente."
      : "Nenhuma pendência operacional identificada.";

  return { count, items, detail };
}

export type ClientDetailNextActionKey =
  | "ativacao"
  | "jornada"
  | "plano-acao"
  | "dados"
  | "planejamento"
  | "implantacao";

export type ClientDetailNextAction = {
  key: ClientDetailNextActionKey;
  label: string;
  detail: string;
};

export type ClientDetailNextActionInput = {
  requiresActivation: boolean;
  clientIsActive: boolean;
  blockerCount: number;
  overdueVisitCount: number;
  overdueActionCount?: number | null;
  actionPlanError?: boolean;
  missingDataCount?: number | null;
  staleDataCount?: number | null;
  dataHealth: ClientDetailDataHealth;
  strategicPlanPendingCount?: number | null;
  warningCount: number;
  journeyIncomplete: boolean;
  totalVisits: number;
};

/** Escolhe a única ação que deve liderar a leitura atual da ficha. */
export function resolveClientNextAction(
  input: ClientDetailNextActionInput,
): ClientDetailNextAction {
  const overdueActionCount = input.overdueActionCount ?? 0;
  const missingDataCount = input.missingDataCount ?? 0;
  const staleDataCount = input.staleDataCount ?? 0;
  const strategicPlanPendingCount = input.strategicPlanPendingCount ?? 0;

  if (input.requiresActivation) {
    return {
      key: "ativacao",
      label: input.clientIsActive ? "Revisar ativação" : "Validar e ativar",
      detail:
        input.blockerCount > 0
          ? `${countLabel(input.blockerCount, "bloqueio", "bloqueios")} ${input.blockerCount === 1 ? "impede" : "impedem"} a ativação. Revise a implantação.`
          : "Confira o checklist de prontidão antes de liberar a operação.",
    };
  }

  if (input.overdueVisitCount > 0) {
    return {
      key: "jornada",
      label: "Revisar jornada atrasada",
      detail: `${countLabel(input.overdueVisitCount, "encontro atrasado", "encontros atrasados")} ${input.overdueVisitCount === 1 ? "precisa" : "precisam"} de uma decisão.`,
    };
  }

  if (overdueActionCount > 0) {
    return {
      key: "plano-acao",
      label: "Revisar plano de ação",
      detail: `${countLabel(overdueActionCount, "ação atrasada", "ações atrasadas")} ${overdueActionCount === 1 ? "precisa" : "precisam"} de revisão.`,
    };
  }

  if (input.actionPlanError) {
    return {
      key: "plano-acao",
      label: "Verificar Plano de Ação",
      detail:
        "A leitura do plano falhou; tente atualizar antes de tomar uma decisão.",
    };
  }

  if (input.dataHealth === "error") {
    return {
      key: "dados",
      label: "Verificar integridade dos dados",
      detail: "A checagem não terminou; tente carregar as fontes novamente.",
    };
  }

  if (missingDataCount > 0 || staleDataCount > 0) {
    return {
      key: "dados",
      label:
        missingDataCount > 0
          ? "Completar fontes de dados"
          : "Revisar fontes desatualizadas",
      detail:
        "Abra Dados para identificar a origem e a última leitura de cada fonte.",
    };
  }

  if (strategicPlanPendingCount > 0) {
    return {
      key: "planejamento",
      label: "Revisar Plano Estratégico",
      detail: `${countLabel(strategicPlanPendingCount, "meta", "metas")} ainda não foram publicadas.`,
    };
  }

  if (input.warningCount > 0) {
    return {
      key: "implantacao",
      label: "Revisar implantação",
      detail: `${countLabel(input.warningCount, "ajuste informativo", "ajustes informativos")} ${input.warningCount === 1 ? "aguarda" : "aguardam"} revisão.`,
    };
  }

  if (input.journeyIncomplete && input.totalVisits > 0) {
    return {
      key: "jornada",
      label: "Abrir próxima etapa",
      detail: "Acompanhe o próximo encontro previsto da jornada.",
    };
  }

  return {
    key: "plano-acao",
    label: "Abrir Plano de Ação",
    detail: "Consulte as ações que mantêm a operação do cliente em movimento.",
  };
}
