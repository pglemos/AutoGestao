import { Info, CircleDollarSign } from 'lucide-react'
import { formatBRLWhole } from './formatBRLWhole'

type Props = {
  comissaoEstimada: number
  qtdVendas: number
  onVerCalculo: () => void
  semPolitica: boolean
  detalhesVisiveis: boolean
}

/**
 * Destaque da comissão do mês.
 *
 * Migrado do tema escuro próprio para a aparência aprovada (§43.1): card
 * branco, acento esmeralda e valor em destaque tipográfico. O impacto vem da
 * escala do número, não de gradiente e brilho.
 */
export function CommissionHeroCard({
  comissaoEstimada,
  qtdVendas,
  onVerCalculo,
  semPolitica,
  detalhesVisiveis,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Comissão estimada
            </span>
            {detalhesVisiveis && (
              <button
                type="button"
                onClick={onVerCalculo}
                aria-label="Ver como a comissão foi calculada"
                className="rounded-full p-0.5 text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {semPolitica ? (
            <div>
              <p className="mt-2 text-lg font-semibold text-gray-800">
                Nenhuma política de remuneração ativa encontrada.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Peça ao gestor ou RH para configurar sua remuneração em Departamento / RH /
                Remuneração.
              </p>
            </div>
          ) : (
            <>
              <p
                className="font-bold leading-none tabular-nums text-emerald-700"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)' }}
              >
                {formatBRLWhole(comissaoEstimada)}
              </p>

              {qtdVendas === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  Ainda não há vendas confirmadas neste período. Assim que suas vendas forem
                  registradas, sua comissão aparecerá aqui.
                </p>
              ) : (
                <p className="mt-4 text-sm text-gray-600">
                  Você já vendeu{' '}
                  <span className="font-semibold text-emerald-700">
                    {qtdVendas} veículo{qtdVendas !== 1 ? 's' : ''}
                  </span>{' '}
                  neste mês.
                </p>
              )}
            </>
          )}
        </div>

        <div className="hidden flex-shrink-0 items-center justify-center lg:flex">
          <span
            aria-hidden="true"
            className="grid h-28 w-28 place-items-center rounded-full bg-emerald-50 text-emerald-600"
          >
            <CircleDollarSign className="h-14 w-14" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </div>
  )
}

export default CommissionHeroCard
