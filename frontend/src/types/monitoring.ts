export type Severity = 'INFO' | 'WARNING' | 'CRITICAL'
export type ConnectivityStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN'
export type MeasurementSource = 'DEVICE' | 'SIMULATED'

export interface VoltagePoint {
  recordedAt: string
  voltageDevice?: number | null
  voltageSimulated?: number | null
}

export interface RecentEvent {
  id: string
  eventType: string
  description: string
  eventTimestamp: string
  severity: Severity
}

export interface DeviceSummary {
  id: string
  deviceId: string
  name: string
  location?: string | null
  connectivityStatus: ConnectivityStatus
  protectionState: string
  lastSeenAt?: string | null
}

export interface DashboardSummary {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  normalDevices: number
  warningDevices: number
  trippedDevices: number
  surgeEvents: number
  unacknowledgedAlerts: number
  voltageTrend: VoltagePoint[]
  recentEvents: RecentEvent[]
  devices: DeviceSummary[]
}

export interface ApiEnvelope<T> {
  data: T
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  institutionId: string | null
  institution: { id: string; name: string } | null
}

export interface InstitutionOption {
  id: string
  name: string
}