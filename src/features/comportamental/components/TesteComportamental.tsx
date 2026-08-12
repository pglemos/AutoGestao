import { useState } from 'react'
import { Plus, ClipboardCheck, Send } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { EmptyState } from '@/components/atoms/EmptyState'
import { useQuestoes, aplicarTeste, type RespostaInput } from '../hooks/useComportamental'

const ESCALA = [1, 2, 3, 4, 5]

export function TesteComportamental() {
  const { questoes, loading, adicionarQuestao } = useQuestoes()
  const [novaQuestao, setNovaQuestao] = useState('')
  const [novaDimensao, setNovaDimensao] = useState('')
  const [savingQ, setSavingQ] = useState(false)
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [enviando, setEnviando] = useState(false)

  const handleAddQuestao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaQuestao.trim() || !novaDimensao.trim()) { toast.error('Texto e dimensão são obrigatórios.'); return }
    setSavingQ(true)
    const { error } = await adicionarQuestao({ texto: novaQuestao.trim(), dimensao: novaDimensao.trim().toLowerCase(), ordem: questoes.length })
    setSavingQ(false)
    if (error) toast.error(error)
    else { toast.success('Questão adicionada.'); setNovaQuestao(''); setNovaDimensao('') }
  }

  const handleEnviar = async () => {
    const faltando = questoes.filter(q => !respostas[q.id])
    if (faltando.length) { toast.error(`Responda todas as questões (${faltando.length} pendentes).`); return }
    setEnviando(true)
    const payload: RespostaInput[] = questoes.map(q => ({ questaoId: q.id, dimensao: q.dimensao, valor: respostas[q.id] }))
    const { error } = await aplicarTeste(payload)
    setEnviando(false)
    if (error) toast.error(error)
    else { toast.success('Teste registrado! Perfil comportamental salvo.'); setRespostas({}) }
  }

  return (
    <div className="space-y-mx-lg">
      <form onSubmit={handleAddQuestao} className="rounded-2xl border border-border bg-surface-alt p-mx-md">
        <Typography variant="caption" tone="muted" className="">Adicionar questão ao teste</Typography>
        <div className="mt-mx-sm grid gap-mx-sm md:grid-cols-[1fr_200px_auto]">
          <Input aria-label="Enunciado da questão" value={novaQuestao} onChange={e => setNovaQuestao(e.target.value)} placeholder="Enunciado da questão" />
          <Input aria-label="Dimensão da questão" value={novaDimensao} onChange={e => setNovaDimensao(e.target.value)} placeholder="Dimensão (ex.: disciplina)" />
          <Button type="submit" disabled={savingQ}><Plus size={16} className="mr-2" />{savingQ ? '…' : 'Add'}</Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm font-bold text-muted-foreground">Carregando questões…</p>
      ) : questoes.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={28} />} title="Nenhuma questão" description="Cadastre as questões do teste comportamental." />
      ) : (
        <div className="space-y-mx-md">
          <Typography variant="caption" tone="muted" className="">
            Aplicar teste (você responde como exemplo de onboarding) — escala 1 (discordo) a 5 (concordo)
          </Typography>
          {questoes.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-border p-mx-md">
              <div className="flex items-start gap-mx-sm">
                <span className="text-xs font-bold text-muted-foreground">{i + 1}.</span>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{q.texto}</p>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{q.dimensao}</span>
                  <div className="mt-mx-sm flex gap-mx-xs">
                    {ESCALA.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRespostas(p => ({ ...p, [q.id]: v }))}
                        className={`h-9 w-9 rounded-mx-full text-sm font-bold transition-colors ${respostas[q.id] === v ? 'bg-brand-primary text-white' : 'bg-surface-alt text-muted-foreground hover:bg-border-default'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button type="button" onClick={handleEnviar} disabled={enviando}><Send size={16} className="mr-2" />{enviando ? 'Enviando…' : 'Concluir teste'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
