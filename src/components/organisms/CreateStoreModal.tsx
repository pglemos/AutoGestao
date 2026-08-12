import { Building2, Mail, Plus, RefreshCw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Card } from '@/components/molecules/Card'

export interface NewStoreDraft {
  name: string
  manager_email: string
}

export interface CreateStoreModalProps {
  open: boolean
  newStore: NewStoreDraft
  setNewStore: React.Dispatch<React.SetStateAction<NewStoreDraft>>
  creating: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  onClose: () => void
  /** Alvo do focus trap, quando o chamador o gerencia (ver useLojasPage). */
  modalRef?: React.RefObject<HTMLDivElement | null>
}

/**
 * Modal "Criar loja" — único do produto.
 *
 * Consolida três implementações que existiam uma por feature (Lojas,
 * Configurações e Dashboard da Loja), todas coletando os mesmos dois campos e
 * divergindo em placeholder, em quem guardava o estado e em quanto cumpriam de
 * §20. Esta é a que tinha foco preso, Escape e botão de fechar com nome
 * acessível, então é ela que ficou.
 *
 * Estado fica com o chamador: das três APIs, é a que serve tanto a quem já
 * mantém o rascunho num hook quanto a quem só precisa de `useState`.
 */
export function CreateStoreModal({
  open,
  modalRef,
  newStore,
  setNewStore,
  creating,
  onSubmit,
  onClose,
}: CreateStoreModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-mx-md bg-gray-900/60 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-store-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg"
          >
            <Card className="p-mx-lg md:p-14 border-none shadow-mx-2xl bg-white overflow-hidden relative">
              <form onSubmit={onSubmit} className="space-y-mx-xl relative z-10">
                <header className="flex items-center justify-between border-b border-border pb-8">
                  <div className="flex items-center gap-mx-sm">
                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-mx-indigo-50 flex items-center justify-center text-status-success-text border border-mx-indigo-100 shadow-none shrink-0">
                      <Building2 size={28} />
                    </div>
                    <div>
                      <Typography id="create-store-title" variant="h3">
                        Criar loja
                      </Typography>
                      <Typography
                        variant="caption"
                        tone="muted"
                        className="mt-1 block"
                      >
                        Cadastro único da rede MX
                      </Typography>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="rounded-mx-full w-mx-xl h-mx-xl bg-gray-50 hover:bg-white shadow-sm transition-all"
                    aria-label="Fechar modal"
                  >
                    <X size={24} />
                  </Button>
                </header>

                <div className="space-y-mx-lg">
                  <div className="space-y-mx-xs">
                    <Typography
                      as="label"
                      htmlFor="store-name"
                      variant="caption"
                      className="ml-2"
                    >
                      Nome da Unidade
                    </Typography>
                    <Input
                      id="store-name"
                      name="store-name"
                      required
                      placeholder="EX: MX SÃO PAULO - LESTE"
                      value={newStore.name}
                      onChange={e =>
                        setNewStore(p => ({ ...p, name: e.target.value.toUpperCase() }))
                      }
                      className="!h-14 !px-6 font-bold"
                    />
                  </div>
                  <div className="space-y-mx-xs">
                    <div className="flex justify-between items-center ml-2">
                      <Typography
                        as="label"
                        htmlFor="manager-email"
                        variant="caption"
                        className=""
                      >
                        E-mail do Gestor
                      </Typography>
                      <Badge variant="outline" className="text-mx-micro">
                        Opcional
                      </Badge>
                    </div>
                    <div className="relative group">
                      <Mail
                        size={18}
                        className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors"
                        aria-hidden="true"
                      />
                      <Input
                        id="manager-email"
                        name="manager-email"
                        type="email"
                        placeholder="gestor@unidade.com.br"
                        value={newStore.manager_email}
                        onChange={e =>
                          setNewStore(p => ({ ...p, manager_email: e.target.value }))
                        }
                        className="!h-14 !pl-14 !px-6 font-bold"
                      />
                    </div>
                    <p className="mt-mx-sm text-mx-micro text-muted-foreground">
                      Este e-mail recebe os relatórios da unidade. Ele não define a
                      gestão comercial: enquanto não houver um gerente com vínculo
                      ativo nesta loja, o dono acumula a gestão e recebe as funções
                      gerenciais completas. Ao cadastrar um gerente, o dono passa a
                      ter acesso de acompanhamento.
                    </p>
                  </div>
                </div>

                <footer className="pt-10 flex justify-end border-t border-border">
                  <Button
                    type="submit"
                    disabled={creating}
                    className="w-full sm:w-auto h-mx-2xl px-12 rounded-mx-full"
                  >
                    {creating ? (
                      <RefreshCw className="animate-spin mr-2" aria-hidden="true" />
                    ) : (
                      <Plus size={20} className="mr-2" aria-hidden="true" />
                    )}
                    Criar loja
                  </Button>
                </footer>
              </form>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
