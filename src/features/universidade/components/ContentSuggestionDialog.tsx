import { useState, type FormEvent } from 'react'
import { Lightbulb, Send } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { useSuggestContent } from '@/hooks/useTrainings'
import { DEVELOPMENT_THEMES, type DevelopmentTheme } from '@/lib/development-content'
import { toast } from '@/lib/toast'

const INITIAL_FORM = {
  theme: 'atendimento' as DevelopmentTheme,
  title: '',
  description: '',
}

export function ContentSuggestionDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const { suggestContent } = useSuggestContent()

  const close = () => {
    setOpen(false)
    setForm(INITIAL_FORM)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return

    const { error } = await suggestContent({
      theme: form.theme,
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: 'medium',
    })

    if (error) {
      toast.error(error)
      return
    }

    toast.success('Sugestão enviada ao Admin MX.')
    close()
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 w-full justify-center rounded-xl border-status-success/30 bg-white px-3 text-xs font-bold text-status-success-text hover:bg-status-success-surface md:w-auto"
      >
        <Lightbulb size={15} className="mr-2" />
        Sugerir tema de aula
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Sugerir tema de aula"
        description="A sugestão será enviada para a curadoria do Admin MX."
        size="md"
      >
        <form onSubmit={event => void submit(event)} className="flex flex-col">
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Tema
              <select
                value={form.theme}
                onChange={event => setForm(current => ({ ...current, theme: event.target.value as DevelopmentTheme }))}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-status-success"
              >
                {DEVELOPMENT_THEMES.map(theme => <option key={theme.key} value={theme.key}>{theme.label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Título da aula
              <Input
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                placeholder="Ex.: Como melhorar a conversão de visitas"
                maxLength={120}
                required
                className="mt-1 h-11 rounded-xl"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              O que você gostaria de aprender? <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
              <textarea
                value={form.description}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                placeholder="Descreva a dúvida ou situação prática."
                maxLength={500}
                rows={4}
                className="mt-1 w-full resize-none rounded-xl border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-status-success"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
            <Button type="submit" variant="primary">
              <Send size={15} className="mr-2" /> Enviar sugestão
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
