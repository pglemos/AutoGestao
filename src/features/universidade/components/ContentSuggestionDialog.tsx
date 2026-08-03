import { useState, type FormEvent } from 'react'
import { Lightbulb, Send, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
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
        className="h-10 w-full justify-center rounded-xl border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 md:w-auto"
      >
        <Lightbulb size={15} className="mr-2" />
        Sugerir tema de aula
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[180] grid place-items-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) close() }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-suggestion-title"
            onSubmit={event => void submit(event)}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <Typography id="content-suggestion-title" variant="h3" className="text-lg text-slate-900">
                  Sugerir tema de aula
                </Typography>
                <Typography variant="caption" tone="muted">
                  A sugestão será enviada para a curadoria do Admin MX.
                </Typography>
              </div>
              <button type="button" onClick={close} aria-label="Fechar sugestão" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </header>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Tema
                <select
                  value={form.theme}
                  onChange={event => setForm(current => ({ ...current, theme: event.target.value as DevelopmentTheme }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {DEVELOPMENT_THEMES.map(theme => <option key={theme.key} value={theme.key}>{theme.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
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
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                O que você gostaria de aprender? <span className="font-normal normal-case text-slate-400">(opcional)</span>
                <textarea
                  value={form.description}
                  onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                  placeholder="Descreva a dúvida ou situação prática."
                  maxLength={500}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
            </div>

            <footer className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                <Send size={15} className="mr-2" /> Enviar sugestão
              </Button>
            </footer>
          </form>
        </div>
      )}
    </>
  )
}
