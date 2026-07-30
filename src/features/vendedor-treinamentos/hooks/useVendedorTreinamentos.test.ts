import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { categoriaDoTreinamento } from './useVendedorTreinamentos'

describe('categoriaDoTreinamento', () => {
    test('mapeia os tipos conhecidos para a categoria de exibição', () => {
        expect(categoriaDoTreinamento('prospeccao')).toBe('Prospecção')
        expect(categoriaDoTreinamento('fechamento')).toBe('Fechamento')
        expect(categoriaDoTreinamento('crm')).toBe('Carteira')
    })

    test('cai em Atendimento para tipo desconhecido ou ausente', () => {
        expect(categoriaDoTreinamento('tipo-nunca-visto')).toBe('Atendimento')
        expect(categoriaDoTreinamento(null)).toBe('Atendimento')
        expect(categoriaDoTreinamento(undefined)).toBe('Atendimento')
    })
})

// P0-03 (auditoria 2026-07-10): trava as duas regressões mais fáceis de
// reintroduzir sem perceber — voltar a fabricar "Impacto no Score +12" /
// quiz_score/hours_studied fixos (como o shim base44Client fazia), ou voltar
// a derivar o nível de maturidade por completedCount/3 em vez da função
// canônica (tempo de mercado + experiência + cargo).
describe('VendedorTreinamentos — sem dados fabricados (P0-03)', () => {
    const hookSource = readFileSync(new URL('./useVendedorTreinamentos.ts', import.meta.url), 'utf8')
    const containerSource = readFileSync(new URL('../VendedorTreinamentos.container.tsx', import.meta.url), 'utf8')

    test('não fabrica quiz_score/hours_studied/attended_live fixos', () => {
        expect(hookSource).not.toMatch(/quiz_score:\s*100/)
        expect(hookSource).not.toMatch(/hours_studied:\s*0\.5/)
        expect(hookSource).not.toMatch(/attended_live:\s*true/)
    })

    test('não hardcoda "Impacto no Score +12"', () => {
        expect(containerSource).not.toContain('+12')
        expect(containerSource).not.toContain('Impacto no Score')
    })

    test('nível de maturidade vem da função canônica, não de completedCount/3', () => {
        expect(hookSource).toContain('derivarNivelMaturidadeVendedor')
        expect(containerSource).not.toMatch(/completedCount\s*\/\s*3/)
        expect(containerSource).not.toMatch(/Math\.floor\(completedCount/)
    })
})

describe('VendedorTreinamentos — contrato visual anterior', () => {
    const containerSource = readFileSync(new URL('../VendedorTreinamentos.container.tsx', import.meta.url), 'utf8')

    test('preserva cabeçalho, cinco indicadores compactos, abas pill e recomendados do layout original', () => {
        expect(containerSource).toContain('<PageHeader title="Treinamentos"')
        expect(containerSource).toContain('grid grid-cols-2 lg:grid-cols-5 gap-4')
        expect(containerSource).toContain('TabsList className="bg-white border border-slate-100 rounded-xl p-1"')
        expect(containerSource).toContain('Recomendado para Você')
        expect(containerSource).not.toContain('<PageHeading title="Universidade MX"')
        expect(containerSource).not.toContain('<TabNavPill')
    })

    test('usa os mesmos limites, margens e padding responsivo da tela de Ranking', () => {
        expect(containerSource).toContain('overflow-y-auto bg-gray-50 font-body no-scrollbar px-mx-sm py-mx-md sm:px-mx-md lg:px-mx-lg pb-12')
        expect(containerSource).toContain('mx-auto w-full max-w-[1500px] space-y-8')
    })
})
