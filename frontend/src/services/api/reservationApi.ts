import type {
  Collaborator,
  Part,
  Reservation,
} from "../../shared/types/domain"
import { apiClient } from "./client"

type ReservationRecord = Omit<Reservation, "collaborator" | "partName"> & {
  collaborator?: Collaborator
  part?: Part
}

type ReservationInput = Omit<
  Reservation,
  "id" | "collaborator" | "partName"
>

function normalizeReservation(record: ReservationRecord): Reservation {
  return {
    id: record.id,
    collaboratorId: record.collaboratorId,
    partId: record.partId,
    collaborator: record.collaborator?.name || "Unknown collaborator",
    partName: record.part?.name || "Unknown part",
    quantity: record.quantity,
    expectedReturnDate: record.expectedReturnDate,
    status: record.status,
  }
}

export const reservationApi = {
  async list() {
    return (await apiClient.get<ReservationRecord[]>("/reservations")).data.map(
      normalizeReservation
    )
  },
  async get(id: number) {
    return normalizeReservation(
      (await apiClient.get<ReservationRecord>(`/reservations/${id}`)).data
    )
  },
  async create(input: ReservationInput) {
    return (await apiClient.post<Reservation>("/reservations", input)).data
  },
  async update(id: number, input: Partial<ReservationInput>) {
    return (await apiClient.put<Reservation>(`/reservations/${id}`, input)).data
  },
  async markBorrowed(id: number) {
    return (await apiClient.put<Reservation>(`/reservations/${id}/mark-borrowed`)).data
  },
  async returnReservation(id: number) {
    return (await apiClient.put<Reservation>(`/reservations/${id}/return`)).data
  },
  async remove(id: number) {
    await apiClient.delete(`/reservations/${id}`)
  },
}
