import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Division } from "../collaborators/collaborator.entity"

export enum PurchasePriority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Critical = "Critical",
}

export enum PurchaseStatus {
  Pending = "Pending",
  Approved = "Approved",
  Ordered = "Ordered",
  InTransit = "In Transit",
  Received = "Received",
  Cancelled = "Cancelled",
}

@Entity("purchases")
export class Purchase {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  itemName: string

  @Column()
  category: string

  @Column({ default: "" })
  manufacturer: string

  @Column({ default: "" })
  reference: string

  @Column()
  quantity: number

  @Column({ type: "text" })
  reason: string

  @Column({
    type: "enum",
    enum: PurchasePriority,
    default: PurchasePriority.Medium,
  })
  priority: PurchasePriority

  @Column({
    type: "enum",
    enum: PurchaseStatus,
    default: PurchaseStatus.Pending,
  })
  status: PurchaseStatus

  @Column()
  requestedById: number

  @Column({
    type: "enum",
    enum: Division,
  })
  division: Division

  @Column({ default: "" })
  supplierName: string

  @Column({ default: "" })
  supplierContact: string

  @Column({ default: 0, type: "float" })
  unitPrice: number

  @Column({ default: 0, type: "float" })
  totalPrice: number

  @Column({ nullable: true, type: "date" })
  expectedArrivalDate: string | null

  @Column({ nullable: true, type: "date" })
  receivedDate: string | null

  @Column({ default: "", type: "text" })
  adminComment: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
