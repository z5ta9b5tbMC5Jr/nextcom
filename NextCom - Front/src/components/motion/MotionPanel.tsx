import { motion, type HTMLMotionProps } from 'motion/react'
import { motionTokens, useNextMotion } from '@/lib/motion'

/** Reveal once per mount; filtering must not remount the panel. */
export function MotionPanel({ children, ...props }: HTMLMotionProps<'section'>) {
  const { reduced } = useNextMotion()
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reduced ? 0 : motionTokens.reveal, ease: motionTokens.ease }}
      {...props}
    >
      {children}
    </motion.section>
  )
}
