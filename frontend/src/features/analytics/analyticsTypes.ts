import type {
  CollaboratorGroup,
  Division,
} from "../../shared/types/organization"
import type { Part } from "../inventory/inventoryTypes"

export type AnalyticsSummary = {
  totalParts: number
  availableParts: number
  borrowedParts: number
  reservedParts: number
  damagedParts?: number
  lowStockParts: number
  lowStockItems: Part[]
  totalCollaborators: number
  activeBorrowers: number
  totalReservations: number
  reservedReservations: number
  borrowedReservations: number
  returnedReservations: number
  mostBorrowedParts: { partName: string; borrowCount: number }[]
  mostActiveCollaborators: {
    collaboratorName: string
    reservationCount: number
    borrowedCount: number
  }[]
  inventoryByCategory: { category: string; count: number }[]
  reservationsByDivision: {
    division: Division
    collaborators: number
    reservationCount: number
    activeReservations: number
    borrowedParts: number
    returnedParts?: number
    damagedParts?: number
  }[]
  borrowedPartsByGroup: {
    group: CollaboratorGroup
    collaborators: number
    reservationCount: number
    activeReservations: number
    borrowedCount: number
    borrowedParts: number
    returnedParts?: number
    damagedParts?: number
  }[]
  currency: string
  totalSpent: number
  pendingPurchaseValue: number
  spentThisMonth: number
  spentThisYear: number
  averageUnitPrice: number
  topExpensivePurchases: {
    id: number
    itemName: string
    category: string
    supplier: string
    division: Division
    quantity: number
    total: number
  }[]
  spendingByCategory: { category: string; total: number }[]
  spendingBySupplier: { supplier: string; total: number }[]
  spendingByDivision: { division: Division; total: number }[]
}
