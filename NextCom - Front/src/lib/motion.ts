import { useEffect, useRef } from 'react'
import { useMotionPreferences } from '@/components/motion/MotionPreferences'

// Seconds for Motion; matching CSS tokens live in motion.css.
export const motionTokens = {
  fast: 0.16,
  enter: 0.32,
  exit: 0.18,
  reveal: 0.48,
  data: 0.52,
  ease: [0.22, 1, 0.36, 1] as const,
  easeOut: [0.4, 0, 1, 1] as const,
}

export function useNextMotion() {
  const { reduced } = useMotionPreferences()
  return {
    reduced,
    transition: { duration: reduced ? 0 : motionTokens.enter, ease: motionTokens.ease },
    presence: {
      initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: reduced ? 0 : -5, transition: { duration: reduced ? 0 : motionTokens.exit } },
      transition: { duration: reduced ? 0 : motionTokens.enter, ease: motionTokens.ease },
    },
  }
}

/** Keep content intact while its overlay plays the closing animation. */
export function useRetainedValue<T>(value: T | null | undefined) {
  const last = useRef(value)
  useEffect(() => {
    if (value != null) last.current = value
  }, [value])
  return value ?? last.current
}
