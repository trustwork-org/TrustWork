const metrics = [
  { val: '$12,480', label: 'Total earned (USDC)', change: '↑ +$2,300 this month', up: true },
  { val: '8', label: 'Active jobs', change: '3 awaiting approval', up: false },
  { val: '47', label: 'Jobs completed', change: 'Tier 3 — Expert', up: true },
]

const milestones = [
  { dot: 'bg-blue-500', name: 'Smart contract audit report', job: 'DeFi Escrow Audit · M2 of 3', pill: 'Awaiting review', pillCls: 'bg-blue-100 text-blue-700', amount: '$1,840' },
  { dot: 'bg-amber-400', name: 'Frontend job board with filters', job: 'Next.js Platform · M1 of 5', pill: 'In progress', pillCls: 'bg-[#e6f4e1] text-[#0d7a00]', amount: '$560' },
  { dot: 'bg-[#14a800]', name: 'DisputeDAO staking logic', job: 'DAO Contract · M1 of 4', pill: 'Released ✓', pillCls: 'bg-gray-100 text-gray-600', amount: '$800' },
  { dot: 'bg-red-500', name: 'IPFS evidence upload component', job: 'Dispute Panel UI · M3 of 5', pill: 'Disputed', pillCls: 'bg-red-100 text-red-700', amount: '$420' },
]

const recentJobs = [
  { title: 'Solidity Escrow Audit', client: '0x4a3f…89b2', budget: '$5,500', status: 'Active', statusCls: 'bg-[#e6f4e1] text-[#0d7a00]' },
  { title: 'Next.js Frontend', client: '0x7c1b…22f1', budget: '$2,800', status: 'Active', statusCls: 'bg-[#e6f4e1] text-[#0d7a00]' },
  { title: 'XMTP Chat Integration', client: '0xd9e0…a7c4', budget: '$900', status: 'Completed', statusCls: 'bg-gray-100 text-gray-600' },
]

export default function Dashboard() {
  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Metrics — 1 col mobile, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {metrics.map(({ val, label, change, up }) => (
          <div key={label} className="bg-white border border-[#e0e0dc] rounded-xl p-4">
            <div className="text-[22px] md:text-[24px] font-bold">{val}</div>
            <div className="text-[12px] text-[#a0a0a0] mt-1">{label}</div>
            <div className={`text-[12px] mt-1.5 ${up ? 'text-[#14a800]' : 'text-[#a0a0a0]'}`}>{change}</div>
          </div>
        ))}
      </div>

      {/* Main + sidebar — stacked on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div>
          <div className="text-[17px] font-semibold mb-4">Active milestones</div>
          <div className="flex flex-col gap-2.5 mb-6">
            {milestones.map(({ dot, name, job, pill, pillCls, amount }) => (
              <div key={name} className="bg-white border border-[#e0e0dc] rounded-lg px-4 py-3.5 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] md:text-[14px] font-medium truncate">{name}</div>
                  <div className="text-[11px] md:text-[12px] text-[#a0a0a0] mt-0.5">{job}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-medium whitespace-nowrap ${pillCls}`}>{pill}</span>
                <div className="text-[13px] md:text-[14px] font-semibold text-[#14a800] shrink-0">{amount}</div>
              </div>
            ))}
          </div>

          <div className="text-[17px] font-semibold mb-4">Recent jobs</div>
          {/* Table — scrollable on mobile */}
          <div className="bg-white border border-[#e0e0dc] rounded-xl overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[400px]">
              <thead>
                <tr className="bg-[#f7f7f5] border-b border-[#e0e0dc]">
                  {['Job', 'Client', 'Budget', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-[#6b6b6b]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentJobs.map(({ title, client, budget, status, statusCls }, i) => (
                  <tr key={title} className={i < recentJobs.length - 1 ? 'border-b border-[#e0e0dc]' : ''}>
                    <td className="px-4 py-3">{title}</td>
                    <td className="px-4 py-3 text-[#6b6b6b]">{client}</td>
                    <td className="px-4 py-3 font-medium">{budget}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusCls}`}>{status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Widgets */}
        <div>
          <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 mb-3">
            <div className="text-[13px] font-semibold mb-3">Reputation progress</div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-11 h-11 rounded-full bg-[#1e1e2d] flex items-center justify-center text-xl shrink-0">🏅</div>
              <div>
                <div className="font-semibold text-[14px]">Expert</div>
                <div className="text-[11px] text-[#a0a0a0]">Tier 3 · Soulbound NFT</div>
              </div>
            </div>
            <div className="flex justify-between text-[12px] text-[#6b6b6b] mb-1.5">
              <span>47 / 50 jobs → Elite</span><span>94%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e4e4e0] overflow-hidden">
              <div className="h-full bg-[#14a800] rounded-full" style={{ width: '94%' }} />
            </div>
            <div className="text-[11px] text-[#a0a0a0] mt-1.5">3 more jobs to reach Tier 4 — Elite</div>
          </div>

          <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 mb-3">
            <div className="text-[13px] font-semibold mb-3">Escrow balance</div>
            <div className="text-[26px] md:text-[28px] font-bold text-[#14a800] mb-1">$6,820</div>
            <div className="text-[12px] text-[#a0a0a0] mb-3">USDC locked in active milestones</div>
            <div className="border-t border-[#e0e0dc] pt-3 space-y-1">
              {[['Pending approval', '$2,260'], ['In progress', '$4,560']].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[12px] text-[#6b6b6b]"><span>{k}</span><span>{v}</span></div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-3">Account standing</div>
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-[#14a800] text-[18px]">✓</span>
              <span className="font-medium">Good standing</span>
            </div>
            <div className="text-[12px] text-[#a0a0a0] mt-1.5">0 flags · 0 bans · eligible to apply to all jobs</div>
          </div>
        </div>
      </div>
    </div>
  )
}
