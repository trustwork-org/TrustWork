import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const jobs = [
  {
    id: 1, verified: true,
    title: 'Senior Solidity Developer — DeFi Escrow Audit & Extension',
    budget: '$4,500 – $7,200', posted: '2h ago', category: 'Smart Contract Dev',
    level: 'Expert', milestones: 3,
    desc: 'Looking for an experienced Solidity developer to audit our EscrowPlatform contract on Lisk Network. Must have experience with USDC ERC-20 integrations, reentrancy guards, and DAO voting mechanisms.',
    tags: ['Solidity', 'ERC-20', 'Smart Contract Audit', 'Lisk Network', 'OpenZeppelin'],
    proposals: 14,
  },
  {
    id: 2, verified: true,
    title: 'Next.js 14 Frontend — Milestone Tracker + XMTP Chat Integration',
    budget: '$2,800', posted: '5h ago', category: 'Web Development',
    level: 'Intermediate', milestones: 5,
    desc: 'Build the frontend for a decentralized freelancer escrow platform. Pages include job board, milestone tracker, dispute panel, and wallet profile. Integrate wagmi v2, RainbowKit, and XMTP chat protocol.',
    tags: ['Next.js', 'wagmi', 'XMTP', 'Tailwind CSS', 'ethers.js'],
    proposals: 7,
  },
  {
    id: 3, verified: true,
    title: 'DisputeDAO Smart Contract — Staking, Voting & Slash Logic',
    budget: '$3,200 – $5,000', posted: '1d ago', category: 'Smart Contract Dev',
    level: 'Expert', milestones: 4,
    desc: 'Implement DisputeDAO.sol with arbitrator staking pool (minStake 100 USDC), pseudorandom selection, 2-day voting window, majority-wins resolution, and 10% stake slash on minority/inactive arbitrators.',
    tags: ['Solidity', 'DAO', 'Arbitration', 'Staking', 'ERC-20'],
    proposals: 21,
  },
  {
    id: 4, verified: false,
    title: 'Soulbound NFT — ReputationNFT.sol with 5-Tier Badge System',
    budget: '$1,500', posted: '2d ago', category: 'Smart Contract Dev',
    level: 'Intermediate', milestones: 2,
    desc: 'Build ERC-721 soulbound NFT with _beforeTokenTransfer hook blocking transfers. 5 reputation tiers triggered at 5/20/50/100/250 job completions. Metadata on IPFS via Pinata.',
    tags: ['ERC-721', 'Soulbound', 'NFT', 'OpenZeppelin', 'IPFS'],
    proposals: 9,
  },
  {
    id: 5, verified: false,
    title: 'ProfileRegistry.sol + IPFS Profile Store — Skill-Based Browsing',
    budget: '$800', posted: '3d ago', category: 'Smart Contract Dev',
    level: 'Intermediate', milestones: 1,
    desc: 'Build ProfileRegistry.sol to map wallet addresses to IPFS JSON hashes containing name, role, skills, bio, and portfolio URL.',
    tags: ['Solidity', 'IPFS', 'Pinata', 'ERC-20'],
    proposals: 5,
  },
  {
    id: 6, verified: true,
    title: 'React Native Mobile App — Wallet Connect + Job Tracker',
    budget: '$3,800', posted: '4d ago', category: 'Mobile Development',
    level: 'Expert', milestones: 4,
    desc: 'Build a React Native mobile app for TrustWork. Features: WalletConnect login, job browsing, milestone submission, push notifications for approvals.',
    tags: ['React Native', 'WalletConnect', 'TypeScript', 'Expo'],
    proposals: 11,
  },
]

const categories = ['All', 'Smart Contract Dev', 'Web Development', 'Mobile Development', 'UI/UX Design', 'Content Writing', 'Data Science']

export default function FindWork() {
  const { isAuthed } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')

  const filtered = jobs.filter(j =>
    (cat === 'All' || j.category === cat) &&
    (search === '' || j.title.toLowerCase().includes(search.toLowerCase()) || j.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  )

  const handleApply = () => {
    if (!isAuthed) navigate('/signin')
    else navigate('/app')
  }

  return (
    <div className="bg-[#f7f7f5] min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-[#e0e0dc] py-10 px-4 md:px-8 text-center">
        <h1 className="text-[28px] md:text-[36px] font-bold text-[#1c1c1c] mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Find Work
        </h1>
        <p className="text-[15px] text-[#6b6b6b] max-w-[500px] mx-auto mb-6">
          Browse open jobs from verified clients. Funds are already locked in escrow — you get paid the moment your milestone is approved.
        </p>
        {/* Search */}
        <div className="max-w-[520px] mx-auto relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-[#e0e0dc] rounded-full text-[14px] outline-none bg-white focus:border-[#14a800] shadow-sm"
            placeholder="Search by skill, keyword, or category..."
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a0a0a0]">🔍</span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6">
        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${cat === c ? 'bg-[#14a800] text-white' : 'bg-white border border-[#e0e0dc] text-[#6b6b6b] hover:border-[#14a800] hover:text-[#14a800]'}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-[14px] text-[#6b6b6b]">{filtered.length} jobs found</span>
          {!isAuthed && (
            <Link to="/signin" className="text-[13px] text-[#14a800] font-medium hover:underline">
              Sign in to apply →
            </Link>
          )}
        </div>

        {/* Job cards */}
        <div className="flex flex-col gap-3">
          {filtered.map(job => (
            <div key={job.id} className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 hover:border-[#14a800] hover:shadow-[0_4px_16px_rgba(20,168,0,0.07)] transition-all">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  {job.verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0d7a00] bg-[#e6f4e1] px-1.5 py-0.5 rounded-full">
                      ✓ Payment verified
                    </span>
                  )}
                  <div className="text-[15px] md:text-[16px] font-semibold leading-snug mt-1">{job.title}</div>
                </div>
                <div className="text-[15px] font-semibold text-[#14a800] shrink-0">{job.budget}</div>
              </div>

              <div className="flex gap-2 flex-wrap mb-2.5 text-[11px] md:text-[12px] text-[#a0a0a0]">
                <span>🕐 {job.posted}</span>
                <span>📋 {job.category}</span>
                <span>⚡ {job.level}</span>
                <span>🏗 {job.milestones} milestones</span>
              </div>

              <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-3 line-clamp-2">{job.desc}</p>

              <div className="flex gap-1.5 flex-wrap mb-3">
                {job.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 border border-[#e0e0dc] rounded-full text-[11px] text-[#6b6b6b] bg-[#f7f7f5]">{t}</span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-3 border-t border-[#e0e0dc]">
                <span className="text-[11px] text-[#a0a0a0]">{job.proposals} proposals</span>
                <button
                  onClick={handleApply}
                  className="px-5 py-2 bg-[#14a800] text-white rounded-full text-[13px] font-medium hover:bg-[#0d7a00] transition-all self-start sm:self-auto"
                >
                  {isAuthed ? 'Apply now' : 'Sign in to apply'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA for guests */}
        {!isAuthed && (
          <div className="mt-8 bg-white border border-[#e0e0dc] rounded-2xl p-6 md:p-8 text-center">
            <div className="text-[20px] font-bold mb-2">Ready to apply?</div>
            <p className="text-[14px] text-[#6b6b6b] mb-5">Create your account in seconds. Sign in with Google or connect your wallet — no setup required.</p>
            <Link to="/signin" className="inline-block px-8 py-3 bg-[#14a800] text-white rounded-full text-[14px] font-semibold hover:bg-[#0d7a00] transition-all">
              Sign in to apply →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
