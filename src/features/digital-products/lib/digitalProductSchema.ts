import { z } from 'zod'

export const digitalProductSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto'),
  description: z.string().trim().min(5, 'Descrição necessária'),
  category: z.string().trim().min(2, 'Categoria obrigatória'),
  target_roles: z.array(z.enum(['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor'])).min(1, 'Selecione ao menos um público'),
  status: z.enum(['ativo', 'rascunho', 'arquivado']),
  sort_order: z.coerce.number().int().min(0).max(999),
})
