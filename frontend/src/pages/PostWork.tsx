import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const steps = [
  { n: '1', title: 'Define your job', desc: 'Write a clear title, description, and category. The more detail you give, the better applicants you attract.' },
  { n: '2', title: 'Set milestones & amounts', desc: 'Break the project into milestones with individual USDC amounts. Freelancers are paid per milestone — not all upfront.' },
  { n: '3', title: 'Deposit into escrow', desc: 'Deposit the total USDC into the smart contract. A 2% client fee is charged — fully refunded if you cancel before hiring.' },
  { n: '4', title: 'Review applicants', desc: 'Freelancers apply with their soulbound reputation badge and job history. Approve the one you want — work starts immediately.' },
  { n: '5', title: 'Approve milestones', desc: 'When a freelancer submits a milestone, review it. Approve and 92% of that milestone\'s amount is released instantly to their wallet.' },
  { n: '6', title: 'Dispute if needed', desc: 'If quality is poor, raise a dispute. Three staked arbitrators review evidence and vote. You get your funds back if you win.' },
]

const faqs = [
  { q: 'What if I want to cancel before hiring anyone?', a: 'You get a full refund — including the 2% client fee. No questions asked.' },
  { q: 'What if the freelancer disappears after I hire them?', a: 'If the deadline passes and no milestones have been submitted, you can call a rescue refund after deadline + 30 days.' },
  { q: 'What if the freelancer does poor work?', a: 'You can reject a milestone (freelancer revises and resubmits) or raise a dispute. If the freelancer self-reports poor work, you get a full refund with no fee.' },
  { q: 'What currency is used?', a: 'All payments are in USDC on Lisk Network. Stable, fast, and no crypto volatility.' },
  { q: 'Do I need a crypto wallet?', a: 'No. You can sign in with Google and a smart contract wallet is created for you automatically. No seed phrases required.' },
]

export default function PostWork() {
  const { isAuthed } = useAuth()
  const navigate = useNavigate()

  const handlePost = () => navigate(isAuthed ? '/app/post' : '/signin')

  return (
    <div className="bg-[#f7f7f5] min-h-screen">
      {/* Hero */}
      <div className="bg-white border-b border-[#e0e0dc] py-12 px-4 md:px-8 text-center">
        <h1 className="text-[28px] md:text-[40px] font-bold text-[#1c1c1c] mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Post a Job on TrustWork
        </h1>
        <p className="text-[15px] md:text-[16px] text-[#6b6b6b] max-w-[560px] mx-auto mb-7 leading-relaxed">
          Hire top freelancers with zero risk. Your funds are locked in a smart contract and only released when you approve the work. No more chasing payments or disappearing freelancers.
        </p>
        <button
          onClick={handlePost}
          className="px-8 py-3.5 bg-[#14a800] text-white rounded-full text-[15px] font-semibold hover:bg-[#0d7a00] transition-all"
        >
          {isAuthed ? 'Post a Job Now →' : 'Sign in to Post a Job →'}
        </button>
        {!isAuthed && (
          <div className="mt-3 text-[13px] text-[#a0a0a0]">Free to sign up · No credit card required</div>
        )}
      </div>

      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-12">
        {/* Why post here */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
          {[
            { icon: '🔒', title: 'Funds locked upfront', desc: 'Freelancers know your payment is real. Funds are on-chain before they even apply.' },
            { icon: '⚡', title: 'Pay only for approved work', desc: 'You control every milestone approval. No approval = no payment. Simple.' },
            { icon: '⚖️', title: 'Dispute protection', desc: 'If something goes wrong, staked arbitrators resolve it fairly — not a company employee.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#e0e0dc] rounded-2xl p-5 text-center">
              <div className="text-[32px] mb-2">{icon}</div>
              <div className="text-[15px] font-semibold mb-1.5">{title}</div>
              <div className="text-[13px] text-[#6b6b6b] leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        {/* How to post */}
        <h2 className="text-[24px] md:text-[30px] font-bold text-[#1c1c1c] mb-6 text-center" style={{ fontFamily: "'DM Serif Display', serif" }}>
          How posting works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="bg-white border border-[#e0e0dc] rounded-xl p-5 flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#e6f4e1] text-[#14a800] font-bold text-[14px] flex items-center justify-center shrink-0">{n}</div>
              <div>
                <div className="text-[14px] font-semibold mb-1">{title}</div>
                <div className="text-[13px] text-[#6b6b6b] leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fee breakdown */}
        <div className="bg-[#1e1e2d] text-white rounded-2xl p-6 md:p-8 mb-14">
          <h2 className="text-[22px] md:text-[26px] font-bold mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>What does it cost?</h2>
          <p className="text-[14px] text-[#aaa] mb-6">All fees are in the smart contract. No hidden charges.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Client fee (upfront)', val: '2%', note: 'Of total deposit. Refunded if you cancel before approving a freelancer.' },
              { label: 'Freelancer fee (per milestone)', val: '8%', note: 'Deducted from each milestone on approval. Freelancer keeps 92%.' },
            ].map(({ label, val, note }) => (
              <div key={label} className="bg-white/10 rounded-xl p-4">
                <div className="text-[11px] text-[#aaa] uppercase tracking-wide mb-1">{label}</div>
                <div className="text-[36px] font-bold text-[#14a800] leading-none mb-2">{val}</div>
                <div className="text-[12px] text-[#ccc] leading-relaxed">{note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <h2 className="text-[24px] md:text-[30px] font-bold text-[#1c1c1c] mb-6 text-center" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Common questions
        </h2>
        <div className="flex flex-col gap-3 mb-12">
          {faqs.map(({ q, a }) => (
            <div key={q} className="bg-white border border-[#e0e0dc] rounded-xl p-5">
              <div className="text-[14px] font-semibold mb-1.5">{q}</div>
              <div className="text-[13px] text-[#6b6b6b] leading-relaxed">{a}</div>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="bg-white border border-[#e0e0dc] rounded-2xl p-8 text-center">
          <div className="text-[22px] font-bold mb-2">Ready to hire?</div>
          <p className="text-[14px] text-[#6b6b6b] mb-5 max-w-[400px] mx-auto">
            Post your first job in under 5 minutes. Funds are locked, freelancers are vetted, and you're protected from day one.
          </p>
          <button
            onClick={handlePost}
            className="px-8 py-3.5 bg-[#14a800] text-white rounded-full text-[15px] font-semibold hover:bg-[#0d7a00] transition-all"
          >
            {isAuthed ? 'Post a Job Now →' : 'Sign in to Post a Job →'}
          </button>
        </div>
      </div>
    </div>
  )
}
