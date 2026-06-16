import axios, { AxiosError, AxiosInstance } from 'axios'

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://eternalmap-worker.summerlyntds.workers.dev/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = (error.response?.data as { detail?: string })?.detail || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export default client
