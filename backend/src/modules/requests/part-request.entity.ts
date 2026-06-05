import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"

export enum RequestType {
  Reservation = "Reservation",
  Borrow = "Borrow",
}

export enum RequestStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Borrowed = "Borrowed",
  Reserved = "Reserved",
  ReturnPending = "Return Pending",
  Returned = "Returned",
  Damaged = "Damaged",
  Cancelled = "Cancelled",
}

@Entity("part_requests")
export class PartRequest {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  collaboratorId: number

  @Column()
  partId: number

  @Column()
  quantity: number

  @Column({ type: "enum", enum: RequestType })
  requestType: RequestType

  @Column({ type: "text" })
  reason: string

  @Column({ type: "date" })
  expectedReturnDate: string

  @Column({ nullable: true, type: "date" })
  usageDate: string | null

  @Column({ nullable: true, type: "date" })
  startDate: string | null

  @Column({ nullable: true, type: "date" })
  dueDate: string | null

  @Column({ type: "enum", enum: RequestStatus, default: RequestStatus.Pending })
  status: RequestStatus

  @Column({ nullable: true, type: "text" })
  managerComment: string

  @Column({ nullable: true, type: "timestamp" })
  returnDeclaredAt: Date | null

  @Column({ nullable: true })
  returnGoodQuantity: number | null

  @Column({ nullable: true })
  returnDamagedQuantity: number | null

  @Column({ nullable: true, type: "text" })
  returnComment: string | null

  @Column({ nullable: true, type: "timestamp" })
  returnConfirmedAt: Date | null

  @Column({ nullable: true })
  confirmedGoodQuantity: number | null

  @Column({ nullable: true })
  confirmedDamagedQuantity: number | null

  @Column({ nullable: true, type: "text" })
  returnManagerComment: string | null

  @ManyToOne(() => Collaborator, { onDelete: "CASCADE" })
  @JoinColumn({ name: "collaboratorId" })
  collaborator: Collaborator

  @ManyToOne(() => Part, { onDelete: "CASCADE" })
  @JoinColumn({ name: "partId" })
  part: Part

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
