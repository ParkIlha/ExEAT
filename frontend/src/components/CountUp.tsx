import { useEffect, useRef, useState } from 'react'

interface Props {
  to: number
  from?: number
  duration?: number
  decimals?: number
  suffix?: string
  className?: string
}

export default function CountUp({
  to,
  from = 0,
  duration = 800,
  decimals = 0,
  suffix = '',
  className,
}: Props) {
  const [value, setValue] = useState(from)
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t
      const progress = Math.min((t - startRef.current) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (to - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [to, from, duration])

  return (
    <span className={className}>
      {value.toFixed(decimals)}{suffix}
    </span>
  )
}
