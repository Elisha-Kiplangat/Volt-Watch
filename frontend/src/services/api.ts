import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  timeout: 8000,
})

let refreshRequest: Promise<string> | null = null

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => response, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config || error.config.url?.includes('/auth/')) {
    return Promise.reject(error)
  }
  const config = error.config as typeof error.config & { _retried?: boolean }
  const refreshToken = window.localStorage.getItem('refreshToken')
  if (config._retried || !refreshToken) return Promise.reject(error)
  config._retried = true
  try {
    refreshRequest ??= axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }).then((response) => {
      const tokens = response.data.data
      window.localStorage.setItem('accessToken', tokens.accessToken)
      window.localStorage.setItem('refreshToken', tokens.refreshToken)
      return tokens.accessToken as string
    })
    const accessToken = await refreshRequest
    config.headers.Authorization = `Bearer ${accessToken}`
    return api.request(config)
  } catch {
    window.localStorage.removeItem('accessToken')
    window.localStorage.removeItem('refreshToken')
    window.dispatchEvent(new Event('auth:expired'))
    return Promise.reject(error)
  } finally {
    refreshRequest = null
  }
})