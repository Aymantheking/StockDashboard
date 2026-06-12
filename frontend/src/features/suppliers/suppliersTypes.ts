export type Supplier = {
  id: number
  name: string
  contactPerson: string
  email: string
  phone: string
  website: string
  country: string
  notes: string
  status: "Active" | "Inactive"
}
