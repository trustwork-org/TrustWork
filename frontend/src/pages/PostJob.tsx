import { useState } from 'react'

interface Milestone { id: number; desc: string; amount: string; date: string }

const inp = 'w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] outline-none bg-white focus:border-[#14a800] transition-colors'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-medium mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-[#a0a0a0] mt-1">{hint}</div>}
    </div>
  )
}

function FeeRow({ label, value, valueClass = 'text-[#6b6b6b]', total = false }: {
  label: string; value: string; valueClass?: string; total?: boolean
}) {
  return (
    <div className={`flex justify-between text-[13px] py-0.5 ${total ? 'border-t border-[#e0e0dc] mt-2 pt-2 font-semibold text-[#1c1c1c]' : 'text-[#6b6b6b]'}`}>
      <span>{label}</span><span className={valueClass}>{value}</span>
    </div>
  )
}

export default function PostJob() {
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: 1, desc: '', amount: '500', date: '' },
    { id: 2, desc: '', amount: '800', date: '' },
  ])
  const [nextId, setNextId] = useState(3)

  const total = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0)
  const clientFee = Math.round(total * 0.02 * 100) / 100
  const available = Math.round((total - clientFee) * 100) / 100

  const add = () => { setMilestones(p => [...p, { id: nextId, desc: '', amount: '0', date: '' }]); setNextId(n => n + 1) }
  const remove = (id: number) => setMilestones(p => p.filter(m => m.id !== id))
  const update = (id: number, field: keyof Milestone, value: string) =>
    setMilestones(p => p.map(m => m.id === id ? { ...m, [field]: value } : m))

  return (
    <div className="max-w-[720px] mx-auto p-4 md:p-6">
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 md:p-7 mb-4">
        <div className="text-[18px] md:text-[20px] font-bold mb-1.5">Post a job</div>
        <div className="text-[13px] text-[#6b6b6b] mb-5">
          Funds are locked in a smart contract. Full refund if cancelled before a freelancer is approved.
        </div>

        <Field label="Job title">
          <input className={inp} placeholder="e.g. Solidity Developer for DeFi Escrow Contract" />
        </Field>
        <Field label="Category">
          <select className={inp}>
            {['Smart Contract Development','Web Development','Mobile Development','UI/UX Design',
              'Graphic Design','Content Writing','Data Science','Digital Marketing',
              'Video Editing','Virtual Assistant','Others'].map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea className={`${inp} min-h-[100px] resize-y`} placeholder="Describe the work, deliverables, and technical requirements..." />
        </Field>
        <Field label="Deadline" hint="Freelancers can invoke a rescue refund after deadline + 30 days with no submissions.">
          <input className={inp} type="date" />
        </Field>

        {/* Milestones — stacked on mobile */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium mb-2">Milestones</label>
          {milestones.map((m, i) => (
            <div key={m.id} className="mb-3 p-3 border border-[#e0e0dc] rounded-lg bg-[#f7f7f5]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-medium text-[#6b6b6b]">Milestone {i + 1}</span>
                <button onClick={() => remove(m.id)} className="text-[#a0a0a0] hover:text-red-500 text-[13px] transition-colors">✕ Remove</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2 mb-2">
                <input className={inp} placeholder="Description" value={m.desc} onChange={e => update(m.id, 'desc', e.target.value)} />
                <input className={inp} type="number" placeholder="Amount (USDC)" value={m.amount} onChange={e => update(m.id, 'amount', e.target.value)} />
              </div>
              <input className={inp} type="date" value={m.date} onChange={e => update(m.id, 'date', e.target.value)} />
            </div>
          ))}
          <button onClick={add} className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#e0e0dc] rounded-md text-[13px] text-[#6b6b6b] w-full hover:border-[#14a800] hover:text-[#14a800] transition-all">
            + Add milestone
          </button>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 md:p-7">
        <div className="text-[16px] font-bold mb-4">Fee breakdown</div>
        <div className="bg-[#f7f7f5] border border-[#e0e0dc] rounded-lg px-4 py-3.5">
          <FeeRow label="Total deposit" value={`$${total.toFixed(0)} USDC`} />
          <FeeRow label="Client fee (2%)" value={`−$${clientFee.toFixed(2)} USDC`} valueClass="text-red-500" />
          <FeeRow label="Available for work" value={`$${available.toFixed(2)} USDC`} valueClass="text-[#14a800]" />
          <FeeRow label="You deposit now" value={`$${total.toFixed(0)} USDC`} total />
        </div>
        <div className="text-[11px] text-[#a0a0a0] mt-2.5 leading-relaxed">
          Freelancer fee (8%) deducted per milestone on approval. Full deposit refunded if you cancel before approving a freelancer.
        </div>
        <button className="w-full mt-4 py-3 bg-[#14a800] text-white rounded-lg text-[14px] font-medium hover:bg-[#0d7a00] transition-all">
          Deposit & Post Job →
        </button>
      </div>
    </div>
  )
}
