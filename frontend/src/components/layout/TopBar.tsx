import { useLocation, Link } from 'react-router-dom'
import { Activity, BarChart3, Bell, ClipboardList, Cpu, FileText, Gauge, LayoutDashboard, Menu, Settings, Siren, UserCheck, Users } from 'lucide-react'
import type { AuthUser } from '../../types/monitoring'

const titles: Record<string, { label: string; icon: typeof Gauge }> = {
  '/': { label: 'Dashboard', icon: LayoutDashboard },
  '/monitoring': { label: 'Live monitoring', icon: Activity },
  '/devices': { label: 'Devices', icon: Cpu },
  '/events': { label: 'Events', icon: ClipboardList },
  '/alerts': { label: 'Alerts', icon: Siren },
  '/analytics': { label: 'Analytics', icon: BarChart3 },
  '/reports': { label: 'Reports', icon: FileText },
  '/approvals': { label: 'Approvals', icon: UserCheck },
  '/settings': { label: 'Settings', icon: Settings },
  '/users': { label: 'Users', icon: Users },
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function TopBar({ user, openMenu }: { user: AuthUser; openMenu: () => void }) {
  const { pathname } = useLocation()
  const current = titles[pathname] ?? titles['/']
  const Icon = current.icon
  return <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={openMenu}><Menu size={20} /></button><div className="breadcrumbs"><span>Power systems</span><span className="crumb-sep">/</span><strong><Icon size={14} /> {current.label}</strong></div><div className="topbar-actions"><Link className="icon-button" aria-label="View alerts" title="View alerts" to="/alerts"><Bell size={18} /></Link><div className="topbar-divider" /><span className="top-avatar" title={`${user.fullName} (${user.role.replaceAll('_', ' ')})`}>{initials(user.fullName)}</span></div></header>
}