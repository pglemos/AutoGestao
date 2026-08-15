// Implementação de PRODUÇÃO das rotas /desenvolvimento e /devolutivas.
//
// Até aqui a rota montava `src/base44-reference/pages/Desenvolvimento.jsx`
// direto: produção executando o protótipo congelado. Isso obrigava qualquer
// correção (contraste, acessibilidade, layout) a ser feita DENTRO da
// referência, destruindo o próprio parâmetro de comparação — e trazia os
// defeitos do protótipo para o runtime.
//
// A referência continua congelada e serve de comparação; o comportamento vive
// aqui, sob os primitives do Foundation Zero.
import { PageCanvas } from '@/design-system/page'
import VendedorDesenvolvimentoPage from '@/features/vendedor-desenvolvimento/VendedorDesenvolvimentoPage.jsx'

export default function VendedorDesenvolvimento() {
  return (
    <PageCanvas as="div" width="focused" className="min-h-full">
      <VendedorDesenvolvimentoPage />
    </PageCanvas>
  )
}
