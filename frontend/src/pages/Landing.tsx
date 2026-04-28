import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { FaLock, FaBolt, FaBalanceScale, FaMedal, FaGlobe, FaFileContract, FaArrowRight } from 'react-icons/fa'
import { FiCheckCircle } from 'react-icons/fi'
import TypewriterText from '../components/TypewriterText'
import AnimatedCounter from '../components/AnimatedCounter'

// ── Variants ─────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = (d = 0.1) => ({ show: { transition: { staggerChildren: d } } })

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────
function Reveal({ children, variant = fadeUp, className = '' }: {
  children: React.ReactNode
  variant?: typeof fadeUp
  className?: string
}) {
  const { ref, isInView } = useScrollReveal()
  return (
    <motion.div ref={ref} variants={variant} initial="hidden" animate={isInView ? 'show' : 'hidden'} className={className}>
      {children}
    </motion.div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
const features = [
  { icon: <FaLock />, title: 'Smart Contract Escrow', desc: 'Client funds are locked on-chain the moment a job is posted. No one can touch them until milestones are approved — not even us.' },
  { icon: <FaBolt />, title: 'Instant Milestone Payments', desc: "Approve a milestone and 92% hits the freelancer's wallet in seconds. No 5-day bank delays, no manual processing." },
  { icon: <FaBalanceScale />, title: 'DAO Dispute Resolution', desc: 'Disputes are resolved by staked, independent arbitrators — not a company employee. Outcomes are on-chain and final.' },
  { icon: <FaMedal />, title: 'Soulbound Reputation NFTs', desc: "Your reputation is a non-transferable NFT on your wallet. It can't be deleted, faked, or taken away by a platform ban." },
  { icon: <FaGlobe />, title: 'Social Login or Wallet', desc: 'Sign in with Google and get a smart contract wallet automatically. No seed phrases, no MetaMask required.' },
  { icon: <FaFileContract />, title: 'Full Transparency', desc: 'Every fee, every rule, every outcome is in public smart contract code. No hidden charges, no arbitrary account bans.' },
]

const steps = [
  { n: '01', role: 'Client', title: 'Post a job & deposit', desc: 'Define milestones and amounts. Deposit USDC into the escrow contract. 2% client fee — refunded if you cancel before hiring.' },
  { n: '02', role: 'Freelancer', title: 'Browse & apply', desc: 'Browse open jobs by category, budget, and skill. No bidding wars — just your profile and track record.' },
  { n: '03', role: 'Client', title: 'Approve a freelancer', desc: "Review applicants' soulbound reputation badges. Approve one — work begins immediately, funds stay locked." },
  { n: '04', role: 'Freelancer', title: 'Submit milestones', desc: 'Complete work, submit a milestone with a link or note. Approve and 92% of the milestone amount is released instantly.' },
  { n: '05', role: 'Both', title: 'Dispute if needed', desc: 'Either party can raise a dispute. Three staked arbitrators review IPFS evidence and vote. Majority wins — no appeals.' },
  { n: '06', role: 'Freelancer', title: 'Build your reputation', desc: 'Every completed job counts toward your soulbound NFT tier. Rising Talent → Established Pro → Expert → Elite → Legend.' },
]

const compare = [
  { feature: 'Platform fee', them: '10–20%', us: '2% + 8% per milestone' },
  { feature: 'Payment speed', them: '5–7 business days', us: 'Instant on approval' },
  { feature: 'Dispute resolution', them: 'Centralized staff', us: 'Staked DAO arbitrators' },
  { feature: 'Reputation ownership', them: 'Lives on their servers', us: 'Soulbound NFT on your wallet' },
  { feature: 'Account bans', them: 'Arbitrary, no appeal', us: 'Only after 3 lost disputes' },
  { feature: 'Fee transparency', them: 'Hidden service fees', us: 'All rules in public code' },
  { feature: 'Login', them: 'Email/password only', us: 'Wallet or Google (your choice)' },
]

const stats = [
  { num: '$2.4M', label: 'Total escrowed' },
  { num: '3,841', label: 'Active jobs' },
  { num: '12,400+', label: 'Freelancers' },
  { num: '98.2%', label: 'Completion rate' },
]

// ── Parallax section wrapper ──────────────────────────────────────────────────
function ParallaxSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [40, -40])
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}

