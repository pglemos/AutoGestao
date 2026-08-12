import { useEffect, useState } from 'react'
import { ClipboardCheck, XCircle, CheckCircle2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { Typography } from '@/components/atoms/Typography'
import {
    listarQuizTreinamento,
    submeterQuizTreinamento,
    type QuizQuestao,
    type ResultadoQuiz,
} from '@/features/universidade/services/universidade-service'

/**
 * Prova oficial da aula (UNIV-6): 5–10 questões, nota mínima 70%.
 * O gabarito nunca chega ao cliente — a correção é feita pelo RPC
 * submeter_quiz_treinamento, que também registra a tentativa (append-only)
 * e conclui o progresso oficial quando aprovado.
 */
export function QuizTreinamento({ trainingId, onCarregado, onAprovado }: {
    trainingId: string
    /** Informa quantas questões ativas a aula tem (0 = sem quiz configurado). */
    onCarregado?: (totalQuestoes: number) => void
    onAprovado?: () => void
}) {
    const [questoes, setQuestoes] = useState<QuizQuestao[]>([])
    const [respostas, setRespostas] = useState<Record<string, number>>({})
    const [resultado, setResultado] = useState<ResultadoQuiz | null>(null)
    const [enviando, setEnviando] = useState(false)

    useEffect(() => {
        let ativo = true
        setQuestoes([])
        setRespostas({})
        setResultado(null)
        listarQuizTreinamento(supabase, trainingId)
            .then(rows => {
                if (!ativo) return
                setQuestoes(rows)
                onCarregado?.(rows.length)
            })
            .catch(() => { if (ativo) onCarregado?.(0) })
        return () => { ativo = false }
    }, [trainingId])

    if (questoes.length < 5) return null

    const todasRespondidas = questoes.every(questao => respostas[questao.id] !== undefined)

    const enviar = async () => {
        setEnviando(true)
        try {
            const res = await submeterQuizTreinamento(supabase, trainingId, respostas)
            setResultado(res)
            if (res.aprovado) {
                toast.success(`Prova aprovada com nota ${res.nota}%.`, { description: 'Aula concluída no seu progresso oficial.' })
                onAprovado?.()
            } else {
                toast.warning(`Nota ${res.nota}% — mínimo para aprovação é 70%.`, { description: 'Revise a aula e tente novamente.' })
            }
        } catch (error) {
            toast.error('Erro ao enviar a prova', { description: error instanceof Error ? error.message : 'Tente novamente.' })
        } finally {
            setEnviando(false)
        }
    }

    return (
        <section className="rounded-2xl border border-border-subtle bg-gray-50/40 p-4" aria-label="Prova oficial da aula">
            <Typography variant="p" className="flex items-center gap-2 text-sm font-bold tracking-wide">
                <ClipboardCheck size={16} className="text-status-success-text" />
                Prova Oficial — nota mínima 70%
            </Typography>
            <Typography variant="caption" tone="muted" className="mb-3 mt-1 block">
                {questoes.length} questões. Suas tentativas ficam registradas; aprovação conclui a aula no progresso oficial.
            </Typography>

            <div className="space-y-4">
                {questoes.map((questao, indice) => (
                    <fieldset key={questao.id} className="rounded-xl border border-border-subtle bg-white p-3">
                        <legend className="px-1 text-sm font-semibold text-foreground">
                            {indice + 1}. {questao.pergunta}
                        </legend>
                        <div className="mt-2 space-y-1.5">
                            {questao.opcoes.map((opcao, opcaoIndice) => (
                                <label key={opcaoIndice} className="flex cursor-pointer select-none items-start gap-2.5 rounded-xl p-1.5 text-sm hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name={`quiz-${questao.id}`}
                                        checked={respostas[questao.id] === opcaoIndice}
                                        onChange={() => setRespostas(atual => ({ ...atual, [questao.id]: opcaoIndice }))}
                                        disabled={Boolean(resultado?.aprovado)}
                                        className="mt-0.5 h-4 w-4 border-border text-status-success-text focus:ring-brand-primary"
                                    />
                                    <span>{opcao}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                ))}
            </div>

            {resultado && (
                <div
                    role="status"
                    className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${resultado.aprovado
                        ? 'border-status-success/30 bg-status-success/5 text-status-success'
                        : 'border-status-error/30 bg-status-error/5 text-status-error'}`}
                >
                    {resultado.aprovado ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    Nota {resultado.nota}% ({resultado.acertos}/{resultado.total_questoes} acertos) — {resultado.aprovado ? 'Aprovado' : 'Reprovado, tente novamente'}
                </div>
            )}

            {!resultado?.aprovado && (
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        disabled={enviando || !todasRespondidas}
                        onClick={() => void enviar()}
                        className="rounded-2xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {enviando ? 'Corrigindo...' : resultado ? 'Tentar novamente' : 'Enviar prova'}
                    </button>
                </div>
            )}
        </section>
    )
}
