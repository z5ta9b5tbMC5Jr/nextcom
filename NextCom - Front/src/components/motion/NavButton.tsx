import { motion } from 'motion/react'
import { useNextMotion } from '@/lib/motion'
import type { ReactNode } from 'react'

export function NavButton({
  active,
  children,
  onClick,
  className = '',
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  const { reduced } = useNextMotion()
  return (
    <motion.button
      className={`nav-item animated-nav ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      aria-current={active ? 'location' : undefined}
      whileHover={reduced ? undefined : { x: 5 }}
      whileTap={reduced ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      {active && (
        <motion.span
          className="nav-active-surface"
          layoutId="sidebar-active"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 29 }}
        />
      )}
      {children}
    </motion.button>
  )
}
