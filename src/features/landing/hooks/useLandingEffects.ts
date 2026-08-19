import { useEffect, useRef } from 'react'
import { FONTS_HREF } from '../data/landing-css'

declare global {
  interface Window {
    MXTextEffects?: {
      mountVapour: (el: HTMLElement, opts: Record<string, unknown>) => void
      mountParticle: (el: HTMLElement, opts: Record<string, unknown>) => void
    }
  }
}

/**
 * Encapsula todos os side-effects da landing MXPerformance:
 * - body class + fonts + título
 * - scroll progress + topbar shadow
 * - IntersectionObserver para reveal + counter
 * - custom cursor + module radial glow + console parallax
 * - mount lazy do text-effects.js (vapour + particle)
 *
 * Refs são expostos para o container conectar aos nós JSX renderizados pelas sections.
 */
export function useLandingEffects() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const progRef = useRef<HTMLDivElement>(null)
  const topbarRef = useRef<HTMLElement>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const heroVapourRef = useRef<HTMLSpanElement>(null)
  const particleStageRef = useRef<HTMLDivElement>(null)

  // Body class + meta + fonts
  useEffect(() => {
    document.body.classList.add('mxp-active')
    const prevTitle = document.title
    document.title = 'MX PERFORMANCE'

    let fontsLink = document.querySelector<HTMLLinkElement>('link[data-mxp-fonts]')
    if (!fontsLink) {
      const pre1 = document.createElement('link')
      pre1.rel = 'preconnect'
      pre1.href = 'https://fonts.googleapis.com'
      pre1.setAttribute('data-mxp-fonts', '1')
      document.head.appendChild(pre1)

      const pre2 = document.createElement('link')
      pre2.rel = 'preconnect'
      pre2.href = 'https://fonts.gstatic.com'
      pre2.crossOrigin = ''
      pre2.setAttribute('data-mxp-fonts', '1')
      document.head.appendChild(pre2)

      fontsLink = document.createElement('link')
      fontsLink.rel = 'stylesheet'
      fontsLink.href = FONTS_HREF
      fontsLink.setAttribute('data-mxp-fonts', '1')
      document.head.appendChild(fontsLink)
    }

    return () => {
      document.body.classList.remove('mxp-active')
      document.title = prevTitle
      document.querySelectorAll('[data-mxp-fonts]').forEach((n) => n.remove())
    }
  }, [])

  // Scroll progress + topbar shadow
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (topbarRef.current) topbarRef.current.classList.toggle('scrolled', y > 24)
      if (progRef.current) {
        const h = document.documentElement.scrollHeight - window.innerHeight
        progRef.current.style.width = Math.min(100, (y / Math.max(h, 1)) * 100) + '%'
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reveal observer + counter
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )
    document.querySelectorAll('.mxp-root [data-reveal]').forEach((el) => io.observe(el))

    requestAnimationFrame(() => {
      document.querySelectorAll('.mxp-root .hero [data-reveal], .mxp-root .hero h1').forEach((el) =>
        el.classList.add('in')
      )
    })

    const counterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement
          const target = parseInt(el.dataset.counter ?? '0', 10)
          const small = el.querySelector('small')
          const dur = 1600
          const start = performance.now()
          const fmt = (n: number) => (target >= 1000 ? n.toLocaleString('pt-BR') : String(n))
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / dur)
            const eased = 1 - Math.pow(1 - p, 3)
            const v = Math.floor(target * eased)
            el.textContent = fmt(v)
            if (small) el.appendChild(small)
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          counterIO.unobserve(el)
        })
      },
      { threshold: 0.4 }
    )
    document.querySelectorAll('.mxp-root [data-counter]').forEach((el) => counterIO.observe(el))

    return () => {
      io.disconnect()
      counterIO.disconnect()
    }
  }, [])

  // Custom cursor
  useEffect(() => {
    const cursor = cursorRef.current
    const isFine = window.matchMedia('(pointer: fine)').matches
    let raf = 0
    if (cursor && isFine) {
      cursor.classList.add('on')
      let mx = 0
      let my = 0
      let cx = 0
      let cy = 0
      const onMove = (e: MouseEvent) => {
        mx = e.clientX
        my = e.clientY
      }
      document.addEventListener('mousemove', onMove)
      const loop = () => {
        cx += (mx - cx) * 0.22
        cy += (my - cy) * 0.22
        cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`
        raf = requestAnimationFrame(loop)
      }
      loop()

      const onEnter = () => cursor.classList.add('lg')
      const onLeave = () => cursor.classList.remove('lg')
      const targets = document.querySelectorAll(
        '.mxp-root a, .mxp-root button, .mxp-root .pcard, .mxp-root .mod, .mxp-root .step-card, .mxp-root .mli, .mxp-root .proof-cell, .mxp-root .faq-q, .mxp-root .cta-list li, .mxp-root .problem-list li'
      )
      targets.forEach((t) => {
        t.addEventListener('mouseenter', onEnter)
        t.addEventListener('mouseleave', onLeave)
      })

      return () => {
        document.removeEventListener('mousemove', onMove)
        targets.forEach((t) => {
          t.removeEventListener('mouseenter', onEnter)
          t.removeEventListener('mouseleave', onLeave)
        })
        cancelAnimationFrame(raf)
      }
    }
  }, [])

  // Module radial glow
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.mxp-root .mod')
    const handlers: Array<[HTMLElement, (e: MouseEvent) => void]> = []
    cards.forEach((card) => {
      const handler = (e: MouseEvent) => {
        const r = card.getBoundingClientRect()
        const x = ((e.clientX - r.left) / r.width) * 100
        const y = ((e.clientY - r.top) / r.height) * 100
        card.style.setProperty('--mx-x', x + '%')
        card.style.setProperty('--mx-y', y + '%')
      }
      card.addEventListener('mousemove', handler)
      handlers.push([card, handler])
    })
    return () => {
      handlers.forEach(([c, h]) => c.removeEventListener('mousemove', h))
    }
  }, [])

  // Console parallax
  useEffect(() => {
    const con = consoleRef.current
    const isFine = window.matchMedia('(pointer: fine)').matches
    if (!con || !isFine) return
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 6
      const dy = (e.clientY / window.innerHeight - 0.5) * 6
      con.style.transform = `perspective(1000px) rotateY(${-dx * 0.4}deg) rotateX(${dy * 0.4}deg) translateY(${dy * 0.6}px)`
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  // text-effects.js (vapour + particle)
  useEffect(() => {
    let cancelled = false
    const mount = () => {
      if (cancelled) return
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      const heroEl = heroVapourRef.current
      if (heroEl && window.MXTextEffects) {
        const computed = getComputedStyle(heroEl.closest('.hero-title') ?? heroEl)
        const px = parseFloat(computed.fontSize) || 110
        heroEl.style.height = px * 1.05 + 'px'
        heroEl.style.width = '100%'
        if (!reduce) {
          window.MXTextEffects.mountVapour(heroEl, {
            texts: ['improviso.', 'achismo.', 'planilha.', 'ruído.', 'atraso.'],
            color: 'rgb(31,203,110)',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: Math.round(px * 0.96),
            spread: 3.5,
            density: 7,
            align: 'left',
            direction: 'left-to-right',
            vaporizeDuration: 1.6,
            fadeInDuration: 0.8,
            waitDuration: 1.8,
          })
          heroEl.parentElement?.classList.add('vapour-enhanced')
        } else {
          heroEl.replaceChildren()
        }
      }
      const particleEl = particleStageRef.current
      if (particleEl && window.MXTextEffects && !reduce) {
        window.MXTextEffects.mountParticle(particleEl, {
          words: ['LANÇAMENTO', 'MÉTODO', 'ROTINA', 'RESULTADO', 'DISCIPLINA', 'CONTROLE'],
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: 130,
          accent: [31, 203, 110],
          drift: [220, 235, 226],
          pixelStep: 5,
          intervalSec: 3.5,
        })
      } else if (particleEl) {
        particleEl.innerHTML =
          '<div style="font-family:Inter,sans-serif;font-weight:700;font-size:64px;color:#00A89D;text-align:center;line-height:1;letter-spacing:-.04em">MÉTODO</div>'
      }
    }
    if (window.MXTextEffects) {
      mount()
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-mxp-effects]')
      if (existing) {
        existing.addEventListener('load', mount)
      } else {
        const s = document.createElement('script')
        s.src = '/landing/text-effects.js'
        s.async = true
        s.setAttribute('data-mxp-effects', '1')
        s.onload = mount
        document.head.appendChild(s)
      }
    }
    return () => {
      cancelled = true
    }
  }, [])

  return { cursorRef, progRef, topbarRef, consoleRef, heroVapourRef, particleStageRef }
}

export const onFaqClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  const item = e.currentTarget.closest('.faq-item')
  item?.classList.toggle('open')
}
