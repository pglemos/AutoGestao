import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import type { Cliente } from '@/lib/schemas/crm.schema'

/**
 * Sugestões de próxima ação — texto livre (o schema real não tem catálogo
 * fechado de "proximo_passo" como o Base44; `clientes.proxima_acao` é texto
 * normalmente resolvido pela cadência automática em cadencia.ts). Este modal
 * cobre o gap de o vendedor conseguir sobrescrever manualmente essa ação e
 * sua data, coisa que hoje só acontece via avanço automático da cadência.
 */
const SUGESTOES_PROXIMA_ACAO = [
  'Ligar para qualificar',
  'Enviar WhatsApp',
  'Confirmar orçamento e forma de pagamento',
  'Convidar para visita',
  'Confirmar visita agendada',
  'Retomar proposta enviada',
  'Acionar gerente',
  'Pedir sinal de negócio',
  'Aguardar retorno do cliente',
]

interface AlterarProximoPassoProps {
  open: boolean
  cliente: Cliente | null
  onClose: () => void
  onSalvar: (input: { proxima_acao: string; proxima_acao_em: string | null }) => Promise<{ error: string | null }>
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AlterarProximoPasso({ open, cliente, onClose, onSalvar }: AlterarProximoPassoProps) {
  const [acao, setAcao] = useState('')
  const [dataStr, setDataStr] = useState(hojeISO())
  const [horario, setHorario] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open && cliente) {
      setAcao(cliente.proxima_acao || '')
      const atual = cliente.proxima_acao_em ? new Date(cliente.proxima_acao_em) : null
      setDataStr(atual && !Number.isNaN(atual.getTime()) ? atual.toISOString().slice(0, 10) : hojeISO())
      setHorario(atual && !Number.isNaN(atual.getTime()) ? atual.toISOString().slice(11, 16) : '')
    }
  }, [open, cliente])

  if (!open || !cliente) return null

  const podeSalvar = acao.trim().length > 0

  async function handleSalvar() {
    if (!podeSalvar) return
    setSalvando(true)
    const dataHora = horario ? `${dataStr}T${horario}:00` : `${dataStr}T00:00:00`
    const { error } = await onSalvar({ proxima_acao: acao.trim(), proxima_acao_em: dataHora })
    setSalvando(false)
    if (!error) onClose()
  }

  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-black/40 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="Alterar próximo passo">
      <Card className="w-full max-w-md space-y-mx-sm p-mx-lg">
        <div className="flex items-start justify-between">
          <div>
            <Typography variant="h3">Alterar próximo passo</Typography>
            <Typography variant="caption" tone="muted">Defina o que precisa acontecer para {cliente.nome.split(' ')[0]} evoluir.</Typography>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={18} className="text-gray-500" /></button>
        </div>

        <div>
          <Typography variant="caption" tone="muted" className="mb-mx-xs block font-bold">Sugestões</Typography>
          <div className="flex flex-wrap gap-1.5">
            {SUGESTOES_PROXIMA_ACAO.map(sugestao => (
              <button
                key={sugestao}
                type="button"
                onClick={() => setAcao(sugestao)}
                className={`rounded-xl border px-mx-xs py-1 text-xs font-semibold transition-colors ${
                  acao === sugestao
                    ? 'border-[#005BFF] bg-[#005BFF] text-white'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-[#005BFF]/40'
                }`}
              >
                {sugestao}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Typography variant="caption" tone="muted" className="mb-mx-xs block font-bold">Próxima ação *</Typography>
          <textarea
            value={acao}
            onChange={event => setAcao(event.target.value)}
            rows={2}
            placeholder="Descreva o próximo passo..."
            className="w-full resize-none rounded-xl border border-gray-100 bg-white p-mx-sm text-sm outline-none focus:border-[#005BFF] focus:ring-4 focus:ring-[#005BFF]/10"
          />
        </div>

        <div className="grid grid-cols-2 gap-mx-xs">
          <div>
            <Typography variant="caption" tone="muted" className="mb-mx-xs block font-bold">Data</Typography>
            <input
              type="date"
              value={dataStr}
              onChange={event => setDataStr(event.target.value)}
              className="h-9 w-full rounded-xl border border-gray-100 bg-white px-mx-xs text-sm outline-none focus:border-[#005BFF]"
            />
          </div>
          <div>
            <Typography variant="caption" tone="muted" className="mb-mx-xs block font-bold">Horário (opcional)</Typography>
            <input
              type="time"
              value={horario}
              onChange={event => setHorario(event.target.value)}
              className="h-9 w-full rounded-xl border border-gray-100 bg-white px-mx-xs text-sm outline-none focus:border-[#005BFF]"
            />
          </div>
        </div>

        <div className="flex gap-mx-xs pt-mx-xs">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button className="flex-1" disabled={!podeSalvar || salvando} onClick={handleSalvar}>
            {salvando ? 'Salvando...' : 'Salvar próximo passo'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
