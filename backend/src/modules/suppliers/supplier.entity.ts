import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

export enum SupplierStatus {
  Active = "Active",
  Inactive = "Inactive",
}

@Entity("suppliers")
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ default: "" })
  contactPerson: string

  @Column({ default: "" })
  email: string

  @Column({ default: "" })
  phone: string

  @Column({ default: "" })
  website: string

  @Column({ default: "" })
  country: string

  @Column({ default: "", type: "text" })
  notes: string

  @Column({
    type: "enum",
    enum: SupplierStatus,
    default: SupplierStatus.Active,
  })
  status: SupplierStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
