import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '../../services/api'
import { ApiListPage } from '../shared/ApiListPage'

const columns = [
  { key: 'id', label: 'Report ID' },
  { key: 'title', label: 'Report' },
  { key: 'createdAt', label: 'Generated', render: (row: Record<string, unknown>) => row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '--' },
  { key: 'status', label: 'Status' },
]

export function ReportsPage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const formSchema = z.object({
    reportType: z.enum(['ELECTRICAL_MONITORING', 'VOLTAGE_ANOMALY', 'SURGE_EVENT', 'PROTECTION_TRIP', 'DEVICE_PERFORMANCE', 'ALERT_SUMMARY']),
    deviceId: z.string().optional(),
    periodFrom: z.string().min(1, 'Choose a start date.'),
    periodTo: z.string().min(1, 'Choose an end date.'),
  })
  type ReportForm = z.infer<typeof formSchema>
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReportForm>({ resolver: zodResolver(formSchema), defaultValues: { reportType: 'ELECTRICAL_MONITORING' } })

  const generate = handleSubmit(async (values) => {
    setError('')
    setMessage('')
    if (new Date(values.periodFrom) >= new Date(values.periodTo)) {
      setError('The report start must be earlier than its end.')
      return
    }
    try {
      await api.post('/reports/generate', {
        ...values,
        periodFrom: new Date(values.periodFrom).toISOString(),
        periodTo: new Date(values.periodTo).toISOString(),
        ...(values.deviceId ? {} : { deviceId: undefined }),
      })
      setMessage('Report generated from persisted monitoring records.')
      await queryClient.invalidateQueries({ queryKey: ['records', '/reports'] })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Report generation failed.')
    }
  })

  return <>
    <section className="resource-view"><div className="eyebrow">POWER SYSTEMS / REPORTING</div><h1>Reports</h1><p className="subheading">Generate persisted, date-bounded monitoring summaries.</p>
      <form className="report-form" onSubmit={generate}>
        <label>Report type<select {...register('reportType')}><option value="ELECTRICAL_MONITORING">Electrical monitoring</option><option value="VOLTAGE_ANOMALY">Voltage anomaly</option><option value="SURGE_EVENT">Surge events</option><option value="PROTECTION_TRIP">Protection trips</option><option value="DEVICE_PERFORMANCE">Device performance</option><option value="ALERT_SUMMARY">Alert summary</option></select></label>
        <label>Device ID <input {...register('deviceId')} placeholder="All devices" /></label>
        <label>From <input type="datetime-local" {...register('periodFrom')} />{errors.periodFrom && <small>{errors.periodFrom.message}</small>}</label>
        <label>To <input type="datetime-local" {...register('periodTo')} />{errors.periodTo && <small>{errors.periodTo.message}</small>}</label>
        <button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Generating...' : 'Generate report'}</button>
      </form>
      {error && <div className="error-banner" role="alert">{error}</div>}{message && <div className="success-banner" role="status">{message}</div>}
    </section>
    <ApiListPage title="Report history" description="Saved report summaries." endpoint="/reports" columns={columns} />
  </>
}