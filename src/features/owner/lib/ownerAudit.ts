import { base44 } from "@/api/base44Client";

type OwnerAuditUser = {
  id?: string | null
  full_name?: string | null
  email?: string | null
}

type OwnerAuditInput = {
  companyId?: string | null
  user?: OwnerAuditUser | null
  entityType?: string | null
  entityId?: string | null
  eventType?: string | null
  previousStatus?: string | null
  newStatus?: string | null
  notes?: string | null
}

type AuditEventEntity = {
  create: (payload: Record<string, string>) => Promise<unknown>
}

// Registra um evento de auditoria vinculado à empresa. A entidade permanece
// opcional no adapter de dados: falha de telemetria não interrompe a mutação
// principal do Dono.
export const logAudit = async ({
  companyId,
  user,
  entityType,
  entityId,
  eventType,
  previousStatus,
  newStatus,
  notes,
}: OwnerAuditInput) => {
  if (!companyId || !entityId) return null;
  try {
    const auditEvent = (base44.entities as unknown as { AuditEvent: AuditEventEntity }).AuditEvent
    return await auditEvent.create({
      company_id: companyId,
      actor_user_id: user?.id || "",
      actor_name: user?.full_name || (user?.id ? "Usuário" : "Sistema"),
      entity_type: entityType || "",
      entity_id: entityId,
      event_type: eventType || "",
      previous_status: previousStatus || "",
      new_status: newStatus || "",
      notes: notes || "",
    });
  } catch (e) {
    return null;
  }
};
