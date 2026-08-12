import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Users, Zap, Clock, Building2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { useNetworkHierarchy } from '@/hooks/useNetworkHierarchy'
import { toast } from '@/lib/toast'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'

type NetworkMember = {
  id: string
  name?: string
  role: string
  avatar_url?: string | null
  checkin_today: boolean
}

export function AdminNetworkView() {
  const { networkData, loading, updateRole, removeMember } = useNetworkHierarchy()
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  if (loading) return (
    <div className="flex flex-col gap-mx-sm animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-mx-3xl bg-white/10 rounded-2xl" />)}
    </div>
  )

  const handleRoleChange = async (userId: string, storeId: string, currentRole: string) => {
    const nextRole = currentRole === 'vendedor' ? 'gerente' : 'vendedor'
    setProcessing(`${userId}-${storeId}`)
    const { error } = await updateRole(userId, storeId, nextRole)
    if (error) toast.error('Erro ao alterar cargo')
    else toast.success('Cargo atualizado!')
    setProcessing(null)
  }

  const executeRemove = async (userId: string, storeId: string) => {
    setProcessing(`${userId}-${storeId}`)
    const { error } = await removeMember(userId, storeId)
    if (error) toast.error('Erro ao remover')
    else toast.success('Membro removido')
    setProcessing(null)
  }

  const handleRemove = (member: NetworkMember, storeId: string) => {
    requestToastConfirmation({
      key: `network-remove:${member.id}:${storeId}`,
      title: `Remover ${member.name || 'membro'} da unidade?`,
      description: 'O vínculo com esta unidade será removido.',
      label: 'Remover',
      onConfirm: () => executeRemove(member.id, storeId),
    })
  }

  return (
    <div className="space-y-mx-md">
      {networkData.map((store) => {
        const isExpanded = expandedStoreId === store.store_id
        const members = store.members as NetworkMember[]
        const operacionais = members.filter((m) => m.checkin_today).length
        const total = store.members.length

        return (
          <Card key={store.store_id} className="overflow-hidden bg-white">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              className="p-mx-sm sm:p-mx-md flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedStoreId(isExpanded ? null : store.store_id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setExpandedStoreId(isExpanded ? null : store.store_id)
                }
              }}
            >
              <div className="flex items-center gap-mx-sm min-w-0">
                <div className="w-mx-10 h-mx-10 sm:w-mx-xl sm:h-mx-xl rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0">
                  <Building2 size={20} className="sm:size-mx-md" />
                </div>
                <div className="min-w-0">
                  <Typography variant="h3" className="text-sm sm:text-lg tracking-tight leading-tight whitespace-normal break-words">{store.store_name}</Typography>
                  <Typography variant="tiny" tone="muted" className="text-mx-nano sm:text-mx-micro">{total} ESPECIALISTAS</Typography>
                </div>
              </div>
              
              <div className="flex items-center gap-mx-xs sm:gap-mx-lg shrink-0">
                <div className="flex items-center gap-mx-tiny text-status-success">
                  <Zap size={14} className="sm:size-mx-sm" />
                  <Typography variant="mono" className="text-mx-tiny sm:text-sm">{operacionais}/{total}</Typography>
                </div>
                <ChevronDown className={cn("transition-transform w-mx-sm h-mx-sm sm:w-5 sm:h-5", isExpanded && "rotate-180")} />
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border bg-gray-50/30"
                >
                  <div className="p-mx-sm sm:p-mx-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-mx-sm">
                    {members.map((member) => (
                      <div key={member.id} className="bg-white p-mx-sm rounded-xl border border-border flex flex-col gap-mx-sm shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-mx-sm relative z-10">
                          <div className="w-mx-10 h-mx-10 rounded-xl bg-gray-50 flex items-center justify-center border border-border overflow-hidden shrink-0">
                            {member.avatar_url ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <Users size={16} className="text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Typography className="text-xs sm:text-sm tracking-tight leading-tight whitespace-normal break-words">{member.name}</Typography>
                            <Typography variant="tiny" tone="muted" className="text-mx-tiny font-bold">{member.role}</Typography>
                          </div>
                          {member.checkin_today ? <Zap size={16} className="text-status-success fill-status-success/20" /> : <Clock size={16} className="text-muted-foreground opacity-20" />}
                        </div>
                        
                        <div className="flex gap-mx-xs border-t border-border pt-mx-xs mt-1 relative z-10">
                          <Button 
                            variant="outline" size="sm" className="flex-1 h-mx-lg sm:h-mx-10 text-mx-micro sm:text-mx-tiny"
                            disabled={!!processing}
                            onClick={(e) => { e.stopPropagation(); handleRoleChange(member.id, store.store_id, member.role) }}
                          >
                            {member.role === 'vendedor' ? 'Promover' : 'Rebaixar'}
                          </Button>
                          <Button 
                            variant="danger" size="sm" className="px-3 h-mx-lg sm:h-mx-10 bg-status-error-surface text-status-error border-status-error/20 hover:bg-status-error hover:text-white"
                            disabled={!!processing}
                            onClick={(e) => { e.stopPropagation(); handleRemove(member, store.store_id) }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )
      })}
    </div>
  )
}
