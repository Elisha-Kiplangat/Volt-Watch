import type { LucideIcon } from 'lucide-react'

export function MetricCard({ title, value, note, tone, icon: Icon, loading }: {
  title: string
  value: number | undefined
  note: string
  tone: string
  icon: LucideIcon
  loading: boolean
}) {
  return <article className="summary-card">
    <div className={`summary-icon ${tone}`}><Icon size={18} /></div>
    <div className="summary-label">{title}</div>
    <div className="summary-value">{loading ? <span className="skeleton" /> : value == null ? '--' : value.toLocaleString()}</div>
    <div className="summary-note">{note}</div>
  </article>
}