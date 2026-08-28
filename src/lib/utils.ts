import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Utilities tipográficas próprias do MX. Todas começam com `text-`, e é aí que
 * mora a armadilha: o tailwind-merge, sem conhecê-las, classifica
 * `text-<desconhecido>` como COR e descarta a cor declarada antes.
 *
 * O efeito era invisível na leitura do código e visível no runtime:
 *
 *   twMerge('bg-brand-primary text-white', 'text-mx-micro')
 *     -> 'bg-brand-primary text-mx-micro'      // o branco sumiu
 *
 * Foi o que deixou o Badge `brand` com texto quase preto sobre o verde da
 * marca (3.19:1) em /relatorios/performance-vendas — 21 nós de color-contrast
 * medidos pelo sweep da FASE V que NÃO eram erro de quem escreveu a tela.
 *
 * Declarar as classes como font-size devolve a precedência à cor.
 */
export const MX_FONT_SIZE_UTILITIES = [
    // Escala semântica (@utility em design-system/tokens/semantic.css)
    'display',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'body',
    'body-sm',
    'caption',
    'label',
    'data',
    // Degraus legados declarados em index.css. Todo nome aqui PRECISA existir em
    // CSS: um degrau registrado e não definido não é inerte — ele vence o merge
    // e apaga o tamanho que o componente declarou, deixando o elemento herdando
    // do pai. Foi o que `mx-nano` fez em 75 pontos até 2026-08-27.
    'mx-micro',
    'mx-tiny',
]

const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': MX_FONT_SIZE_UTILITIES.map(name => `text-${name}`),
        },
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

type JsonLikeObject = Record<string, unknown>

function isPlainObject(value: unknown): value is JsonLikeObject {
    return value !== null && typeof value === 'object' && value.constructor === Object
}

export function toCamelCase<T>(obj: T): unknown {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v))
    } else if (isPlainObject(obj)) {
        return Object.keys(obj).reduce<JsonLikeObject>((result, key) => {
            const camelKey = key.replace(/([-_][a-z])/g, group =>
                group.toUpperCase().replace('-', '').replace('_', '')
            )
            result[camelKey] = toCamelCase(obj[key])
            return result
        }, {})
    }
    return obj
}

export function toSnakeCase<T>(obj: T): unknown {
    if (Array.isArray(obj)) {
        return obj.map(v => toSnakeCase(v))
    } else if (isPlainObject(obj)) {
        return Object.keys(obj).reduce<JsonLikeObject>((result, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
            result[snakeKey] = toSnakeCase(obj[key])
            return result
        }, {})
    }
    return obj
}

export function getAvatarUrl(name: string, options?: { size?: number; background?: string; color?: string }): string {
    const params = new URLSearchParams({ name, size: String(options?.size ?? 128) })
    if (options?.background) params.set('background', options.background)
    if (options?.color) params.set('color', options.color)
    return `https://ui-avatars.com/api/?${params.toString()}`
}

export function getPublicAppOrigin(): string {
    const configured = (import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL || '').trim()
    if (configured) {
        try {
            return new URL(configured).origin
        } catch {
            // Invalid local config should not break rendering public links.
        }
    }

    if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
        return window.location.origin
    }
    return 'https://mxperformance.vercel.app'
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     
    .replace(/[^\w-]+/g, '') 
    .replace(/\-\-+/g, '-')   
    .replace(/^-+|-+$/g, '')
}

export function getPreRegistrationLink(storeName: string): string {
    return `${getPublicAppOrigin()}/pre-cadastro/${slugify(storeName)}`
}
