import React, { useState } from 'react'
import { toast } from '@/lib/toast'
import { Plus, Target } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { useConsultingActionPlan } from '@/hooks/useConsultingActionPlan'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Falha ao criar tarefa.'
}

export function VisitActionQuickAdd({ clientId, visitNumber }: { clientId: string, visitNumber: number }) {
  const { createItem } = useConsultingActionPlan(clientId)
  const [isOpen, setIsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    action: '',
    owner_name: '',
    due_date: new Date().toISOString().split('T')[0]
  })

  const handleCreate = async () => {
    if (!form.action.trim()) return toast.error('Descreva a ação')
    
    setSubmitting(true)
    try {
      const { error } = await createItem({
        action: form.action,
        owner_name: form.owner_name,
        due_date: form.due_date,
        priority: 2,
        visit_number: visitNumber
      })
      if (error) throw new Error(error)
      toast.success('Ação adicionada ao Plano de Ação!')
      setForm({ action: '', owner_name: '', due_date: new Date().toISOString().split('T')[0] })
      setIsOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <Button variant="outline" className="w-full border-dashed border-2 h-mx-14 font-bold hover:text-status-success-text hover:border-brand-primary" icon={<Plus size={16} />} onClick={() => setIsOpen(true)}>
        ADICIONAR AÇÃO AO PLANO PDCA
      </Button>
    )
  }

  return (
    <Card className="p-mx-lg border-2 border-brand-primary/30 /5 shadow-sm animate-in zoom-in-95 duration-200">
      <div className="flex items-center gap-mx-xs mb-mx-md">
        <Target className="w-mx-5 h-mx-5 text-status-success-text" />
        <Typography variant="h3" className="">Nova Ação Corretiva</Typography>
      </div>
      <div className="space-y-mx-md">
        <div className="space-y-mx-xs">
          <Typography variant="tiny" className="font-bold">O que será feito?</Typography>
          <Textarea value={form.action} onChange={e => setForm({...form, action: e.target.value})} placeholder="Descreva a tarefa decidida na visita..." className="min-h-mx-20 bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-mx-sm">
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Responsável</Typography>
            <Input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} placeholder="Quem?" className="bg-white" />
          </div>
          <div className="space-y-mx-xs">
            <Typography variant="tiny" className="font-bold">Prazo</Typography>
            <Input aria-label="Prazo" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="bg-white" />
          </div>
        </div>
        <div className="flex gap-mx-xs pt-mx-xs">
          <Button variant="ghost" className="flex-1" onClick={() => setIsOpen(false)}>CANCELAR</Button>
          <Button variant="primary" className="flex-1" loading={submitting} onClick={handleCreate}>CRIAR TAREFA</Button>
        </div>
      </div>
    </Card>
  )
}
