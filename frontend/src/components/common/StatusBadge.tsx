import type { ConnectivityStatus, Severity } from '../../types/monitoring'

export function StatusBadge({ status }: { status: ConnectivityStatus | Severity | string }) {
  const tone = status === 'ONLINE' || status === 'INFO' ? 'healthy' : status === 'WARNING' ? 'warning' : status === 'CRITICAL' ? 'critical' : 'offline'
  return <span className={`status-pill ${tone}`}><i />{status.replaceAll('_', ' ')}</span>
}