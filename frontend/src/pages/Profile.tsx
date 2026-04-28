const skills = ['Solidity','ERC-20','ERC-721','Hardhat','OpenZeppelin','ethers.js','wagmi','IPFS / Pinata','Next.js','TypeScript','Smart Contract Audit','DAO Design']

const tiers = [
  { jobs: 5, name: 'Rising Talent', state: 'earned' },
  { jobs: 20, name: 'Established Pro', state: 'earned' },
  { jobs: 50, name: 'Expert', state: 'current' },
  { jobs: 100, name: 'Elite', state: 'locked' },
  { jobs: 250, name: 'Legend', state: 'locked' },
]

export default function Profile() {
  return (
    <div className="max-w-[900px] mx-auto p-4 md:p-6">
      {/* Header — stacked on mobile */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 md:p-6 flex flex-col sm:flex-row gap-4 mb-4">
        <div className="w-[64px] h-[64px] md:w-[72px] md:h-[72px] rounded-full bg-[#14a800] flex items-center justify-center text-[22px] md:text-[26px] font-bold text-white shrink-0">
          AK
        </div>
        <div className="flex-1">
          <div className="text-[20px] md:text-[22px] font-bold mb-1">Alex K.</div>
          <div className="text-[13px] md:text-[14px] text-[#6b6b6b] mb-1.5">Senior Solidity Developer & Smart Contract Auditor</div>
          <div className="text-[12px] md:text-[13px] text-[#a0a0a0]">Wallet: 0x4a3f…89b2 · Joined Mar 2024</div>
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1e1e2d] text-yellow-400 rounded-full text-[11px] md:text-[12px] font-semibold">
              🏅 Expert — Tier 3 Soulbound NFT
            </span>
          </div>
          {/* Stats — wrap on mobile */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {[['47','jobs completed'],['4.97','⭐ rating'],['$12,480','earned'],['0','flags'],['100%','completion']].map(([val, lbl]) => (
              <div key={lbl} className="text-[12px] md:text-[13px] text-[#6b6b6b]">
                <strong className="text-[#1c1c1c]">{val}</strong> {lbl}
              </div>
            ))}
          </div>
        </div>
        <button className="self-start sm:self-auto px-4 py-2 bg-[#14a800] text-white rounded-lg text-[13px] md:text-[14px] font-medium hover:bg-[#0d7a00] transition-all shrink-0">
          Edit profile
        </button>
      </div>

      {/* About */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
        <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">About</div>
        <div className="text-[13px] md:text-[14px] text-[#6b6b6b] leading-relaxed">
          Solidity developer with 4+ years building DeFi protocols, escrow systems, and DAO governance contracts. Specialise in OpenZeppelin security patterns, gas optimisation, and formal verification.
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
        <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">Skills</div>
        <div>
          {skills.map(s => (
            <span key={s} className="inline-block px-2.5 py-1 bg-[#f7f7f5] border border-[#e0e0dc] rounded-full text-[11px] md:text-[12px] text-[#6b6b6b] m-0.5">{s}</span>
          ))}
        </div>
      </div>

      {/* Reputation tiers — scrollable on mobile */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5">
        <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">Reputation tiers</div>
        <div className="overflow-x-auto">
          <div className="flex border border-[#e0e0dc] rounded-lg overflow-hidden mb-3 min-w-[360px]">
            {tiers.map(({ jobs, name, state }, i) => (
              <div
                key={name}
                className={`flex-1 text-center py-2.5 ${i < tiers.length - 1 ? 'border-r border-[#e0e0dc]' : ''} ${state === 'current' ? 'bg-[#e6f4e1]' : 'bg-white'} ${state === 'locked' ? 'opacity-40' : ''}`}
              >
                <div className={`text-[16px] md:text-[18px] font-bold ${state === 'current' ? 'text-[#14a800]' : ''}`}>{jobs}</div>
                <div className={`text-[10px] md:text-[11px] ${state === 'current' ? 'text-[#0d7a00]' : 'text-[#a0a0a0]'}`}>
                  {name}{state === 'current' ? ' ←' : ''}
                </div>
                <div className={`text-[10px] md:text-[11px] mt-0.5 ${state !== 'locked' ? 'text-[#14a800]' : 'text-[#a0a0a0]'}`}>
                  {state === 'earned' ? '✓ Earned' : state === 'current' ? '47/50' : 'Locked'}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-[#a0a0a0] leading-relaxed">
          Soulbound NFTs are non-transferable and live on your wallet forever. Tier upgrades burn the old NFT and mint a new one with updated metadata on IPFS.
        </div>
      </div>
    </div>
  )
}
