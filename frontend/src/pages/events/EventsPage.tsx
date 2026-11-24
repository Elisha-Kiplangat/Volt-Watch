import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'eventTimestamp', label: 'Time', render: (row: Record<string, unknown>) => row.eventTimestamp ? new Date(String(row.eventTimestamp)).toLocaleString() : '--' },
  { key: 'eventType', label: 'Event' },
  { key: 'severity', label: 'Severity' },
  { key: 'device', label: 'Device', render: (row: Record<string, unknown>) => String((row.device as { name?: string } | undefined)?.name ?? '--') },
  { key: 'voltage', label: 'Voltage (V)' },
  { key: 'description', label: 'Description' },
]

export function EventsPage() {
  return <ApiListPage title="Events" description="Electrical anomalies, protection transitions, and device activity." endpoint="/events" columns={columns} filters={[{ label: 'Severity', param: 'severity', options: ['INFO', 'WARNING', 'CRITICAL'] }]} />
}