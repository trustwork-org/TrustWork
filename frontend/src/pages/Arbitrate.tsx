const metrics = [
  { val: '$100', label: 'Your stake (USDC)', change: 'Active in pool', up: true },
  { val: '$48', label: 'Earned from disputes', change: '↑ 3 disputes resolved', up: true },
  { val: '1', label: 'Assigned dispute', change: '⚠ Vote required', up: false },
]

export default function Arbitrate() {
  return (
    <div className="max-w-[860px] mx-auto p-4 md:p-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {metrics.map(({ val, label, change, up }) => (
          <div key={label} className="bg-white border border-[#e0e0dc] rounded-xl p-4">
            <div className="text-[22px] md:text-[24px] font-bold">{val}</div>
            <div className="text-[12px] text-[#a0a0a0] mt-1">{label}</div>
            <div className={`text-[12px] mt-1.5 ${up ? 'text-[#14a800]' : 'text-red-500'}`}>{change}</div>
          </div>
        ))}
      </div>

      {/* Assigned dispute */}
      <div className="text-[17px] font-semibold mb-4">Your assigned dispute</div>
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
          <div>
            <div className="text-[12px] text-[#a0a0a0]">Dispute #D-0042 · Voting closes in 18h 32m</div>
            <div className="text-[15px] md:text-[16px] font-semibold mt-1">IPFS Evidence Upload Component — quality disputed</div>
          </div>
          <span className="self-start px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 whitespace-nowrap">Action required</span>
        </div>

        {/* Evidence links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { role: 'Client evidence (IPFS)', hash: 'QmXy4...9aZ2' },
            { role: 'Freelancer evidence (IPFS)', hash: 'QmBb8...7cW1' },
          ].map(({ role, hash }) => (
            <div key={role} className="p-2.5 border border-[#e0e0dc] rounded-lg cursor-pointer hover:border-[#14a800] transition-all">
              <div className="text-[11px] text-[#a0a0a0]">{role}</div>
              <div className="text-[13px] text-blue-500 mt-0.5">{hash} →</div>
            </div>
          ))}
        </div>

        <div className="text-[13px] text-[#6b6b6b] mb-4 leading-relaxed">
          Milestone at stake: <strong className="text-[#1c1c1c]">$420 USDC</strong>. You earn a share of 6% ($25.20) if your vote is in the majority. Minority vote = 10% stake slash.
        </div>

        {/* Vote buttons — stacked on mobile */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button className="flex-1 py-2.5 border border-[#0d7a00] text-[#0d7a00] rounded-lg text-[14px] font-medium hover:bg-[#e6f4e1] transition-all">
            Vote: Client wins
          </button>
          <button className="flex-1 py-2.5 border border-blue-700 text-blue-700 rounded-lg text-[14px] font-medium hover:bg-blue-50 transition-all">
            Vote: Freelancer wins
          </button>
        </div>
      </div>

      {/* Pool info */}
      <div className="text-[17px] font-semibold mb-4">Pool info</div>
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
        <div className="text-[13px] text-[#6b6b6b] mb-3">62 arbitrators currently staked · Up to 20 simultaneous disputes supported</div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <div className="text-[14px] font-medium">Your status: <span className="text-[#14a800]">Active</span></div>
            <div className="text-[12px] text-[#a0a0a0] mt-0.5">Min stake: 100 USDC · Your stake: 100 USDC</div>
          </div>
          <button className="self-start sm:self-auto px-4 py-1.5 border border-red-400 text-red-500 rounded-full text-[13px] hover:bg-red-50 transition-all">
            Leave pool
          </button>
        </div>
      </div>
    </div>
  )
}
