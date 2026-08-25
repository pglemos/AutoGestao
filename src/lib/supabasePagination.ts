// Paginação de leituras do Supabase.
//
// O PostgREST devolve no máximo 1000 linhas por requisição. Uma consulta sem
// `range` não avisa que truncou: volta 1000 linhas e a aplicação trata como o
// conjunto inteiro. No plano estratégico isso apagava unidades inteiras — um
// cliente com 3 lojas tem 3 × 45 indicadores × 12 meses = 1620 linhas, e a
// terceira loja simplesmente não existia para a tela.

export type PageResult<T> = { data: T[] | null; error: { message: string } | null }

/** Tamanho da página do PostgREST. */
export const SUPABASE_PAGE_SIZE = 1000

/** Teto de segurança: evita laço infinito se a origem nunca encurtar a página. */
const MAX_PAGES = 100

/**
 * Lê todas as linhas de uma consulta, página a página.
 *
 * `build` recebe os índices inclusivos de `range` e devolve a consulta pronta:
 *
 * ```ts
 * const { rows, error } = await fetchAllRows<Row>((from, to) =>
 *   supabase.from('tabela').select('a, b').eq('x', y).range(from, to))
 * ```
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * pageSize
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) return { rows, error: error.message }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) return { rows, error: null }
  }
  return { rows, error: `Consulta excedeu ${MAX_PAGES * pageSize} linhas; refine o filtro.` }
}

/**
 * Mesma paginação, no formato `{ data, error }` das respostas do supabase-js —
 * para trocar uma consulta existente sem mudar quem a consome.
 */
export async function fetchAllPaged<T>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const { rows, error } = await fetchAllRows(build, pageSize)
  if (error) return { data: null, error: { message: error } }
  return { data: rows, error: null }
}
