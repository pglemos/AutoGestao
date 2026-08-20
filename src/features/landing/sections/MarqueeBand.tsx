/**
 * Static grid bands used as section dividers.
 * `variant="main"` = feature grid after Hero.
 * `variant="micro"` = compact grid after Problem section.
 * Replaces auto-scrolling marquee with user-controlled static content.
 */
type Props = { variant?: 'main' | 'micro' }

const MAIN_ITEMS = [
  ['Lançamento diário', false],
  ['Funil MX', false],
  ['Ranking ao vivo', true],
  ['Devolutivas', false],
  ['PDI 360', false],
  ['MX Academy', true],
  ['Visitas PMR', false],
  ['DRE', false],
  ['ROI', true],
] as const

const MICRO_ITEMS = [
  'Rotina vira rastro',
  'Rastro vira dado',
  'Dado vira decisão',
] as const

function MainGridContent() {
  return (
    <div className="feature-grid" role="list">
      {MAIN_ITEMS.map(([label, italic], i) => (
        <div key={i} className="feature-card" role="listitem">
          <span className={italic ? 'it' : ''}>{label}</span>
          <span className="star">✦</span>
        </div>
      ))}
    </div>
  )
}

function MicroGridContent() {
  return (
    <div className="micro-grid" role="list">
      {MICRO_ITEMS.map((item, i) => (
        <div key={i} className="micro-card" role="listitem">
          <span>
            {item.split(' vira ')[0]} <span className="it">vira</span> {item.split(' vira ')[1]}
          </span>
          <span className="star">✦</span>
        </div>
      ))}
    </div>
  )
}

export function MarqueeBand({ variant = 'main' }: Props) {
  if (variant === 'micro') {
    return (
      <div className="micro-grid-wrapper" aria-label="Rotina para decisão">
        <MicroGridContent />
      </div>
    )
  }
  return (
    <div className="feature-grid-wrapper" aria-label="Funcionalidades MX Performance">
      <MainGridContent />
    </div>
  )
}
