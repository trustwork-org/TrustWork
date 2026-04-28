import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/find-work', label: 'Find Work' },
  { to: '/post-work', label: 'Post Work' },
]

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const { isAuthed, signOut } = useAuth()
  const navigate = useNavigate()

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-[14px] transition-all ${isActive ? 'text-[#14a800] font-medium' : 'text-[#4a4a4a] hover:text-[#1c1c1c]'}`

  return (
    <>
      <nav className="bg-white/90 backdrop-blur border-b border-[#e0e0dc] flex items-center px-4 md:px-8 h-16 sticky top-0 z-50">
        <Link to="/" className="text-[24px] text-[#14a800] shrink-0 mr-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
          TrustWork
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-1 flex-1">
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkCls}>{label}</NavLink>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {isAuthed ? (
            <>
              <button onClick={() => navigate('/app')} className="px-4 py-2 bg-[#14a800] text-white rounded-full text-[13px] font-medium hover:bg-[#0d7a00] transition-all">
                Go to App →
              </button>
              <button onClick={() => { signOut(); navigate('/') }} className="text-[13px] text-[#6b6b6b] hover:text-red-500 transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="text-[14px] text-[#6b6b6b] hover:text-[#1c1c1c] transition-colors">Sign in</Link>
              <Link to="/signin" className="px-4 py-2 bg-[#14a800] text-white rounded-full text-[13px] font-medium hover:bg-[#0d7a00] transition-all">
                Get started free
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden ml-auto w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-[#f7f7f5]" aria-label="Menu">
          <span className={`block w-5 h-0.5 bg-[#1c1c1c] transition-all ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#1c1c1c] transition-all ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#1c1c1c] transition-all ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-b border-[#e0e0dc] px-4 py-3 flex flex-col gap-1 z-40">
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkCls} onClick={() => setOpen(false)}>{label}</NavLink>
          ))}
          <div className="border-t border-[#e0e0dc] mt-2 pt-2 flex flex-col gap-1">
            {isAuthed ? (
              <>
                <button onClick={() => { navigate('/app'); setOpen(false) }} className="text-left px-3 py-1.5 text-[14px] text-[#14a800] font-medium">Go to App →</button>
                <button onClick={() => { signOut(); navigate('/'); setOpen(false) }} className="text-left px-3 py-1.5 text-[13px] text-red-500">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/signin" className="px-3 py-1.5 text-[14px] text-[#6b6b6b]" onClick={() => setOpen(false)}>Sign in</Link>
                <Link to="/signin" className="px-3 py-1.5 text-[14px] text-[#14a800] font-medium" onClick={() => setOpen(false)}>Get started free →</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
