import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import { Activity, Shield, Zap } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import type { InstitutionOption } from '../../types/monitoring'

const credentialsSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(100).optional(),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(72),
  institutionId: z.string().optional(),
})

type Credentials = z.infer<typeof credentialsSchema>

export function AuthPage() {
  const { authenticated, signIn, signUp } = useAuth()
  const [registering, setRegistering] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const response = await api.get<{ data: InstitutionOption[] }>('/auth/institutions')
      return response.data.data
    },
    enabled: registering,
  })
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) })

  if (authenticated) return <Navigate to="/" replace />

  const submit = handleSubmit(async (values) => {
    setRequestError('')
    setSuccessMessage('')
    try {
      if (registering) {
        if (!values.fullName) { setError('fullName', { message: 'Enter your full name.' }); return }
        if (values.password.length < 12) { setError('password', { message: 'Use at least 12 characters.' }); return }
        if (!values.institutionId) { setError('institutionId', { message: 'Select your institution.' }); return }
        setSuccessMessage(await signUp(values.fullName, values.email, values.password, values.institutionId))
        setRegistering(false)
      } else {
        await signIn(values.email, values.password)
      }
    } catch (error) {
      setRequestError(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Authentication failed. Check the API connection and your details.' : 'Authentication failed.')
    }
  })

  return <main className="auth-screen">
    <section className="auth-panel">
      <div className="brand auth-brand"><span className="brand-mark"><Zap size={19} fill="currentColor" /></span><span><strong>VOLT<span>WATCH</span></strong><small>POWER SYSTEMS</small></span></div>
      <div className="eyebrow">SECURE MONITORING ACCESS</div>
      <h1>{registering ? 'Create operator account' : 'Sign in to operations'}</h1>
      <p className="auth-copy">Electrical condition monitoring and device protection status.</p>
      {requestError && <div className="error-banner" role="alert">{requestError}</div>}
      {successMessage && <div className="success-banner" role="status">{successMessage}</div>}
      <form onSubmit={submit} className="auth-form">
        {registering && <>
          <label>Full name<input autoComplete="name" maxLength={100} {...register('fullName')} />{errors.fullName && <small role="alert">{errors.fullName.message}</small>}</label>
          <label>Institution
            <select defaultValue="" {...register('institutionId')} disabled={institutions.isPending || institutions.isError}>
              <option value="">{institutions.isPending ? 'Loading institutions...' : 'Select institution'}</option>
              {institutions.data?.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}
            </select>
            {errors.institutionId && <small role="alert">{errors.institutionId.message}</small>}
            {institutions.isError && <small role="alert">Could not load institutions.</small>}
            {institutions.data?.length === 0 && <small role="alert">No institutions are available yet. Contact an administrator.</small>}
          </label>
        </>}
        <label>Email address<input type="email" autoComplete="email" maxLength={254} {...register('email')} />{errors.email && <small role="alert">{errors.email.message}</small>}</label>
        <label>Password<input type="password" autoComplete={registering ? 'new-password' : 'current-password'} maxLength={72} {...register('password')} />{errors.password && <small role="alert">{errors.password.message}</small>}</label>
        <button className="auth-submit" disabled={isSubmitting || (registering && (!institutions.data?.length || institutions.isPending || institutions.isError))}>
          {isSubmitting ? 'Connecting...' : registering ? 'Request account' : 'Sign in'} <span>→</span>
        </button>
      </form>
      {registering && institutions.isError && <button className="auth-switch" onClick={() => void institutions.refetch()}>Retry loading institutions</button>}
      <button className="auth-switch" onClick={() => { setRequestError(''); setSuccessMessage(''); setRegistering(!registering) }}>{registering ? 'Already have an account? Sign in' : 'New to the system? Create an operator account'}</button>
      <div className="auth-footnote"><Shield size={14} /> New operator accounts require approval by an institution administrator before dashboard access.</div>
    </section>
    <div className="auth-aside"><span className="auth-aside-mark"><Activity size={25} /></span><div className="auth-aside-title">POWER SYSTEM<br />STATUS</div><div className="auth-aside-rule" /><p>Telemetry and protection state are shown from persisted device records. Local controllers remain authoritative for electrical protection.</p></div>
  </main>
}