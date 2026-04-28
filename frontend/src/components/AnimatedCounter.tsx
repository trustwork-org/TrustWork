import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface Props { to: string }

// Parses "$2.4M", "3,841", "98.2%", "12,400+" into a number + prefix/suffix
function parse(val: string) {
  const prefix = val.startsWith('$') ? '$' : ''
  const suffix = val.endsWith('%') ? '%' : val.endsWith('+') ? '+' : val.endsWith('M') ? 'M' : ''
  const raw = val.replace(/[$%+M,]/g, '')
  return { prefix, suffix, num: parseFloat(raw) }
}

export default function AnimatedCounter({ to }: Props) {
  const { prefix, suffix, num } = parse(to)
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const duration = 1800
    const steps = 60
    const increment = num / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= num) { setCount(num); clearInterval(timer) }
      else setCount(current)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [inView, num])

  const display = num % 1 !== 0
    ? count.toFixed(1)
    : Math.floor(count).toLocaleString()

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}
