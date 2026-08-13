import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
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
    <Modal
      open={open && !!cliente}
      onClose={onClose}
      title="Alterar próximo passo"
      description={cliente ? `Defina o que precisa acontecer para ${cliente.nome.split(' ')[0]} evoluir.` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button className="flex-1" disabled={!podeSalvar || salvando} onClick={() => void handleSalvar()}>
            {salvando ? 'Salvando...' : 'Salvar próximo passo'}
          </Button>
        </>
      }
    >
      {cliente && (
        <div className="space-y-mx-sm">
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
                      ? 'border-status-info bg-status-info text-white'
                      : 'border-border-subtle bg-surface-alt text-muted-foreground hover:border-status-info/40'
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
              className="w-full resize-none rounded-xl border border-border-subtle bg-white p-mx-sm text-sm outline-none focus:border-status-info focus:ring-4 focus:ring-status-info/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-mx-xs">
            <div>
              <Typography variant="caption" tone="muted" className="mb-mx-xs block font-bold">Data</Typography>
              <input
                type="date"
                value={dataStr}
                onChange={event => setDataStr(event.target.value)}
                className="h-9 w-full rounded-xl border border-border-subtle bg-white px-mx-xs text-sm outline-none focus:border-status-info"
              />
            </div>
            <div>
              <Typography variant="caption" tone="muted" className="mb-mx-xs block font-bold">Horário (opcional)</Typography>
              <input
                type="time"
                value={horario}
                onChange={event => setHorario(event.target.value)}
                className="h-9 w-full rounded-xl border border-border-subtle bg-white px-mx-xs text-sm outline-none focus:border-status-info"
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
