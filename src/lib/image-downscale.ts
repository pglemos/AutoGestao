/**
 * Redimensionamento de imagem antes do upload.
 *
 * O bucket público de avatares acumulou 107 MB em 90 arquivos (média de
 * 1,2 MB, maior com 3,2 MB) porque a foto ia para o storage exatamente como
 * saiu da câmera do celular. Como o bucket é público, cada leitura passa pelo
 * CDN e conta como *cached egress* — foi o que estourou a cota do plano.
 *
 * Um avatar é renderizado no máximo em ~64 px. Guardar 3 MB para exibir 64 px
 * é desperdício puro: 256 px em JPEG 0,82 resolve com ~25 KB.
 */

export const AVATAR_MAX_DIMENSION = 256
export const AVATAR_JPEG_QUALITY = 0.82
/** Teto do arquivo já reduzido. Acima disso algo deu errado no downscale. */
export const AVATAR_MAX_OUTPUT_BYTES = 512 * 1024

export interface Dimensions {
  width: number
  height: number
}

/**
 * Calcula a dimensão de saída preservando proporção e sem ampliar imagem
 * pequena — reprocessar um avatar de 80 px para 256 px só aumentaria o arquivo.
 */
export function fitWithin(source: Dimensions, maxDimension = AVATAR_MAX_DIMENSION): Dimensions {
  const largest = Math.max(source.width, source.height)
  if (largest <= 0) return { width: 0, height: 0 }
  if (largest <= maxDimension) return { width: source.width, height: source.height }
  const ratio = maxDimension / largest
  return {
    width: Math.max(1, Math.round(source.width * ratio)),
    height: Math.max(1, Math.round(source.height * ratio)),
  }
}

/** Nome do arquivo depois da conversão para JPEG. */
export function jpegFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'avatar'
  return `${base}.jpg`
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    image.src = url
  })
}

/**
 * Reduz a imagem para caber em `maxDimension` e devolve um JPEG.
 *
 * Em ambiente sem canvas (SSR, teste de nó) devolve o arquivo original: é
 * melhor subir a foto grande do que perder o cadastro do vendedor.
 */
export async function downscaleImageFile(
  file: File,
  maxDimension = AVATAR_MAX_DIMENSION,
  quality = AVATAR_JPEG_QUALITY,
): Promise<File> {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return file

  try {
    const image = await loadImage(file)
    const target = fitWithin({ width: image.naturalWidth, height: image.naturalHeight }, maxDimension)
    if (target.width === 0 || target.height === 0) return file

    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(image, 0, 0, target.width, target.height)

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(result => resolve(result), 'image/jpeg', quality)
    })
    if (!blob) return file

    // Foto já pequena e otimizada: reprocessar só pioraria (recompressão de
    // JPEG perde qualidade sem ganhar bytes).
    if (blob.size >= file.size) return file

    return new File([blob], jpegFileName(file.name), { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
