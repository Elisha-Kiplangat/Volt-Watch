import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthPage } from '../pages/auth/AuthPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { MonitoringPage } from '../pages/monitoring/MonitoringPage'
import { DevicesPage } from '../pages/devices/DevicesPage'
import { EventsPage } from '../pages/events/EventsPage'
import { AlertsPage } from '../pages/alerts/AlertsPage'
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage'
import { ReportsPage } from '../pages/reports/ReportsPage'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { UsersPage } from '../pages/users/UsersPage'
import { ApprovalsPage } from '../pages/approvals/ApprovalsPage'
import { ProtectedLayout } from '../layouts/ProtectedLayout'

function SuperAdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === 'SUPER_ADMIN' ? children : <Navigate to="/" replace />
}

function AdminApprovalAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? children : <Navigate to="/" replace />
}

export function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<AuthPage />} />
    <Route element={<ProtectedLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="monitoring" element={<MonitoringPage />} />
      <Route path="devices" element={<DevicesPage />} />
      <Route path="events" element={<EventsPage />} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="approvals" element={<AdminApprovalAccess><ApprovalsPage /></AdminApprovalAccess>} />
      <Route path="users" element={<SuperAdminOnly><UsersPage /></SuperAdminOnly>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}