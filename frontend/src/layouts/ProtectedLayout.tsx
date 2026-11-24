import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'

export function ProtectedLayout() {
  const { authenticated, user, userLoading, userError, refreshUser, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!authenticated) return <Navigate to="/login" replace />
  if (!user) return <main className="identity-state" aria-live="polite">
    <div className="resource-state">{userLoading ? 'Loading your account permissions...' : userError}
      {!userLoading && <button className="button" onClick={() => void refreshUser()}>Retry</button>}
    </div>
  </main>
  async function logout() {
    try { await signOut() } catch { /* signOut always clears the local session. */ }
  }
  return <div className="app-shell">
    <Sidebar user={user} mobileOpen={mobileOpen} close={() => setMobileOpen(false)} onLogout={() => void logout()} />
    <main className="main-area"><TopBar user={user} openMenu={() => setMobileOpen(true)} /><div className="page-content"><Outlet /></div></main>
  </div>
}