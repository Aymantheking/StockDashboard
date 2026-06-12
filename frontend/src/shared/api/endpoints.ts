const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/+$/, "")

export const endpoints = {
  analyticsSummary: `${API_BASE_URL}/analytics/summary`,
  auth: `${API_BASE_URL}/auth`,
  collaborators: `${API_BASE_URL}/collaborators`,
  missingItemRequests: `${API_BASE_URL}/missing-item-requests`,
  notifications: `${API_BASE_URL}/notifications`,
  parts: `${API_BASE_URL}/parts`,
  purchases: `${API_BASE_URL}/purchases`,
  requests: `${API_BASE_URL}/requests`,
  reservations: `${API_BASE_URL}/reservations`,
  settings: `${API_BASE_URL}/settings`,
  suppliers: `${API_BASE_URL}/suppliers`,
  users: `${API_BASE_URL}/users`,
} as const

export const notificationSummaryEndpoint = `${endpoints.notifications}/summary`
