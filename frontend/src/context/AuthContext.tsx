import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface User {
  address: string
  displayName: string
  provider: 'wallet' | 'google'
  avatar: string
}

interface AuthContextType {
  user: User | null
  isAuthed: boolean
  signInWithWallet: () => void
  signInWithGoogle: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Hardcoded mock users
const MOCK_WALLET_USER: User = {
  address: '0x4a3f…89b2',
  displayName: 'AK',
  provider: 'wallet',
  avatar: 'AK',
}

const MOCK_GOOGLE_USER: User = {
  address: '0x7c1b…22f1',
  displayName: 'Alex K.',
  provider: 'google',
  avatar: 'AK',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const signInWithWallet = () => setUser(MOCK_WALLET_USER)
  const signInWithGoogle = () => setUser(MOCK_GOOGLE_USER)
  const signOut = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, isAuthed: !!user, signInWithWallet, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
