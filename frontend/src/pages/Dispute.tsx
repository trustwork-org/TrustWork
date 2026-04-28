const arbitrators = [
  { initials: 'AR', address: '0xabc1…3d92', stake: '200 USDC staked', voted: true },
  { initials: 'BR', address: '0x9fda…1c50', stake: '150 USDC staked', voted: true },
  { initials: 'CR', address: '0x2b77…88e4', stake: '100 USDC staked', voted: false },
]

export default function Dispute() {
  return (
    <div className="max-w-[900px] mx-auto p-4 md:p-6">
      <div className="text-[17px] font-semibold mb-4">Active disputes</div>

      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
          <div>
            <div className="text-[12px] text-[#a0a0a0]">Dispute #D-0042 · Job #J-0187 · Milestone 3 of 5</div>
            <div className="text-[15px] md:text-[16px] font-semibold mt-1">IPFS Evidence Upload Component — quality disputed</div>
          </div>
          <span className="self-start px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 whitespace-nowrap">Voting open</span>
        </div>

        {/* Evidence — stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { role: 'CLIENT', addr: '0x4a3f…89b2', text: '"The component crashes on mobile Safari and doesn\'t handle files >10MB as per the spec."' },
            { role: 'FREELANCER', addr: '0x7c1b…22f1', text: '"Mobile Safari was not in the original spec. File limit increase was agreed later via XMTP chat."' },
          ].map(({ role, addr, text }) => (
            <div key={role} className="p-3 bg-[#f7f7f5] rounded-lg">
              <div className="text-[11px] text-[#a0a0a0] mb-1">{role}</div>
              <div className="text-[13px] font-medium">{addr}</div>
              <div className="text-[12px] text-[#6b6b6b] mt-1.5 leading-relaxed">{text}</div>
            </div>
          ))}
        </div>

        {/* Vote bar */}
        <div className="mb-3">
          <div className="text-[12px] font-medium mb-1.5">Arbitrator votes (2 of 3 submitted)</div>
          <div className="h-2 rounded-full bg-[#e4e4e0] overflow-hidden flex">
            <div className="bg-[#14a800]" style={{ width: '33%' }} />
            <div className="bg-blue-500" style={{ width: '33%' }} />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] mt-1 gap-0.5">
            <span className="text-[#14a800]">1 vote — client</span>
            <span className="text-blue-500">1 vote — freelancer · 1 pending</span>
          </div>
        </div>

        <div className="text-[12px] text-[#6b6b6b] mb-3">
          Milestone at stake: <strong className="text-[#1c1c1c]">$420 USDC</strong> · Opened 1d 6h ago · <strong className="text-red-500">Closes in 18h 32m</strong>
        </div>

        {/* Arbitrators */}
        {arbitrators.map(({ initials, address, stake, voted }) => (
          <div key={address} className="flex items-center gap-2.5 px-3 py-2 border border-[#e0e0dc] rounded-lg bg-[#f7f7f5] mb-1.5">
            <div className="w-7 h-7 rounded-full bg-[#1e1e2d] text-yellow-400 flex items-center justify-center text-[11px] font-semibold shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">{address}</div>
              <div className="text-[11px] text-[#a0a0a0]">{stake}</div>
            </div>
            {voted
              ? <span className="text-[10px] px-1.5 py-0.5 bg-[#e6f4e1] text-[#0d7a00] rounded-full font-medium shrink-0">Voted</span>
              : <span className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded-full font-medium shrink-0">⚠ Not voted</span>
            }
          </div>
        ))}

        {/* Actions — stacked on mobile */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <button className="px-4 py-2 border border-[#14a800] text-[#14a800] rounded-full text-[13px] hover:bg-[#e6f4e1] transition-all">View IPFS evidence</button>
          <button className="px-4 py-2 border border-[#14a800] text-[#14a800] rounded-full text-[13px] hover:bg-[#e6f4e1] transition-all">XMTP chat thread</button>
          <button className="sm:ml-auto px-4 py-2 bg-[#14a800] text-white rounded-lg text-[13px] hover:bg-[#0d7a00] transition-all">Resolve dispute</button>
        </div>
      </div>

      {/* Resolved */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl px-4 md:px-5 py-3.5 flex items-start sm:items-center gap-3">
        <div className="text-[20px] shrink-0">✅</div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium">Dispute #D-0038 resolved — Freelancer won</div>
          <div className="text-[12px] text-[#6b6b6b] mt-0.5">$800 USDC released · 2 arbitrators earned 6% fee split · Resolved 3 days ago</div>
        </div>
        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">Closed</span>
      </div>
    </div>
  )
}