// ── Bento feature card ────────────────────────────────────────────────────────
const bentoSizes = [
  'md:col-span-2', // wide
  'md:col-span-1', // normal
  'md:col-span-1', // normal
  'md:col-span-1', // normal
  'md:col-span-1', // normal
  'md:col-span-2', // wide
]

const bentoAccents = [
  'from-[#e6f4e1] to-white',
  'from-white to-[#f0faf0]',
  'from-[#1e1e2d] to-[#2a2a3d]',  // dark card
  'from-[#1e1e2d] to-[#2a2a3d]',  // dark card
  'from-white to-[#f0faf0]',
  'from-[#e6f4e1] to-white',
]

function BentoCard({ icon, title, desc, index }: { icon: React.ReactNode; title: string; desc: string; index: number }) {
  const isDark = index === 2 || index === 3
  const isWide = index === 0 || index === 5

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-3xl p-7 border cursor-default group
        bg-gradient-to-br ${bentoAccents[index]}
        ${isDark ? 'border-white/10' : 'border-[#e0e0dc]'}
        ${bentoSizes[index]}
        shadow-sm hover:shadow-xl transition-shadow`}
    >
      {/* Animated background orb */}
      <motion.div
        className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-2xl pointer-events-none
          ${isDark ? 'bg-[#14a800]/20' : 'bg-[#14a800]/10'}`}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4 + index, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Icon */}
      <motion.div
        whileHover={{ rotate: 12, scale: 1.15 }}
        transition={{ type: 'spring', stiffness: 400 }}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] mb-5
          ${isDark ? 'bg-white/10 text-[#14a800]' : 'bg-[#14a800]/10 text-[#14a800]'}`}
      >
        {icon}
      </motion.div>

      <div className={`text-[18px] font-bold mb-2 group-hover:text-[#14a800] transition-colors
        ${isDark ? 'text-white' : 'text-[#1c1c1c]'}`}>
        {title}
      </div>
      <div className={`text-[13px] leading-relaxed ${isDark ? 'text-[#aaa]' : 'text-[#6b6b6b]'}`}>
        {desc}
      </div>

      {/* Wide card extra — live stat */}
      {isWide && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 bg-[#14a800]/10 text-[#14a800] rounded-full text-[12px] font-semibold"
        >
          <motion.span
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[#14a800] inline-block"
          />
          {index === 0 ? '$2.4M locked right now' : '12,400+ freelancers earning'}
        </motion.div>
      )}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Landing() {
  const heroRef = useRef(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(heroScroll, [0, 1], [0, 120])
  const heroOpacity = useTransform(heroScroll, [0, 0.6], [1, 0])
  const springY = useSpring(heroY, { stiffness: 80, damping: 20 })

  return (
    <div className="bg-[#f7f7f5] overflow-x-hidden">

      {/* ── HERO ── */}
      <section ref={heroRef} className="bg-white border-b border-[#e0e0dc] relative overflow-hidden min-h-[100svh] md:min-h-[90vh] flex items-center">
        <motion.div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-[#e6f4e1] opacity-60 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.1, 1], x: [0, 30, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full bg-[#e6f4e1] opacity-40 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.12, 1], y: [0, -24, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />

        <motion.div style={{ y: springY, opacity: heroOpacity }} className="max-w-[1100px] mx-auto px-5 md:px-8 pt-12 pb-16 md:py-24 relative z-10 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12">

            {/* Copy */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-[#e6f4e1] text-[#0d7a00] rounded-full text-[11px] md:text-[12px] font-medium mb-5">
                <FiCheckCircle /> Built on Lisk Network · Powered by USDC
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }}
                className="text-[32px] sm:text-[40px] md:text-[56px] font-bold leading-[1.15] text-[#1c1c1c] mb-4 md:mb-5"
                style={{ fontFamily: "'DM Serif Display', serif" }}>
                Get paid for your work.<br />
                <TypewriterText />
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.22 }}
                className="text-[14px] md:text-[17px] text-[#6b6b6b] max-w-[480px] mx-auto lg:mx-0 mb-7 leading-relaxed">
                TrustWork is a decentralised freelancer escrow platform. Clients lock funds in smart contracts. Freelancers get paid instantly on milestone approval. Disputes go to a staked DAO — not a company employee.
              </motion.p>

              {/* CTA buttons — full width on mobile */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.34 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-7">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                  <Link to="/find-work" className="flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 bg-[#14a800] text-white rounded-full text-[15px] font-semibold hover:bg-[#0d7a00] transition-colors shadow-[0_4px_24px_rgba(20,168,0,0.35)]">
                    Find Work <FaArrowRight className="text-[13px]" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                  <Link to="/post-work" className="flex items-center justify-center w-full sm:w-auto px-7 py-3.5 border-2 border-[#14a800] text-[#14a800] rounded-full text-[15px] font-semibold hover:bg-[#e6f4e1] transition-colors">
                    Post a Job
                  </Link>
                </motion.div>
              </motion.div>

              {/* Trust badges — 2 col grid on mobile */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start text-[11px] md:text-[12px] text-[#6b6b6b]">
                {['No seed phrases', 'Funds locked on-chain', '2% client fee', 'Instant payouts'].map((t, i) => (
                  <motion.span key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-center gap-1.5">
                    <FiCheckCircle className="text-[#14a800] shrink-0" />{t}
                  </motion.span>
                ))}
              </motion.div>
            </div>

            {/* Floating mock card */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden lg:block flex-shrink-0 w-[340px]">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="bg-white border border-[#e0e0dc] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-5 relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[11px] text-[#a0a0a0] mb-0.5">Active escrow</div>
                    <div className="text-[22px] font-bold">$4,500 <span className="text-[13px] font-normal text-[#a0a0a0]">USDC</span></div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#e6f4e1] flex items-center justify-center">
                    <FaLock className="text-[#14a800] text-[16px]" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  {[{ label: 'Smart contract audit', amt: '$1,500', done: true }, { label: 'Frontend integration', amt: '$1,800', done: true }, { label: 'Deployment & testing', amt: '$1,200', done: false }].map(({ label, amt, done }) => (
                    <div key={label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#f7f7f5]">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${done ? 'bg-[#14a800] text-white' : 'border-2 border-[#e0e0dc]'}`}>{done && '✓'}</div>
                      <span className="flex-1 text-[12px]">{label}</span>
                      <span className={`text-[12px] font-semibold ${done ? 'text-[#14a800]' : 'text-[#a0a0a0]'}`}>{amt}</span>
                    </div>
                  ))}
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 bg-[#14a800] text-white rounded-xl text-[13px] font-semibold hover:bg-[#0d7a00] transition-colors">
                  Approve milestone → instant pay
                </motion.button>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
                  className="absolute -top-3 -right-3 bg-[#1e1e2d] text-yellow-400 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                  🏅 Expert
                </motion.div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="mt-3 bg-white border border-[#e0e0dc] rounded-xl shadow-md px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#e6f4e1] flex items-center justify-center shrink-0">
                  <FaBolt className="text-[#14a800] text-[13px]" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold">Payment sent instantly</div>
                  <div className="text-[11px] text-[#a0a0a0]">$1,656 USDC → 0x4a3f…89b2</div>
                </div>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-auto w-2 h-2 rounded-full bg-[#14a800]" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-[#1e1e2d] text-white py-10 overflow-hidden">
        <motion.div className="max-w-[1100px] mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          {stats.map(({ num, label }) => (
            <motion.div key={label} variants={fadeUp}>
              <motion.div className="text-[32px] md:text-[40px] font-bold text-[#14a800]"
                initial={{ scale: 0.5, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120, delay: 0.1 }}>
                <AnimatedCounter to={num} />
              </motion.div>
              <div className="text-[11px] text-[#999] uppercase tracking-widest mt-1">{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <ParallaxSection className="py-20 md:py-28 bg-[#f7f7f5]">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-[#e6f4e1] text-[#0d7a00] rounded-full text-[12px] font-medium mb-4">Why choose us</div>
            <h2 className="text-[30px] md:text-[46px] font-bold text-[#1c1c1c] mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Why TrustWork?
            </h2>
            <p className="text-[15px] text-[#6b6b6b] max-w-[480px] mx-auto leading-relaxed">
              Traditional freelance platforms are middlemen that can ban you, delay your money, and charge 20%.<br />
              <span className="text-[#14a800] font-semibold">We replaced them with code.</span>
            </p>
          </Reveal>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto"
            variants={stagger(0.07)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            {features.map(({ icon, title, desc }, i) => (
              <BentoCard key={title} icon={icon} title={title} desc={desc} index={i} />
            ))}
          </motion.div>
        </div>
      </ParallaxSection>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#1e1e2d] py-24 md:py-32 overflow-hidden relative">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        {/* Green glow top */}
        <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-[#14a800]/15 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />

        <div className="max-w-[1100px] mx-auto px-4 md:px-8 relative z-10">
          <Reveal className="text-center mb-20">
            <div className="inline-block px-3 py-1 bg-white/10 text-[#14a800] rounded-full text-[12px] font-medium mb-4">The process</div>
            <h2 className="text-[32px] md:text-[48px] font-bold text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              From job post to payment<br />
              <span className="text-[#14a800]">in six steps.</span>
            </h2>
            <p className="text-[15px] text-[#888] max-w-[480px] mx-auto">Everything happens on-chain. No middlemen, no delays, no trust required.</p>
          </Reveal>

          {/* Steps — alternating left/right on desktop */}
          <div className="flex flex-col gap-6 md:gap-0">
            {steps.map(({ n, role, title, desc }, i) => {
              const isEven = i % 2 === 0
              return (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, x: isEven ? -60 : 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                  className={`flex flex-col md:flex-row items-center gap-6 md:gap-12 ${!isEven ? 'md:flex-row-reverse' : ''} md:py-10 md:border-b md:border-white/5 last:border-0`}
                >
                  {/* Big number + role pill */}
                  <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-3 md:w-[200px]">
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className="text-[80px] md:text-[100px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#14a800] to-[#14a800]/20 select-none"
                    >
                      {n}
                    </motion.div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest border border-[#14a800]/40 text-[#14a800]">
                      {role}
                    </span>
                  </div>

                  {/* Content card */}
                  <motion.div
                    whileHover={{ y: -4, borderColor: '#14a800' }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 group"
                  >
                    <div className="text-[20px] md:text-[24px] font-bold text-white mb-3 group-hover:text-[#14a800] transition-colors">
                      {title}
                    </div>
                    <div className="text-[14px] md:text-[15px] text-[#888] leading-relaxed">{desc}</div>

                    {/* Progress indicator */}
                    <div className="mt-5 flex items-center gap-2">
                      {steps.map((_, j) => (
                        <motion.div
                          key={j}
                          className={`h-1 rounded-full transition-all ${j === i ? 'bg-[#14a800] flex-1' : 'bg-white/10 w-4'}`}
                          layoutId={j === i ? `active-step-${i}` : undefined}
                        />
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <ParallaxSection className="py-20 md:py-28">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-[#e6f4e1] text-[#0d7a00] rounded-full text-[12px] font-medium mb-4">The difference</div>
            <h2 className="text-[30px] md:text-[42px] font-bold text-[#1c1c1c] mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              TrustWork vs. the rest
            </h2>
            <p className="text-[15px] text-[#6b6b6b]">We're not trying to be Upwork. We're replacing it.</p>
          </Reveal>

          <div className="bg-white border border-[#e0e0dc] rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full border-collapse text-[13px] md:text-[14px] min-w-[500px]">
              <thead>
                <tr className="bg-[#f7f7f5] border-b border-[#e0e0dc]">
                  <th className="text-left px-5 py-4 font-medium text-[#6b6b6b]">Feature</th>
                  <th className="text-left px-5 py-4 font-medium text-[#6b6b6b]">Upwork / Fiverr</th>
                  <th className="text-left px-5 py-4 font-semibold text-[#14a800]">✓ TrustWork</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(({ feature, them, us }, i) => (
                  <motion.tr key={feature}
                    className={`${i < compare.length - 1 ? 'border-b border-[#e0e0dc]' : ''} hover:bg-[#f7fff7] transition-colors cursor-default`}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}>
                    <td className="px-5 py-3.5 font-medium">{feature}</td>
                    <td className="px-5 py-3.5 text-[#a0a0a0] line-through decoration-red-300">{them}</td>
                    <td className="px-5 py-3.5 text-[#14a800] font-semibold">{us}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ParallaxSection>

      {/* ── FEES ── */}
      <section className="bg-[#1e1e2d] py-20 md:py-28 relative overflow-hidden">
        <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-[#14a800]/10 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />

        <div className="max-w-[900px] mx-auto px-4 md:px-8 text-center relative z-10">
          <Reveal>
            <div className="inline-block px-3 py-1 bg-white/10 text-[#14a800] rounded-full text-[12px] font-medium mb-4">Pricing</div>
            <h2 className="text-[30px] md:text-[42px] font-bold text-white mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Simple, transparent fees
            </h2>
            <p className="text-[15px] text-[#aaa] mb-12">No surprises. All fee logic is in public smart contract code.</p>
          </Reveal>

          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8"
            variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            {[
              { label: 'Client fee', val: '2%', note: 'Charged at job creation. Fully refunded if you cancel before approving a freelancer.' },
              { label: 'Freelancer fee', val: '8%', note: 'Deducted per milestone on approval. You keep 92% of every milestone.' },
              { label: 'Dispute fee', val: '8%', note: 'Same as happy path — 6% to arbitrators, 2% to platform. No surprise charges.' },
            ].map(({ label, val, note }) => (
              <motion.div key={label} variants={fadeUp}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.15)' }}
                className="bg-white/10 border border-white/10 rounded-2xl p-6 text-left transition-colors group">
                <div className="text-[11px] text-[#aaa] uppercase tracking-widest mb-2">{label}</div>
                <motion.div className="text-[52px] font-bold text-[#14a800] leading-none mb-3"
                  initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120 }}>
                  {val}
                </motion.div>
                <div className="text-[12px] text-[#ccc] leading-relaxed">{note}</div>
              </motion.div>
            ))}
          </motion.div>

          <Reveal>
            <p className="text-[12px] text-[#555]">Fee bounds are hard-coded and immutable: min 1%, max 8%. The DAO can adjust within these bounds only.</p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white border-t border-[#e0e0dc] py-20 md:py-28 relative overflow-hidden">
        <motion.div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#e6f4e1] opacity-60 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />

        <div className="max-w-[640px] mx-auto px-4 text-center relative z-10">
          <Reveal>
            <div className="inline-block px-3 py-1 bg-[#e6f4e1] text-[#0d7a00] rounded-full text-[12px] font-medium mb-5">Get started today</div>
            <h2 className="text-[30px] md:text-[44px] font-bold text-[#1c1c1c] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Ready to work without<br />the middleman?
            </h2>
            <p className="text-[15px] text-[#6b6b6b] mb-10 leading-relaxed">
              Sign in with your wallet or Google account. No seed phrases required. Your first job is one click away.
            </p>
          </Reveal>

          <motion.div className="flex flex-col sm:flex-row gap-3 justify-center"
            variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <motion.div variants={fadeUp} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
              <Link to="/signin" className="flex items-center justify-center gap-2 px-8 py-4 bg-[#14a800] text-white rounded-full text-[15px] font-semibold hover:bg-[#0d7a00] transition-colors shadow-[0_6px_28px_rgba(20,168,0,0.35)]">
                Get started free <FaArrowRight className="text-[13px]" />
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
              <Link to="/find-work" className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-[#e0e0dc] text-[#6b6b6b] rounded-full text-[15px] hover:border-[#14a800] hover:text-[#14a800] transition-colors">
                Browse jobs first
              </Link>
            </motion.div>
          </motion.div>

          {/* Social proof row */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[12px] text-[#a0a0a0]">
            {['No credit card required', 'Sign in with Google', 'Instant wallet setup', 'Cancel anytime'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <FiCheckCircle className="text-[#14a800]" />{t}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="border-t border-[#e0e0dc] py-6 text-center text-[12px] text-[#a0a0a0]">
        TrustWork · Built on Lisk Network · Smart contracts are public and auditable ·{' '}
        <a href="#" className="hover:text-[#14a800] transition-colors">View on Explorer</a>
      </motion.footer>

    </div>
  )
}
