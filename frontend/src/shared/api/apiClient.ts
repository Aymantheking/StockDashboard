export type ApiFetch = (
  url: string,
  options?: RequestInit
) => Promise<Response>

export function createApiClient(
  getAccessToken: () => string | null,
  onUnauthorized: () => void
): ApiFetch {
  return async (url, options = {}) => {
    const headers = new Headers(options.headers)
    const accessToken = getAccessToken()

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`)
    }

    const response = await fetch(url, { ...options, headers })
    if (response.status === 401) {
      onUnauthorized()
    }
    return response
  }
}
