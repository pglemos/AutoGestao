import { Camera, Key, LogOut, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { getAvatarDisplayUrl } from '@/lib/avatar'
import { MxField, MxModuleHeader, MxModulePage, MxSectionCard, MxSectionHeader, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useInternalProfileController } from './hooks/useInternalProfileController'

export function InternalProfilePage() {
  const state = useInternalProfileController()
  if (!state.profile) return null
  return (
    <MxModulePage id="internal-profile">
      <MxModuleHeader eyebrow="Conta" title="Meu Perfil" description="Dados pessoais, foto e segurança da conta MX." actions={<><Button variant="managerSecondary" onClick={() => void state.signOut()}><LogOut size={18} />Sair</Button><Button onClick={() => void state.save()} disabled={!state.canEdit || state.saving}>{state.saving ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" /> : <Save size={18} />}Salvar</Button></>} />
      {!state.canEdit ? <MxStatusBanner tone="warning">Este perfil está disponível somente para leitura.</MxStatusBanner> : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <MxSectionCard className="lg:col-span-4"><MxSectionHeader title="Identidade" description="Imagem e contexto do perfil atual." /><div className="flex flex-col items-center gap-4 p-5 text-center"><img className="h-32 w-32 rounded-2xl object-cover" src={getAvatarDisplayUrl(state.profile.avatar_url, state.profile.name, { size: 256, background: '0D3B2E', color: 'fff' })} alt={`Avatar de ${state.profile.name}`} /><div><strong className="block text-lg text-gray-800">{state.profile.name}</strong><span className="text-sm text-gray-500">{state.role}</span></div><input ref={state.fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Selecionar avatar" onChange={event => { const file = event.target.files?.[0] || null; state.setPendingAvatarFile(file); if (file) void state.uploadAvatar(file) }} /><Button variant="managerOutline" onClick={() => state.fileInputRef.current?.click()} disabled={!state.canEdit || state.uploading}><Camera size={18} />{state.uploading ? 'Enviando...' : 'Alterar avatar'}</Button>{state.pendingAvatarFile ? <Button variant="managerSecondary" onClick={() => void state.uploadAvatar()} disabled={state.uploading}>Tentar novamente</Button> : null}</div></MxSectionCard>
        <div className="space-y-5 lg:col-span-8">
          <MxSectionCard><MxSectionHeader title="Dados da conta" description="Informações utilizadas na operação interna." /><div className="grid gap-4 p-5 sm:grid-cols-2"><MxField label="Nome"><Input value={state.name} disabled={!state.canEdit} onChange={event => state.setName(event.target.value)} /></MxField><MxField label="E-mail"><Input value={state.profile.email} disabled /></MxField><MxField label="Telefone"><Input value={state.phone} disabled={!state.canEdit} onChange={event => state.setPhone(event.target.value)} /></MxField><MxField label="Cargo"><Input value={state.role || ''} disabled /></MxField></div></MxSectionCard>
          <MxSectionCard><MxSectionHeader title="Segurança" description="A senha nunca é exibida ou armazenada nesta tela." actions={<Button variant="managerOutline" onClick={() => state.setPasswordOpen(true)} disabled={!state.canEdit}><Key size={18} />Alterar senha</Button>} /><div className="flex items-center gap-3 p-5 text-sm text-gray-600"><ShieldCheck className="text-emerald-600" size={20} />Verificação de acesso ativa.</div></MxSectionCard>
        </div>
      </div>
      {state.passwordOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="internal-password-title" onMouseDown={event => { if (event.currentTarget === event.target) state.setPasswordOpen(false) }}><section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><h2 id="internal-password-title" className="text-lg font-bold text-gray-800">Alterar senha</h2><div className="mt-4 space-y-4"><MxField label="Nova senha"><Input type="password" value={state.newPassword} onChange={event => state.setNewPassword(event.target.value)} autoComplete="new-password" /></MxField><MxField label="Confirmar senha"><Input type="password" value={state.confirmPassword} onChange={event => state.setConfirmPassword(event.target.value)} autoComplete="new-password" /></MxField></div><div className="mt-5 flex justify-end gap-2"><Button variant="managerSecondary" onClick={() => state.setPasswordOpen(false)} disabled={state.changingPassword}>Cancelar</Button><Button onClick={() => void state.updatePassword()} disabled={state.changingPassword}>{state.changingPassword ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" /> : <ShieldCheck size={18} />}Atualizar senha</Button></div></section></div> : null}
    </MxModulePage>
  )
}

export default InternalProfilePage
