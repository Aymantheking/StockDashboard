import type { AuthUser } from "../features/auth/authTypes"

export const appPages = [
  "Dashboard",
  "Inventory",
  "Reservations",
  "Requests",
  "My Requests",
  "Collaborators",
  "Suppliers",
  "Purchase",
  "Analytics",
  "Settings",
] as const

export type AppPage = (typeof appPages)[number]

export function getVisiblePages(user: AuthUser): string[] {
  if (user.role === "Collaborator") {
    return ["Inventory", "My Requests"]
  }

  if (user.role === "Admin") {
    return [
      "Dashboard",
      "Inventory",
      "Reservations",
      "Collaborators",
      "Suppliers",
      "Analytics",
      "Requests",
      "Purchase",
      "Settings",
    ]
  }

  if (user.role === "Inventory Manager") {
    return [
      "Dashboard",
      "Inventory",
      "Reservations",
      "Collaborators",
      "Suppliers",
      "Analytics",
      "Requests",
      "Purchase",
    ]
  }

  return ["Dashboard", "Inventory", "Reservations", "Analytics"]
}
