import { describe, expect, it } from 'bun:test'
import { canEditConsultingVisit } from '../lib/visitExecutionPolicy'
describe('visit execution policy', () => {
  it('blocks completed visits', () => expect(canEditConsultingVisit({ role:'administrador_mx', assigned:true, completed:true })).toBe(false))
  it('allows assigned consultant', () => expect(canEditConsultingVisit({ role:'consultor_mx', assigned:true, completed:false })).toBe(true))
  it('allows an unassigned consultant in the global internal scope', () => expect(canEditConsultingVisit({ role:'consultor_mx', assigned:false, completed:false })).toBe(true))
})
