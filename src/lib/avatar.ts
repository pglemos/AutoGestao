import { supabase } from '@/lib/supabase'
import { getAvatarUrl } from '@/lib/utils'
import { downscaleImageFile } from '@/lib/image-downscale'

export const USER_AVATAR_BUCKET = 'perfis_usuario'
/** Limite do arquivo que o usuário escolhe — a foto é reduzida antes de subir. */
export const USER_AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const USER_AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const AVATAR_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

export function validateUserAvatarFile(file: File): string | null {
    if (!USER_AVATAR_ALLOWED_TYPES.includes(file.type as (typeof USER_AVATAR_ALLOWED_TYPES)[number])) {
        return 'Use JPG, PNG ou WEBP.'
    }

    if (file.size > USER_AVATAR_MAX_SIZE_BYTES) {
        return 'Imagem deve ter no máximo 5MB.'
    }

    return null
}

export function getAvatarDisplayUrl(
    avatarUrl: string | null | undefined,
    name: string | null | undefined,
    options?: { size?: number; background?: string; color?: string },
) {
    return avatarUrl || getAvatarUrl(name || 'MX', options)
}

export async function uploadUserAvatar(userId: string, file: File) {
    const validationError = validateUserAvatarFile(file)
    if (validationError) throw new Error(validationError)

    // O bucket é público: o que sobe aqui é servido pelo CDN e conta como
    // cached egress. Reduzir para 256 px antes do upload troca ~1,2 MB por
    // ~25 KB sem diferença visível num avatar.
    const optimized = await downscaleImageFile(file)

    const extension = AVATAR_EXTENSIONS[optimized.type] || 'jpg'
    const path = `${userId}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
        .from(USER_AVATAR_BUCKET)
        .upload(path, optimized, {
            contentType: optimized.type,
            upsert: true,
            // Um ano de cache: o caminho já carrega o timestamp, então trocar
            // de foto gera URL nova. Sem isto, cada visita revalidava no CDN.
            cacheControl: '31536000',
        })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from(USER_AVATAR_BUCKET).getPublicUrl(path)
    // Sem `?t=`: o caminho já é único por upload, e o query param só servia
    // para furar o cache do CDN a cada leitura.
    return publicUrl
}
