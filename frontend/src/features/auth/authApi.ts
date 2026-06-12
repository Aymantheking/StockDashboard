import { endpoints } from "../../shared/api/endpoints"

export function getAuthEndpoint(mode: "login" | "register") {
  return `${endpoints.auth}/${mode}`
}
