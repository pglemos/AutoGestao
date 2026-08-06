import { useState } from 'react'

type Props = {
  nome: string
  foto?: string | null
  size?: number
  border?: string
  gradient?: string
}

export function RankingAvatar({ nome, foto, size = 64, border, gradient = 'linear-gradient(135deg, var(--color-brand-primary), var(--color-chart-2))' }: Props) {
  const [imgError, setImgError] = useState(false)
  const initials = nome ? nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  const showFallback = !foto || imgError
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: showFallback ? gradient : undefined,
        border: border ?? '3px solid var(--color-border-default)',
        fontSize: size * 0.32,
      }}
    >
      {showFallback ? initials : <img src={foto} alt={nome} className="w-full h-full rounded-full object-cover" loading="lazy" decoding="async" onError={() => setImgError(true)} />}
    </div>
  )
}

export default RankingAvatar
