import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingNav from './components/LandingNav'
import Navbar from './components/Navbar'
import StatsBar from './components/StatsBar'

// Public pages
import Landing from './pages/Landing'
import FindWork from './pages/FindWork'
import PostWork from './pages/PostWork'
import SignIn from './pages/SignIn'

// Protected app pages
import JobBoard from './pages/JobBoard'
import Dashboard from './pages/Dashboard'
import PostJob from './pages/PostJob'
import Dispute from './pages/Dispute'
import Arbitrate from './pages/Arbitrate'
import Profile from './pages/Profile'

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      {children}
    </>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Navbar />
      <StatsBar />
      {children}
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
          <Route path="/find-work" element={<PublicLayout><FindWork /></PublicLayout>} />
          <Route path="/post-work" element={<PublicLayout><PostWork /></PublicLayout>} />
          <Route path="/signin" element={<SignIn />} />

          {/* Protected app routes */}
          <Route path="/app" element={<AppLayout><JobBoard /></AppLayout>} />
          <Route path="/app/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/app/post" element={<AppLayout><PostJob /></AppLayout>} />
          <Route path="/app/dispute" element={<AppLayout><Dispute /></AppLayout>} />
          <Route path="/app/arbitrate" element={<AppLayout><Arbitrate /></AppLayout>} />
          <Route path="/app/profile" element={<AppLayout><Profile /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
