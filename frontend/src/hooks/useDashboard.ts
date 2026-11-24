import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '../services/dashboard'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 30_000,
    retry: 1,
  })
}