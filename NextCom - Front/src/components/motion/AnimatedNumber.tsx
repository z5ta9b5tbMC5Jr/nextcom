import { useLayoutEffect, useRef } from 'react'
import { animate } from 'motion'
import { useNextMotion, motionTokens } from '@/lib/motion'
import { currency, decimal, number } from '@/lib/data'

type Format = 'currency' | 'integer' | 'percent' | 'multiple'
const formatters: Record<Format, (value: number) => string> = {
  currency,
  integer: number,
  percent: (value) => `${decimal(value)}%`,
  multiple: (value) => `${decimal(value)}x`,
}

/** Interrupt from the current displayed value; never rerender React every frame. */
export function AnimatedNumber({ value, format = 'integer' }: { value: number; format?: Format }) {
  const node = useRef<HTMLSpanElement>(null)
  const current = useRef(value)
  const { reduced } = useNextMotion()
  const formatValue = formatters[format]
  useLayoutEffect(() => {
    if (!node.current) return
    if (reduced || current.current === value) {
      current.current = value
      node.current.textContent = formatValue(value)
      return
    }
    const control = animate(current.current, value, {
      duration: motionTokens.data,
      ease: motionTokens.ease,
      onUpdate: (latest) => {
        current.current = latest
        if (node.current) node.current.textContent = formatValue(latest)
      },
      onComplete: () => {
        current.current = value
        if (node.current) node.current.textContent = formatValue(value)
      },
    })
    return () => control.stop()
  }, [value, formatValue, reduced])
  return (
    <span className="animated-number">
      <span ref={node} aria-hidden="true">
        {formatValue(value)}
      </span>
      <span className="sr-only">{formatValue(value)}</span>
    </span>
  )
}
