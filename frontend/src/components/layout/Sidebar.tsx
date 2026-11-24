import { Activity, BarChart3, ClipboardList, Cpu, FileText, LayoutDashboard, LogOut, Settings, Siren, UserCheck, Users, Zap } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import type { AuthUser } from '../../types/monitoring'

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Live monitoring', path: '/monitoring', icon: Activity },
  { label: 'Devices', path: '/devices', icon: Cpu },
  { label: 'Events', path: '/events', icon: ClipboardList },
  { label: 'Alerts', path: '/alerts', icon: Siren },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Approvals', path: '/approvals', icon: UserCheck, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { label: 'Users', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
]

function roleLabel(role: AuthUser['role']) {
  return role === 'SUPER_ADMIN' ? 'Super administrator' : role === 'ADMIN' ? 'Administrator' : 'Operator'
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function Sidebar({ user, mobileOpen, close, onLogout }: { user: AuthUser; mobileOpen: boolean; close: () => void; onLogout: () => void }) {
  return <>
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <Link className="brand" to="/" onClick={close}><span className="brand-mark"><Zap size={19} fill="currentColor" /></span><span><strong>VOLT<span>WATCH</span></strong><small>POWER SYSTEMS</small></span></Link>
      {/* <div className="workspace-label">MONITORING</div> */}
      <nav className="side-nav" aria-label="Main navigation">{navigation.filter(({ roles }) => !roles || roles.includes(user.role)).map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Alerts' && <b className="nav-count" />}</NavLink>)}
        <div className="nav-divider" />
        <NavLink to="/settings" onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Settings size={17} strokeWidth={1.8} /><span>Settings</span></NavLink>
      </nav>
      <div className="sidebar-bottom">
        {/* <div className="connection-indicator">
          <span className="pulse-dot" /><span>API CONNECTION</span><b>ON REQUEST</b>
        </div> */}
      <div className="sidebar-user"><span className="user-avatar">{initials(user.fullName)}</span><div><strong>{user.fullName}</strong><small>{roleLabel(user.role)}{user.institution ? ` · ${user.institution.name}` : ''}</small></div><button className="logout-button" aria-label="Sign out" title="Sign out" onClick={onLogout}><LogOut size={15} /></button></div></div>
    </aside>
    {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={close} />}
  </>
}