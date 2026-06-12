import type { Collaborator } from "../collaborators/collaboratorsTypes"
import type { Part } from "../inventory/inventoryTypes"

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
  returnComment?: string | null
  returnConfirmedAt?: string | null
  confirmedGoodQuantity?: number | null
  confirmedDamagedQuantity?: number | null
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
