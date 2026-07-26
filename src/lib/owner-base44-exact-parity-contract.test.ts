import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('contrato do shell universal do módulo Dono', () => {
  it('monta /dono/* como filho protegido do Layout universal', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('<Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>')
    expect(app).toContain('<Route path="/dono/*" element={<Suspense fallback={<Spinner />}><OwnerModule /></Suspense>} />')
    expect(app).not.toContain('<Route path="/dono/*" element={<ProtectedRoute>')
  })

  it('mantém os dados reais e o modal funcional sem layout visual paralelo', () => {
    const module = read('src/features/owner-base44/OwnerModule.tsx')
    expect(module).toContain("import { OwnerProvider } from '@/components/owner/OwnerContext'")
    expect(module).toContain("import ConsultantRequestModal from '@/components/owner/ConsultantRequestModal'")
    expect(module).toContain("import OwnerLiveDataPage from '@/features/owner-base44/OwnerLiveDataPage'")
    expect(module).toContain('<Route path="*" element={<OwnerLiveDataPage />} />')
    expect(module).toContain('<Route path="plano-acao" element={<PlanoDeAcao />} />')
    expect(module).not.toContain('OwnerLayout')
    expect(module).not.toContain('OwnerSidebar')
    expect(module).not.toContain('OwnerTopbar')
    expect(module).not.toContain('owner-base44-exact')
    expect(module).not.toContain('owner-b44')
  })

  it('remove os artefatos visuais Base44 que não podem voltar ao bundle', () => {
    const forbidden = [
      'src/components/owner/OwnerLayout.jsx',
      'src/components/owner/OwnerSidebar.jsx',
      'src/components/owner/OwnerTopbar.jsx',
      'src/styles/owner-base44-exact.css',
      'src/styles/owner-base44-fixes.css',
      'src/styles/owner-base44-visual-scope.css',
    ]
    for (const file of forbidden) expect(existsSync(resolve(root, file)), file).toBe(false)
  })

  it('mantém o vínculo de consultoria à sessão autenticada', () => {
    const adapter = read('src/features/owner-base44/b44adapter.js')
    expect(adapter).toContain('const { data: auth, error: authError } = await supabase.auth.getUser()')
    expect(adapter).toContain("if (authError || !userId) throw new Error('Usuário não identificado')")
    expect(adapter).not.toContain('payload.created_by')
  })
})
