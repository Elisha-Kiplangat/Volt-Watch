import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCw, Search, WifiOff } from 'lucide-react'
import { api } from '../../services/api'
import { ApiTable } from '../../components/common/ApiTable'
import type { TableColumn } from '../../components/common/ApiTable'
import { exportCsv } from '../../utils/exportCsv'

export interface ApiListPageProps {
  title: string
  description: string
  endpoint: string
  columns: TableColumn<Record<string, unknown>>[]
  filters?: Array<{ label: string; param: string; options: string[] }>
  groupBy?: (row: Record<string, unknown>) => string
  renderActions?: (row: Record<string, unknown>, refresh: () => void) => ReactNode
}

const pageSize = 50

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function groupRecords(rows: Record<string, unknown>[], groupBy: (row: Record<string, unknown>) => string) {
  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const group = groupBy(row)
    const groupRows = groups.get(group) ?? []
    groupRows.push(row)
    groups.set(group, groupRows)
  }
  return Array.from(groups.entries())
}

export function ApiListPage({ title, description, endpoint, columns, filters = [], groupBy, renderActions }: ApiListPageProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const query = useQuery({
    queryKey: ['records', endpoint, search, filterValues, page],
    queryFn: async () => {
      const activeFilters = Object.fromEntries(Object.entries(filterValues).filter(([, value]) => value !== ''))
      const response = await api.get<{ data: unknown }>(endpoint, { params: { page, pageSize, ...(search ? { search } : {}), ...activeFilters } })
      const payload: unknown = response.data.data ?? response.data
      if (Array.isArray(payload)) {
        const items = payload.filter(isRecord)
        return { items, total: items.length, paginated: false }
      }
      if (!isRecord(payload)) throw new Error(`The ${title.toLowerCase()} response was invalid.`)
      const items = Array.isArray(payload.items) ? payload.items.filter(isRecord) : [payload]
      return { items, total: typeof payload.total === 'number' ? payload.total : items.length, paginated: typeof payload.total === 'number' }
    },
    retry: 1,
  })
  const rows = query.data?.items ?? []
  const total = query.data?.total ?? rows.length
  const groupedRows = groupBy ? groupRecords(rows, groupBy) : null

  return <section className="resource-view"><div className="eyebrow">POWER SYSTEMS / OPERATIONS</div>
    <div className="resource-heading"><div><h1>{title}</h1><p className="subheading">{description}</p></div>
    <button className="button" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label={`Refresh ${title}`}><RefreshCw size={15} className={query.isFetching ? 'spin' : ''} /> Refresh</button></div>
    <div className="resource-toolbar"><label className="resource-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} /></label>{filters.map((filter) => <label className="filter-select" key={filter.param}><span>{filter.label}</span><select value={filterValues[filter.param] ?? ''} onChange={(event) => { setFilterValues((current) => ({ ...current, [filter.param]: event.target.value })); setPage(1) }}><option value="">All</option>{filter.options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>)}<button className="button" disabled={!rows.length} onClick={() => exportCsv(rows, `${title.toLowerCase().replaceAll(' ', '-')}.csv`)}><Download size={14} /> Export CSV</button></div>
    <section className="panel records-panel" aria-live="polite">{query.isPending ? <div className="resource-state">Loading {title.toLowerCase()}...</div> : query.isError ? <div className="resource-state resource-error"><WifiOff size={17} />{query.error instanceof Error ? query.error.message : `Could not load ${title.toLowerCase()}.`}<button className="button" onClick={() => void query.refetch()}>Retry</button></div> : rows.length ? groupedRows ? groupedRows.map(([group, groupRows]) => <section className="records-group" key={group}><h2>{group}</h2><ApiTable rows={groupRows} columns={columns} actions={renderActions ? (row) => renderActions(row, () => void query.refetch()) : undefined} /></section>) : <ApiTable rows={rows} columns={columns} actions={renderActions ? (row) => renderActions(row, () => void query.refetch()) : undefined} /> : <div className="resource-state">No {title.toLowerCase()} records match this filter.</div>}</section>
    {!query.isError && !query.isPending && <div className="page-footer"><span>{query.data?.paginated ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} records` : `${rows.length} records shown`}</span><span>Source: persisted API records</span></div>}
    {!query.isError && query.data?.paginated && total > pageSize && <nav className="pagination" aria-label={`${title} pages`}><button className="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || query.isFetching}>Previous</button><span>Page {page} of {Math.ceil(total / pageSize)}</span><button className="button" onClick={() => setPage((current) => current + 1)} disabled={page >= Math.ceil(total / pageSize) || query.isFetching}>Next</button></nav>}
  </section>
}