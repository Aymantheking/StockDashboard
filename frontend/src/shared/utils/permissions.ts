export type UserRole =
  | "Admin"
  | "Inventory Manager"
  | "Collaborator"
  | "Viewer"

export type RoleUser = {
  role: UserRole
}

export function hasRole(user: RoleUser, roles: UserRole[]) {
  return roles.includes(user.role)
}
