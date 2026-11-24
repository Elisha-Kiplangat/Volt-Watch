import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'deviceId', label: 'Device' },
  { key: 'configuration', label: 'Configuration version', render: (row: Record<string, unknown>) => String((row.configuration as { version?: number } | null)?.version ?? '--') },
  { key: 'configuration', label: 'Undervoltage warning (V)', render: (row: Record<string, unknown>) => String((row.configuration as { lowVoltageThreshold?: number } | null)?.lowVoltageThreshold ?? '--') },
  { key: 'configuration', label: 'Critical undervoltage (V)', render: (row: Record<string, unknown>) => String((row.configuration as { criticalLowVoltageThreshold?: number } | null)?.criticalLowVoltageThreshold ?? '--') },
  { key: 'configuration', label: 'Overvoltage warning (V)', render: (row: Record<string, unknown>) => String((row.configuration as { highVoltageThreshold?: number } | null)?.highVoltageThreshold ?? '--') },
  { key: 'configuration', label: 'Critical overvoltage (V)', render: (row: Record<string, unknown>) => String((row.configuration as { criticalHighVoltageThreshold?: number } | null)?.criticalHighVoltageThreshold ?? '--') },
  { key: 'configuration', label: 'Device acknowledgement', render: (row: Record<string, unknown>) => String((row.configuration as { deliveryStatus?: string } | null)?.deliveryStatus ?? '--') },
]

export function SettingsPage() {
  return <ApiListPage title="Protection settings" description="Device thresholds, configuration versions, and delivery acknowledgement state." endpoint="/devices" columns={columns} />
}