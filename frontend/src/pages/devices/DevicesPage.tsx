import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import type { InstitutionOption } from '../../types/monitoring'
import { ApiListPage } from '../shared/ApiListPage'

const baseColumns = [
  { key: 'deviceId', label: 'Device ID' },
  { key: 'name', label: 'Name' },
  { key: 'location', label: 'Location' },
  { key: 'connectivityStatus', label: 'Connectivity' },
  { key: 'protectionState', label: 'Protection state' },
  { key: 'lastSeenAt', label: 'Last seen', render: (row: Record<string, unknown>) => row.lastSeenAt ? new Date(String(row.lastSeenAt)).toLocaleString() : 'Never' },
]

export function DevicesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [institutionChoices, setInstitutionChoices] = useState<Record<string, string>>({})
  const [assignmentError, setAssignmentError] = useState('')
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const response = await api.get<{ data: InstitutionOption[] }>('/auth/institutions')
      return response.data.data
    },
    enabled: user?.role === 'SUPER_ADMIN',
  })
  const schema = z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().max(500).optional(),
    location: z.string().max(160).optional(),
    deviceType: z.string().max(80).optional(),
    institutionId: z.string().optional(),
  })
  type DeviceForm = z.infer<typeof schema>
  const { register, handleSubmit, reset, setError: setFormError, formState: { errors, isSubmitting } } = useForm<DeviceForm>({ resolver: zodResolver(schema) })
  const canManageDevices = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const create = handleSubmit(async (values) => {
    setError('')
    if (user?.role === 'SUPER_ADMIN' && !values.institutionId) {
      setFormError('institutionId', { message: 'Select an institution for this device.' })
      return
    }
    setMessage('')
    try {
      const response = await api.post('/devices', values)
      setMessage(`Registered device ${response.data.data.deviceId}.`)
      reset()
      setFormOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['records', '/devices'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Device registration failed.')
    }
  })

  async function assignDevice(id: string) {
    const institutionId = institutionChoices[id]
    if (!institutionId) return
    setAssignmentError('')
    try {
      await api.patch(`/devices/${id}/institution`, { institutionId })
      await queryClient.invalidateQueries({ queryKey: ['records', '/devices'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (reason) {
      setAssignmentError(reason instanceof Error ? reason.message : 'Institution assignment failed.')
    }
  }

  const columns = user?.role === 'SUPER_ADMIN'
    ? [{ key: 'institution', label: 'Institution', render: (row: Record<string, unknown>) => String((row.institution as { name?: string } | null)?.name ?? 'Unassigned') }, ...baseColumns]
    : baseColumns

  return <>
    <section className="resource-view"><div className="eyebrow">POWER SYSTEMS / ASSETS</div><div className="resource-heading"><div><h1>Devices</h1><p className="subheading">Registered devices, connectivity, and controller-reported protection state.</p></div>{canManageDevices && <button className="button button-primary" onClick={() => setFormOpen(!formOpen)}>{formOpen ? 'Cancel' : 'Register device'}</button>}</div>
      {canManageDevices && formOpen && <form className="report-form" onSubmit={create}><label>Device name<input {...register('name')} maxLength={100} />{errors.name && <small>Enter a name between 2 and 100 characters.</small>}</label><label>Location<input {...register('location')} maxLength={160} /></label><label>Device type<input {...register('deviceType')} maxLength={80} placeholder="SURGE_PROTECTOR" /></label><label>Description<input {...register('description')} maxLength={500} /></label>{user?.role === 'SUPER_ADMIN' && <label>Institution<select defaultValue="" {...register('institutionId')}><option value="">Select institution</option>{institutions.data?.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select>{errors.institutionId && <small>{errors.institutionId.message}</small>}</label>}<button className="button button-primary" disabled={isSubmitting || (user?.role === 'SUPER_ADMIN' && (!institutions.data?.length || institutions.isPending || institutions.isError))}>{isSubmitting ? 'Registering...' : 'Create device'}</button></form>}
      {error && <div className="error-banner" role="alert">{error}</div>}{message && <div className="success-banner" role="status">{message}</div>}
      {assignmentError && <div className="error-banner" role="alert">{assignmentError}</div>}
      {user?.role === 'SUPER_ADMIN' && institutions.isError && <div className="error-banner" role="alert">Could not load institutions for device assignment.</div>}
    </section>
    <ApiListPage title="Registered devices" description="Connectivity and protection states reported by devices." endpoint="/devices" columns={columns} groupBy={user?.role === 'SUPER_ADMIN' ? (row) => String((row.institution as { name?: string } | null)?.name ?? 'Unassigned') : undefined} filters={[{ label: 'Connectivity', param: 'connectivityStatus', options: ['ONLINE', 'OFFLINE', 'UNKNOWN'] }]} renderActions={user?.role === 'SUPER_ADMIN' ? (row) => {
      const id = String(row.id)
      const currentInstitutionId = (row.institution as { id?: string } | null)?.id ?? ''
      return <div className="device-assignment"><select aria-label={`Institution for ${String(row.name ?? row.deviceId)}`} value={institutionChoices[id] ?? currentInstitutionId} onChange={(event) => setInstitutionChoices((current) => ({ ...current, [id]: event.target.value }))}><option value="">Unassigned</option>{institutions.data?.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select><button className="table-action" disabled={!institutionChoices[id] || institutionChoices[id] === currentInstitutionId} onClick={() => void assignDevice(id)}>Assign</button></div>
    } : undefined} />
  </>
}