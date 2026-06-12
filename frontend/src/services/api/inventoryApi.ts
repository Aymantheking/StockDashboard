import type { Part } from "../../shared/types/domain"
import { apiClient } from "./client"

export type PartInput = Omit<Part, "id">

export const inventoryApi = {
  async list() {
    return (await apiClient.get<Part[]>("/parts")).data
  },
  async get(id: number) {
    return (await apiClient.get<Part>(`/parts/${id}`)).data
  },
  async create(input: PartInput) {
    return (await apiClient.post<Part>("/parts", input)).data
  },
  async update(id: number, input: Partial<PartInput>) {
    return (await apiClient.put<Part>(`/parts/${id}`, input)).data
  },
  async remove(id: number) {
    await apiClient.delete(`/parts/${id}`)
  },
}
