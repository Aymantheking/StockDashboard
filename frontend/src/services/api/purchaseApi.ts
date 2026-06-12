import type {
  Purchase,
  PurchasePriority,
} from "../../features/purchases/purchasesTypes"
import { apiClient } from "./client"

export type CreatePurchaseInput = {
  sourcePartId: number
  itemName: string
  category: string
  manufacturer: string
  reference: string
  quantity: number
  reason: string
  priority: PurchasePriority
}

export const purchaseApi = {
  async create(input: CreatePurchaseInput) {
    return (await apiClient.post<Purchase>("/purchases", input)).data
  },
}
