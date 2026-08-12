import type { RefObject } from 'react'
import { Mail, Phone, Power, RefreshCw, Save, ShieldAlert, ShieldCheck, Trash2, TrendingUp, User, X } from 'lucide-react'
import { motion } from 'motion/react'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { IconBadge } from '@/components/atoms/IconBadge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card'
import { OptionCard } from '@/components/molecules/OptionCard'
import type { TeamMember } from '@/hooks/useTeam'
import type { MembershipRole, Store } from '@/types/database'

export type EditableTeamMember = TeamMember & {
  previous_store_id?: string | null
}

export function EditMemberModal({
  editingMember,
  editMemberDialogRef,
  onClose,
  onSubmit,
  onChange,
  editableStoreRoles,
  lojas,
  storeId,
  saving,
  pendingConfirmations,
  getDeleteMemberConfirmationKey,
  onDeleteMember,
}: {
  editingMember: EditableTeamMember
  editMemberDialogRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onChange: (next: EditableTeamMember) => void
  editableStoreRoles: MembershipRole[]
  lojas: Store[]
  storeId: string | null
  saving: boolean
  pendingConfirmations: Set<string>
  getDeleteMemberConfirmationKey: (member: EditableTeamMember) => string
  onDeleteMember: (member: EditableTeamMember) => void
}) {
  return (
    <div
      ref={editMemberDialogRef}
      className="fixed inset-0 z-[100] overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-start sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-team-member-title"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl relative z-10 my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[88dvh] flex flex-col"
      >
        <Card className="border-none overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[88dvh] shadow-2xl">
          <CardHeader className="bg-gray-900 border-none text-white p-mx-md sm:p-mx-xl relative shrink-0">
            <div className="absolute top-mx-0 left-mx-0 w-full h-mx-px bg-emerald-600 shadow-mx-glow-brand" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-mx-md">
                <IconBadge variant="emeraldSolid" size="xl">
                  <ShieldCheck size={28} className="text-white" />
                </IconBadge>
                <div>
                  <CardTitle id="edit-team-member-title" className="text-white text-lg sm:text-2xl">
                    Editar integrante
                  </CardTitle>
                  <Typography variant="caption" tone="white" className="opacity-60 block text-mx-nano">
                    Dados de acesso, vínculo e vigência de {editingMember.name}
                  </Typography>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar edição de integrante"
                onClick={onClose}
                className="text-white/40 hover:text-white hover:bg-white/10 rounded-mx-full"
              >
                <X size={20} />
              </Button>
            </div>
          </CardHeader>

          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardContent className="p-mx-md sm:p-mx-xl space-y-mx-lg overflow-y-auto flex-1 overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-name" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-muted-foreground">
                    Nome
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="edit-member-name"
                      name="name"
                      required
                      value={editingMember.name || ''}
                      onChange={e => onChange({ ...editingMember, name: e.target.value.toUpperCase() })}
                      className="w-full h-mx-14 pl-12 pr-4 bg-gray-50 border border-border rounded-2xl text-foreground font-bold uppercase tracking-tight focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-email" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-muted-foreground">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="edit-member-email"
                      name="email"
                      required
                      type="email"
                      value={editingMember.email || ''}
                      onChange={e => onChange({ ...editingMember, email: e.target.value })}
                      className="w-full h-mx-14 pl-12 pr-4 bg-gray-50 border border-border rounded-2xl text-foreground font-bold focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-phone" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-muted-foreground">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="edit-member-phone"
                      name="phone"
                      value={editingMember.phone || ''}
                      onChange={e => onChange({ ...editingMember, phone: e.target.value })}
                      className="w-full h-mx-14 pl-12 pr-4 bg-gray-50 border border-border rounded-2xl text-foreground font-bold focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-role" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-muted-foreground">
                    Papel na loja
                  </label>
                  <select
                    aria-label="Papel na loja"
                    id="edit-member-role"
                    name="role"
                    value={editingMember.role || 'vendedor'}
                    onChange={e => onChange({ ...editingMember, role: e.target.value as MembershipRole })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-border rounded-2xl text-foreground font-bold uppercase focus:outline-none focus:border-emerald-600 transition-all"
                  >
                    {editableStoreRoles.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-mx-tiny">
                  <label htmlFor="edit-member-store" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-muted-foreground">
                    Loja vinculada
                  </label>
                  <select
                    aria-label="Loja vinculada"
                    id="edit-member-store"
                    name="store_id"
                    value={editingMember.store_id || storeId || ''}
                    onChange={e => onChange({ ...editingMember, store_id: e.target.value })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-border rounded-2xl text-foreground font-bold uppercase focus:outline-none focus:border-emerald-600 transition-all"
                  >
                    <option value="">Selecione a loja</option>
                    {lojas.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
                <div className="space-y-mx-tiny">
                  <label htmlFor="started-at" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-muted-foreground">
                    Início da vigência
                  </label>
                  <input
                    aria-label="Início da vigência"
                    id="started-at"
                    name="started_at"
                    type="date"
                    required
                    value={editingMember.started_at || ''}
                    onChange={e => onChange({ ...editingMember, started_at: e.target.value })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-border rounded-2xl text-foreground font-bold focus:outline-none focus:border-emerald-600 transition-all uppercase"
                  />
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="ended-at" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-muted-foreground">
                    Término (Opcional)
                  </label>
                  <input
                    aria-label="Término (Opcional)"
                    id="ended-at"
                    name="ended_at"
                    type="date"
                    value={editingMember.ended_at || ''}
                    onChange={e => onChange({ ...editingMember, ended_at: e.target.value })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-border rounded-2xl text-foreground font-bold focus:outline-none focus:border-emerald-600 transition-all uppercase"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-mx-sm pt-mx-md border-t border-border">
                  <OptionCard
                    title="Usuário ativo"
                    description="Permite acesso ao sistema"
                    icon={<ShieldCheck size={20} />}
                    iconVariant="emerald"
                    name="active"
                    checked={editingMember.active ?? true}
                    onChange={checked => onChange({ ...editingMember, active: checked })}
                  />
                  <OptionCard
                    title="Vigência ativa"
                    description="Conta na lista operacional da loja"
                    icon={<Power size={20} />}
                    iconVariant="emeraldSubtle"
                    name="is_active"
                    checked={Boolean(editingMember.is_active)}
                    onChange={checked => onChange({ ...editingMember, is_active: checked })}
                  />
                  <OptionCard
                    title="Vendas da Gestão / Apoio (Sem Meta Individual)"
                    description="Entra no faturamento e ranking em tempo real, sem meta individual ou comissão da equipe"
                    tooltip="Ative para Gerentes, Donos ou Apoio. As vendas efetuadas por este usuário entram no faturamento total e ranking da loja em tempo real, porém NÃO geram cobrança de meta individual nem afetam o comissionamento da equipe."
                    icon={<TrendingUp size={20} />}
                    iconVariant="emeraldSubtle"
                    name="is_venda_loja"
                    checked={Boolean(editingMember.is_venda_loja)}
                    onChange={checked => onChange({ ...editingMember, is_venda_loja: checked })}
                  />
                  <OptionCard
                    title="Carência MX"
                    description="Ignorar metas do mês vigente"
                    icon={<ShieldAlert size={20} />}
                    iconVariant="amber"
                    name="closing_month_grace"
                    checked={Boolean(editingMember.closing_month_grace)}
                    onChange={checked => onChange({ ...editingMember, closing_month_grace: checked })}
                  />
                </div>
              </div>
            </CardContent>

            <div
              className="p-3 sm:p-mx-lg bg-gray-50 border-t border-border flex items-center justify-between gap-2 shrink-0"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
            >
              <Button
                type="button"
                variant="danger"
                disabled={saving || pendingConfirmations.has(getDeleteMemberConfirmationKey(editingMember))}
                onClick={() => onDeleteMember(editingMember)}
                className="h-11 sm:h-12 px-3 sm:px-6 rounded-xl font-bold uppercase text-xs shrink-0"
              >
                <Trash2 size={16} className="sm:mr-2" />
                <span className="hidden sm:inline">ENCERRAR</span>
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-11 sm:h-12 px-4 flex-1 text-xs font-bold uppercase rounded-xl"
              >
                {saving ? <RefreshCw className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                SALVAR INTEGRANTE
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
