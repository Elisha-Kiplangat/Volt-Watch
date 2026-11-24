import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AlertSummary({ count, loading }: { count?: number; loading: boolean }) {
  return <Link className="alert-summary" to="/alerts">
    <span className="alert-summary-icon"><Bell size={15} /></span>
    <span><strong>{loading ? 'Loading alerts' : `${count ?? 0} unacknowledged alerts`}</strong><small>Review active alert history</small></span>
    <span className="alert-summary-arrow">→</span>
  </Link>
}