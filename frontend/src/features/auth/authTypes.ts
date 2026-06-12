import type { UserRole } from "../../shared/utils/permissions"
import type {
  CollaboratorGroup,
  Division,
} from "../../shared/types/organization"

export type AuthUser = {
  id: number
  name: string
  email: string
  role: UserRole
  division: Division
  group: CollaboratorGroup
  managedDivision: Division | null
  emailVerificationStatus?: "Pending" | "Verified" | "Rejected"
}

export type AuthResponse = {
  accessToken: string
  user: AuthUser
  message?: string
}
