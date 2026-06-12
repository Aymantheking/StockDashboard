import type {
  MissingItemRequest,
  PartRequest,
} from "../../shared/types/domain"
import { apiClient } from "./client"

export type RequestAction = "approve" | "reject" | "return" | "mark-damaged"

export type CreatePartRequestInput = {
  collaboratorId?: number
  partId: number
  quantity: number
  requestType: "Reservation" | "Borrow"
  reason: string
  expectedReturnDate?: string
  usageDate?: string
  startDate?: string
  dueDate?: string
}

export const requestApi = {
  async list(mine = false) {
    return (await apiClient.get<PartRequest[]>(mine ? "/requests/my" : "/requests")).data
  },
  async listMissing(mine = false) {
    return (
      await apiClient.get<MissingItemRequest[]>(
        mine ? "/missing-item-requests/my" : "/missing-item-requests"
      )
    ).data
  },
  async create(input: CreatePartRequestInput) {
    return (await apiClient.post<PartRequest>("/requests", input)).data
  },
  async createMissing(
    input: Omit<
      MissingItemRequest,
      "id" | "collaboratorId" | "status" | "managerComment"
    >
  ) {
    return (await apiClient.post<MissingItemRequest>("/missing-item-requests", input)).data
  },
  async action(id: number, action: RequestAction, managerComment = "") {
    return (
      await apiClient.put<PartRequest>(`/requests/${id}/${action}`, {
        managerComment,
      })
    ).data
  },
  async missingAction(
    id: number,
    action: "approve" | "reject",
    managerComment = ""
  ) {
    return (
      await apiClient.put<MissingItemRequest>(
        `/missing-item-requests/${id}/${action}`,
        { managerComment }
      )
    ).data
  },
  async declareReturn(
    id: number,
    input: { goodQuantity: number; damagedQuantity: number; comment: string }
  ) {
    return (await apiClient.put<PartRequest>(`/requests/${id}/declare-return`, input)).data
  },
  async confirmReturn(
    id: number,
    input: {
      confirmedGoodQuantity: number
      confirmedDamagedQuantity: number
      managerComment: string
    }
  ) {
    return (await apiClient.put<PartRequest>(`/requests/${id}/confirm-return`, input)).data
  },
}
