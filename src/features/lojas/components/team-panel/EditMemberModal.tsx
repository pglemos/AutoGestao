import type { RefObject } from 'react'
import { Mail, Phone, Power, RefreshCw, Save, ShieldAlert, ShieldCheck, Trash2, TrendingUp, User, X } from 'lucide-react'
import { motion } from 'motion/react'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card'
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
    <div ref={editMemberDialogRef} className="fixed inset-0 z-[100] flex items-start justify-center p-mx-md overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="edit-team-member-title">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" />

      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="w-full max-w-2xl relative z-10 my-mx-lg">
        <Card className="border-none overflow-hidden">
          <CardHeader className="bg-gray-900 border-none text-white p-mx-xl relative">
              <div className="absolute top-mx-0 left-mx-0 w-full h-mx-px bg-emerald-600 shadow-mx-glow-brand" />
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-mx-md">
                      <div className="w-mx-14 h-mx-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-sm">
                          <ShieldCheck size={28} className="text-white" />
                      </div>
                      <div>
                          <CardTitle id="edit-team-member-title" className="text-white text-2xl">Editar integrante</CardTitle>
                          <Typography variant="caption" tone="white" className="opacity-60 block text-mx-nano">Dados de acesso, vínculo e vigência de {editingMember.name}</Typography>
                      </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Fechar edição de integrante" onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 rounded-mx-full">
                      <X size={20} />
                  </Button>
              </div>
          </CardHeader>

          <CardContent className="p-mx-xl space-y-mx-lg overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            <form onSubmit={onSubmit} className="space-y-mx-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-name" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-gray-500">Nome</label>
                  <div className="relative">
                    <User size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="edit-member-name"
                      name="name"
                      required
                      value={editingMember.name || ''}
                      onChange={e => onChange({ ...editingMember, name: e.target.value.toUpperCase() })}
                      className="w-full h-mx-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold uppercase tracking-tight focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-email" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-gray-500">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="edit-member-email"
                      name="email"
                      required
                      type="email"
                      value={editingMember.email || ''}
                      onChange={e => onChange({ ...editingMember, email: e.target.value })}
                      className="w-full h-mx-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-phone" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-gray-500">Telefone</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="edit-member-phone"
                      name="phone"
                      value={editingMember.phone || ''}
                      onChange={e => onChange({ ...editingMember, phone: e.target.value })}
                      className="w-full h-mx-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="edit-member-role" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-gray-500">Papel na loja</label>
                  <select aria-label="Papel na loja"
                    id="edit-member-role"
                    name="role"
                    value={editingMember.role || 'vendedor'}
                    onChange={e => onChange({ ...editingMember, role: e.target.value as MembershipRole })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold uppercase focus:outline-none focus:border-brand-primary transition-all"
                  >
                    {editableStoreRoles.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-mx-tiny">
                  <label htmlFor="edit-member-store" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-gray-500">Loja vinculada</label>
                  <select aria-label="Loja vinculada"
                    id="edit-member-store"
                    name="store_id"
                    value={editingMember.store_id || storeId || ''}
                    onChange={e => onChange({ ...editingMember, store_id: e.target.value })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold uppercase focus:outline-none focus:border-brand-primary transition-all"
                  >
                    <option value="">Selecione a loja</option>
                    {lojas.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-mx-md">
                <div className="space-y-mx-tiny">
                  <label htmlFor="started-at" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-gray-500">Início da vigência</label>
                  <input aria-label="Início da vigência"
                    id="started-at"
                    name="started_at"
                    type="date" required
                    value={editingMember.started_at || ''}
                    onChange={e => onChange({ ...editingMember, started_at: e.target.value })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-brand-primary transition-all uppercase"
                  />
                </div>
                <div className="space-y-mx-tiny">
                  <label htmlFor="ended-at" className="px-2 text-mx-tiny font-bold uppercase tracking-mx-widest text-gray-500">Término (Opcional)</label>
                  <input aria-label="Término (Opcional)"
                    id="ended-at"
                    name="ended_at"
                    type="date"
                    value={editingMember.ended_at || ''}
                    onChange={e => onChange({ ...editingMember, ended_at: e.target.value })}
                    className="w-full h-mx-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-brand-primary transition-all uppercase"
                  />
                </div>

                <div className="col-span-2 space-y-mx-sm pt-mx-md border-t border-gray-200">
                  <label className="flex items-center justify-between p-mx-md rounded-2xl bg-gray-50 border border-gray-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-center gap-mx-md">
                      <div className="w-mx-10 h-mx-10 rounded-2xl bg-status-success-surface text-status-success flex items-center justify-center border border-status-success/10"><ShieldCheck size={20} /></div>
                      <div className="space-y-0.5">
                        <Typography variant="h3" className="text-sm tracking-tight">Usuário ativo</Typography>
                        <Typography variant="caption" tone="muted" className="text-mx-nano">Permite acesso ao sistema</Typography>
                      </div>
                    </div>
                    <input type="checkbox" name="active" checked={editingMember.active ?? true} onChange={e => onChange({ ...editingMember, active: e.target.checked })} className="w-mx-sm h-mx-sm rounded-xl accent-status-success cursor-pointer" />
                  </label>
                  <label className="flex items-center justify-between p-mx-md rounded-2xl bg-gray-50 border border-gray-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-center gap-mx-md">
                      <div className="w-mx-10 h-mx-10 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600"><Power size={20} /></div>
                      <div className="space-y-0.5">
                        <Typography variant="h3" className="text-sm tracking-tight">Vigência ativa</Typography>
                        <Typography variant="caption" tone="muted" className="text-mx-nano">Conta na lista operacional da loja</Typography>
                      </div>
                    </div>
                    <input type="checkbox" name="is_active" checked={editingMember.is_active} onChange={e => onChange({ ...editingMember, is_active: e.target.checked })} className="w-mx-sm h-mx-sm rounded-xl accent-brand-primary cursor-pointer" />
                  </label>

                  <label className="flex items-center justify-between p-mx-md rounded-2xl bg-gray-50 border border-gray-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-center gap-mx-md">
                      <div className="w-mx-10 h-mx-10 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600"><TrendingUp size={20} /></div>
                      <div className="space-y-0.5">
                        <Typography variant="h3" className="text-sm tracking-tight">Venda loja</Typography>
                        <Typography variant="caption" tone="muted" className="text-mx-nano">Conta como indicador operacional da unidade</Typography>
                      </div>
                    </div>
                    <input type="checkbox" name="is_venda_loja" checked={editingMember.is_venda_loja ?? false} onChange={e => onChange({ ...editingMember, is_venda_loja: e.target.checked })} className="w-mx-sm h-mx-sm rounded-xl accent-brand-primary cursor-pointer" />
                  </label>

                  <label className="flex items-center justify-between p-mx-md rounded-2xl bg-gray-50 border border-gray-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-center gap-mx-md">
                      <div className="w-mx-10 h-mx-10 rounded-2xl bg-status-warning-surface text-status-warning border border-status-warning/10"><ShieldAlert size={20} /></div>
                      <div className="space-y-0.5">
                        <Typography variant="h3" className="text-sm tracking-tight">Carência MX</Typography>
                        <Typography variant="caption" tone="muted" className="text-mx-nano">Ignorar metas do mês vigente</Typography>
                      </div>
                    </div>
                    <input type="checkbox" name="closing_month_grace" checked={editingMember.closing_month_grace} onChange={e => onChange({ ...editingMember, closing_month_grace: e.target.checked })} className="w-mx-sm h-mx-sm rounded-xl accent-status-warning cursor-pointer" />
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-mx-sm">
                <Button
                  type="button"
                  variant="danger"
                  disabled={saving || pendingConfirmations.has(getDeleteMemberConfirmationKey(editingMember))}
                  onClick={() => onDeleteMember(editingMember)}
                  className="h-mx-16 sm:w-mx-40 rounded-2xl font-bold uppercase tracking-mx-wide text-xs shadow-sm"
                >
                  <Trash2 size={18} className="mr-2" />
                  ENCERRAR
                </Button>
                <Button
                  type="submit" disabled={saving}
                  className="h-mx-16 flex-1 text-xs"
                >
                  {saving ? <RefreshCw className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
                  SALVAR INTEGRANTE
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
