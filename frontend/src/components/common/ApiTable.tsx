import type { ReactNode } from 'react'

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => string
}

export function ApiTable<T extends Record<string, unknown>>({ rows, columns, actions }: {
  rows: T[]
  columns: TableColumn<T>[]
  actions?: (row: T) => ReactNode
}) {
  return <div className="records-table-wrap"><table className="records-table"><thead><tr>{columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}{actions && <th>Action</th>}</tr></thead><tbody>
    {rows.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => {
      const raw = row[column.key as keyof T]
      const display = column.render ? column.render(row) : raw == null ? '--' : typeof raw === 'object' ? JSON.stringify(raw) : String(raw)
      return <td key={String(column.key)}>{display}</td>
    })}{actions && <td>{actions(row)}</td>}</tr>)}
  </tbody></table></div>
}