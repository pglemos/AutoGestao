import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { uploadUserAvatar } from '@/lib/avatar'
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy'
import { toast } from '@/lib/toast'
import { canEditInternalProfile } from '../lib/internalProfilePolicy'

export function useInternalProfileController() {
  const auth = useAuth()
  const { profile, role, updateProfile, changePassword, signOut } = auth
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(profile?.name || '')
    setPhone(profile?.phone || '')
  }, [profile?.name, profile?.phone])

  const canEdit = canEditInternalProfile(role)

  const save = async () => {
    if (!canEdit || saving) return
    if (!name.trim()) {
      toast.error('Nome não pode ficar vazio.')
      return
    }
    setSaving(true)
    try {
      const { error } = await updateProfile({ name: name.trim(), phone: phone.trim() || undefined })
      if (error) throw new Error(error)
      toast.success('Perfil atualizado.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao atualizar perfil.')
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async (file = pendingAvatarFile) => {
    if (!canEdit || !file || !profile?.id || uploading) return
    setPendingAvatarFile(file)
    setUploading(true)
    try {
      const avatarUrl = await uploadUserAvatar(profile.id, file)
      const { error } = await updateProfile({ avatar_url: avatarUrl })
      if (error) throw new Error(error)
      setPendingAvatarFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Avatar atualizado.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao enviar avatar. O arquivo foi mantido para nova tentativa.')
    } finally {
      setUploading(false)
    }
  }

  const updatePassword = async () => {
    if (!canEdit || changingPassword) return
    if (!isStrongPassword(newPassword)) {
      toast.error(PASSWORD_POLICY_MESSAGE)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    setChangingPassword(true)
    try {
      const { error } = await changePassword(newPassword)
      if (error) throw new Error(error)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordOpen(false)
      toast.success('Senha alterada com sucesso.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao alterar senha.')
    } finally {
      setChangingPassword(false)
    }
  }

  return { profile, role, canEdit, name, setName, phone, setPhone, saving, save, uploading, pendingAvatarFile, setPendingAvatarFile, uploadAvatar, fileInputRef, passwordOpen, setPasswordOpen, newPassword, setNewPassword, confirmPassword, setConfirmPassword, changingPassword, updatePassword, signOut }
}
