const stats = [
  { num: '$2.4M', label: 'Escrowed' },
  { num: '3,841', label: 'Active Jobs' },
  { num: '2%', label: 'Client Fee' },
  { num: '8%', label: 'Freelancer Fee' },
]

export default function StatsBar() {
  return (
    <div className="bg-[#1e1e2d] text-white px-4 md:px-6 py-2.5 flex flex-wrap gap-x-6 gap-y-1 items-center text-[13px]">
      <span className="hidden md:block flex-1 text-[#aaa] text-[12px]">Smart contract escrow · Zero downtime · Instant milestone payments</span>
      {stats.map(({ num, label }) => (
        <div key={label} className="flex flex-col items-center shrink-0">
          <span className="text-[16px] md:text-[18px] font-semibold text-[#14a800]">{num}</span>
          <span className="text-[9px] md:text-[10px] text-[#999] uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  )
}
