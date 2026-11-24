import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'createdAt', label: 'Created', render: (row: Record<string, unknown>) => row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '--' },
  { key: 'title', label: 'Alert' },
  { key: 'severity', label: 'Severity' },
  { key: 'status', label: 'Status' },
  { key: 'device', label: 'Device', render: (row: Record<string, unknown>) => String((row.device as { name?: string } | undefined)?.name ?? '--') },
  { key: 'acknowledgedBy', label: 'Acknowledged by', render: (row: Record<string, unknown>) => String((row.acknowledgedBy as { fullName?: string } | undefined)?.fullName ?? '--') },
]

export function AlertsPage() {
  const queryClient = useQueryClient()
  return <ApiListPage title="Alerts" description="Review alerts, record acknowledgement, and track resolution history." endpoint="/alerts" columns={columns} filters={[{ label: 'Severity', param: 'severity', options: ['INFO', 'WARNING', 'CRITICAL'] }, { label: 'Status', param: 'status', options: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] }]} renderActions={(row, refresh) => <button className="table-action" disabled={row.status !== 'ACTIVE'} onClick={async () => { await api.patch(`/alerts/${String(row.id)}/acknowledge`); await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); refresh() }}>Acknowledge</button>} />
}