import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '../../services/api'
import type { InstitutionOption } from '../../types/monitoring'
import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'institution', label: 'Institution', render: (row: Record<string, unknown>) => String((row.institution as { name?: string } | null)?.name ?? '--') },
  { key: 'role', label: 'Role', render: (row: Record<string, unknown>) => String(row.role ?? '').replaceAll('_', ' ') },
  { key: 'approvalStatus', label: 'Approval', render: (row: Record<string, unknown>) => String(row.approvalStatus ?? '--') },
  { key: 'isActive', label: 'Account status', render: (row: Record<string, unknown>) => row.isActive ? 'Active' : 'Inactive' },
  { key: 'createdAt', label: 'Created', render: (row: Record<string, unknown>) => row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString() : '--' },
]

export function UsersPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [assignmentError, setAssignmentError] = useState('')
  const [institutionChoices, setInstitutionChoices] = useState<Record<string, string>>({})
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const response = await api.get<{ data: InstitutionOption[] }>('/auth/institutions')
      return response.data.data
    },
  })
  const schema = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(72),
    institutionName: z.string().trim().min(2).max(120),
  })
  type AdminForm = z.infer<typeof schema>
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AdminForm>({ resolver: zodResolver(schema) })

  const createAdmin = handleSubmit(async (values) => {
    setError('')
    setMessage('')
    try {
      const response = await api.post('/users/admins', values)
      setMessage(`Created administrator ${response.data.data.fullName} for ${response.data.data.institution.name}.`)
      reset()
      await queryClient.invalidateQueries({ queryKey: ['records', '/users'] })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Administrator creation failed.')
    }
  })

  async function assignInstitution(id: string) {
    const institutionId = institutionChoices[id]
    if (!institutionId) return
    setAssignmentError('')
    try {
      await api.patch(`/users/${id}`, { institutionId })
      await queryClient.invalidateQueries({ queryKey: ['records', '/users'] })
    } catch (reason) {
      setAssignmentError(reason instanceof Error ? reason.message : 'Institution assignment failed.')
    }
  }

  return <>
    <section className="resource-view"><div className="eyebrow">POWER SYSTEMS / ACCESS CONTROL</div><div className="resource-heading"><div><h1>Create administrator</h1><p className="subheading">Enter an existing institution name to reuse it, or a new name to create one.</p></div></div>
      <form className="report-form" onSubmit={createAdmin}>
        <label>Full name<input {...register('fullName')} maxLength={100} />{errors.fullName && <small>Enter a name between 2 and 100 characters.</small>}</label>
        <label>Email<input type="email" {...register('email')} maxLength={254} />{errors.email && <small>Enter a valid email address.</small>}</label>
        <label>Initial password<input type="password" autoComplete="new-password" {...register('password')} maxLength={72} />{errors.password && <small>Use 12 to 72 characters.</small>}</label>
        <label>Institution<input {...register('institutionName')} maxLength={120} />{errors.institutionName && <small>Enter an institution name.</small>}</label>
        <button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create administrator'}</button>
      </form>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {message && <div className="success-banner" role="status">{message}</div>}
      {assignmentError && <div className="error-banner" role="alert">{assignmentError}</div>}
    </section>
    <ApiListPage title="User accounts" description="Review account roles, approval state, and institution assignments." endpoint="/users" columns={columns} renderActions={(row, refresh) => {
      if (row.role === 'SUPER_ADMIN') return '--'
      const id = String(row.id)
      const currentInstitutionId = (row.institution as { id?: string } | null)?.id ?? ''
      return <div className="device-assignment"><select aria-label={`Institution for ${String(row.fullName ?? row.email)}`} value={institutionChoices[id] ?? currentInstitutionId} onChange={(event) => setInstitutionChoices((current) => ({ ...current, [id]: event.target.value }))} disabled={institutions.isPending || institutions.isError}><option value="">Unassigned</option>{institutions.data?.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select><button className="table-action" disabled={!institutionChoices[id] || institutionChoices[id] === currentInstitutionId} onClick={async () => { await assignInstitution(id); refresh() }}>Assign</button></div>
    }} />
  </>
}
