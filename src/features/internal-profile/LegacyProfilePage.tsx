import { useState, useRef } from 'react'
import { User, Mail, Shield, Save, Camera, LogOut, Key, ChevronRight, ShieldCheck, RefreshCw, X } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy'
import { getAvatarDisplayUrl, uploadUserAvatar } from '@/lib/avatar'

export default function Perfil() {
  const { profile, role, signOut, updateProfile, changePassword } = useAuth()
  const isSeller = role === 'vendedor'
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome não pode ficar vazio.')
      return
    }
    setSaving(true)
    const { error } = await updateProfile({ name: name.trim(), phone: phone.trim() || undefined })
    setSaving(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Perfil atualizado!')
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setUploadingAvatar(true)
    try {
      const avatarUrl = await uploadUserAvatar(profile.id, file)
      const { error: updateError } = await updateProfile({ avatar_url: avatarUrl })
      if (updateError) throw updateError

      toast.success('Avatar atualizado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar avatar.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleChangePassword = async () => {
    if (!isStrongPassword(newPassword)) {
      toast.error(PASSWORD_POLICY_MESSAGE)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    setChangingPassword(true)
    const { error } = await changePassword(newPassword)
    setChangingPassword(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Senha alterada com sucesso!')
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  if (!profile) return null

  return (
    <main id="perfil" className="flex min-h-0 flex-1 flex-col space-y-6 p-6 pb-20 lg:pb-0" aria-label="Meu Perfil">

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-6 shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 bg-brand-primary rounded-full shadow-md" aria-hidden="true" />
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">{isSeller ? 'Minha Conta' : 'Painel de Identidade'}</h1>
          </div>
          <p className="pl-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {isSeller ? 'Dados pessoais, telefone, foto e senha' : 'Gestão de credenciais e segurança MX'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" size="icon" onClick={() => signOut()} className="h-14 w-14 rounded-lg text-status-error border-status-error/20 hover:bg-status-error-surface shadow-sm bg-card">
            <LogOut size={24} />
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-14 px-10 rounded-full shadow-xl">
            {saving ? <RefreshCw className="animate-spin mr-2" /> : <ShieldCheck size={18} className="mr-2" />}
            <span className="text-xs font-black uppercase tracking-widest">{isSeller ? 'Salvar conta' : 'Firmar alterações'}</span>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

        <aside className="lg:col-span-4 flex flex-col gap-6 h-full">
          <div className="rounded-xl border border-border bg-card p-10 md:p-12 flex flex-col items-center text-center group relative overflow-hidden shadow-lg">
            <div className="absolute top-0 left-0 w-full h-4xl bg-brand-secondary z-0 opacity-10" aria-hidden="true" />
            <div className="relative z-10 space-y-6">
              <div className="relative group/avatar inline-block">
                <div className="w-4xl h-4xl rounded-3xl border-8 border-card shadow-xl overflow-hidden bg-muted transition-transform group-hover/avatar:scale-105 duration-500">
                  <img
                    src={getAvatarDisplayUrl(profile.avatar_url, profile.name, { size: 256, background: '4f46e5', color: 'fff' })}
                    alt={`Avatar de ${profile.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2 disabled:opacity-50"
                >
                  {uploadingAvatar ? <RefreshCw size={24} className="animate-spin" /> : <Camera size={24} />}
                  <span className="text-xs font-bold text-white">{uploadingAvatar ? 'Enviando...' : 'ALTERAR'}</span>
                </button>
                <input aria-label="Selecionar arquivo" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="user" onChange={handleAvatarUpload} className="hidden" />
              </div>

              <div>
                <h2 className="text-2xl uppercase tracking-tighter font-black text-foreground">{profile.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge variant="brand" className="px-4 py-1 shadow-sm">
                    <span className="text-xs font-black uppercase">{role} tier</span>
                  </Badge>
                  <div className="w-1.5 h-1.5 rounded-full bg-status-success shadow-sm animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 flex flex-col gap-6 h-full">
          <div className="rounded-xl border border-border bg-card shadow-xl group h-full flex flex-col overflow-hidden">
            <header className="bg-muted/30 border-b border-border p-10 md:p-14 flex flex-row items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-2xl h-2xl rounded-2xl bg-brand-secondary text-white flex items-center justify-center shadow-xl transform rotate-2"><User size={32} /></div>
                <div>
                  <h2 className="text-2xl uppercase tracking-tighter leading-none text-foreground">{isSeller ? 'Minha conta' : 'Configurações de Conta'}</h2>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">
                    {isSeller ? 'Informações usadas na rotina da loja' : 'Sinc: Identity Gateway v4.0'}
                  </p>
                </div>
              </div>
            </header>

            <div className="p-10 md:p-14 space-y-14 flex-1 overflow-y-auto no-scrollbar relative z-10">
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <p className="ml-2 text-xs font-black uppercase tracking-widest leading-none text-muted-foreground">Nome Operacional</p>
                  <Input aria-label="Nome Operacional" value={name} onChange={e => setName(e.target.value)} className="!h-14 px-6 font-bold" />
                </div>
                <div className="space-y-3">
                  <p className="ml-2 text-xs font-black uppercase tracking-widest leading-none text-muted-foreground">E-mail Fixado</p>
                  <Input aria-label="E-mail Fixado" value={profile.email} disabled className="!h-14 px-6 font-bold opacity-50 bg-muted" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <p className="ml-2 text-xs font-black uppercase tracking-widest leading-none text-muted-foreground">Telefone</p>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="!h-14 px-6 font-bold" />
                </div>
                <div className="space-y-3">
                  <p className="ml-2 text-xs font-black uppercase tracking-widest leading-none text-muted-foreground">Cargo</p>
                  <Input aria-label="Cargo" value={role || ''} disabled className="!h-14 px-6 font-bold opacity-50 bg-muted capitalize" />
                </div>
              </div>

              <div className="pt-14 border-t border-border space-y-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 text-brand-primary flex items-center justify-center shadow-inner border border-indigo-100"><ShieldCheck size={20} /></div>
                  <p className="text-xs font-black uppercase tracking-widest text-brand-primary">
                    {isSeller ? 'Segurança da minha conta' : 'Segurança & Criptografia MX'}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div
                    className="rounded-xl border border-border bg-muted/50 p-6 flex items-center justify-between group/sec cursor-pointer hover:bg-card hover:shadow-lg transition-all"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-xl w-xl rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover/sec:text-brand-primary transition-colors shadow-sm"><Key size={20} /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-foreground">Alterar Senha</span>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground opacity-30 group-hover/sec:translate-x-1 transition-all" />
                  </div>

                  <div className="rounded-xl border border-border bg-muted/50 p-6 flex items-center justify-between group/sec">
                    <div className="flex items-center gap-3">
                      <div className="h-xl w-xl rounded-xl bg-card border border-border flex items-center justify-center text-status-success shadow-sm"><ShieldCheck size={20} /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-foreground">Verificação de acesso</span>
                    </div>
                    <Badge variant="success" className="px-4 py-1 rounded-full border-none">
                      <span className="text-xs font-black uppercase">Ativo</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showPasswordModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-password-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPasswordModal(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setShowPasswordModal(false)
          }}
        >
          <div
            role="presentation"
            className="bg-card rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-foreground" id="profile-password-modal-title">Alterar Senha</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="profile-password-modal-new" className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1">Nova Senha</label>
                <Input id="profile-password-modal-new" name="new-password" autoComplete="new-password" type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full" />
              </div>
              <div>
                <label htmlFor="profile-password-modal-confirm" className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1">Confirmar Senha</label>
                <Input id="profile-password-modal-confirm" name="new-password" autoComplete="new-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" className="w-full" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(false)}>Cancelar</Button>
              <Button size="sm" className="bg-brand-primary text-white" onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
