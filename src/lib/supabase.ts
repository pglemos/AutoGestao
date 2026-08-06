import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * MX Performance Supabase Client (Singleton Pattern)
 * Este padrão garante que apenas uma instância do cliente exista no ciclo de vida da aplicação,
 * prevenindo vazamentos de memória e comportamentos instáveis no GoTrue (Auth).
 */

const supabaseUrl = 
    import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_PUBLIC_SUPABASE_URL || 
    ''

const supabaseAnonKey = 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || 
    ''

export function getSupabaseUrl(): string {
    return supabaseUrl
}

export function getSupabaseAnonKey(): string {
    return supabaseAnonKey
}

export function getSupabaseFunctionHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders }

    if (supabaseAnonKey) {
        headers.apikey = supabaseAnonKey
        if (!headers.Authorization && !headers.authorization) {
            headers.Authorization = `Bearer ${supabaseAnonKey}`
        }
    }

    return headers
}

export function getSupabaseFunctionUrl(functionName: string): string {
    if (!supabaseUrl) {
        throw new Error('Supabase URL missing. Check your .env file.')
    }

    return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName.replace(/^\//, '')}`
}

/**
 * Verifica se as credenciais do Supabase estão presentes.
 * @param url URL do projeto Supabase
 * @param anonKey Chave anônima do Supabase
 * @returns boolean indicando se as credenciais são válidas
 */
export function checkSupabaseCredentials(url?: string, anonKey?: string): boolean {
    if (!url || !anonKey) {
        console.warn('Supabase credentials missing. Check your .env file.')
        return false
    }
    return true
}

/**
 * Extrai a mensagem real de erro de uma chamada `supabase.functions.invoke`.
 *
 * Quando a Edge Function responde com status não-2xx, o supabase-js lança
 * FunctionsHttpError com `.message` genérico ("Edge Function returned a
 * non-2xx status code") — o corpo JSON real (com o motivo de negócio) fica em
 * `error.context`, uma Response ainda não lida.
 */
export type FunctionInvokeErrorDetail = {
    message: string
    code?: string
    existing_user?: {
        id: string
        name: string
        email: string
        current_store_id: string | null
        current_store_name: string
    }
}

export async function resolveFunctionInvokeDetail(
    error: unknown,
    data: unknown,
    fallback = 'Erro desconhecido',
): Promise<FunctionInvokeErrorDetail> {
    const dataObj = data as { error?: string; code?: string; existing_user?: any } | null
    if (dataObj?.error) {
        return {
            message: dataObj.error,
            code: dataObj.code,
            existing_user: dataObj.existing_user,
        }
    }

    if (error && typeof error === 'object') {
        const context = (error as { context?: unknown }).context
        if (context instanceof Response) {
            try {
                const body = await context.clone().json()
                if (body?.error) {
                    return {
                        message: body.error,
                        code: body.code,
                        existing_user: body.existing_user,
                    }
                }
            } catch {
                // corpo não é JSON ou já foi consumido — segue pro fallback
            }
        }
        const message = (error as { message?: string }).message
        if (message) return { message }
    }

    return { message: fallback }
}

export async function resolveFunctionInvokeError(
    error: unknown,
    data: unknown,
    fallback = 'Erro desconhecido',
): Promise<string> {
    const detail = await resolveFunctionInvokeDetail(error, data, fallback)
    return detail.message
}

// Bloqueio inicial para evitar falhas silenciosas difíceis de diagnosticar
if (!supabaseUrl || !supabaseAnonKey) {
    checkSupabaseCredentials(supabaseUrl, supabaseAnonKey)
    if (import.meta.env.PROD) {
        throw new Error('Supabase credentials missing. Check your .env file.')
    }
}

// Variável privada para o Singleton
let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseInstance) {
        // createClient lançará erro caso url ou key estejam vazios
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        })
    }
    return supabaseInstance
}

// Export canonical instance for direct use (backwards compatibility)
export const supabase = getSupabaseClient()
