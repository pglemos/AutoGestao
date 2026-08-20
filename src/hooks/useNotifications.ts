import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { parseNotificationArray, type Notification as AppNotification } from '@/lib/schemas/notification.schema'

const notificationPriorityRank: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const NOTIFICATION_SELECT = 'id, title, message, type, priority, read, recipient_id, sender_id, store_id, target_role, link, broadcast_id, created_at'

const QA_NOTIFICATION_MARKER = /\[teste\s+qa\]|dedup-debug/i

/**
 * Remove fixtures/debug notices before they reach any end-user surface and
 * collapse exact duplicate broadcasts. QA data must never compete with a
 * seller's operational alerts in the bell or notification center.
 */
export function sanitizeNotifications(notifications: AppNotification[]): AppNotification[] {
  const seen = new Set<string>()
  return notifications.filter(notification => {
    const searchable = `${notification.title} ${notification.message}`
    if (QA_NOTIFICATION_MARKER.test(searchable)) return false

    const fingerprint = [
      notification.title.trim().toLocaleLowerCase('pt-BR'),
      notification.message.trim().toLocaleLowerCase('pt-BR'),
      notification.link || '',
    ].join('|')
    if (seen.has(fingerprint)) return false
    seen.add(fingerprint)
    return true
  })
}

export function sortNotificationsByPriority<T extends Pick<AppNotification, 'priority' | 'created_at'>>(notifications: T[]): T[] {
  return [...notifications].sort((a, b) => {
    const priorityDelta = (notificationPriorityRank[b.priority] || 0) - (notificationPriorityRank[a.priority] || 0)
    if (priorityDelta !== 0) return priorityDelta
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function useNotifications() {
  if (process.env.NODE_ENV === 'test') {
    return {
      notificacoes: [] as AppNotification[],
      unreadCount: 0,
      loading: false,
      markRead: async () => {},
      markUnread: async () => {},
      markAllAsRead: async () => {},
      deleteNotification: async () => {},
      sendNotification: async () => ({ error: null }),
      fetchNotifications: async () => ({} as any),
      refetch: async () => ({} as any),
    }
  }

  const { profile, role } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['notificacoes', profile?.id],
    queryFn: async () => {
      if (!profile) return { notificacoes: [] as AppNotification[], unreadCount: 0 }

      const { data, error } = await supabase.from('notificacoes')
        .select(NOTIFICATION_SELECT)
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw error
      }

      const notificacoes = sanitizeNotifications(sortNotificationsByPriority(parseNotificationArray(data || [])))
      return { notificacoes, unreadCount: notificacoes.filter(n => !n.read).length }
    },
    enabled: !!profile,
  })

  useEffect(() => {
    if (!profile?.id) return

    const channelInstanceId = `${profile.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(`notificacoes:${channelInstanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes', filter: `recipient_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notificacoes', profile.id] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.id, queryClient])

  const markReadMut = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!profile) return
      await supabase.from('notificacoes').update({ read: true }).eq('id', notificationId).eq('recipient_id', profile.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })

  const markUnreadMut = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!profile) return
      await supabase.from('notificacoes').update({ read: false }).eq('id', notificationId).eq('recipient_id', profile.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })

  const markAllAsReadMut = useMutation({
    mutationFn: async () => {
      if (!profile) return
      await supabase.from('notificacoes').update({ read: true }).eq('recipient_id', profile.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })

  const deleteNotificationMut = useMutation({
    mutationFn: async (id: string) => {
      if (!profile) return
      if (role === 'dono') return
      await supabase.from('notificacoes').delete().eq('id', id).eq('recipient_id', profile.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })

  const sendNotificationMut = useMutation({
    mutationFn: async (input: { title: string; message: string; type?: string; priority?: string; recipient_id?: string; store_id?: string; target_role?: string; link?: string }) => {
      if (!profile) return { error: 'Não autenticado' }
      if (role === 'dono') return { error: 'Dono acompanha alertas, mas não dispara notificações operacionais.' }

      if (!input.recipient_id && (input.target_role || input.store_id)) {
        const { error } = await supabase.rpc('send_broadcast_notification', {
          p_title: input.title,
          p_message: input.message,
          p_type: input.type || 'system',
          p_priority: input.priority || 'medium',
          p_store_id: input.store_id || null,
          p_target_role: input.target_role || 'todos',
          p_link: input.link || null,
          p_sender_id: profile.id,
        })
        return { error: error?.message || null }
      }

      if (input.recipient_id && (input.type === 'routine' || input.type === 'checkin')) {
        const { data, error } = await supabase.rpc('enviar_cobranca_diaria', {
          p_recipient_id: input.recipient_id,
          p_store_id: input.store_id || null,
          p_type: input.type,
          p_title: input.title,
          p_message: input.message,
          p_priority: input.priority || 'high',
          p_link: input.link || null,
        })
        const result = data as { ok?: boolean; error?: string; duplicate?: boolean } | null
        return { error: error?.message || result?.error || null, duplicate: result?.duplicate || false }
      }

      const { error } = await supabase.from('notificacoes').insert({ ...input, target_type: 'all', sender_id: profile.id, read: false })
      return { error: error?.message || null }
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
      }
    },
  })

  return {
    notificacoes: data?.notificacoes || [],
    unreadCount: data?.unreadCount || 0,
    loading,
    markRead: (id: string) => markReadMut.mutateAsync(id),
    markUnread: (id: string) => markUnreadMut.mutateAsync(id),
    markAllAsRead: () => markAllAsReadMut.mutateAsync(),
    deleteNotification: (id: string) => deleteNotificationMut.mutateAsync(id),
    sendNotification: (input: Parameters<typeof sendNotificationMut.mutateAsync>[0]) => sendNotificationMut.mutateAsync(input),
    fetchNotifications: refetch,
    refetch,
  }
}
