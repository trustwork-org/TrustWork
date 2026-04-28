import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const phrases = [
  'Every time. On-chain.',
  'No middlemen. Ever.',
  'Instant. Trustless. Yours.',
  'Powered by smart contracts.',
  'Zero platform bans. Forever.',
]

export default function TypewriterText() {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    const current = phrases[index]

    if (typing) {
      if (displayed.length < current.length) {
        const t = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 45)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setTyping(false), 1800)
        return () => clearTimeout(t)
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 25)
        return () => clearTimeout(t)
      } else {
        setIndex(i => (i + 1) % phrases.length)
        setTyping(true)
      }
    }
  }, [displayed, typing, index])

  return (
    <span className="text-[#14a800] inline-flex items-center gap-1">
      <AnimatePresence mode="wait">
        <motion.span
          key={displayed}
          initial={{ opacity: 1 }}
          className="inline-block"
        >
          {displayed}
        </motion.span>
      </AnimatePresence>
      {/* blinking cursor */}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="inline-block w-[3px] h-[0.85em] bg-[#14a800] rounded-sm align-middle ml-0.5"
      />
    </span>
  )
}
