import axios from "axios"
import { DEFAULT_API_URL } from "../../shared/constants/api"

const apiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL

export const apiClient = axios.create({
  baseURL: apiUrl.replace(/\/+$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
})

let onUnauthorized: (() => void) | null = null

export function configureApiClient(
  getAccessToken: () => string | null,
  unauthorizedHandler: () => void
) {
  onUnauthorized = unauthorizedHandler
  apiClient.interceptors.request.clear()
  apiClient.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  }
)
