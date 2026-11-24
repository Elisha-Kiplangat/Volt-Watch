import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../services/api'
import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'institution', label: 'Institution', render: (row: Record<string, unknown>) => String((row.institution as { name?: string } | null)?.name ?? '--') },
  { key: 'createdAt', label: 'Requested', render: (row: Record<string, unknown>) => row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '--' },
]

function ApproveOperatorButton({ id, refresh }: { id: string; refresh: () => void }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function approve() {
    setError('')
    setSubmitting(true)
    try {
      await api.patch(`/users/${id}/approve`)
      await queryClient.invalidateQueries({ queryKey: ['records', '/users/pending-operators'] })
      refresh()
    } catch (reason) {
      setError(axios.isAxiosError(reason) ? reason.response?.data?.message ?? 'Approval failed.' : 'Approval failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return <span><button className="table-action" onClick={() => void approve()} disabled={submitting}>{submitting ? 'Approving...' : 'Approve'}</button>{error && <small role="alert">{error}</small>}</span>
}

export function ApprovalsPage() {
  return <ApiListPage
    title="Operator approvals"
    description="Approve operator accounts that requested access to your institution."
    endpoint="/users/pending-operators"
    columns={columns}
    renderActions={(row, refresh) => <ApproveOperatorButton id={String(row.id)} refresh={refresh} />}
  />
}
