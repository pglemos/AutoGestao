// @ts-nocheck
// Paridade 1:1 com Base44: renderiza o componente de Desenvolvimento do protótipo
// (header + abas Feedback/PDI) usando o shim base44Client (dados reais do MX).
import { PageCanvas } from '@/design-system/page'
import Desenvolvimento from '@/base44-reference/pages/Desenvolvimento.jsx'

export default function VendedorDesenvolvimento() {
  return <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="min-h-full"><Desenvolvimento /></PageCanvas>
}
