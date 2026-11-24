import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'recordedAt', label: 'Recorded', render: (row: Record<string, unknown>) => row.recordedAt ? new Date(String(row.recordedAt)).toLocaleString() : '--' },
  { key: 'device', label: 'Device', render: (row: Record<string, unknown>) => String((row.device as { name?: string } | undefined)?.name ?? '--') },
  { key: 'voltage', label: 'Voltage (V)' },
  { key: 'current', label: 'Current (A)' },
  { key: 'frequency', label: 'Frequency (Hz)' },
  { key: 'power', label: 'Power (W)' },
  { key: 'source', label: 'Source' },
]

export function MonitoringPage() {
  return <ApiListPage title="Live monitoring" description="Persisted telemetry readings. Simulated values are labelled separately from device measurements." endpoint="/telemetry" columns={columns} />
}