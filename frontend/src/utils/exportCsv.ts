export function exportCsv(records: Array<Record<string, unknown>>, filename: string) {
  if (!records.length) return
  const headers = [...new Set(records.flatMap((record) => Object.keys(record)))]
  const escape = (value: unknown) => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    return `"${text.replaceAll('"', '""')}"`
  }
  const csv = [headers, ...records.map((record) => headers.map((header) => record[header]))]
    .map((row) => row.map(escape).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}