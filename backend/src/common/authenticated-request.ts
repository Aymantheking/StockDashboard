import { Request } from "express"
import { UserRole } from "../modules/users/user.entity"

export type AuthenticatedUser = {
  id: number
  email: string
  name?: string
  role: UserRole
  division?: string
  group?: string
  managedDivision?: string | null
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser
}
