// ─── Serviço Único do Dono Master ─────────────────────────────────────────────
// Fonte única para validar, resolver e reparar a designação Dono Master.
// Usado por: card Dono Master, checklist de ativação, ação Corrigir.
//
// A identidade canônica é UserProfile.id (referenciada por RoleGrant.user_profile_id).
// O validador busca o usuário no filtro por client_account_id E diretamente por ID,
// para cobrir o caso de usuário reutilizado cujo client_account_id não foi atualizado.

import { base44 } from '@/api/base44Client';

const VALID_USER_STATUSES = ['EM_PREPARACAO', 'CONVITE_PENDENTE', 'CONVIDADO', 'ATIVO'];
const INVITE_PENDING_STATUSES = ['EM_PREPARACAO', 'CONVITE_PENDENTE', 'CONVIDADO'];

export async function resolveClientOwnerMaster(clientAccountId) {
  try {
    const roleGrants = await base44.entities.RoleGrant.filter({ client_account_id: clientAccountId }).catch(() => []);

    const activeOwnerGrants = roleGrants.filter(rg =>
      rg.role === 'DONO_MASTER' &&
      rg.status === 'ATIVO' &&
      (!rg.valid_until || new Date(rg.valid_until) >= new Date())
    );

    if (activeOwnerGrants.length > 1) {
      return {
        status: 'DUPLICATE_MASTER',
        clientAccountId,
        grants: activeOwnerGrants,
        inconsistencies: activeOwnerGrants.map(g => ({ grantId: g.id, userProfileId: g.user_profile_id })),
        repairAction: 'RECONCILE_DUPLICATE',
        updatedAt: new Date().toISOString(),
      };
    }

    if (activeOwnerGrants.length === 0) {
      const donoSocioGrants = roleGrants.filter(rg => rg.role === 'DONO_SOCIO' && rg.status === 'ATIVO');
      return {
        status: donoSocioGrants.length > 0 ? 'OWNER_ROLE_MISSING' : 'NOT_CONFIGURED',
        clientAccountId,
        donoSocioGrants,
        repairAction: donoSocioGrants.length > 0 ? 'DEFINE_MASTER' : 'CREATE_OWNER',
        updatedAt: new Date().toISOString(),
      };
    }

    const grant = activeOwnerGrants[0];

    // 1. Tentar encontrar o usuário no filtro por client_account_id
    const users = await base44.entities.UserProfile.filter({ client_account_id: clientAccountId }).catch(() => []);
    let ownerUser = users.find(u => u.id === grant.user_profile_id);

    // 2. Se não encontrado, buscar diretamente pelo ID (usuário reutilizado de outro cliente)
    if (!ownerUser && grant.user_profile_id) {
      ownerUser = await base44.entities.UserProfile.get(grant.user_profile_id).catch(() => null);
    }

    if (!ownerUser) {
      return {
        status: 'USER_NOT_FOUND',
        clientAccountId,
        grant,
        inconsistencies: [`RoleGrant ${grant.id} referencia user_profile_id "${grant.user_profile_id}" mas nenhum UserProfile foi encontrado`],
        repairAction: 'RECONCILE_REFERENCE',
        updatedAt: new Date().toISOString(),
      };
    }

    // 3. Verificar se o usuário pertence ao cliente correto
    if (ownerUser.client_account_id && ownerUser.client_account_id !== clientAccountId) {
      return {
        status: 'WRONG_CLIENT',
        clientAccountId,
        user: ownerUser,
        grant,
        inconsistencies: [`UserProfile ${ownerUser.id} pertence ao cliente ${ownerUser.client_account_id}, não ao cliente ${clientAccountId}`],
        repairAction: 'REASSIGN_USER',
        updatedAt: new Date().toISOString(),
      };
    }

    // 4. Verificar status do usuário
    if (!VALID_USER_STATUSES.includes(ownerUser.status)) {
      return {
        status: 'USER_INACTIVE',
        clientAccountId,
        user: ownerUser,
        grant,
        inconsistencies: [`Status do usuário é ${ownerUser.status}`],
        repairAction: 'ACTIVATE_USER',
        updatedAt: new Date().toISOString(),
      };
    }

    const isInvitePending = INVITE_PENDING_STATUSES.includes(ownerUser.status);

    return {
      status: 'VALID',
      clientAccountId,
      user: {
        id: ownerUser.id,
        name: ownerUser.full_name,
        email: ownerUser.email,
        phone: ownerUser.phone,
        status: ownerUser.status,
        declared_function: ownerUser.declared_function,
      },
      ownerRoleGrant: {
        id: grant.id,
        userId: grant.user_profile_id,
        roleCode: grant.role,
        status: grant.status,
        isPrimary: grant.is_primary,
      },
      masterDesignation: {
        id: grant.id,
        referencedUserId: grant.user_profile_id,
        status: grant.status,
      },
      isInvitePending,
      inconsistencies: [],
      repairAction: null,
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      status: 'TECHNICAL_ERROR',
      clientAccountId,
      error: String(e?.message || e),
      inconsistencies: [String(e?.message || e)],
      repairAction: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── Reparação idempotente do vínculo do Dono Master ──────────────────────────
// Corrige referências inconsistentes sem criar usuários novos.
export async function repairClientOwnerMasterReference({ clientAccountId }) {
  const before = await resolveClientOwnerMaster(clientAccountId);

  if (before.status === 'VALID') {
    return { repaired: false, reason: 'Nenhuma correção necessária. Vínculo já reconciliado.', before, after: before };
  }

  // WRONG_CLIENT: o usuário existe mas pertence a outro client_account_id → corrigir
  if (before.status === 'WRONG_CLIENT' && before.user) {
    const previousClientId = before.user.client_account_id;
    await base44.entities.UserProfile.update(before.user.id, { client_account_id: clientAccountId });
    await base44.entities.AuditLog.create({
      user_name: 'Administrador MX',
      user_role: 'ADMINISTRADOR_IMPLANTACAO',
      client_account_id: clientAccountId,
      resource: 'UserProfile',
      action: 'OWNER_MASTER_REPAIR_REASSIGN',
      resource_id: before.user.id,
      value_before: JSON.stringify({ client_account_id: previousClientId, user_profile_id: before.user.id }),
      value_after: JSON.stringify({ client_account_id: clientAccountId, user_profile_id: before.user.id }),
      origin: 'Reparação automática — Vínculo do Dono Master',
      environment: 'PROTOTIPO',
    });
    const after = await resolveClientOwnerMaster(clientAccountId);
    return {
      repaired: after.status === 'VALID',
      before,
      after,
      reason: after.status === 'VALID'
        ? `client_account_id do usuário corrigido de "${previousClientId}" para "${clientAccountId}".`
        : `Correção parcial — status final: ${after.status}.`,
    };
  }

  // USER_NOT_FOUND: a referência existe mas o usuário não foi encontrado — diagnóstico apenas
  if (before.status === 'USER_NOT_FOUND') {
    return {
      repaired: false,
      before,
      reason: `Referência quebrada: RoleGrant ${before.grant?.id} referencia user_profile_id "${before.grant?.user_profile_id}" que não existe. Reconciliação manual necessária.`,
    };
  }

  return { repaired: false, before, reason: `Status ${before.status} não possui reparação automática configurada.` };
}