import { api } from './api'
import type { DashboardSummary } from '../types/monitoring'

export async function fetchDashboardSummary() {
  const response = await api.get<{ data: DashboardSummary }>('/dashboard/summary')
  return response.data.data
}