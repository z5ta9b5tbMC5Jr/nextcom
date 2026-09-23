import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

export type MotionMode = 'system' | 'full' | 'reduced'
const MotionPreferences = createContext({
  reduced: false,
  mode: 'system' as MotionMode,
  setMode: (_mode: MotionMode) => {},
})
export const useMotionPreferences = () => useContext(MotionPreferences)

export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<MotionMode>(() => {
    try {
      const saved = localStorage.getItem('nextcom-motion')
      return saved === 'full' || saved === 'reduced' ? saved : 'system'
    } catch {
      return 'system'
    }
  })
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const reduced = mode === 'reduced' || (mode === 'system' && systemReduced)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
    try {
      localStorage.setItem('nextcom-motion', mode)
    } catch {
      /* Session preference still works. */
    }
  }, [mode, reduced])
  return (
    <MotionPreferences.Provider value={{ reduced, mode, setMode }}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </MotionPreferences.Provider>
  )
}
