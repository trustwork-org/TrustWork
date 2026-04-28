import { useState } from 'react'

const jobs = [
  {
    id: 1, verified: true,
    title: 'Senior Solidity Developer — DeFi Escrow Audit & Extension',
    budget: '$4,500 – $7,200', posted: '2h ago', category: 'Smart Contract Dev',
    level: 'Expert', milestones: 3,
    desc: 'Looking for an experienced Solidity developer to audit our EscrowPlatform contract on Lisk Network. Must have experience with USDC ERC-20 integrations, reentrancy guards, and DAO voting mechanisms.',
    tags: ['Solidity', 'ERC-20', 'Smart Contract Audit', 'Lisk Network', 'OpenZeppelin'],
    location: 'Worldwide · Lisk Sepolia', proposals: 14,
  },
  {
    id: 2, verified: true,
    title: 'Next.js 14 Frontend — Milestone Tracker + XMTP Chat Integration',
    budget: '$2,800', posted: '5h ago', category: 'Web Development',
    level: 'Intermediate', milestones: 5,
    desc: 'Build the frontend for a decentralized freelancer escrow platform. Pages include job board, milestone tracker, dispute panel, and wallet profile.',
    tags: ['Next.js', 'wagmi', 'XMTP', 'Tailwind CSS', 'ethers.js'],
    location: 'Worldwide · 4 week deadline', proposals: 7,
  },
  {
    id: 3, verified: true,
    title: 'DisputeDAO Smart Contract — Staking, Voting & Slash Logic',
    budget: '$3,200 – $5,000', posted: '1d ago', category: 'Smart Contract Dev',
    level: 'Expert', milestones: 4,
    desc: 'Implement DisputeDAO.sol with arbitrator staking pool, pseudorandom selection, 2-day voting window, majority-wins resolution, and 10% stake slash.',
    tags: ['Solidity', 'DAO', 'Arbitration', 'Staking', 'ERC-20'],
    location: 'Worldwide', proposals: 21,
  },
  {
    id: 4, verified: false,
    title: 'Soulbound NFT — ReputationNFT.sol with 5-Tier Badge System',
    budget: '$1,500', posted: '2d ago', category: 'Smart Contract Dev',
    level: 'Intermediate', milestones: 2,
    desc: 'Build ERC-721 soulbound NFT with _beforeTokenTransfer hook. 5 reputation tiers triggered at 5/20/50/100/250 job completions.',
    tags: ['ERC-721', 'Soulbound', 'NFT', 'OpenZeppelin', 'IPFS'],
    location: 'Worldwide', proposals: 9,
  },
  {
    id: 5, verified: false,
    title: 'ProfileRegistry.sol + IPFS Profile Store',
    budget: '$800', posted: '3d ago', category: 'Smart Contract Dev',
    level: 'Intermediate', milestones: 1,
    desc: 'Build ProfileRegistry.sol to map wallet addresses to IPFS JSON hashes containing name, role, skills, bio, and portfolio URL.',
    tags: ['Solidity', 'IPFS', 'Pinata', 'ERC-20'],
    location: 'Worldwide', proposals: 5,
  },
]

const categories = [
  { label: 'Smart Contract Dev', count: 142, checked: true },
  { label: 'Web Development', count: 318, checked: true },
  { label: 'Mobile Dev', count: 87, checked: false },
  { label: 'UI/UX Design', count: 204, checked: false },
  { label: 'Content Writing', count: 156, checked: false },
  { label: 'Data Science', count: 63, checked: false },
]

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
      <div className="text-[11px] font-semibold text-[#6b6b6b] mb-3 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  )
}

