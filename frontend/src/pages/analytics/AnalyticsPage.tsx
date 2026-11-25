import { ApiListPage } from '../shared/ApiListPage'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatLabel(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return 'Unknown'
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatLastSeen(value: unknown) {
  if (value === null) return 'Never seen'
  if (typeof value !== 'string') return 'Last seen unknown'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return 'Last seen unknown'
  return `Last seen ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)}`
}

function summarizeDevices(value: unknown) {
  const devices = Array.isArray(value) ? value.filter(isRecord) : []
  if (devices.length === 0) return 'No active devices'

  const groups = new Map<string, number>()
  for (const device of devices) {
    const lastSeen = device.lastSeenAt === null ? 'Never seen' : formatLastSeen(device.lastSeenAt)
    const label = `${formatLabel(device.connectivityStatus)} · Protection ${formatLabel(device.protectionState)} · ${lastSeen}`
    groups.set(label, (groups.get(label) ?? 0) + 1)
  }
  return Array.from(groups, ([label, count]) => `${label} (${count})`).join('; ')
}

function summarizeDistribution(value: unknown, dimensions: string[], emptyLabel: string) {
  const groups = Array.isArray(value) ? value.filter(isRecord) : []
  if (groups.length === 0) return emptyLabel

  return groups.map((group) => {
    const label = dimensions.map((dimension) => formatLabel(group[dimension])).join(' · ')
    const count = isRecord(group._count) ? group._count._all : undefined
    return `${label}: ${typeof count === 'number' ? count : 'Unknown count'}`
  }).join('; ')
}

const columns = [
  { key: 'devices', label: 'Device availability and protection', render: (row: Record<string, unknown>) => summarizeDevices(row.devices) },
  { key: 'events', label: 'Persisted event distribution', render: (row: Record<string, unknown>) => summarizeDistribution(row.events, ['eventType', 'severity'], 'No events recorded') },
  { key: 'alerts', label: 'Alert distribution', render: (row: Record<string, unknown>) => summarizeDistribution(row.alerts, ['severity', 'status'], 'No alerts recorded') },
]

export function AnalyticsPage() {
  return <ApiListPage title="Analytics" description="Aggregated availability, event and alert counts calculated from persisted records." endpoint="/dashboard/analytics" columns={columns} />
}