import type { CollaboratorGroup, Division } from "./organization"

export type Part = {
  id: number
  name: string
  category: string
  manufacturer: string
  reference: string
  quantity: number
  totalQuantity: number
  availableQuantity: number
  reservedQuantity: number
  borrowedQuantity: number
  damagedQuantity: number
  location: string
  description: string
  stockAllocationNote: string
  status: string
}

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

export type Reservation = {
  id: number
  collaboratorId: number
  partId: number
  collaborator: string
  partName: string
  quantity: number
  expectedReturnDate: string
  status: "Reserved" | "Borrowed" | "Returned"
}

export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Borrowed"
  | "Reserved"
  | "Return Pending"
  | "Returned"
  | "Damaged"
  | "Cancelled"

export type PartRequest = {
  id: number
  collaboratorId: number
  partId: number
  quantity: number
  requestType: "Reservation" | "Borrow"
  reason: string
  expectedReturnDate: string
  usageDate: string | null
  startDate: string | null
  dueDate: string | null
  status: RequestStatus
  managerComment: string
  returnDeclaredAt?: string | null
  returnGoodQuantity?: number | null
  returnDamagedQuantity?: number | null
  returnDeclaredGoodQuantity?: number | null
  returnDeclaredDamagedQuantity?: number | null
  returnComment?: string | null
  returnConfirmedAt?: string | null
  confirmedGoodQuantity?: number | null
  confirmedDamagedQuantity?: number | null
  returnConfirmedGoodQuantity?: number | null
  returnConfirmedDamagedQuantity?: number | null
  returnManagerComment?: string | null
  createdAt?: string
  updatedAt?: string
  collaborator?: Collaborator
  part?: Part
}

export type MissingItemRequest = {
  id: number
  collaboratorId: number
  partId?: number | null
  itemName: string
  category: string
  manufacturer: string
  reference: string
  quantityNeeded: number
  reason: string
  neededDate: string
  status: RequestStatus
  managerComment: string
  createdAt?: string
  updatedAt?: string
  collaborator?: Collaborator
}

export type RequestDetailsItem = PartRequest | MissingItemRequest