export default function JobBoard() {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      {/* Mobile filter toggle */}
      <div className="flex justify-between items-center mb-3 md:hidden">
        <span className="text-[14px] text-[#6b6b6b]">2,841 jobs found</span>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="px-3 py-1.5 border border-[#e0e0dc] rounded-lg text-[13px] text-[#6b6b6b] hover:border-[#14a800] hover:text-[#14a800] transition-all"
        >
          {filtersOpen ? 'Hide filters ✕' : 'Filters ⚙'}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[260px_1fr] md:gap-5">
        {/* Sidebar — hidden on mobile unless toggled */}
        <aside className={`flex flex-col gap-3.5 mb-4 md:mb-0 ${filtersOpen ? 'flex' : 'hidden md:flex'}`}>
          <FilterCard title="Search">
            <input
              className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-[#f7f7f5] outline-none focus:border-[#14a800] focus:bg-white"
              placeholder="Skills, keywords..."
            />
          </FilterCard>
          <FilterCard title="Category">
            {categories.map(({ label, count, checked }) => (
              <label key={label} className="flex items-center gap-2 text-[13px] text-[#6b6b6b] cursor-pointer py-0.5 hover:text-[#1c1c1c]">
                <input type="checkbox" defaultChecked={checked} className="accent-[#14a800] w-3.5 h-3.5" />
                {label}
                <span className="ml-auto text-[11px] text-[#a0a0a0]">{count}</span>
              </label>
            ))}
          </FilterCard>
          <FilterCard title="Budget">
            {['Under $500', '$500 – $2,000', '$2,000 – $10,000', '$10,000+'].map((b, i) => (
              <label key={b} className="flex items-center gap-2 text-[13px] text-[#6b6b6b] cursor-pointer py-0.5 hover:text-[#1c1c1c]">
                <input type="checkbox" defaultChecked={i === 1 || i === 2} className="accent-[#14a800] w-3.5 h-3.5" />
                {b}
              </label>
            ))}
          </FilterCard>
          <FilterCard title="Experience">
            {['Entry level', 'Intermediate', 'Expert'].map((e, i) => (
              <label key={e} className="flex items-center gap-2 text-[13px] text-[#6b6b6b] cursor-pointer py-0.5 hover:text-[#1c1c1c]">
                <input type="checkbox" defaultChecked={i > 0} className="accent-[#14a800] w-3.5 h-3.5" />
                {e}
              </label>
            ))}
          </FilterCard>
        </aside>

        {/* Job list */}
        <main>
          <div className="hidden md:flex justify-between items-center mb-3">
            <span className="text-[14px] text-[#6b6b6b]">2,841 jobs found</span>
            <select className="border border-[#e0e0dc] rounded-md px-2.5 py-1.5 text-[13px] bg-white cursor-pointer outline-none">
              <option>Newest first</option>
              <option>Highest budget</option>
              <option>Most proposals</option>
            </select>
          </div>

          {jobs.map((job) => (
            <div key={job.id} className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 cursor-pointer transition-all mb-2.5 hover:border-[#14a800] hover:shadow-[0_4px_16px_rgba(20,168,0,0.08)]">
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex-1 min-w-0">
                  {job.verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0d7a00] bg-[#e6f4e1] px-1.5 py-0.5 rounded-full">
                      ✓ Payment verified
                    </span>
                  )}
                  <div className="text-[15px] md:text-[16px] font-semibold leading-snug mt-1.5">{job.title}</div>
                </div>
                <div className="text-[14px] md:text-[15px] font-semibold text-[#14a800] shrink-0">{job.budget}</div>
              </div>
              <div className="flex gap-2 md:gap-3.5 mb-2.5 flex-wrap">
                <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">🕐 {job.posted}</span>
                <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">📋 {job.category}</span>
                <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">⚡ {job.level}</span>
                <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">🏗 {job.milestones} milestones</span>
              </div>
              <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-3 line-clamp-2">{job.desc}</p>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {job.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 border border-[#e0e0dc] rounded-full text-[11px] text-[#6b6b6b] bg-[#f7f7f5]">{t}</span>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#e0e0dc] text-[11px] text-[#a0a0a0]">
                <span>🌐 {job.location}</span>
                <span>{job.proposals} proposals</span>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
