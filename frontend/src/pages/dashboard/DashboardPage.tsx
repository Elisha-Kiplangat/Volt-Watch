import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Activity, AlertTriangle, Bell, Cpu, RefreshCw, Shield, Siren, WifiOff, Zap } from 'lucide-react'
import { VoltageTrendChart } from '../../components/charts/VoltageTrendChart'
import { DeviceStatusList } from '../../components/devices/DeviceStatusList'
import { AlertSummary } from '../../components/alerts/AlertSummary'
import { MetricCard } from '../../components/dashboard/MetricCard'
import { useAuth } from '../../context/AuthContext'
import { useDashboard } from '../../hooks/useDashboard'
import type { AuthUser, RecentEvent } from '../../types/monitoring'

const metricCards = [
  { title: 'Registered devices', key: 'totalDevices', icon: Cpu, tone: 'navy', note: (summary: { onlineDevices: number }) => `${summary.onlineDevices} online` },
  { title: 'Offline devices', key: 'offlineDevices', icon: WifiOff, tone: 'gray', note: () => 'Connectivity status' },
  { title: 'Warning state', key: 'warningDevices', icon: AlertTriangle, tone: 'amber', note: () => 'Needs attention' },
  { title: 'Protection trips', key: 'trippedDevices', icon: Shield, tone: 'red', note: () => 'Local protection state' },
  { title: 'Surge events', key: 'surgeEvents', icon: Zap, tone: 'blue', note: () => 'Recorded event history' },
  { title: 'Open alerts', key: 'unacknowledgedAlerts', icon: Bell, tone: 'amber', note: () => 'Awaiting acknowledgement' },
] as const

const roleViews: Record<AuthUser['role'], { title: string; description: string; access: string }> = {
  OPERATOR: {
    title: 'Operator dashboard',
    description: 'Live condition and protection status across devices in your institution.',
    access: 'Monitoring access: review institution device status and events, and acknowledge assigned active alerts.',
  },
  ADMIN: {
    title: 'Administrator dashboard',
    description: 'Monitor your institution, approve operator accounts, and manage its devices and protection configurations.',
    access: 'Administrator access: institution-scoped monitoring, operator approvals, and device configuration management.',
  },
  SUPER_ADMIN: {
    title: 'System admin dashboard',
    description: 'Monitor all institutions, approve operator accounts, and oversee administrator and institution access.',
    access: 'Super administrator access: cross-institution monitoring, administrator creation, and user access.',
  },
}

function formatTime(date?: string) {
  if (!date) return 'No readings yet'
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(date))
}

function RecentEventRow({ event }: { event: RecentEvent }) {
  return <div className="event-row" key={event.id}>
    <span className={`event-marker ${event.severity.toLowerCase()}`}><Zap size={14} /></span>
    <div><strong>{event.eventType.replaceAll('_', ' ')}</strong><p>{event.description}</p></div>
    <time>{formatTime(event.eventTimestamp)}</time>
  </div>
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: summary, isPending, isFetching, isError, error, refetch } = useDashboard()
  const [realtime, setRealtime] = useState(false)
  const roleView = roleViews[user?.role ?? 'OPERATOR']

  useEffect(() => {
    const token = window.localStorage.getItem('accessToken')
    if (!token) return
    const socket = io(`${import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'}/monitoring`, { auth: { token } })
    socket.on('connect', () => setRealtime(true))
    socket.on('disconnect', () => setRealtime(false))
    socket.on('connect_error', () => setRealtime(false))
    const refresh = () => { void refetch() }
    for (const event of ['telemetry:update', 'device:status', 'alert:created', 'alert:updated', 'event:created', 'surge:detected']) socket.on(event, refresh)
    return () => { socket.disconnect(); setRealtime(false) }
  }, [refetch])

  return <>
    <header className="page-heading">
      <div><div className="eyebrow">POWER SYSTEMS / {user?.role.replaceAll('_', ' ')}</div><h1>{roleView.title}</h1><p className="subheading">{roleView.description}</p></div>
      <button type="button" className="button button-secondary" onClick={() => void refetch()} aria-busy={isFetching}><RefreshCw size={16} className={isFetching ? 'spin' : ''} /> {isFetching ? 'Refreshing...' : 'Refresh'}</button>
    </header>

    <section className="panel role-access-panel"><div><strong>{roleView.access}</strong><p>Actions unavailable to you.</p></div>
      {user?.role === 'SUPER_ADMIN' && <Link className="text-link" to="/users">View users <span>→</span></Link>}
      {user?.role === 'ADMIN' && <Link className="text-link" to="/devices">Manage devices <span>→</span></Link>}
      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && <Link className="text-link" to="/approvals">Operator approvals <span>→</span></Link>}
      {user?.role === 'OPERATOR' && <Link className="text-link" to="/alerts">Review alerts <span>→</span></Link>}
    </section>

    {isError && <div className="error-banner" role="alert"><WifiOff size={18} /><span>{error instanceof Error ? error.message : 'The monitoring API could not be reached. Dashboard values are not available.'}</span><button type="button" onClick={() => void refetch()} aria-busy={isFetching}>{isFetching ? 'Retrying...' : 'Retry'}</button></div>}

    <section className="summary-grid" aria-label="System summary">
      {metricCards.map(({ title, key, icon, tone, note }) => <MetricCard key={key} title={title} value={summary?.[key]} loading={isPending} tone={tone} icon={icon} note={note(summary ?? { onlineDevices: 0 })} />)}
    </section>

    <div className="content-grid">
      <VoltageTrendChart points={summary?.voltageTrend ?? []} loading={isPending} realtime={realtime} />
      <DeviceStatusList devices={summary?.devices ?? []} loading={isPending} online={summary?.onlineDevices} normal={summary?.normalDevices} />
    </div>

    <div className="bottom-grid">
      <section className="panel events-panel">
        <div className="panel-heading"><div><h2>Recent events</h2><p>Latest events recorded by the system</p></div><Link className="text-link" to="/events">Event history <span>→</span></Link></div>
        {summary?.recentEvents.length ? summary.recentEvents.slice(0, 4).map((event) => <RecentEventRow key={event.id} event={event} />) : <div className="inline-empty">{isPending ? 'Loading events...' : 'No events recorded for this period.'}</div>}
      </section>
      <section className="panel status-panel">
        <div className="panel-heading"><div><h2>Protection overview</h2><p>Controller-reported state only</p></div><Siren size={18} className="heading-icon" /></div>
        <div className="protection-state"><span className="state-indicator" /><div><strong>{isPending ? 'Loading state' : `${summary?.normalDevices ?? 0} devices normal`}</strong><span>Protection is controlled locally by each device.</span></div></div>
        <div className="safety-note"><Activity size={15} /> Backend monitoring does not issue protection reset commands.</div>
        <AlertSummary count={summary?.unacknowledgedAlerts} loading={isPending} />
      </section>
    </div>
    <footer className="page-footer"><span>Data source: persisted API records</span><span>{realtime ? 'Live updates connected' : 'Polling every 30 seconds'}</span></footer>
  </>
}