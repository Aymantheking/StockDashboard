export type PurchasePriority = "Low" | "Medium" | "High" | "Critical"

export type PurchaseStatus =
  | "Pending"
  | "Approved"
  | "Ordered"
  | "In Transit"
  | "Received"
  | "Cancelled"

export type PurchaseDivision =
  | "Division 1"
  | "Division 2"
  | "Division 3"
  | "Division 4"
  | "Admin"

export type Purchase = {
  id: number
  sourcePartId: number | null
  itemName: string
  category: string
  manufacturer: string
  reference: string
  quantity: number
  reason: string
  priority: PurchasePriority
  status: PurchaseStatus
  requestedById: number
  division: PurchaseDivision
  supplierName: string
  supplierContact: string
  unitPrice: number
  totalPrice: number
  expectedArrivalDate: string | null
  receivedDate: string | null
  adminComment: string
  createdAt?: string
  updatedAt?: string
}
