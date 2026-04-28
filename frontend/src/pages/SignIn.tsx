import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignIn() {
  const { signInWithWallet, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleWallet = () => { signInWithWallet(); navigate('/') }
  const handleGoogle = () => { signInWithGoogle(); navigate('/') }

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-[32px] text-[#14a800] mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            TrustWork
          </div>
          <div className="text-[15px] text-[#6b6b6b]">Decentralised freelancer escrow platform</div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#e0e0dc] rounded-2xl p-8 shadow-sm">
          <div className="text-[20px] font-bold mb-1.5 text-center">Welcome back</div>
          <div className="text-[13px] text-[#6b6b6b] text-center mb-7">
            Sign in to access your jobs, milestones, and escrow balance.
          </div>

          {/* Connect Wallet */}
          <button
            onClick={handleWallet}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-2 border-[#14a800] rounded-xl text-[14px] font-semibold text-[#14a800] hover:bg-[#e6f4e1] transition-all mb-3 group"
          >
            <span className="w-9 h-9 rounded-full bg-[#e6f4e1] flex items-center justify-center text-[18px] group-hover:bg-[#14a800] group-hover:text-white transition-all">
              🦊
            </span>
            <div className="flex-1 text-left">
              <div>Connect Wallet</div>
              <div className="text-[11px] font-normal text-[#6b6b6b]">MetaMask, WalletConnect, Coinbase</div>
            </div>
            <span className="text-[#a0a0a0] text-[18px]">→</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#e0e0dc]" />
            <span className="text-[12px] text-[#a0a0a0]">or</span>
            <div className="flex-1 h-px bg-[#e0e0dc]" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center gap-3 px-4 py-3.5 border border-[#e0e0dc] rounded-xl text-[14px] font-medium text-[#1c1c1c] hover:bg-[#f7f7f5] hover:border-[#a0a0a0] transition-all group"
          >
            <span className="w-9 h-9 rounded-full bg-[#f7f7f5] flex items-center justify-center text-[18px]">
              G
            </span>
            <div className="flex-1 text-left">
              <div>Sign in with Google</div>
              <div className="text-[11px] font-normal text-[#6b6b6b]">Powered by account abstraction (EIP-4337)</div>
            </div>
            <span className="text-[#a0a0a0] text-[18px]">→</span>
          </button>

          {/* Info */}
          <div className="mt-6 p-3.5 bg-[#f7f7f5] rounded-lg">
            <div className="text-[11px] text-[#6b6b6b] leading-relaxed">
              🔒 <strong>No seed phrases required</strong> for Google sign-in. A smart contract wallet is created automatically. You can export it anytime for full self-custody.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 text-[12px] text-[#a0a0a0]">
          By signing in you agree to interact with smart contracts on Lisk Network.
        </div>
      </div>
    </div>
  )
}
