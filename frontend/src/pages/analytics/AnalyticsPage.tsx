import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'devices', label: 'Device availability and protection', render: (row: Record<string, unknown>) => JSON.stringify(row.devices ?? []) },
  { key: 'events', label: 'Persisted event distribution', render: (row: Record<string, unknown>) => JSON.stringify(row.events ?? []) },
  { key: 'alerts', label: 'Alert distribution', render: (row: Record<string, unknown>) => JSON.stringify(row.alerts ?? []) },
]

export function AnalyticsPage() {
  return <ApiListPage title="Analytics" description="Aggregated availability, event and alert counts calculated from persisted records." endpoint="/dashboard/analytics" columns={columns} />
}