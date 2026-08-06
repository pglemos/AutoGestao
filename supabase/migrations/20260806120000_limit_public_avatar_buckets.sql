-- Teto de tamanho nos buckets públicos de avatar.
--
-- Causa raiz do estouro de cota (cached egress) em 2026-08-05: os dois buckets
-- públicos aceitavam 5 MB por arquivo e a foto ia para o storage exatamente
-- como saiu da câmera. Estado medido:
--
--   pre-cadastro-avatares  90 objetos  107 MB  (média 1,2 MB, maior 3,2 MB)
--   perfis_usuario          1 objeto   419 kB
--
-- Como os buckets são públicos, cada leitura passa pelo CDN e conta como
-- *cached egress*. Uma tela de ranking/equipe com 87 avatares baixava ~105 MB
-- por carga — algumas dezenas de aberturas consomem os 5 GB do plano gratuito.
--
-- O cliente passou a reduzir a imagem para 256 px antes do upload (~25 KB).
-- Este limite é a defesa do servidor: mesmo que alguém suba direto pela API,
-- o arquivo gordo é recusado.

UPDATE storage.buckets
   SET file_size_limit = 524288,  -- 512 KB
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id IN ('pre-cadastro-avatares', 'perfis_usuario');

-- DOWN (compensatória, forward-only):
-- UPDATE storage.buckets SET file_size_limit = 5242880, allowed_mime_types = NULL
--  WHERE id IN ('pre-cadastro-avatares', 'perfis_usuario');
-- Reverter só faz sentido se o projeto sair do plano gratuito: o limite de
-- 5 MB é justamente o que permitiu o estouro.
