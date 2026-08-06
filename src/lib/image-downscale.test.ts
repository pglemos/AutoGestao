import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { AVATAR_MAX_DIMENSION, fitWithin, jpegFileName } from './image-downscale'

const avatarSource = readFileSync(new URL('./avatar.ts', import.meta.url), 'utf8')
const preRegistrationSource = readFileSync(new URL('../pages/StorePreRegistration.tsx', import.meta.url), 'utf8')
const rankingAvatarSource = readFileSync(
  new URL('../features/ranking/components/base44/RankingAvatar.tsx', import.meta.url),
  'utf8',
)
const bucketMigration = readFileSync(
  new URL('../../supabase/migrations/20260806120000_limit_public_avatar_buckets.sql', import.meta.url),
  'utf8',
)

describe('fitWithin', () => {
  test('reduz o lado maior para o teto preservando proporção', () => {
    expect(fitWithin({ width: 3000, height: 1500 })).toEqual({ width: 256, height: 128 })
    expect(fitWithin({ width: 1500, height: 3000 })).toEqual({ width: 128, height: 256 })
  })

  test('não amplia imagem menor que o teto', () => {
    expect(fitWithin({ width: 80, height: 80 })).toEqual({ width: 80, height: 80 })
  })

  test('quadrado grande vira exatamente o teto', () => {
    expect(fitWithin({ width: 4000, height: 4000 })).toEqual({
      width: AVATAR_MAX_DIMENSION,
      height: AVATAR_MAX_DIMENSION,
    })
  })

  test('dimensão inválida não quebra', () => {
    expect(fitWithin({ width: 0, height: 0 })).toEqual({ width: 0, height: 0 })
  })

  test('nunca devolve zero para imagem muito estreita', () => {
    const resultado = fitWithin({ width: 4000, height: 3 })
    expect(resultado.width).toBe(256)
    expect(resultado.height).toBeGreaterThanOrEqual(1)
  })
})

describe('jpegFileName', () => {
  test('troca a extensão', () => {
    expect(jpegFileName('foto.png')).toBe('foto.jpg')
    expect(jpegFileName('foto.HEIC')).toBe('foto.jpg')
  })

  test('nome sem extensão continua válido', () => {
    expect(jpegFileName('foto')).toBe('foto.jpg')
  })
})

describe('contenção de egress nos avatares', () => {
  test('upload de perfil reduz a imagem antes de subir', () => {
    expect(avatarSource).toContain('downscaleImageFile')
    expect(avatarSource).toContain('.upload(path, optimized')
  })

  test('URL pública deixa de furar o cache do CDN', () => {
    expect(avatarSource).not.toContain('?t=${Date.now()}')
    expect(avatarSource).toContain("cacheControl: '31536000'")
  })

  test('pré-cadastro também reduz antes de gerar o base64', () => {
    expect(preRegistrationSource).toContain('const optimized = await downscaleImageFile(file)')
    expect(preRegistrationSource).toContain('reader.readAsDataURL(optimized)')
  })

  // O atom `Avatar` e `PreRegistrationQueue` ficaram de fora: os dois carregam
  // tokens legados congelados no baseline imutável do design system de gestão,
  // e qualquer alteração no arquivo reabriria essas violações no CI. Com o
  // avatar em ~10 KB depois da recompressão, o lazy nesses dois é ganho
  // marginal — não vale reestilizar um atom compartilhado por causa disso.
  test('avatar de lista de ranking carrega sob demanda', () => {
    expect(rankingAvatarSource).toContain('loading="lazy"')
    expect(rankingAvatarSource).toContain('decoding="async"')
  })

  test('bucket público recusa arquivo gordo no servidor', () => {
    expect(bucketMigration).toContain('file_size_limit = 524288')
    expect(bucketMigration).toContain("'pre-cadastro-avatares', 'perfis_usuario'")
  })
})
