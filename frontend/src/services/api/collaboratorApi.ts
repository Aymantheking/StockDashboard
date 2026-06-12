import type {
  Collaborator,
  RatingHistoryItem,
} from "../../shared/types/domain"
import { apiClient } from "./client"

type CollaboratorInput = Omit<Collaborator, "id">

export const collaboratorApi = {
  async list() {
    return (await apiClient.get<Collaborator[]>("/collaborators")).data
  },
  async get(id: number) {
    return (await apiClient.get<Collaborator>(`/collaborators/${id}`)).data
  },
  async create(input: CollaboratorInput) {
    return (await apiClient.post<Collaborator>("/collaborators", input)).data
  },
  async update(id: number, input: Partial<CollaboratorInput>) {
    return (await apiClient.put<Collaborator>(`/collaborators/${id}`, input)).data
  },
  async remove(id: number) {
    await apiClient.delete(`/collaborators/${id}`)
  },
  async ratingHistory(id: number) {
    return (
      await apiClient.get<RatingHistoryItem[]>(`/collaborators/${id}/rating-history`)
    ).data
  },
  async adjustRating(id: number, rating: number, reason: string) {
    return (
      await apiClient.put<Collaborator>(`/collaborators/${id}/rating`, {
        rating,
        reason,
      })
    ).data
  },
}
