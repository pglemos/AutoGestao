import React, { useState, useEffect, useRef } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { motion, AnimatePresence } from 'motion/react'
import { UserPlus, Mail, Lock, User, Shield, Phone, X, RefreshCw, CheckCircle2, Building2, Zap, Sparkles, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { toast } from '@/lib/toast'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy'
import type { RegisterUserInput } from '@/hooks/useTeam'
import type { Store, UserRole } from '@/types/database'

import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { OptionCard } from '@/components/molecules/OptionCard'
import { TransferConfirmationDialog, type TransferConfirmationData } from '@/features/lojas/components/team-panel/TransferConfirmationDialog'

const papeisInternosMx = ['administrador_geral', 'administrador_mx', 'consultor_mx']
const todayISO = () => new Date().toISOString().slice(0, 10)

const rotulosPapel: Record<string, string> = {
  administrador_mx: 'Administrador MX',
  consultor_mx: 'Consultor MX',
  dono: 'Dono da loja',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

interface UserCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  registerUser: (data: RegisterUserInput) => Promise<{
    success?: boolean
    error?: string
    code?: string
    existingUser?: {
      id: string
      name: string
      email: string
      current_store_id: string | null
      current_store_name: string
    }
  }>
  storeId?: string
  lojas?: Store[]
}

type UserCreationForm = {
  name: string
  email: string
  password: string
  role: UserRole
  store_id: string
  phone: string
  started_at: string
  ended_at: string
  is_active: boolean
  closing_month_grace: boolean
  is_venda_loja: boolean
}

export function UserCreationModal({ isOpen, onClose, onSuccess, registerUser, storeId: initialStoreId, lojas }: UserCreationModalProps) {
  const { role: currentUserRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [transferData, setTransferData] = useState<TransferConfirmationData | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, isOpen)

  // Escape fecha modal (Story 3.12 — WCAG 2.1 AA §2.1.2)
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (transferData) setTransferData(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, transferData])

  const [formData, setFormData] = useState<UserCreationForm>({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
    store_id: (initialStoreId === 'all' ? '' : initialStoreId) || '',
    phone: '',
    started_at: todayISO(),
    ended_at: '',
    is_active: true,
    closing_month_grace: false,
    is_venda_loja: false,
  })

  const papelSelecionadoInterno = papeisInternosMx.includes(formData.role)

  const handleConfirmTransfer = async () => {
    setLoading(true)
    const payload = papelSelecionadoInterno
      ? { ...formData, store_id: undefined, ended_at: formData.ended_at || null, confirm_transfer: true }
      : { ...formData, ended_at: formData.ended_at || null, confirm_transfer: true }

    const result = await registerUser(payload)
    if (result.success) {
      toast.success('Integrante transferido e vinculado com sucesso.')
      setTimeout(() => {
        setLoading(false)
        setTransferData(null)
        onSuccess()
        onClose()
      }, 1000)
    } else {
      setLoading(false)
      toast.error(result.error || 'Não foi possível concluir a transferência.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!papelSelecionadoInterno && !formData.store_id) return toast.error('Selecione uma unidade operacional')
    if (!isStrongPassword(formData.password)) return toast.error(PASSWORD_POLICY_MESSAGE)
    
    setLoading(true)
    const payload = papelSelecionadoInterno
      ? { ...formData, store_id: undefined, ended_at: formData.ended_at || null }
      : { ...formData, ended_at: formData.ended_at || null }

    const result = await registerUser(payload)
    
    if (result.success) {
      toast.success('Integrante criado com sucesso.')
      setTimeout(() => {
        setLoading(false)
        onSuccess()
        onClose()
      }, 1000)
    } else if (result.code === 'EXISTS_IN_OTHER_STORE' && result.existingUser) {
      setLoading(false)
      const targetStore = lojas?.find(l => l.id === formData.store_id)?.name
      setTransferData({
        existingUser: result.existingUser,
        targetStoreName: targetStore,
        onConfirm: handleConfirmTransfer,
      })
    } else {
      setLoading(false)
      toast.error(result.error || 'Falha ao criar integrante.')
    }
  }

  const allowedRoles = React.useMemo(() => {
    if (currentUserRole === 'administrador_geral') return ['administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor']
    if (isAdministradorMx(currentUserRole)) return ['consultor_mx', 'dono', 'gerente', 'vendedor']
    if (currentUserRole === 'dono') return ['gerente', 'vendedor']
    if (currentUserRole === 'gerente') return ['vendedor']
    return []
  }, [currentUserRole])

  return (
    <AnimatePresence>
      {isOpen && (
        <div ref={dialogRef} className="fixed inset-0 z-[110] flex items-center justify-center p-mx-lg overflow-hidden" role="dialog" aria-modal="true" aria-label="Criar novo integrante">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-gray-50/80 backdrop-blur-md" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 40 }} 
            className="w-full max-w-6xl relative z-10"
          >
            <div className="relative w-full bg-white/90 backdrop-blur-2xl border border-gray-200 rounded-mx-4xl shadow-sm overflow-hidden">
              <div className="absolute top-mx-0 left-mx-0 w-full h-mx-xs bg-gradient-to-r from-emerald-600/50 via-emerald-600 to-emerald-600/50" />
            
              <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col lg:flex-row max-h-[85vh] w-full overflow-hidden">
                {/* Sidebar Context */}
                <div className="w-full lg:w-mx-sidebar-expanded shrink-0 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-200 p-mx-lg flex flex-col justify-between relative overflow-y-auto lg:overflow-hidden">
                    <div className="space-y-mx-lg relative z-10">
                        <div className="w-mx-20 h-mx-20 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-600 shadow-sm">
                            <UserPlus size={40} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-mx-xs">
                            <Typography variant="h2" className="text-3xl tracking-tighter">Novo <span className="text-emerald-600">Integrante</span></Typography>
                            <Typography variant="tiny" tone="muted" className="leading-relaxed">Cadastro completo de acesso, vínculo e vigência operacional na loja.</Typography>
                        </div>

                        <div className="space-y-mx-md pt-mx-lg">
                            <div className="flex items-center gap-mx-sm">
                                <div className="w-mx-10 h-mx-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shadow-sm"><ShieldCheck size={20} /></div>
                                <Typography variant="tiny" tone="muted" className="text-mx-nano">Acesso ao sistema</Typography>
                            </div>
                            <div className="flex items-center gap-mx-sm">
                                <div className="w-mx-10 h-mx-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shadow-sm"><Sparkles size={20} /></div>
                                <Typography variant="tiny" tone="muted" className="text-mx-nano">Vínculo com a loja</Typography>
                            </div>
                            <div className="flex items-center gap-mx-sm">
                                <div className="w-mx-10 h-mx-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-amber-600 shadow-sm"><Zap size={20} /></div>
                                <Typography variant="tiny" tone="muted" className="text-mx-nano">Senha provisória obrigatória</Typography>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 pt-mx-lg">
                        <button type="button" onClick={onClose} className="group flex items-center gap-mx-sm text-gray-500 hover:text-emerald-600 transition-colors">
                            <X size={20} />
                            <Typography variant="tiny" className="">CANCELAR</Typography>
                        </button>
                    </div>
                </div>

                {/* Main Form Fields */}
                <div className="flex-1 p-mx-lg lg:p-mx-xl space-y-mx-xl bg-white overflow-y-auto max-h-[85vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
                        {/* Nome */}
                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1 truncate">Nome completo</Typography>
                          <div className="relative group">
                            <User size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 transition-colors" />
                            <input 
                              id="new-user-name"
                              name="new_user_name"
                              autoComplete="off"
                              required placeholder="NOME COMPLETO" 
                              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                              className="w-full h-mx-14 pl-12 pr-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold uppercase tracking-mx-widest text-xs focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all placeholder:text-gray-500/50"
                            />
                          </div>
                        </div>

                        {/* Telefone */}
                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1">Telefone / WhatsApp</Typography>
                          <div className="relative group">
                            <Phone size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 transition-colors" />
                            <input 
                              id="new-user-phone"
                              name="new_user_phone"
                              autoComplete="off"
                              required placeholder="(00) 00000-0000" 
                              value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                              className="w-full h-mx-14 pl-12 pr-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all placeholder:text-gray-500/50"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1">E-mail de acesso</Typography>
                          <div className="relative group">
                            <Mail size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 transition-colors" />
                            <input 
                              id="new-user-email"
                              name="new_user_email"
                              autoComplete="off"
                              required type="email" placeholder="USUARIO@MX PERFORMANCE.COM" 
                              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                              className="w-full h-mx-14 pl-12 pr-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all placeholder:text-gray-500/50"
                            />
                          </div>
                        </div>

                        {/* Senha */}
                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1 truncate">Senha provisória</Typography>
                          <div className="relative group">
                            <Lock size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 transition-colors" />
                            <input 
                              id="new-user-password"
                              name="new_user_password"
                              autoComplete="new-password"
                              required
                              minLength={6}
                              pattern=".{6,}"
                              type="password" placeholder="MÍN. 6 CARACTERES"
                              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                              className="w-full h-mx-14 pl-12 pr-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all placeholder:text-gray-500/50"
                            />
                          </div>
                        </div>

                        {/* Hierarquia */}
                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1">Papel na loja</Typography>
                          <div className="relative group">
                            <Shield size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 transition-colors z-10 pointer-events-none" />
                            <select
                              aria-label="Papel na loja"
                              id="new-user-role"
                              name="role"
                              value={formData.role} 
                              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                              className="w-full h-mx-14 pl-12 pr-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold uppercase tracking-mx-widest text-mx-nano focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                              {allowedRoles.map(role => (
                                <option key={role} value={role} className="bg-white text-gray-800">
                                  {(rotulosPapel[role] || role).toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Unidade */}
                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1">Loja vinculada</Typography>
                          <div className="relative group">
                            <Building2 size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 transition-colors z-10 pointer-events-none" />
                            <select
                              aria-label="Loja vinculada"
                              id="new-user-store"
                              name="store_id"
                              value={formData.store_id} 
                              onChange={e => setFormData({...formData, store_id: e.target.value})}
                              disabled={(!!initialStoreId && initialStoreId !== 'all') && !isAdministradorMx(currentUserRole)}
                              className="w-full h-mx-14 pl-12 pr-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold uppercase tracking-mx-widest text-mx-nano focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-40"
                            >
                              <option value="" className="bg-white text-gray-500/40">
                                {papelSelecionadoInterno ? 'SEM UNIDADE OBRIGATÓRIA' : 'SELECIONE A UNIDADE'}
                              </option>
                              {lojas?.map(store => (
                                <option key={store.id} value={store.id} className="bg-white text-gray-800">{store.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1">Início da vigência</Typography>
                          <input aria-label="Início da vigência"
                            id="new-user-started-at"
                            name="started_at"
                            type="date"
                            required={!papelSelecionadoInterno && formData.role === 'vendedor'}
                            value={formData.started_at}
                            onChange={e => setFormData({...formData, started_at: e.target.value})}
                            disabled={papelSelecionadoInterno || formData.role !== 'vendedor'}
                            className="w-full h-mx-14 px-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all disabled:opacity-40"
                          />
                        </div>

                        <div className="space-y-mx-xs">
                          <Typography variant="tiny" tone="muted" className="px-1">Fim da vigência</Typography>
                          <input aria-label="Fim da vigência"
                            id="new-user-ended-at"
                            name="ended_at"
                            type="date"
                            value={formData.ended_at}
                            onChange={e => setFormData({...formData, ended_at: e.target.value})}
                            disabled={papelSelecionadoInterno || formData.role !== 'vendedor'}
                            className="w-full h-mx-14 px-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 font-bold focus:outline-none focus:border-emerald-600/50 focus:bg-white transition-all disabled:opacity-40"
                          />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-mx-md">
                      <OptionCard
                        title="Operacional ativo"
                        checked={formData.is_active}
                        onChange={checked => setFormData({ ...formData, is_active: checked })}
                        disabled={papelSelecionadoInterno || formData.role !== 'vendedor'}
                      />
                      <OptionCard
                        title="Vendas da Gestão / Apoio (Sem Meta)"
                        tooltip="Ative para Gerentes, Donos ou integrantes de apoio que fazem vendas. As vendas entram no faturamento total e ranking em tempo real, sem gerar cobrança de meta individual ou alterar comissões da equipe."
                        checked={formData.is_venda_loja}
                        onChange={checked => setFormData({ ...formData, is_venda_loja: checked })}
                        disabled={papelSelecionadoInterno}
                      />
                      <OptionCard
                        title="Carência no mês"
                        checked={formData.closing_month_grace}
                        onChange={checked => setFormData({ ...formData, closing_month_grace: checked })}
                        disabled={papelSelecionadoInterno || formData.role !== 'vendedor'}
                      />
                    </div>

                    <div className="pt-mx-md">
                        <button 
                            type="submit" disabled={loading} 
                            className="w-full h-mx-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold uppercase tracking-mx-widest text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-mx-sm relative overflow-hidden group/btn"
                        >
                            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500 skew-x-12" />
                            {loading ? <RefreshCw className="animate-spin" /> : <Zap size={24} className="fill-white" />}
                            CRIAR INTEGRANTE
                        </button>
                        <Typography variant="tiny" tone="muted" className="mt-mx-md text-center opacity-40">
                            O usuário será criado com acesso, vínculo e regras operacionais da loja selecionada.
                        </Typography>
                    </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      <TransferConfirmationDialog
        data={transferData}
        isOpen={!!transferData}
        onClose={() => setTransferData(null)}
        loading={loading}
      />
    </AnimatePresence>
  )
}
