import type {
  CollaboratorGroup,
  Division,
} from "../../shared/types/organization"

export type Collaborator = {
  id: number
  name: string
  email: string
  division: Division
  group: CollaboratorGroup
  role: string
  rating: number
}

export type RatingHistoryItem = {
  id: number
  collaboratorId: number
  previousRating: number
  newRating: number
  reason: string
  changedBy: string
  createdAt: string
}
