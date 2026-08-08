import { MX_MOTION } from '@/design-system/tokens'

// Motion canônico (T4.7) — duração/easing derivados de MX_MOTION (primitives
// `--mx-duration-*` / `--mx-easing-*`, MD3). A string CSS `cubic-bezier(...)`
// dos primitives não é aceita por motion/react; converte para o array bezier
// equivalente `[x1, y1, x2, y2]` na fronteira, preservando a curva exata.
const bezierFromCss = (css) => {
  const m = css.match(/cubic-bezier\(([^)]+)\)/)
  return m ? m[1].split(',').map((v) => Number(v.trim())) : css
}

export const easing = {
  standard: bezierFromCss(MX_MOTION.easing.standard),
  enter: bezierFromCss(MX_MOTION.easing.enter),
  exit: bezierFromCss(MX_MOTION.easing.exit),
  emphasized: bezierFromCss(MX_MOTION.easing.emphasized),
}

export const duration = {
  fast: MX_MOTION.duration.fast / 1000,
  normal: MX_MOTION.duration.normal / 1000,
  slow: MX_MOTION.duration.slow / 1000,
  deliberate: MX_MOTION.duration.deliberate / 1000,
}

export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: easing.standard } },
  exit: { opacity: 0, y: -6, transition: { duration: duration.fast, ease: easing.exit } },
}

export const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: easing.standard } },
}

export const listContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.035,
    },
  },
}

export const rowVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: easing.standard } },
}

export const modalVariants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: duration.normal, ease: easing.emphasized } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: duration.fast, ease: easing.exit } },
}

export const drawerVariants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { duration: duration.slow, ease: easing.emphasized } },
  exit: { x: '100%', transition: { duration: duration.normal, ease: easing.exit } },
}
