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
