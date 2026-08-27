/** Primeiro nome do vendedor. Pódio e Corrida precisam recortar igual — antes
 *  um usava `split(' ')` e o outro `split(/\s+/)`, e nomes com espaço duplo
 *  divergiam entre as duas peças da mesma tela. */
export function primeiroNome(nome?: string | null): string {
  return nome?.trim().split(/\s+/)[0] || 'Vendedor'
}
